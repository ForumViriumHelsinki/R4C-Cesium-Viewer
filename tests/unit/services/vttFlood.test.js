import { beforeEach, describe, expect, it, vi } from 'vitest'

// Cesium mock surfaces just enough API for renderFlood + clearFlood to exercise.
const ColorMock = vi.fn(function (r, g, b, a) {
	this.red = r ?? 1
	this.green = g ?? 1
	this.blue = b ?? 1
	this.alpha = a ?? 1
})
ColorMock.BLUE = new ColorMock(0, 0, 1, 1)
ColorMock.RED = new ColorMock(1, 0, 0, 1)
ColorMock.BLACK = new ColorMock(0, 0, 0, 1)
ColorMock.lerp = vi.fn((_a, _b, _r, result) => result ?? new ColorMock())

const Cartesian3Mock = {
	fromDegreesArray: vi.fn((arr) => arr.slice()),
}

const CustomDataSourceMock = vi.fn(function (name) {
	this.name = name
	const entities = []
	this.entities = {
		add: vi.fn((entity) => {
			entities.push(entity)
			return entity
		}),
		values: entities,
	}
})

vi.mock('@/services/cesiumProvider.js', () => ({
	getCesium: () => ({
		Color: ColorMock,
		Cartesian3: Cartesian3Mock,
		CustomDataSource: CustomDataSourceMock,
		ArcType: { GEODESIC: 'GEODESIC' },
	}),
}))

import { VTT_FLOOD_LAYER_NAME } from '@/constants/vttFlood.ts'
import { clearFlood, fetchSimulationFrame, renderFlood } from '@/services/vttFlood.js'

function makeViewer() {
	const sources = []
	return {
		isDestroyed: () => false,
		dataSources: {
			_dataSources: sources,
			// Production clearFlood() iterates via the public DataSourceCollection API
			// (length + get(i)); back both with the same sources array.
			get length() {
				return sources.length
			},
			get: (i) => sources[i],
			add: vi.fn((ds) => {
				sources.push(ds)
				return ds
			}),
			remove: vi.fn((ds) => {
				const i = sources.indexOf(ds)
				if (i >= 0) sources.splice(i, 1)
				return true
			}),
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

const SAMPLE_RING = [
	[25.04, 60.18],
	[25.041, 60.18],
	[25.041, 60.181],
	[25.04, 60.181],
	[25.04, 60.18],
]

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

	it('returns features and computed propertyRanges on success', async () => {
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
					SAMPLE_RING
				),
			],
		}
		vi.spyOn(global, 'fetch').mockResolvedValue(
			new Response(JSON.stringify(payload), { status: 200 })
		)

		const result = await fetchSimulationFrame({ scenarioId: '1', frameNumber: 12 })
		expect(result.features).toHaveLength(2)
		expect(result.propertyRanges.canopy_air_temperature).toEqual({ min: 290, max: 295 })
		expect(result.propertyRanges.overland_water_depth).toEqual({ min: 0.1, max: 0.4 })
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

	it('propagates AbortError', async () => {
		vi.spyOn(global, 'fetch').mockImplementation(() =>
			Promise.reject(Object.assign(new DOMException('aborted', 'AbortError')))
		)
		await expect(fetchSimulationFrame({ scenarioId: '1', frameNumber: 0 })).rejects.toMatchObject({
			name: 'AbortError',
		})
	})
})

describe('renderFlood', () => {
	beforeEach(() => {
		CustomDataSourceMock.mockClear()
		ColorMock.lerp.mockClear()
	})

	it('produces the expected entity count for a small fixture', async () => {
		const viewer = makeViewer()
		const frame = {
			features: [
				makeFeature({ overland_water_depth: 0.1 }, SAMPLE_RING),
				makeFeature({ overland_water_depth: 0.5 }, SAMPLE_RING),
				makeFeature({ overland_water_depth: 1.0 }, SAMPLE_RING),
			],
			propertyRanges: {
				canopy_air_temperature: { min: 0, max: 0 },
				overland_water_depth: { min: 0.1, max: 1.0 },
				transpiration: { min: 0, max: 0 },
				upper_storage_water_depth: { min: 0, max: 0 },
			},
		}
		const created = await renderFlood({ viewer, frame, dimension: 'overland_water_depth' })
		expect(created).toBe(3)
		expect(viewer.dataSources._dataSources).toHaveLength(1)
		expect(viewer.dataSources._dataSources[0].name).toBe(VTT_FLOOD_LAYER_NAME)
	})

	it('handles empty features without crashing', async () => {
		const viewer = makeViewer()
		const frame = {
			features: [],
			propertyRanges: {
				canopy_air_temperature: { min: 0, max: 0 },
				overland_water_depth: { min: 0, max: 0 },
				transpiration: { min: 0, max: 0 },
				upper_storage_water_depth: { min: 0, max: 0 },
			},
		}
		const created = await renderFlood({ viewer, frame, dimension: 'overland_water_depth' })
		expect(created).toBe(0)
	})

	it('throws on unknown dimension', async () => {
		const viewer = makeViewer()
		const frame = { features: [], propertyRanges: {} }
		await expect(renderFlood({ viewer, frame, dimension: 'not_a_real_dimension' })).rejects.toThrow(
			/Invalid VTT dimension/
		)
	})

	it('skips features with non-numeric values silently', async () => {
		const viewer = makeViewer()
		const frame = {
			features: [
				makeFeature({ overland_water_depth: 0.5 }, SAMPLE_RING),
				makeFeature({ overland_water_depth: 'oops' }, SAMPLE_RING),
				makeFeature({ overland_water_depth: NaN }, SAMPLE_RING),
			],
			propertyRanges: {
				canopy_air_temperature: { min: 0, max: 0 },
				overland_water_depth: { min: 0.5, max: 0.5 },
				transpiration: { min: 0, max: 0 },
				upper_storage_water_depth: { min: 0, max: 0 },
			},
		}
		const created = await renderFlood({ viewer, frame, dimension: 'overland_water_depth' })
		expect(created).toBe(1)
	})
})

describe('clearFlood', () => {
	it('removes only the VTT flood layer', async () => {
		const viewer = makeViewer()
		viewer.dataSources._dataSources.push({ name: VTT_FLOOD_LAYER_NAME })
		viewer.dataSources._dataSources.push({ name: 'Buildings 00100' })
		await clearFlood({ viewer })
		expect(viewer.dataSources.remove).toHaveBeenCalledTimes(1)
	})

	it('is safe on a destroyed viewer', async () => {
		await expect(clearFlood({ viewer: null })).resolves.toBeUndefined()
		await expect(clearFlood({ viewer: { isDestroyed: () => true } })).resolves.toBeUndefined()
	})
})
