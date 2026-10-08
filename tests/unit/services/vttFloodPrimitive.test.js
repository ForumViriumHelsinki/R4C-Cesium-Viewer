/**
 * The VTT flood layer as one Cesium Primitive restyled in place (issue 6: the
 * Entity layer rebuilt 13k extruded polygons on every frame change).
 *
 * Runs against the real Cesium geometry classes (tests/setup.js mocks
 * `cesium` globally; this file loads the actual module) so the geometry,
 * instance attributes and Primitive options are what the browser gets. WebGL
 * is not available, so the primitive never renders here: `ready` and the
 * batch-table accessors are stubbed where a test needs them.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/cesiumProvider.js', async () => {
	const Cesium = await vi.importActual('cesium')
	return { getCesium: () => Cesium }
})

import { VTT_FLOOD_LAYER_NAME } from '@/constants/vttFlood.ts'
import { getCesium } from '@/services/cesiumProvider.js'
import {
	createFloodPrimitive,
	destroyFloodPrimitive,
	FLOOD_LAYER_PROPERTY,
	findFloodPrimitives,
	floodPrimitiveMesh,
	updateFloodPrimitive,
} from '@/services/vttFloodPrimitive.js'

/** Viewer stand-in with a PrimitiveCollection-like list and postRender event. */
function makeViewer() {
	const list = []
	const listeners = new Set()
	return {
		listeners,
		isDestroyed: () => false,
		scene: {
			requestRender: vi.fn(),
			postRender: {
				addEventListener: vi.fn((cb) => {
					listeners.add(cb)
					return () => listeners.delete(cb)
				}),
			},
			primitives: {
				list,
				get length() {
					return list.length
				},
				get: (i) => list[i],
				add: vi.fn((p) => {
					list.push(p)
					return p
				}),
				remove: vi.fn((p) => {
					const i = list.indexOf(p)
					if (i < 0) return false
					list.splice(i, 1)
					p.destroy()
					return true
				}),
			},
		},
	}
}

/** Three 4-vertex cells and one degenerate cell. */
function makeMesh() {
	const rings = [
		[25.04, 60.16, 25.041, 60.16, 25.041, 60.161, 25.04, 60.161],
		[25.041, 60.16, 25.042, 60.16, 25.042, 60.161, 25.041, 60.161],
		[], // no usable geometry
		[25.042, 60.16, 25.043, 60.16, 25.043, 60.161, 25.042, 60.161],
	]
	const offsets = new Uint32Array(rings.length + 1)
	const coords = []
	rings.forEach((ring, i) => {
		coords.push(...ring)
		offsets[i + 1] = coords.length / 2
	})
	return { cellCount: rings.length, offsets, coords: Float64Array.from(coords) }
}

function makeStyle(cellClass) {
	return {
		cellClass: Int16Array.from(cellClass),
		classColors: [new Uint8Array([10, 20, 30, 140]), new Uint8Array([40, 50, 60, 140])],
		classHeights: Float32Array.from([2, 100]),
	}
}

/** Make a primitive look rendered: ready, with per-cell attribute recorders. */
function markReady(primitive) {
	const attrs = new Map()
	Object.defineProperty(primitive, 'ready', { value: true, configurable: true })
	vi.spyOn(primitive, 'getGeometryInstanceAttributes').mockImplementation((id) => {
		if (!attrs.has(id)) attrs.set(id, { writes: 0 })
		const rec = attrs.get(id)
		return {
			set show(v) {
				rec.show = Array.from(v)
				rec.writes++
			},
			set color(v) {
				rec.color = Array.from(v)
				rec.writes++
			},
			set extrusion(v) {
				rec.extrusion = Array.from(v)
				rec.writes++
			},
		}
	})
	return attrs
}

describe('createFloodPrimitive', () => {
	let viewer
	let mesh
	beforeEach(() => {
		viewer = makeViewer()
		mesh = makeMesh()
	})

	it('adds one non-pickable, translucent Primitive with an instance per valid cell', () => {
		const Cesium = getCesium()
		const primitive = createFloodPrimitive({ viewer, mesh, style: makeStyle([0, 1, -1, -1]) })

		expect(primitive).toBeInstanceOf(Cesium.Primitive)
		expect(viewer.scene.primitives.add).toHaveBeenCalledTimes(1)
		expect(primitive.allowPicking).toBe(false)
		expect(primitive.appearance).toBeInstanceOf(Cesium.PerInstanceColorAppearance)
		expect(primitive.appearance.translucent).toBe(true)
		expect(primitive.appearance.vertexShaderSource).toContain('czm_batchTable_extrusion(batchId)')
		expect(primitive.geometryInstances.map((g) => g.id)).toEqual([0, 1, 3])
		expect(viewer.scene.requestRender).toHaveBeenCalled()
	})

	it('builds each 4-vertex cell as a 12-vertex column: cap, wall top, wall bottom', () => {
		const primitive = createFloodPrimitive({ viewer, mesh, style: makeStyle([0, 0, -1, 0]) })
		const { geometry } = primitive.geometryInstances[0]

		expect(geometry.attributes.position.values).toHaveLength(12 * 3)
		expect(geometry.indices).toHaveLength(2 * 3 + 4 * 2 * 3) // cap + 4 walls
		const extrude = geometry.attributes.extrudeDirection.values
		// Cap and wall-top rows extrude along a unit normal; the bottom row stays put.
		for (let v = 0; v < 8; v++) {
			const len = Math.hypot(extrude[3 * v], extrude[3 * v + 1], extrude[3 * v + 2])
			expect(len).toBeCloseTo(1, 6)
		}
		for (let v = 8; v < 12; v++) {
			expect([extrude[3 * v], extrude[3 * v + 1], extrude[3 * v + 2]]).toEqual([0, 0, 0])
		}
		expect(Math.max(...geometry.indices)).toBe(11)
	})

	it('bakes the initial style into the instance attributes', () => {
		const primitive = createFloodPrimitive({ viewer, mesh, style: makeStyle([1, -1, -1, 0]) })
		const [first, second, fourth] = primitive.geometryInstances

		expect(Array.from(first.attributes.color.value)).toEqual([40, 50, 60, 140])
		expect(Array.from(first.attributes.show.value)).toEqual([1])
		expect(first.attributes.extrusion.value).toEqual([100])
		expect(Array.from(second.attributes.show.value)).toEqual([0])
		expect(fourth.attributes.extrusion.value).toEqual([2])
	})

	it('is findable in the scene and remembers its mesh', () => {
		const primitive = createFloodPrimitive({ viewer, mesh, style: makeStyle([0, 0, 0, 0]) })
		expect(primitive[FLOOD_LAYER_PROPERTY]).toBe(VTT_FLOOD_LAYER_NAME)
		expect(findFloodPrimitives(viewer)).toEqual([primitive])
		expect(floodPrimitiveMesh(primitive)).toBe(mesh)
	})
})

describe('updateFloodPrimitive', () => {
	it('writes show, colour and height through the instance attributes, adding nothing', () => {
		const viewer = makeViewer()
		const primitive = createFloodPrimitive({
			viewer,
			mesh: makeMesh(),
			style: makeStyle([0, 0, 0, 0]),
		})
		const attrs = markReady(primitive)
		viewer.scene.requestRender.mockClear()

		updateFloodPrimitive({ viewer, primitive, style: makeStyle([1, -1, -1, 0]) })

		expect(viewer.scene.primitives.add).toHaveBeenCalledTimes(1)
		expect(attrs.get(0)).toMatchObject({ show: [1], color: [40, 50, 60, 140], extrusion: [100] })
		expect(attrs.get(1)).toMatchObject({ show: [0] })
		expect(attrs.get(3)).toMatchObject({ show: [1], color: [10, 20, 30, 140], extrusion: [2] })
		expect(viewer.scene.requestRender).toHaveBeenCalledTimes(1)
	})

	it('defers a style given before the first render and applies it once ready', () => {
		const viewer = makeViewer()
		const primitive = createFloodPrimitive({
			viewer,
			mesh: makeMesh(),
			style: makeStyle([0, 0, 0, 0]),
		})

		updateFloodPrimitive({ viewer, primitive, style: makeStyle([0, 0, 0, 0]) })
		updateFloodPrimitive({ viewer, primitive, style: makeStyle([-1, 1, -1, 1]) })
		expect(viewer.scene.postRender.addEventListener).toHaveBeenCalledTimes(1)

		// A render that has not finished the primitive yet changes nothing.
		for (const cb of [...viewer.listeners]) cb()
		expect(viewer.listeners.size).toBe(1)

		const attrs = markReady(primitive)
		for (const cb of [...viewer.listeners]) cb()

		expect(viewer.listeners.size).toBe(0)
		expect(attrs.get(0)).toMatchObject({ show: [0] })
		expect(attrs.get(1)).toMatchObject({ show: [1], extrusion: [100] })
	})

	it('rejects a primitive it did not build', () => {
		const viewer = makeViewer()
		expect(() => updateFloodPrimitive({ viewer, primitive: {}, style: makeStyle([]) })).toThrow(
			/not a VTT flood primitive/
		)
	})
})

describe('destroyFloodPrimitive', () => {
	it('removes and destroys the primitive and drops a pending ready listener', () => {
		const viewer = makeViewer()
		const primitive = createFloodPrimitive({
			viewer,
			mesh: makeMesh(),
			style: makeStyle([0, 0, 0, 0]),
		})
		updateFloodPrimitive({ viewer, primitive, style: makeStyle([0, 0, 0, 0]) })
		viewer.scene.requestRender.mockClear()

		destroyFloodPrimitive({ viewer, primitive })

		expect(viewer.scene.primitives.length).toBe(0)
		expect(primitive.isDestroyed()).toBe(true)
		expect(viewer.listeners.size).toBe(0)
		expect(floodPrimitiveMesh(primitive)).toBeUndefined()
		expect(viewer.scene.requestRender).toHaveBeenCalled()
	})
})
