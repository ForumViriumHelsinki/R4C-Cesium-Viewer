/**
 * @module services/vttFlood
 * Service layer for the VTT R4C flood simulation integration.
 *
 * Three responsibilities:
 *  - {@link fetchSimulationFrame} — POST to the VTT proxy for a (scenario, frame)
 *    pair, validating the payload before returning it. Implements the
 *    cancellable-request pattern via AbortController so navigation away from
 *    the panel aborts an in-flight request rather than letting it overwrite
 *    fresher state.
 *  - {@link renderFlood} — draw the returned GeoJSON as extruded polygon
 *    entities coloured and sized by the active dimension's colour classes
 *    (utils/vttFloodColorScale.js).
 *  - {@link clearFlood} — remove the flood layer in one call.
 *
 * The service is stateless (no module-level mutable state): callers manage
 * AbortControllers via the Pinia store and pass viewers explicitly.
 */

import {
	VTT_API_PATH,
	VTT_DEFAULT_OPACITY,
	VTT_DIMENSIONS,
	VTT_FLOOD_LAYER_NAME,
	validateFrameNumber,
	validateScenarioId,
} from '../constants/vttFlood'
import logger from '../utils/logger.js'
import { buildColorScale, classExtrusion, classIndex } from '../utils/vttFloodColorScale.js'
import { getCesium } from './cesiumProvider.js'
import { generateSyntheticFrame } from './vttFloodSynthetic.js'

const DIMENSION_KEYS = VTT_DIMENSIONS.map((d) => d.key)

/**
 * Computes per-property min/max across all features so dimension switching is
 * an O(0) re-render rather than re-fetch.
 *
 * @param {Array<Object>} features - GeoJSON features.
 * @returns {Record<string, {min: number, max: number}>}
 */
function computePropertyRanges(features) {
	/** @type {Record<string, {min: number, max: number}>} */
	const ranges = {}
	for (const key of DIMENSION_KEYS) {
		ranges[key] = { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY }
	}
	for (const feature of features) {
		const props = feature?.properties
		if (!props) continue
		for (const key of DIMENSION_KEYS) {
			const value = props[key]
			if (typeof value !== 'number' || !Number.isFinite(value)) continue
			if (value < ranges[key].min) ranges[key].min = value
			if (value > ranges[key].max) ranges[key].max = value
		}
	}
	// Replace untouched ranges (no numeric values) with {min: 0, max: 0} so
	// downstream code can rely on numeric values without a NaN sentinel.
	for (const key of DIMENSION_KEYS) {
		if (
			ranges[key].min === Number.POSITIVE_INFINITY ||
			ranges[key].max === Number.NEGATIVE_INFINITY
		) {
			ranges[key] = { min: 0, max: 0 }
		}
	}
	return ranges
}

/**
 * Fetch a single simulation frame from the VTT proxy.
 *
 * @param {Object} params
 * @param {string} params.scenarioId - VTT scenario id (validated against
 *   the {@link VTT_SCENARIOS} allow-list).
 * @param {number} params.frameNumber - Frame index in 0..VTT_FRAME_COUNT-1.
 * @param {AbortSignal} [params.signal] - Optional AbortSignal for cancellation.
 * @param {boolean} [params.synthetic] - Return a locally generated frame
 *   instead of calling the VTT API (the `vttFloodSyntheticData` flag).
 * @returns {Promise<{features: Array<Object>, propertyRanges: Record<string, {min: number, max: number}>}>}
 * @throws {Error} On invalid input, non-2xx response, or malformed payload.
 *   AbortError propagates as-is so callers can distinguish cancellation from
 *   real failures.
 */
export async function fetchSimulationFrame(
	{
		scenarioId,
		frameNumber,
		signal,
		synthetic = false,
	} = /** @type {{scenarioId: string, frameNumber: number, signal?: AbortSignal, synthetic?: boolean}} */ ({})
) {
	const safeScenario = validateScenarioId(scenarioId)
	const safeFrame = validateFrameNumber(frameNumber)

	if (synthetic) {
		logger.debug(`[VTTFlood] Generating synthetic scenario=${safeScenario} frame=${safeFrame}`)
		const { features } = generateSyntheticFrame({
			scenarioId: safeScenario,
			frameNumber: safeFrame,
		})
		return { features, propertyRanges: computePropertyRanges(features) }
	}

	const body = JSON.stringify({
		picture_number: safeFrame,
		scenario_number: safeScenario,
	})

	// Append scenario+frame as query params so the nginx proxy can build a
	// reliable cache key from $request_uri alone. $request_body is not
	// guaranteed to be populated during nginx's cache lookup phase, so a
	// body-based key collapses every POST onto the same entry. The upstream
	// VTT API still reads the POST body and ignores the query string.
	const url = `${VTT_API_PATH}?scenario=${safeScenario}&frame=${safeFrame}`

	logger.debug(`[VTTFlood] Fetching scenario=${safeScenario} frame=${safeFrame} from ${url}`)

	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body,
		signal,
	})

	if (!response.ok) {
		throw new Error(
			`VTT flood API responded ${response.status} ${response.statusText} for scenario=${safeScenario} frame=${safeFrame}`
		)
	}

	const payload = await response.json()
	if (!payload || typeof payload !== 'object' || !Array.isArray(payload.features)) {
		throw new Error(
			'VTT flood API returned malformed payload: expected GeoJSON FeatureCollection with features[]'
		)
	}

	return {
		features: payload.features,
		propertyRanges: computePropertyRanges(payload.features),
	}
}

/**
 * Builds the polygon ring from a Feature's geometry.coordinates.
 * Accepts both [[lon,lat],...] (single ring) and [[[lon,lat],...]] (Polygon
 * outer ring) shapes — the POC API has been seen emitting both.
 *
 * @param {Object} geometry - GeoJSON geometry object.
 * @returns {Array<number>|null} Flat [lon, lat, lon, lat, ...] or null on
 *   unrecognised shape.
 */
function extractRing(geometry) {
	if (!geometry?.coordinates) return null
	const coords = geometry.coordinates
	// flat(Infinity) collapses single ring or nested rings to a flat list — the
	// POC relies on this same trick.
	const flat = coords.flat(Infinity)
	if (!flat.length || flat.length % 2 !== 0) return null
	for (const n of flat) {
		if (typeof n !== 'number' || !Number.isFinite(n)) return null
	}
	return flat
}

/**
 * Values of one dimension in feature order; non-numeric values become NaN.
 *
 * @param {{features: Array<Object>}} frame
 * @param {string} dimension
 * @returns {Float64Array}
 */
export function frameValues(frame, dimension) {
	const out = new Float64Array(frame.features.length)
	frame.features.forEach((feature, i) => {
		const value = feature?.properties?.[dimension]
		out[i] = typeof value === 'number' ? value : Number.NaN
	})
	return out
}

/**
 * Render the flood frame as extruded polygon entities, coloured and sized by
 * the active dimension's colour classes. Cells the scale hides (zero, below the
 * wet threshold, non-numeric) get no entity.
 *
 * @param {Object} params
 * @param {Cesium.Viewer} params.viewer - Cesium viewer.
 * @param {{features: Array<Object>, propertyRanges: Record<string, {min: number, max: number}>}} params.frame
 *   Output of {@link fetchSimulationFrame}.
 * @param {string} params.dimension - Active dimension key (one of {@link VTT_DIMENSIONS}).
 * @param {number} [params.opacity] - Fill opacity 0..1.
 * @param {import('../utils/vttFloodColorScale.js').VttColorScale} [params.scale] - Colour
 *   scale for this frame and dimension; built here when omitted. Pass the one the
 *   legend shows so both come from the same object.
 * @returns {Promise<{created: number, scale: import('../utils/vttFloodColorScale.js').VttColorScale | null}>}
 */
export async function renderFlood(
	{
		viewer,
		frame,
		dimension,
		opacity = VTT_DEFAULT_OPACITY,
		scale,
	} = /** @type {{viewer: Cesium.Viewer, frame: {features: Array<Object>, propertyRanges: Record<string, {min: number, max: number}>}, dimension: string, opacity?: number, scale?: import('../utils/vttFloodColorScale.js').VttColorScale}} */ ({})
) {
	if (!viewer || viewer.isDestroyed?.()) {
		logger.warn('[VTTFlood] renderFlood: viewer not initialized; skipping')
		return { created: 0, scale: null }
	}
	if (!frame || !Array.isArray(frame.features)) {
		logger.warn('[VTTFlood] renderFlood: no frame data; skipping')
		return { created: 0, scale: null }
	}
	const meta = VTT_DIMENSIONS.find((d) => d.key === dimension)
	if (!meta) {
		throw new Error(`Invalid VTT dimension: "${dimension}"`)
	}

	const Cesium = getCesium()
	await clearFlood({ viewer })

	const values = frameValues(frame, dimension)
	const colorScale = scale ?? buildColorScale(meta, values)
	// One immutable Color per class (architecture.md: never share-and-mutate).
	const alpha = Math.round(opacity * 255)
	const materials = colorScale.classes.map((c) =>
		Cesium.Color.fromBytes(c.rgb[0], c.rgb[1], c.rgb[2], alpha)
	)
	const dataSource = new Cesium.CustomDataSource(VTT_FLOOD_LAYER_NAME)

	let created = 0
	dataSource.entities.suspendEvents()
	frame.features.forEach((feature, i) => {
		const idx = classIndex(colorScale, values[i])
		if (idx < 0) return
		const ring = extractRing(feature.geometry)
		if (!ring) return
		dataSource.entities.add({
			polygon: {
				hierarchy: Cesium.Cartesian3.fromDegreesArray(ring),
				extrudedHeight: classExtrusion(colorScale, idx),
				material: materials[idx],
				arcType: Cesium.ArcType.GEODESIC,
			},
		})
		created++
	})
	dataSource.entities.resumeEvents()

	viewer.dataSources.add(dataSource)
	viewer.scene.requestRender()
	logger.debug(`[VTTFlood] Rendered ${created} cells for dimension="${dimension}"`)
	return { created, scale: colorScale }
}

/**
 * Remove the VTT flood layer from the viewer.
 *
 * @param {Object} params
 * @param {Cesium.Viewer} params.viewer - Cesium viewer.
 * @returns {Promise<void>}
 */
export async function clearFlood({ viewer } = /** @type {{viewer: Cesium.Viewer}} */ ({})) {
	if (!viewer || viewer.isDestroyed?.() || !viewer.dataSources) return
	// Snapshot via the public DataSourceCollection API before mutating it.
	const sources = /** @type {Array<Cesium.DataSource>} */ ([])
	for (let i = 0; i < viewer.dataSources.length; i++) {
		sources.push(viewer.dataSources.get(i))
	}
	for (const ds of sources) {
		if (ds.name === VTT_FLOOD_LAYER_NAME) {
			viewer.dataSources.remove(ds, true)
		}
	}
}
