/**
 * @module services/vttFloodSynthetic
 * Deterministic synthetic frames for the VTT flood simulation panel.
 *
 * Used when the `vttFloodSyntheticData` feature flag is on, so the panel can be
 * demonstrated while the upstream VTT API is unavailable. The output has the
 * same shape as the VTT API response (a GeoJSON FeatureCollection of polygon
 * cells carrying every {@link VTT_DIMENSIONS} property), so the normal render
 * path is exercised unchanged.
 *
 * The values are illustrative, not a hydrological model: rain accumulates per
 * scenario profile, ponds in a few fixed depressions, and drains away after
 * the storm passes.
 */

import {
	LAAJASALO_CAMERA,
	VTT_FRAME_INTERVAL_MINUTES,
	validateFrameNumber,
	validateScenarioId,
} from '../constants/vttFlood'

const GRID_COLS = 24
const GRID_ROWS = 18
/** Cell size in degrees — roughly 100 m × 100 m at Laajasalo's latitude. */
const CELL_LON = 0.0018
const CELL_LAT = 0.0009

/** Fraction of ponded water remaining after each 2.5 min frame. */
const DRAINAGE_RETENTION = 0.97

/**
 * Rain profile per scenario: total millimetres falling over `stormFrames`
 * frames, starting at frame 0. Loosely follows the scenario descriptions.
 */
const SCENARIO_PROFILES = {
	1: { totalMm: 80, stormFrames: 24 },
	2: { totalMm: 30, stormFrames: 288 },
	3: { totalMm: 40, stormFrames: 288 },
}

/** Low-lying spots where water collects: centre offsets in cells, radius in cells. */
const DEPRESSIONS = [
	{ col: 6, row: 5, radius: 3 },
	{ col: 16, row: 11, radius: 4 },
	{ col: 11, row: 14, radius: 2.5 },
]

/**
 * Deterministic pseudo-random value in [0, 1) for a grid cell.
 *
 * @param {number} col
 * @param {number} row
 * @returns {number}
 */
function cellNoise(col, row) {
	const x = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453
	return x - Math.floor(x)
}

/**
 * Depression factor in [0, 1] — 1 at the bottom of a depression.
 *
 * @param {number} col
 * @param {number} row
 * @returns {number}
 */
function depressionFactor(col, row) {
	let best = 0
	for (const d of DEPRESSIONS) {
		const distSq = (col - d.col) ** 2 + (row - d.row) ** 2
		best = Math.max(best, Math.exp(-distSq / (2 * d.radius ** 2)))
	}
	return best
}

/**
 * Rain time series up to `frame` for a scenario.
 *
 * @param {{totalMm: number, stormFrames: number}} profile
 * @param {number} frame
 * @returns {{intensityMmH: number, cumulativeMm: number, pondedMm: number}}
 */
function rainState(profile, frame) {
	const perFrameMm = profile.totalMm / profile.stormFrames
	let cumulativeMm = 0
	let pondedMm = 0
	let lastFrameMm = 0
	for (let k = 0; k <= frame; k++) {
		// Sine-shaped storm: peaks mid-storm, zero outside it.
		const inStorm = k < profile.stormFrames
		const shape = inStorm ? Math.sin((Math.PI * (k + 0.5)) / profile.stormFrames) : 0
		lastFrameMm = perFrameMm * shape * (Math.PI / 2)
		cumulativeMm += lastFrameMm
		pondedMm = pondedMm * DRAINAGE_RETENTION + lastFrameMm
	}
	return {
		intensityMmH: lastFrameMm * (60 / VTT_FRAME_INTERVAL_MINUTES),
		cumulativeMm,
		pondedMm,
	}
}

/**
 * Generate one synthetic simulation frame.
 *
 * @param {Object} params
 * @param {string} params.scenarioId - VTT scenario id (validated).
 * @param {number} params.frameNumber - Frame index (validated).
 * @returns {{type: 'FeatureCollection', features: Array<Object>}}
 */
export function generateSyntheticFrame(
	{ scenarioId, frameNumber } = /** @type {{scenarioId: string, frameNumber: number}} */ ({})
) {
	const safeScenario = validateScenarioId(scenarioId)
	const safeFrame = validateFrameNumber(frameNumber)
	const { intensityMmH, cumulativeMm, pondedMm } = rainState(
		SCENARIO_PROFILES[safeScenario],
		safeFrame
	)

	const originLon = LAAJASALO_CAMERA.longitude - (GRID_COLS * CELL_LON) / 2
	const originLat = LAAJASALO_CAMERA.latitude - (GRID_ROWS * CELL_LAT) / 2
	const rainSuppression = 1 - 0.8 * Math.min(1, intensityMmH / 20)
	const wetness = Math.min(1, cumulativeMm / 40)

	const features = []
	for (let row = 0; row < GRID_ROWS; row++) {
		for (let col = 0; col < GRID_COLS; col++) {
			const depression = depressionFactor(col, row)
			const imperviousness = 0.2 + 0.6 * cellNoise(col, row)
			const vegetation = 1 - imperviousness

			const west = originLon + col * CELL_LON
			const south = originLat + row * CELL_LAT
			const east = west + CELL_LON
			const north = south + CELL_LAT

			features.push({
				type: 'Feature',
				geometry: {
					type: 'Polygon',
					coordinates: [
						[
							[west, south],
							[east, south],
							[east, north],
							[west, north],
							[west, south],
						],
					],
				},
				properties: {
					canopy_air_temperature:
						293.5 + 2 * imperviousness - 2.5 * wetness * vegetation + 0.3 * cellNoise(row, col),
					overland_water_depth:
						0.002 * depression +
						(pondedMm / 1000) * (0.2 + 2.5 * depression) * (0.5 + imperviousness),
					transpiration: 0.35 * vegetation * rainSuppression,
					upper_storage_water_depth: 0.005 + 0.04 * vegetation * (1 - Math.exp(-cumulativeMm / 30)),
				},
			})
		}
	}

	return { type: 'FeatureCollection', features }
}
