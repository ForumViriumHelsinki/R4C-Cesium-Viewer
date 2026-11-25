/**
 * @file Tiles whose DataSource was removed by someone else are loaded again
 * @tag @unit
 *
 * Postal-code navigation (featurepicker, postalCodeLoader) and the view-mode
 * switch call `datasourceService.removeDataSourcesAndEntities()`, which removes
 * every DataSource on the viewer, the viewport building tiles included. The
 * loader kept those tiles in `loadedTiles`, so `loadMissingTiles` skipped them
 * and `updateTileVisibility` found no DataSource to show: the area stayed
 * without buildings until the page was reloaded.
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

const emptyCollection = () => ({ type: 'FeatureCollection', features: [] })

describe('ViewportBuildingLoader reconciles loadedTiles with the viewer', () => {
	let loader
	let loadLayer
	const rect = { west: 24.9005, south: 60.1005, east: 24.9395, north: 60.1395 }
	const camera = { lon: 24.92, lat: 60.101 }

	beforeEach(() => {
		dataSources.length = 0
		setActivePinia(createPinia())
		loader = new ViewportBuildingLoader()
		loadLayer = loader.unifiedLoader.loadLayer
		loadLayer.mockReset()
		loadLayer.mockImplementation(async () => featureCollection())
		loader.featureFlagStore = { isEnabled: () => false }
		loader.setHSYBuildingAttributes = vi.fn(async () => {})
		loader.fadeInDatasource = vi.fn(async (ds) => {
			ds.show = true
		})
		loader.viewer = makeViewer(rect, camera)
	})

	const coveredTiles = () => loader.getTilesInBounds(loader.expandBounds(rect, 0.2))

	it('reloads every tile after all DataSources were removed externally', async () => {
		await loader.updateViewport()
		await drain(loader)
		const covered = coveredTiles()
		expect(viewportDataSources()).toHaveLength(covered.length)

		// removeDataSourcesAndEntities() on postal-code navigation
		dataSources.length = 0

		await loader.updateViewport()
		await drain(loader)

		expect(viewportDataSources()).toHaveLength(covered.length)
		for (const key of covered) {
			const ds = dataSources.find((d) => d.name === `Buildings Viewport HSY ${key}`)
			expect(ds?.show).toBe(true)
		}
	})

	it('refetches only the tiles whose DataSource is gone', async () => {
		await loader.updateViewport()
		await drain(loader)
		const callsBefore = loadLayer.mock.calls.length

		const removed = viewportDataSources().slice(0, 2)
		for (const ds of removed) dataSources.splice(dataSources.indexOf(ds), 1)

		await loader.updateViewport()
		await drain(loader)

		expect(loadLayer.mock.calls.length - callsBefore).toBe(removed.length)
		expect(viewportDataSources()).toHaveLength(coveredTiles().length)
	})

	it('does not refetch tiles that loaded with no buildings', async () => {
		loadLayer.mockImplementation(async () => emptyCollection())
		await loader.updateViewport()
		await drain(loader)
		const callsBefore = loadLayer.mock.calls.length
		expect(callsBefore).toBe(coveredTiles().length)

		await loader.updateViewport()
		await drain(loader)

		expect(loadLayer.mock.calls.length).toBe(callsBefore)
	})
	it('reloads removed tiles without waiting for the next camera move', async () => {
		let onRemoved
		loader.viewer.dataSources = {
			dataSourceRemoved: {
				addEventListener: vi.fn((fn) => {
					onRemoved = fn
				}),
				removeEventListener: vi.fn(),
			},
		}
		const viewer = loader.viewer
		loader.viewer = null
		await loader.initialize(viewer)
		await drain(loader)
		const covered = coveredTiles()
		expect(viewportDataSources()).toHaveLength(covered.length)

		// removeDataSourcesAndEntities() fires dataSourceRemoved once per DataSource
		const removed = dataSources.splice(0)
		for (const ds of removed) onRemoved({}, ds)
		await drain(loader)

		expect(viewportDataSources()).toHaveLength(covered.length)
	})

	it('does not reload after its own evictions', async () => {
		await loader.updateViewport()
		await drain(loader)
		const callsBefore = loadLayer.mock.calls.length
		const key = coveredTiles()[0]

		await loader.unloadTile(key)
		loader.handleDataSourceRemoved({ name: `Buildings Viewport HSY ${key}` })
		await drain(loader)

		expect(loadLayer.mock.calls.length).toBe(callsBefore)
	})
})
