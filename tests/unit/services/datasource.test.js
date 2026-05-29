import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DataSource from '@/services/datasource.js'

// Mock fetch globally
global.fetch = vi.fn()

// Mock the Cesium provider so getCesium() returns a stub.
// GeoJsonDataSource.load is the only Cesium API exercised here.
const geoJsonLoad = vi.fn()
vi.mock('@/services/cesiumProvider.js', () => ({
	getCesium: () => ({
		GeoJsonDataSource: {
			load: geoJsonLoad,
		},
		Color: class Color {
			constructor(r, g, b, a) {
				this.r = r
				this.g = g
				this.b = b
				this.a = a
			}
			static BLACK = 'BLACK'
		},
	}),
}))

// Mock global store: provide a viewer with a data source collection.
const dataSourcesAdd = vi.fn()
vi.mock('@/stores/globalStore.js', () => ({
	useGlobalStore: vi.fn(() => ({
		cesiumViewer: {
			dataSources: {
				add: dataSourcesAdd,
				_dataSources: [],
			},
		},
	})),
}))

// Helper to build a fetch Response-like stub.
function mockResponse({ ok = true, status = 200, contentType, body }) {
	return {
		ok,
		status,
		headers: {
			get: (name) => (name.toLowerCase() === 'content-type' ? contentType : null),
		},
		json: vi.fn().mockResolvedValue(body),
	}
}

describe(
	'DataSource Service - loadGeoJsonDataSource content-type guard',
	{ tags: ['@unit', '@datasource'] },
	() => {
		let dataSource

		beforeEach(() => {
			setActivePinia(createPinia())
			vi.clearAllMocks()
			global.fetch.mockClear()
			geoJsonLoad.mockReset()
			dataSourcesAdd.mockReset()
			vi.spyOn(console, 'warn').mockImplementation(() => {})
			vi.spyOn(console, 'error').mockImplementation(() => {})

			dataSource = new DataSource()
		})

		afterEach(() => {
			vi.restoreAllMocks()
		})

		it('returns [] without throwing when the response is HTML (oauth2 sign_out catch-all)', async () => {
			// Arrange: oauth2-proxy serves a logout HTML page with a 200 OK for the
			// relative asset request, exactly the #807 reproduction.
			global.fetch.mockResolvedValue(
				mockResponse({
					ok: true,
					status: 200,
					contentType: 'text/html; charset=utf-8',
					body: '<!doctype html><html><body>Sign out</body></html>',
				})
			)

			// Act
			const result = await dataSource.loadGeoJsonDataSource(
				0.5,
				'./assets/data/hsy_po.json',
				'PostCodes'
			)

			// Assert: graceful no-op, no SyntaxError reaching Cesium
			expect(result).toEqual([])
			expect(geoJsonLoad).not.toHaveBeenCalled()
			expect(dataSourcesAdd).not.toHaveBeenCalled()
		})

		it('only warns once for repeated non-JSON responses', async () => {
			global.fetch.mockResolvedValue(
				mockResponse({
					ok: true,
					status: 200,
					contentType: 'text/html',
					body: '<!doctype html>',
				})
			)

			await dataSource.loadGeoJsonDataSource(0.5, './a.json', 'A')
			await dataSource.loadGeoJsonDataSource(0.5, './b.json', 'B')

			expect(console.warn).toHaveBeenCalledTimes(1)
		})

		it('returns [] when the fetch is not ok', async () => {
			global.fetch.mockResolvedValue(
				mockResponse({
					ok: false,
					status: 502,
					contentType: 'text/html',
					body: '',
				})
			)

			const result = await dataSource.loadGeoJsonDataSource(0.5, './a.json', 'A')

			expect(result).toEqual([])
			expect(geoJsonLoad).not.toHaveBeenCalled()
		})

		it('loads the parsed GeoJSON on the happy path (application/json)', async () => {
			// Arrange
			const geojson = {
				type: 'FeatureCollection',
				features: [{ type: 'Feature', properties: { id: 1 } }],
			}
			global.fetch.mockResolvedValue(
				mockResponse({
					ok: true,
					status: 200,
					contentType: 'application/json',
					body: geojson,
				})
			)
			const entities = [{ id: 'entity-1' }]
			geoJsonLoad.mockResolvedValue({
				name: '',
				entities: { values: entities },
			})

			// Act
			const result = await dataSource.loadGeoJsonDataSource(
				0.5,
				'./assets/data/hsy_po.json',
				'PostCodes'
			)

			// Assert: parsed object handed to Cesium, data source added, entities returned
			expect(geoJsonLoad).toHaveBeenCalledTimes(1)
			expect(geoJsonLoad.mock.calls[0][0]).toEqual(geojson)
			expect(dataSourcesAdd).toHaveBeenCalledTimes(1)
			expect(result).toBe(entities)
		})
	}
)
