/**
 * @file The building tile working set stays bounded by MAX_LOADED_TILES (#1054)
 * @tag @unit
 *
 * With a static camera the loader used to keep adding building DataSources
 * well past the 50-tile cap: every tile in the buffered viewport rectangle
 * counted as "required" and was never evictable, eviction ran before the loads
 * it had just started completed, and each viewport update re-queued every
 * missing tile on top of the queue it already had. A pitched camera's view
 * rectangle reaches towards the horizon, so the required set ran to hundreds of
 * tiles (and to 122,694 at pitch -20 from 1,500 m).
 *
 * These tests drive `updateViewport()` against an in-memory DataSource
 * collection and assert on the number of DataSources the loader leaves behind.
 */

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ViewportBuildingLoader from '@/services/viewportBuildingLoader.js'

vi.mock('@/services/unifiedLoader.js', () => ({
	default: { loadLayer: vi.fn(), cancelLoading: vi.fn() },
}))

// In-memory stand-in for the viewer's DataSourceCollection, keyed the same way
// as the real service: add replaces by name, remove matches by name prefix.
const dataSources = []
vi.mock('@/services/datasource.js', () => ({
	default: vi.fn(function () {
		this.addDataSourceWithPolygonFix = vi.fn(async (geojson, name, show) => {
			const ds = { name, show, entities: { values: geojson.features.map(() => ({})) } }
			dataSources.push(ds)
			return ds.entities.values
		})
		this.getDataSourceByName = vi.fn((name) => dataSources.find((ds) => ds.name === name))
		this.removeDataSourcesByNamePrefix = vi.fn(async (prefix) => {
			for (let i = dataSources.length - 1; i >= 0; i--) {
				if (dataSources[i].name.startsWith(prefix)) dataSources.splice(i, 1)
			}
		})
	}),
}))

vi.mock('@/services/urbanheat.js', () => ({
	default: vi.fn(function () {
		this.getHeatData = vi.fn()
		this.mergeHeatWithBuildings = vi.fn()
	}),
}))

const cesiumMock = {
	Rectangle: class {},
	Cartesian2: class {
		constructor(x, y) {
			this.x = x
			this.y = y
		}
	},
	// The test viewer's pickEllipsoid returns a cartographic in radians already.
	Cartographic: { fromCartesian: (position) => position },
	Math: {
		toDegrees: (radians) => (radians * 180) / Math.PI,
		toRadians: (degrees) => (degrees * Math.PI) / 180,
	},
}
vi.mock('@/services/cesiumProvider', () => ({ getCesium: () => cesiumMock }))

const MAX_LOADED_TILES = 50
const rad = (deg) => (deg * Math.PI) / 180

/**
 * Viewer whose view rectangle and camera position the test can move.
 * @param {{west: number, south: number, east: number, north: number}} rect - degrees
 * @param {{lon: number, lat: number}} camera - degrees
 */
function makeViewer(rect, camera) {
	const viewer = {
		isDestroyed: () => false,
		scene: {
			globe: { ellipsoid: {} },
			canvas: { clientWidth: 1600, clientHeight: 1000 },
			requestRender: vi.fn(),
		},
		camera: {
			moveEnd: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
			positionCartographic: { longitude: 0, latitude: 0, height: 1500 },
			computeViewRectangle: vi.fn(),
			// Default: the centre ray misses, so ranking uses the camera position.
			pickEllipsoid: vi.fn(() => undefined),
		},
	}
	viewer.lookAt = (r, c) => {
		viewer.camera.computeViewRectangle.mockReturnValue({
			west: rad(r.west),
			south: rad(r.south),
			east: rad(r.east),
			north: rad(r.north),
		})
		viewer.camera.positionCartographic = {
			longitude: rad(c.lon),
			latitude: rad(c.lat),
			height: 1500,
		}
	}
	viewer.lookAt(rect, camera)
	return viewer
}

const featureCollection = () => ({
	type: 'FeatureCollection',
	features: [{ type: 'Feature', id: 'b', properties: {}, geometry: null }],
})

/** Let queued tile loads run until the loader is idle. */
async function drain(loader) {
	for (let i = 0; i < 2000; i++) {
		if (loader.activeLoads === 0 && loader.loadingQueue.length === 0) break
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
	// Let trailing eviction promises settle.
	for (let i = 0; i < 20; i++) await new Promise((resolve) => setTimeout(resolve, 0))
}

const viewportDataSources = () =>
	dataSources.filter((ds) => ds.name.startsWith('Buildings Viewport'))

describe('ViewportBuildingLoader tile cap (#1054)', () => {
	let loader
	let loadLayer

	beforeEach(() => {
		dataSources.length = 0
		setActivePinia(createPinia())
		loader = new ViewportBuildingLoader()
		loadLayer = loader.unifiedLoader.loadLayer
		loadLayer.mockReset()
		loadLayer.mockImplementation(async () => featureCollection())
		// Prefetch is a separate cache-only path; keep it out of the count.
		loader.featureFlagStore = { isEnabled: () => false }
		// Styling and the fade-in animation are not under test.
		loader.setHSYBuildingAttributes = vi.fn(async () => {})
		loader.fadeInDatasource = vi.fn(async (ds) => {
			ds.show = true
		})
	})

	it('loads at most MAX_LOADED_TILES tiles when the viewport covers more', async () => {
		// A pitched camera's view rectangle: 0.2° x 0.1°, about 20 x 10 tiles
		// before the 20% buffer.
		const rect = { west: 24.85, south: 60.15, east: 25.05, north: 60.25 }
		loader.viewer = makeViewer(rect, { lon: 24.95, lat: 60.151 })
		const covered = loader.getTilesInBounds(loader.expandBounds(rect, 0.2))
		expect(covered.length).toBeGreaterThan(MAX_LOADED_TILES)

		await loader.updateViewport()
		await drain(loader)

		expect(loadLayer.mock.calls.length).toBeLessThanOrEqual(MAX_LOADED_TILES)
		expect(loader.loadedTiles.size).toBeLessThanOrEqual(MAX_LOADED_TILES)
		expect(viewportDataSources().length).toBeLessThanOrEqual(MAX_LOADED_TILES)
	})

	it('keeps the tiles nearest the camera when it has to drop some', async () => {
		const rect = { west: 24.85, south: 60.15, east: 25.05, north: 60.25 }
		const camera = { lon: 24.955, lat: 60.155 }
		loader.viewer = makeViewer(rect, camera)

		await loader.updateViewport()
		await drain(loader)

		const cameraTile = `${Math.floor(camera.lon / 0.01)}_${Math.floor(camera.lat / 0.01)}`
		const farCornerTile = `${Math.floor(25.05 / 0.01)}_${Math.floor(60.25 / 0.01)}`
		expect(loader.loadedTiles.has(cameraTile)).toBe(true)
		expect(loader.loadedTiles.has(farCornerTile)).toBe(false)
	})

	it('ranks around the ground point under the screen centre when a pitched camera sees it', async () => {
		// The camera sits at the south edge; the screen centre looks north at 60.22.
		const rect = { west: 24.85, south: 60.15, east: 25.05, north: 60.25 }
		loader.viewer = makeViewer(rect, { lon: 24.955, lat: 60.151 })
		const centre = { lon: 24.955, lat: 60.225 }
		loader.viewer.camera.pickEllipsoid.mockReturnValue({
			longitude: rad(centre.lon),
			latitude: rad(centre.lat),
		})

		await loader.updateViewport()
		await drain(loader)

		const centreTile = `${Math.floor(centre.lon / 0.01)}_${Math.floor(centre.lat / 0.01)}`
		const belowCameraTile = `${Math.floor(24.955 / 0.01)}_${Math.floor(60.151 / 0.01)}`
		expect(loader.loadedTiles.has(centreTile)).toBe(true)
		expect(loader.loadedTiles.has(belowCameraTile)).toBe(false)
	})

	it('evicts down to the cap after loads that finish once the viewport update has returned', async () => {
		// The camera was elsewhere before: 50 tiles loaded far to the west.
		for (let i = 0; i < MAX_LOADED_TILES; i++) {
			const key = `${2400 + i}_6000`
			loader.loadedTiles.set(key, { bounds: {}, entityCount: 1, loadedAt: i })
			dataSources.push({ name: `Buildings Viewport HSY ${key}`, show: false, entities: {} })
		}

		// A viewport that needs fewer tiles than the cap, so capping alone
		// cannot bring the total back under it.
		const rect = { west: 24.9005, south: 60.1005, east: 24.9395, north: 60.1395 }
		loader.viewer = makeViewer(rect, { lon: 24.92, lat: 60.101 })
		const covered = loader.getTilesInBounds(loader.expandBounds(rect, 0.2))
		expect(covered.length).toBeLessThan(MAX_LOADED_TILES)

		await loader.updateViewport()
		await drain(loader)

		for (const key of covered) expect(loader.loadedTiles.has(key)).toBe(true)
		expect(loader.loadedTiles.size).toBeLessThanOrEqual(MAX_LOADED_TILES)
		expect(viewportDataSources().length).toBeLessThanOrEqual(MAX_LOADED_TILES)
		// Every DataSource left behind belongs to a tile the loader still tracks.
		for (const ds of viewportDataSources()) {
			expect(loader.loadedTiles.has(ds.name.replace('Buildings Viewport HSY ', ''))).toBe(true)
		}
	})

	it('does not queue a tile twice when the viewport updates while loads are pending', async () => {
		loadLayer.mockImplementation(() => new Promise(() => {}))
		const rect = { west: 24.9005, south: 60.1005, east: 24.9395, north: 60.1395 }
		loader.viewer = makeViewer(rect, { lon: 24.92, lat: 60.101 })
		const covered = loader.getTilesInBounds(loader.expandBounds(rect, 0.2))

		await loader.updateViewport()
		await loader.updateViewport()

		expect(new Set(loader.loadingQueue).size).toBe(loader.loadingQueue.length)
		expect(loader.loadingQueue.length + loader.loadingTiles.size).toBe(covered.length)
	})

	it('drops tiles queued for a viewport the camera has left', async () => {
		loadLayer.mockImplementation(() => new Promise(() => {}))
		const first = { west: 24.9005, south: 60.1005, east: 24.9395, north: 60.1395 }
		loader.viewer = makeViewer(first, { lon: 24.92, lat: 60.101 })
		await loader.updateViewport()

		const second = { west: 25.2005, south: 60.2005, east: 25.2395, north: 60.2395 }
		loader.viewer.lookAt(second, { lon: 25.22, lat: 60.201 })
		await loader.updateViewport()

		const secondTiles = new Set(loader.getTilesInBounds(loader.expandBounds(second, 0.2)))
		expect(loader.loadingQueue.length).toBeGreaterThan(0)
		for (const key of loader.loadingQueue) expect(secondTiles.has(key)).toBe(true)
	})
})
