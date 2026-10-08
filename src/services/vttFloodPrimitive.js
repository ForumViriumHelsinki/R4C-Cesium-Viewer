/**
 * @module services/vttFloodPrimitive
 * The VTT flood layer as one Cesium Primitive whose cells are restyled in
 * place.
 *
 * Every VTT frame of every scenario uses the same mesh (13,077 cells), so the
 * cell geometry is built once and only per-cell colour, visibility and height
 * change between frames, dimensions and opacity settings. The previous Entity
 * layer rebuilt 13k extruded polygons on every change: about 3–5 s of main
 * thread and 200–500 MB of garbage each time, measured in production.
 *
 * Geometry: each cell is a column of 3k vertices (k = ring vertex count) at
 * ellipsoid height 0 — the top cap, the top of the walls and the bottom of the
 * walls. Cap and wall-top vertices carry the surface normal in
 * `extrudeDirection`; the vertex shader pushes them up by the per-instance
 * `extrusion` attribute, which Cesium keeps in a batch table texture, so a
 * height change is an attribute write rather than a geometry rebuild. Walls are
 * darkened towards the ground (`shade`) so columns stay readable without
 * outlines.
 *
 * Layer state (mesh, cached attribute accessors, pending style) lives in a
 * WeakMap keyed by the primitive, so destroying the primitive releases it.
 */

import { VTT_FLOOD_LAYER_NAME, VTT_MAX_EXTRUSION_M } from '../constants/vttFlood'
import { getCesium } from './cesiumProvider.js'
import VERTEX_SHADER from './vttFloodColumnVS.glsl?raw'

/**
 * @typedef {Object} VttMesh
 * @property {number} cellCount
 * @property {Uint32Array} offsets - Vertex offset of each cell's ring into
 *   `coords` (in vertices, not numbers); length cellCount + 1.
 * @property {Float64Array} coords - lon, lat pairs of every ring, without the
 *   closing vertex.
 */

/**
 * @typedef {Object} VttFloodStyle
 * @property {Int16Array} cellClass - Colour class per cell, -1 = hidden.
 * @property {Uint8Array[]} classColors - RGBA bytes per class.
 * @property {Float32Array} classHeights - Extrusion in metres per class.
 */

/** Property set on the primitive so the layer can be found in scene.primitives. */
export const FLOOD_LAYER_PROPERTY = 'vttLayerName'

/** Brightness of the cap, the top of the walls and the bottom of the walls. */
const CAP_SHADE = 1
const WALL_TOP_SHADE = 0.8
const WALL_BOTTOM_SHADE = 0.55

const SHOW = new Uint8Array([1])
const HIDE = new Uint8Array([0])

/** @type {WeakMap<object, {mesh: VttMesh, attrs: Array<any>|null, pending: VttFloodStyle|null, removeReadyListener: (() => void)|null}>} */
const layerState = new WeakMap()

/**
 * Build the column geometry for one cell, or null for a degenerate ring.
 *
 * @param {any} Cesium
 * @param {VttMesh} mesh
 * @param {number} cell
 * @returns {any|null} Cesium.Geometry
 */
function cellGeometry(Cesium, mesh, cell) {
	const start = mesh.offsets[cell]
	const k = mesh.offsets[cell + 1] - start
	if (k < 3) return null

	const ellipsoid = Cesium.Ellipsoid.WGS84
	const vertexCount = 3 * k
	const positions = new Float64Array(vertexCount * 3)
	const extrude = new Float32Array(vertexCount * 3)
	const shade = new Float32Array(vertexCount)
	const point = new Cesium.Cartesian3()
	const normal = new Cesium.Cartesian3()

	for (let j = 0; j < k; j++) {
		const lon = mesh.coords[2 * (start + j)]
		const lat = mesh.coords[2 * (start + j) + 1]
		Cesium.Cartesian3.fromDegrees(lon, lat, 0, ellipsoid, point)
		ellipsoid.geodeticSurfaceNormal(point, normal)
		// Rows: 0 = cap, 1 = wall top, 2 = wall bottom.
		for (let row = 0; row < 3; row++) {
			const v = row * k + j
			positions[3 * v] = point.x
			positions[3 * v + 1] = point.y
			positions[3 * v + 2] = point.z
			if (row < 2) {
				extrude[3 * v] = normal.x
				extrude[3 * v + 1] = normal.y
				extrude[3 * v + 2] = normal.z
			}
			shade[v] = row === 0 ? CAP_SHADE : row === 1 ? WALL_TOP_SHADE : WALL_BOTTOM_SHADE
		}
	}

	const indices = new Uint16Array(3 * (k - 2) + 6 * k)
	let n = 0
	for (let j = 1; j < k - 1; j++) {
		// Cap: fan over the (convex) cell ring.
		indices[n++] = 0
		indices[n++] = j
		indices[n++] = j + 1
	}
	for (let j = 0; j < k; j++) {
		const next = (j + 1) % k
		const topA = k + j
		const topB = k + next
		const bottomA = 2 * k + j
		const bottomB = 2 * k + next
		indices[n++] = bottomA
		indices[n++] = bottomB
		indices[n++] = topB
		indices[n++] = bottomA
		indices[n++] = topB
		indices[n++] = topA
	}

	const boundingSphere = Cesium.BoundingSphere.fromVertices(positions)
	boundingSphere.radius += VTT_MAX_EXTRUSION_M

	return new Cesium.Geometry({
		attributes: {
			position: new Cesium.GeometryAttribute({
				componentDatatype: Cesium.ComponentDatatype.DOUBLE,
				componentsPerAttribute: 3,
				values: positions,
			}),
			extrudeDirection: new Cesium.GeometryAttribute({
				componentDatatype: Cesium.ComponentDatatype.FLOAT,
				componentsPerAttribute: 3,
				values: extrude,
			}),
			shade: new Cesium.GeometryAttribute({
				componentDatatype: Cesium.ComponentDatatype.FLOAT,
				componentsPerAttribute: 1,
				values: shade,
			}),
		},
		indices,
		primitiveType: Cesium.PrimitiveType.TRIANGLES,
		boundingSphere,
	})
}

/**
 * Per-instance attribute values of one cell under a style.
 *
 * @param {VttFloodStyle} style
 * @param {number} cell
 * @returns {{show: Uint8Array, color: Uint8Array, height: number}}
 */
function cellValues(style, cell) {
	const idx = style.cellClass[cell]
	if (idx < 0) return { show: HIDE, color: style.classColors[0] ?? new Uint8Array(4), height: 0 }
	return { show: SHOW, color: style.classColors[idx], height: style.classHeights[idx] }
}

/**
 * Write a style into the primitive's per-instance attributes. The primitive
 * must be ready.
 *
 * @param {any} primitive
 * @param {{mesh: VttMesh, attrs: Array<any>|null}} state
 * @param {VttFloodStyle} style
 */
function applyStyle(primitive, state, style) {
	if (!state.attrs) {
		state.attrs = []
		for (let cell = 0; cell < state.mesh.cellCount; cell++) {
			state.attrs.push(primitive.getGeometryInstanceAttributes(cell) ?? null)
		}
	}
	const height = new Float32Array(1)
	for (let cell = 0; cell < state.attrs.length; cell++) {
		const attrs = state.attrs[cell]
		if (!attrs) continue
		const values = cellValues(style, cell)
		attrs.show = values.show
		if (values.show === HIDE) continue
		attrs.color = values.color
		height[0] = values.height
		attrs.extrusion = height
	}
}

/**
 * Flood primitives currently in the scene (normally zero or one).
 *
 * @param {any} viewer - Cesium viewer.
 * @returns {any[]}
 */
export function findFloodPrimitives(viewer) {
	const primitives = viewer?.scene?.primitives
	if (!primitives) return []
	const found = []
	for (let i = 0; i < primitives.length; i++) {
		const p = primitives.get(i)
		if (p?.[FLOOD_LAYER_PROPERTY] === VTT_FLOOD_LAYER_NAME) found.push(p)
	}
	return found
}

/**
 * The mesh a flood primitive was built from, or undefined for a primitive this
 * module instance did not build (e.g. after a hot reload).
 *
 * @param {any} primitive
 * @returns {VttMesh|undefined}
 */
export function floodPrimitiveMesh(primitive) {
	return layerState.get(primitive)?.mesh
}

/**
 * Build the flood primitive for a mesh, styled with `style`, and add it to the
 * scene. Geometry is combined synchronously (raw Geometry cannot go to the
 * geometry workers); this is a one-off per mesh.
 *
 * @param {Object} params
 * @param {any} params.viewer - Cesium viewer.
 * @param {VttMesh} params.mesh
 * @param {VttFloodStyle} params.style
 * @returns {any} The Cesium.Primitive.
 */
export function createFloodPrimitive({ viewer, mesh, style }) {
	const Cesium = getCesium()
	const instances = []
	for (let cell = 0; cell < mesh.cellCount; cell++) {
		const geometry = cellGeometry(Cesium, mesh, cell)
		if (!geometry) continue
		const values = cellValues(style, cell)
		instances.push(
			new Cesium.GeometryInstance({
				geometry,
				id: cell,
				attributes: {
					color: new Cesium.ColorGeometryInstanceAttribute(
						values.color[0] / 255,
						values.color[1] / 255,
						values.color[2] / 255,
						values.color[3] / 255
					),
					show: new Cesium.ShowGeometryInstanceAttribute(values.show === SHOW),
					extrusion: new Cesium.GeometryInstanceAttribute({
						componentDatatype: Cesium.ComponentDatatype.FLOAT,
						componentsPerAttribute: 1,
						value: [values.height],
					}),
				},
			})
		)
	}

	const primitive = new Cesium.Primitive({
		geometryInstances: instances,
		appearance: new Cesium.PerInstanceColorAppearance({
			flat: true,
			translucent: true,
			closed: false,
			vertexShaderSource: VERTEX_SHADER,
		}),
		asynchronous: false,
		// Cells are not clickable; clicks fall through to buildings and areas.
		// Also saves 13k pick ids and the pick pass.
		allowPicking: false,
		releaseGeometryInstances: true,
		compressVertices: false,
	})
	Object.defineProperty(primitive, FLOOD_LAYER_PROPERTY, { value: VTT_FLOOD_LAYER_NAME })
	layerState.set(primitive, { mesh, attrs: null, pending: null, removeReadyListener: null })

	viewer.scene.primitives.add(primitive)
	viewer.scene.requestRender()
	return primitive
}

/**
 * Restyle an existing flood primitive in place: per-instance attribute writes,
 * no new geometry. Before the primitive's first render (it is not ready yet)
 * the style is kept and applied once it is.
 *
 * @param {Object} params
 * @param {any} params.viewer - Cesium viewer.
 * @param {any} params.primitive - A primitive from {@link createFloodPrimitive}.
 * @param {VttFloodStyle} params.style
 */
export function updateFloodPrimitive({ viewer, primitive, style }) {
	const state = layerState.get(primitive)
	if (!state) throw new Error('updateFloodPrimitive: not a VTT flood primitive')

	if (primitive.ready) {
		applyStyle(primitive, state, style)
	} else {
		state.pending = style
		if (!state.removeReadyListener) {
			state.removeReadyListener = viewer.scene.postRender.addEventListener(() => {
				if (primitive.isDestroyed() || !primitive.ready) return
				state.removeReadyListener?.()
				state.removeReadyListener = null
				if (state.pending) applyStyle(primitive, state, state.pending)
				state.pending = null
				viewer.scene.requestRender()
			})
		}
	}
	viewer.scene.requestRender()
}

/**
 * Remove a flood primitive from the scene and destroy it.
 *
 * @param {Object} params
 * @param {any} params.viewer - Cesium viewer.
 * @param {any} params.primitive
 */
export function destroyFloodPrimitive({ viewer, primitive }) {
	const state = layerState.get(primitive)
	state?.removeReadyListener?.()
	layerState.delete(primitive)
	// scene.primitives destroys what it removes (destroyPrimitives defaults to true).
	viewer.scene.primitives.remove(primitive)
	viewer.scene.requestRender()
}
