/**
 * @module services/vttFlood
 * Service layer for the VTT R4C flood simulation integration.
 *
 *  - {@link fetchSimulationFrame} — POST to the VTT proxy for a (scenario, frame)
 *    pair, validating the payload and converting it to a compact frame
 *    ({@link compactFrame}). Cancellable via AbortController so navigation
 *    away from the panel aborts an in-flight request rather than letting it
 *    overwrite fresher state.
 *  - {@link renderFlood} — draw a frame as extruded columns coloured and sized
 *    by the active dimension's colour classes (utils/vttFloodColorScale.js).
 *    The first frame builds the layer (services/vttFloodPrimitive.js); later
 *    frames, dimensions and opacities only restyle it.
 *  - {@link hideFlood} / {@link clearFlood} — hide the layer, or remove and
 *    destroy it.
 *
 * Callers manage AbortControllers via the Pinia store and pass viewers
 * explicitly. The layer is found through the viewer, so at most one exists
 * however renders interleave.
 */

import {
	VTT_API_PATH,
	VTT_DEFAULT_OPACITY,
	VTT_DIMENSIONS,
	validateFrameNumber,
	validateScenarioId,
} from '../constants/vttFlood'
import logger from '../utils/logger.js'
import { buildColorScale, classExtrusion, classIndex } from '../utils/vttFloodColorScale.js'
import {
	createFloodPrimitive,
	destroyFloodPrimitive,
	findFloodPrimitives,
	floodPrimitiveMesh,
	updateFloodPrimitive,
} from './vttFloodPrimitive.js'
import { generateSyntheticFrame } from './vttFloodSynthetic.js'

/** @typedef {import('./vttFloodPrimitive.js').VttMesh} VttMesh */
/** @typedef {import('../utils/vttFloodColorScale.js').VttColorScale} VttColorScale */

/**
 * A simulation frame without the GeoJSON object graph: cell geometry plus one
 * typed array of values per dimension, in feature order.
 *
 * @typedef {Object} VttFrame
 * @property {VttMesh} mesh
 * @property {Record<string, Float32Array>} values - NaN where a cell has no numeric value.
 * @property {string} [scenarioId] - Set by {@link fetchSimulationFrame}; with
 *   `synthetic` it selects the frame's colour classes.
 * @property {boolean} [synthetic] - Set by {@link fetchSimulationFrame}.
 */

const DIMENSION_KEYS = VTT_DIMENSIONS.map((d) => d.key)

/**
 * Outer ring of a cell as [lon, lat] pairs without the closing vertex, or null
 * on an unrecognised shape. Accepts a Polygon's coordinates ([[[lon,lat],...]])
 * and a bare ring ([[lon,lat],...]) — the POC API has been seen emitting both.
 *
 * @param {Object} geometry - GeoJSON geometry object.
 * @returns {Array<Array<number>>|null}
 */
function outerRing(geometry) {
	let ring = geometry?.coordinates
	while (Array.isArray(ring) && Array.isArray(ring[0]) && Array.isArray(ring[0][0])) {
		ring = ring[0]
	}
	if (!Array.isArray(ring) || ring.length < 3) return null
	for (const point of ring) {
		if (!Array.isArray(point) || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
			return null
		}
	}
	const first = ring[0]
	const last = ring[ring.length - 1]
	const closed = first[0] === last[0] && first[1] === last[1]
	const open = closed ? ring.slice(0, -1) : ring
	return open.length >= 3 ? open : null
}

/**
 * Convert GeoJSON features into a compact frame. Iterating the raw parsed
 * payload once here keeps the 13k-feature object graph out of the store and
 * out of every later render.
 *
 * @param {Array<Object>} features - GeoJSON features.
 * @returns {VttFrame}
 */
export function compactFrame(features) {
	const cellCount = features.length
	const offsets = new Uint32Array(cellCount + 1)
	/** @type {number[]} */
	const coords = []
	/** @type {Record<string, Float32Array>} */
	const values = {}
	for (const key of DIMENSION_KEYS) values[key] = new Float32Array(cellCount)

	features.forEach((feature, cell) => {
		const ring = outerRing(feature?.geometry)
		if (ring) {
			for (const [lon, lat] of ring) coords.push(lon, lat)
		}
		offsets[cell + 1] = coords.length / 2
		const props = feature?.properties
		for (const key of DIMENSION_KEYS) {
			const value = props?.[key]
			values[key][cell] = typeof value === 'number' ? value : Number.NaN
		}
	})

	return { mesh: { cellCount, offsets, coords: Float64Array.from(coords) }, values }
}

/**
 * @param {VttMesh} a
 * @param {VttMesh} b
 * @returns {boolean} True when both meshes have identical cell geometry.
 */
export function meshesEqual(a, b) {
	if (a === b) return true
	if (a.cellCount !== b.cellCount || a.coords.length !== b.coords.length) return false
	for (let i = 0; i < a.offsets.length; i++) if (a.offsets[i] !== b.offsets[i]) return false
	for (let i = 0; i < a.coords.length; i++) if (a.coords[i] !== b.coords[i]) return false
	return true
}

/**
 * Share one mesh object between frames with the same geometry. Every VTT frame
 * uses the same mesh, so the renderer can tell by identity whether the layer's
 * geometry still fits, and cached frames hold one mesh between them.
 *
 * @param {VttFrame} frame
 * @param {VttMesh|null|undefined} known - A mesh already in use.
 * @returns {VttFrame} `frame`, with `mesh` replaced by `known` when equal.
 */
export function internMesh(frame, known) {
	if (!known || frame.mesh === known || !meshesEqual(frame.mesh, known)) return frame
	return { ...frame, mesh: known }
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
 * @returns {Promise<VttFrame>} The frame in compact form ({@link compactFrame}),
 *   tagged with its `scenarioId` and `synthetic` source.
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
		return { ...compactFrame(features), scenarioId: safeScenario, synthetic: true }
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

	return { ...compactFrame(payload.features), scenarioId: safeScenario, synthetic: false }
}

/**
 * Per-cell style for the flood primitive from a colour scale.
 *
 * @param {VttColorScale} scale
 * @param {ArrayLike<number>} values
 * @param {number} opacity - 0..1.
 * @returns {import('./vttFloodPrimitive.js').VttFloodStyle & {shown: number}}
 */
function styleFor(scale, values, opacity) {
	const alpha = Math.round(opacity * 255)
	// One RGBA value per class, shared by every cell in it.
	const classColors = scale.classes.map(
		(c) => new Uint8Array([c.rgb[0], c.rgb[1], c.rgb[2], alpha])
	)
	const classHeights = Float32Array.from(scale.classes, (_, i) => classExtrusion(scale, i))
	const cellClass = new Int16Array(values.length)
	let shown = 0
	for (let cell = 0; cell < values.length; cell++) {
		const idx = classIndex(scale, values[cell])
		cellClass[cell] = idx
		if (idx >= 0) shown++
	}
	return { cellClass, classColors, classHeights, shown }
}

/**
 * Draw a frame. The first call (or a frame with a different mesh) builds the
 * layer; later calls restyle it in place. Synchronous, and the layer is looked
 * up through the viewer, so two renders can never leave two layers.
 *
 * @param {Object} params
 * @param {any} params.viewer - Cesium viewer.
 * @param {VttFrame} params.frame - Output of {@link fetchSimulationFrame}.
 * @param {string} params.dimension - Active dimension key (one of {@link VTT_DIMENSIONS}).
 * @param {number} [params.opacity] - Fill opacity 0..1.
 * @param {VttColorScale} [params.scale] - Colour scale for this frame and
 *   dimension; built here when omitted. Pass the one the legend shows so both
 *   come from the same object.
 * @returns {{shown: number, scale: VttColorScale | null}}
 */
export function renderFlood(
	{
		viewer,
		frame,
		dimension,
		opacity = VTT_DEFAULT_OPACITY,
		scale,
	} = /** @type {{viewer: any, frame: VttFrame, dimension: string, opacity?: number, scale?: VttColorScale}} */ ({})
) {
	if (!viewer || viewer.isDestroyed?.()) {
		logger.warn('[VTTFlood] renderFlood: viewer not initialized; skipping')
		return { shown: 0, scale: null }
	}
	if (!frame?.mesh || !frame.values) {
		logger.warn('[VTTFlood] renderFlood: no frame data; skipping')
		return { shown: 0, scale: null }
	}
	const meta = VTT_DIMENSIONS.find((d) => d.key === dimension)
	if (!meta) {
		throw new Error(`Invalid VTT dimension: "${dimension}"`)
	}

	const values = frame.values[dimension]
	const colorScale = scale ?? buildColorScale(meta, values, frame)
	const style = styleFor(colorScale, values, opacity)

	const [existing, ...strays] = findFloodPrimitives(viewer)
	for (const stray of strays) destroyFloodPrimitive({ viewer, primitive: stray })

	let primitive = existing
	if (primitive && floodPrimitiveMesh(primitive) !== frame.mesh) {
		destroyFloodPrimitive({ viewer, primitive })
		primitive = undefined
	}
	if (primitive) {
		updateFloodPrimitive({ viewer, primitive, style })
	} else {
		primitive = createFloodPrimitive({ viewer, mesh: frame.mesh, style })
	}
	primitive.show = style.shown > 0
	viewer.scene.requestRender()

	logger.debug(`[VTTFlood] Rendered ${style.shown} cells for dimension="${dimension}"`)
	return { shown: style.shown, scale: colorScale }
}

/**
 * Hide the flood layer without destroying it, e.g. while the next scenario
 * loads, so showing it again needs no geometry rebuild.
 *
 * @param {Object} params
 * @param {any} params.viewer - Cesium viewer.
 */
export function hideFlood({ viewer } = /** @type {{viewer: any}} */ ({})) {
	if (!viewer || viewer.isDestroyed?.()) return
	const primitives = findFloodPrimitives(viewer)
	for (const primitive of primitives) primitive.show = false
	if (primitives.length > 0) viewer.scene.requestRender()
}

/**
 * Remove the VTT flood layer from the viewer and destroy it.
 *
 * @param {Object} params
 * @param {any} params.viewer - Cesium viewer.
 */
export function clearFlood({ viewer } = /** @type {{viewer: any}} */ ({})) {
	if (!viewer || viewer.isDestroyed?.() || !viewer.scene?.primitives) return
	for (const primitive of findFloodPrimitives(viewer)) {
		destroyFloodPrimitive({ viewer, primitive })
	}
}
