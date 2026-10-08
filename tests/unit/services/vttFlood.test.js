import { beforeEach, describe, expect, it, vi } from 'vitest'

// Real Cesium geometry classes (tests/setup.js mocks `cesium` globally); the
// layer is never rendered here, so no WebGL is needed.
vi.mock('@/services/cesiumProvider.js', async () => {
	const Cesium = await vi.importActual('cesium')
	return { getCesium: () => Cesium }
})

import { VTT_DEFAULT_OPACITY, VTT_FLOOD_LAYER_NAME } from '@/constants/vttFlood.ts'
import {
	clearFlood,
	compactFrame,
	fetchSimulationFrame,
	hideFlood,
	internMesh,
	meshesEqual,
	renderFlood,
} from '@/services/vttFlood.js'
import { findFloodPrimitives } from '@/services/vttFloodPrimitive.js'
import { buildColorScale } from '@/utils/vttFloodColorScale.js'

function makeViewer() {
	const list = []
	return {
		isDestroyed: () => false,
		scene: {
			requestRender: vi.fn(),
			postRender: { addEventListener: vi.fn(() => () => {}) },
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
					p.destroy?.()
					return true
				}),
			},
		},
	}
}

function makeFeature(props, ring) {
	return {
		type: 'Feature',
		geometry: { type: 'Polygon', coordinates: [ring] },
		properties: props,
	}
}

function cellRing(col) {
	const w = 25.04 + col * 0.001
	return [
		[w, 60.16],
		[w + 0.001, 60.16],
		[w + 0.001, 60.161],
		[w, 60.161],
		[w, 60.16],
	]
}

/** Compact frame of `depths.length` cells along a row, overland depth only. */
function depthFrame(depths) {
	return compactFrame(depths.map((d, i) => makeFeature({ overland_water_depth: d }, cellRing(i))))
}

const SAMPLE_RING = cellRing(0)

describe('fetchSimulationFrame', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
	})

	it('rejects invalid scenario id without firing a network request', async () => {
		const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}'))
		await expect(fetchSimulationFrame({ scenarioId: '9', frameNumber: 0 })).rejects.toThrow(
			/Invalid VTT scenario/
		)
		expect(fetchSpy).not.toHaveBeenCalled()
	})

	it('rejects out-of-range frame number', async () => {
		const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}'))
		await expect(fetchSimulationFrame({ scenarioId: '1', frameNumber: -1 })).rejects.toThrow(
			/Invalid VTT frame/
		)
		expect(fetchSpy).not.toHaveBeenCalled()
	})

	it('returns the frame as typed arrays in feature order', async () => {
		const payload = {
			type: 'FeatureCollection',
			features: [
				makeFeature(
					{
						canopy_air_temperature: 290,
						overland_water_depth: 0.1,
						transpiration: 0.5,
						upper_storage_water_depth: 0.05,
					},
					SAMPLE_RING
				),
				makeFeature(
					{
						canopy_air_temperature: 295,
						overland_water_depth: 0.4,
						transpiration: 0.7,
						upper_storage_water_depth: 0.08,
					},
					cellRing(1)
				),
			],
		}
		vi.spyOn(global, 'fetch').mockResolvedValue(
			new Response(JSON.stringify(payload), { status: 200 })
		)

		const result = await fetchSimulationFrame({ scenarioId: '1', frameNumber: 12 })
		expect(result.mesh.cellCount).toBe(2)
		expect(result.values.canopy_air_temperature).toBeInstanceOf(Float32Array)
		expect(Array.from(result.values.canopy_air_temperature)).toEqual([290, 295])
		expect(Array.from(result.values.overland_water_depth)).toEqual([
			Math.fround(0.1),
			Math.fround(0.4),
		])
		expect(result).not.toHaveProperty('features')
	})

	it('throws on non-2xx response', async () => {
		vi.spyOn(global, 'fetch').mockResolvedValue(new Response('error', { status: 500 }))
		await expect(fetchSimulationFrame({ scenarioId: '1', frameNumber: 0 })).rejects.toThrow(/500/)
	})

	it('throws on malformed payload (missing features[])', async () => {
		vi.spyOn(global, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ type: 'FeatureCollection' }), { status: 200 })
		)
		await expect(fetchSimulationFrame({ scenarioId: '1', frameNumber: 0 })).rejects.toThrow(
			/malformed/
		)
	})

	it('returns a synthetic frame without a network request when synthetic is set', async () => {
		// restoreAllMocks does not clear call history of a re-spied global, so
		// clear it explicitly — earlier tests in this block call fetch.
		const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}'))
		fetchSpy.mockClear()
		const result = await fetchSimulationFrame({ scenarioId: '1', frameNumber: 12, synthetic: true })
		expect(fetchSpy).not.toHaveBeenCalled()
		expect(result.mesh.cellCount).toBeGreaterThan(0)
		const depths = Array.from(result.values.overland_water_depth)
		expect(Math.max(...depths)).toBeGreaterThan(Math.min(...depths))
	})

	it('propagates AbortError', async () => {
		vi.spyOn(global, 'fetch').mockImplementation(() =>
			Promise.reject(Object.assign(new DOMException('aborted', 'AbortError')))
		)
		await expect(fetchSimulationFrame({ scenarioId: '1', frameNumber: 0 })).rejects.toMatchObject({
			name: 'AbortError',
		})
	})
})

describe('compactFrame', () => {
	it('keeps each ring without its closing vertex and marks non-numeric values NaN', () => {
		const frame = compactFrame([
			makeFeature({ transpiration: 0.2 }, SAMPLE_RING),
			makeFeature({ transpiration: 'oops' }, cellRing(1)),
			{ type: 'Feature', geometry: null, properties: { transpiration: 0.3 } },
		])
		expect(Array.from(frame.mesh.offsets)).toEqual([0, 4, 8, 8])
		expect(Array.from(frame.mesh.coords.slice(0, 8))).toEqual(SAMPLE_RING.slice(0, 4).flat())
		expect(frame.values.transpiration[0]).toBeCloseTo(0.2)
		expect(Number.isNaN(frame.values.transpiration[1])).toBe(true)
		expect(frame.values.transpiration[2]).toBeCloseTo(0.3)
	})

	it('accepts a bare ring as well as Polygon coordinates', () => {
		const frame = compactFrame([
			{ type: 'Feature', geometry: { coordinates: SAMPLE_RING }, properties: {} },
		])
		expect(Array.from(frame.mesh.offsets)).toEqual([0, 4])
	})
})

describe('internMesh', () => {
	it('shares an equal mesh and keeps a different one', () => {
		const a = depthFrame([0.1, 0.2])
		const b = depthFrame([0.3, 0.4])
		const c = depthFrame([0.3, 0.4, 0.5])
		expect(meshesEqual(a.mesh, b.mesh)).toBe(true)
		expect(internMesh(b, a.mesh).mesh).toBe(a.mesh)
		expect(internMesh(b, a.mesh).values).toBe(b.values)
		expect(internMesh(c, a.mesh).mesh).toBe(c.mesh)
		expect(internMesh(b, null)).toBe(b)
	})
})

describe('renderFlood', () => {
	it('builds one flood layer and requests a render (requestRenderMode is on)', () => {
		const viewer = makeViewer()
		const { shown } = renderFlood({
			viewer,
			frame: depthFrame([0.1, 0.5, 1.0]),
			dimension: 'overland_water_depth',
		})
		expect(shown).toBe(3)
		expect(findFloodPrimitives(viewer)).toHaveLength(1)
		expect(viewer.scene.requestRender).toHaveBeenCalled()
	})

	it('builds the geometry once across repeated frame, dimension and opacity changes', () => {
		const viewer = makeViewer()
		const first = depthFrame([0.1, 0.5, 1.0])
		for (let n = 0; n < 5; n++) {
			const next = internMesh(depthFrame([0.02 * n, 0.3, 0.6 + n]), first.mesh)
			renderFlood({ viewer, frame: next, dimension: 'overland_water_depth', opacity: 0.2 + n / 10 })
			renderFlood({ viewer, frame: next, dimension: 'transpiration' })
		}
		expect(viewer.scene.primitives.add).toHaveBeenCalledTimes(1)
		expect(findFloodPrimitives(viewer)).toHaveLength(1)
	})

	it('rebuilds when the mesh changes, leaving exactly one layer', () => {
		const viewer = makeViewer()
		renderFlood({ viewer, frame: depthFrame([0.1, 0.5]), dimension: 'overland_water_depth' })
		const [old] = findFloodPrimitives(viewer)
		renderFlood({ viewer, frame: depthFrame([0.1, 0.5, 0.9]), dimension: 'overland_water_depth' })

		expect(old.isDestroyed()).toBe(true)
		expect(findFloodPrimitives(viewer)).toHaveLength(1)
	})

	it('never leaves two layers when renders interleave', async () => {
		const viewer = makeViewer()
		// Two watcher runs racing in the same microtask checkpoint, each with a
		// frame that has its own (unshared) mesh.
		await Promise.all([
			Promise.resolve().then(() =>
				renderFlood({ viewer, frame: depthFrame([0.1, 0.5]), dimension: 'overland_water_depth' })
			),
			Promise.resolve().then(() =>
				renderFlood({ viewer, frame: depthFrame([0.2, 0.6]), dimension: 'overland_water_depth' })
			),
		])
		expect(findFloodPrimitives(viewer)).toHaveLength(1)
		expect(viewer.scene.primitives.length).toBe(1)
	})

	it('removes a stray second flood layer', () => {
		const viewer = makeViewer()
		const frame = depthFrame([0.1, 0.5])
		renderFlood({ viewer, frame, dimension: 'overland_water_depth' })
		const [layer] = findFloodPrimitives(viewer)
		// A second layer left behind, e.g. by a hot module reload.
		const stray = Object.defineProperty({ destroy: vi.fn() }, 'vttLayerName', {
			value: VTT_FLOOD_LAYER_NAME,
		})
		viewer.scene.primitives.list.push(stray)

		renderFlood({ viewer, frame, dimension: 'overland_water_depth' })

		expect(findFloodPrimitives(viewer)).toEqual([layer])
		expect(stray.destroy).toHaveBeenCalled()
	})

	it('hides the layer for a frame with nothing to draw', () => {
		const viewer = makeViewer()
		const frame = compactFrame([0, 1, 2].map((i) => makeFeature({ transpiration: 0 }, cellRing(i))))
		const { shown, scale } = renderFlood({ viewer, frame, dimension: 'transpiration' })
		expect(shown).toBe(0)
		expect(scale.mode).toBe('empty')
		expect(findFloodPrimitives(viewer)[0].show).toBe(false)
	})

	it('uses the scale it is given, so the legend and the layer agree', () => {
		const viewer = makeViewer()
		const frame = depthFrame([0.02, 0.4, 1.2])
		const scale = buildColorScale(
			{
				key: 'overland_water_depth',
				hideBelow: 0.01,
				palette: 'YlGnBu',
				scale: { kind: 'fixed', breaks: [0.01, 1] },
			},
			frame.values.overland_water_depth
		)
		const result = renderFlood({ viewer, frame, dimension: 'overland_water_depth', scale })
		expect(result.scale).toBe(scale)
		const [primitive] = findFloodPrimitives(viewer)
		const alpha = Math.round(VTT_DEFAULT_OPACITY * 255)
		const colors = primitive.geometryInstances.map((g) => Array.from(g.attributes.color.value))
		expect(colors[0]).toEqual([...scale.classes[0].rgb, alpha])
		expect(colors[2]).toEqual([...scale.classes[1].rgb, alpha])
	})

	it('hides dry and sub-threshold cells', () => {
		const viewer = makeViewer()
		const { shown, scale } = renderFlood({
			viewer,
			frame: depthFrame([0, 0.001, 0.02, 0.4]),
			dimension: 'overland_water_depth',
		})
		expect(shown).toBe(2)
		expect(scale.hiddenCount).toBe(2)
		const [primitive] = findFloodPrimitives(viewer)
		const show = primitive.geometryInstances.map((g) => g.attributes.show.value[0])
		expect(show).toEqual([0, 0, 1, 1])
	})

	it('throws on unknown dimension', () => {
		const viewer = makeViewer()
		expect(() =>
			renderFlood({ viewer, frame: depthFrame([0.1]), dimension: 'not_a_real_dimension' })
		).toThrow(/Invalid VTT dimension/)
	})

	it('skips a missing viewer or frame', () => {
		const frame = depthFrame([0.1])
		expect(renderFlood({ viewer: null, frame, dimension: 'transpiration' })).toEqual({
			shown: 0,
			scale: null,
		})
		expect(renderFlood({ viewer: makeViewer(), frame: null, dimension: 'transpiration' })).toEqual({
			shown: 0,
			scale: null,
		})
	})
})

describe('hideFlood', () => {
	it('hides the layer without destroying it', () => {
		const viewer = makeViewer()
		renderFlood({ viewer, frame: depthFrame([0.1, 0.5]), dimension: 'overland_water_depth' })
		const [primitive] = findFloodPrimitives(viewer)
		hideFlood({ viewer })
		expect(primitive.show).toBe(false)
		expect(primitive.isDestroyed()).toBe(false)
	})
})

describe('clearFlood', () => {
	it('removes and destroys only the VTT flood layer', () => {
		const viewer = makeViewer()
		const other = { destroy: vi.fn() }
		viewer.scene.primitives.list.push(other)
		renderFlood({ viewer, frame: depthFrame([0.1, 0.5]), dimension: 'overland_water_depth' })
		const [primitive] = findFloodPrimitives(viewer)
		viewer.scene.requestRender.mockClear()

		clearFlood({ viewer })

		expect(viewer.scene.primitives.list).toEqual([other])
		expect(primitive.isDestroyed()).toBe(true)
		expect(other.destroy).not.toHaveBeenCalled()
		expect(viewer.scene.requestRender).toHaveBeenCalled()
	})

	it('is safe on a destroyed viewer', () => {
		expect(() => clearFlood({ viewer: null })).not.toThrow()
		expect(() => clearFlood({ viewer: { isDestroyed: () => true } })).not.toThrow()
	})
})
