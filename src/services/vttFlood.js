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
 *    entities with a blue→red gradient driven by the active dimension.
 *  - {@link clearFlood} — remove the flood layer in one call.
 *
 * The service is stateless (no module-level mutable state): callers manage
 * AbortControllers via the Pinia store and pass viewers explicitly.
 */

import {
	VTT_API_PATH,
	VTT_DIMENSIONS,
	VTT_FILL_ALPHA,
	VTT_FLOOD_LAYER_NAME,
	VTT_MAX_EXTRUSION_M,
	validateFrameNumber,
	validateScenarioId,
} from '../constants/vttFlood'
import logger from '../utils/logger.js'
import { getCesium } from './cesiumProvider.js'

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
	} = /** @type {{scenarioId: string, frameNumber: number, signal?: AbortSignal}} */ ({})
) {
	const safeScenario = validateScenarioId(scenarioId)
	const safeFrame = validateFrameNumber(frameNumber)

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
 * Render the flood frame as a Cesium GeoJsonDataSource of extruded polygons,
 * coloured and sized by the active dimension.
 *
 * Uses the existing GeoJsonDataSource pattern (consistent with
 * {@link DataSource#addDataSourceWithPolygonFix}) so the layer participates
 * in `changeDataSourceShowByName` / `removeDataSourcesByNamePrefix`.
 *
 * @param {Object} params
 * @param {Cesium.Viewer} params.viewer - Cesium viewer.
 * @param {{features: Array<Object>, propertyRanges: Record<string, {min: number, max: number}>}} params.frame
 *   Output of {@link fetchSimulationFrame}.
 * @param {string} params.dimension - Active dimension key (one of {@link VTT_DIMENSIONS}).
 * @returns {Promise<number>} Number of entities created.
 */
export async function renderFlood(
	{
		viewer,
		frame,
		dimension,
	} = /** @type {{viewer: Cesium.Viewer, frame: {features: Array<Object>, propertyRanges: Record<string, {min: number, max: number}>}, dimension: string}} */ ({})
) {
	if (!viewer || viewer.isDestroyed?.()) {
		logger.warn('[VTTFlood] renderFlood: viewer not initialized; skipping')
		return 0
	}
	if (!frame || !Array.isArray(frame.features)) {
		logger.warn('[VTTFlood] renderFlood: no frame data; skipping')
		return 0
	}
	if (!DIMENSION_KEYS.includes(dimension)) {
		throw new Error(`Invalid VTT dimension: "${dimension}"`)
	}

	const Cesium = getCesium()
	await clearFlood({ viewer })

	const range = frame.propertyRanges[dimension] || { min: 0, max: 0 }
	const span = range.max - range.min
	const dataSource = new Cesium.CustomDataSource(VTT_FLOOD_LAYER_NAME)

	let created = 0
	for (const feature of frame.features) {
		const ring = extractRing(feature.geometry)
		if (!ring) continue

		const value = feature.properties?.[dimension]
		if (typeof value !== 'number' || !Number.isFinite(value)) continue

		const ratio = span === 0 ? 0 : Math.max(0, Math.min(1, (value - range.min) / span))
		const color = Cesium.Color.lerp(Cesium.Color.BLUE, Cesium.Color.RED, ratio, new Cesium.Color())
		color.alpha = VTT_FILL_ALPHA

		dataSource.entities.add({
			polygon: {
				hierarchy: Cesium.Cartesian3.fromDegreesArray(ring),
				extrudedHeight: ratio * VTT_MAX_EXTRUSION_M,
				material: color,
				outline: true,
				outlineColor: Cesium.Color.BLACK,
				arcType: Cesium.ArcType.GEODESIC,
			},
		})
		created++
	}

	viewer.dataSources.add(dataSource)
	logger.debug(`[VTTFlood] Rendered ${created} cells for dimension="${dimension}"`)
	return created
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
