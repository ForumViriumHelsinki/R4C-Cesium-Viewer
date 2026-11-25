/**
 * @file Building tiles are styled before their DataSource joins the viewer
 * @tag @unit
 *
 * An attached DataSource's GeometryVisualizer listens to every entity's
 * definitionChanged and rebuilds the geometry batch on each frame in which an
 * entity changed. The loader used to add the DataSource first and then style
 * it in yielded batches, and to fade it in by assigning a new material to every
 * entity ten times. Measured under SwiftShader with the mock API, that was
 * about 22 Primitive builds per tile; styling before add and showing the tile
 * by `DataSource.show` takes it to 2 (fill and outline).
 *
 * These tests use real Cesium entities and count definitionChanged events,
 * other than isShowing, raised after the point where the DataSource would be
 * added.
 */

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const Cesium = await vi.importActual('cesium')

vi.mock('@/services/cesiumProvider', () => ({ getCesium: () => Cesium }))
vi.mock('@/services/cesiumProvider.js', () => ({ getCesium: () => Cesium }))
vi.mock('@/services/unifiedLoader.js', () => ({
	default: { loadLayer: vi.fn(), cancelLoading: vi.fn() },
}))
vi.mock('@/services/urbanheat.js', () => ({
	default: vi.fn(function () {
		this.getHeatData = vi.fn()
		this.mergeHeatWithBuildings = vi.fn(async () => {})
	}),
}))

/** Changes raised on the tile's entities after it was added to the viewer. */
let changesAfterAdd = 0
let addedDataSource = null

vi.mock('@/services/datasource.js', () => ({
	default: vi.fn(function () {
		this.addDataSourceWithPolygonFix = vi.fn(async (geojson, name, show, { beforeAdd } = {}) => {
			const ds = new Cesium.CustomDataSource(name)
			for (const feature of geojson.features) {
				ds.entities.add(
					new Cesium.Entity({
						id: feature.id,
						properties: feature.properties,
						polygon: {
							hierarchy: Cesium.Cartesian3.fromDegreesArray([
								24.9, 60.1, 24.91, 60.1, 24.91, 60.11,
							]),
						},
					})
				)
			}
			const entities = ds.entities.values
			if (beforeAdd) await beforeAdd(entities)
			// "Add to the viewer": from here on, a geometry change rebuilds the batch.
			// isShowing is the exception: the batch updates a show attribute for it.
			for (const entity of entities) {
				entity.definitionChanged.addEventListener((_entity, propertyName) => {
					if (propertyName !== 'isShowing') changesAfterAdd++
				})
			}
			ds.show = show
			addedDataSource = ds
			return entities
		})
		this.getDataSourceByName = vi.fn(() => addedDataSource)
		this.removeDataSourcesByNamePrefix = vi.fn(async () => {})
	}),
}))

const { default: ViewportBuildingLoader } = await import('@/services/viewportBuildingLoader.js')

const tile = (properties) => ({
	type: 'FeatureCollection',
	features: Array.from({ length: 60 }, (_, i) => ({
		type: 'Feature',
		id: `b${i}`,
		properties: properties(i),
		geometry: null,
	})),
})

describe('ViewportBuildingLoader styles tiles before they join the viewer', () => {
	let loader

	beforeEach(() => {
		setActivePinia(createPinia())
		changesAfterAdd = 0
		addedDataSource = null
		loader = new ViewportBuildingLoader()
		loader.viewer = { isDestroyed: () => false, scene: { requestRender: vi.fn() } }
	})

	it('HSY tile: heights and colours are set before add, none after', async () => {
		loader.toggleStore.helsinkiView = false
		const entities = await loader.processBuildings(
			tile((i) => ({ vtj_prt: `b${i}`, kerrosten_lkm: (i % 8) + 1, avgheatexposure: 0.5 })),
			'2490_6010'
		)

		const now = Cesium.JulianDate.now()
		expect(entities).toHaveLength(60)
		expect(entities[3].polygon.extrudedHeight.getValue(now)).toBeGreaterThan(0)
		expect(entities[3].polygon.material.color.getValue(now)).toEqual(
			new Cesium.Color(1, 0.5, 0, 0.7)
		)
		expect(changesAfterAdd).toBe(0)
	})

	it('Helsinki tile: heights and heat colours are set before add, none after', async () => {
		loader.toggleStore.helsinkiView = true
		const entities = await loader.processBuildings(
			tile((i) => ({ i_kerrlkm: 3, avgheatexposuretobuilding: 0.25 + (i % 2) * 0.5 })),
			'2490_6010'
		)

		const now = Cesium.JulianDate.now()
		expect(entities[0].polygon.extrudedHeight.getValue(now)).toBeGreaterThan(0)
		expect(entities[0].polygon.material.color.getValue(now).alpha).toBeCloseTo(0.25)
		expect(changesAfterAdd).toBe(0)
	})

	it('revealing a tile changes no entity definitions', async () => {
		loader.toggleStore.helsinkiView = false
		await loader.processBuildings(
			tile(() => ({ kerrosten_lkm: 2 })),
			'2490_6010'
		)
		expect(addedDataSource.show).toBe(false)

		loader.revealDatasource(addedDataSource)

		expect(addedDataSource.show).toBe(true)
		expect(loader.viewer.scene.requestRender).toHaveBeenCalled()
		expect(changesAfterAdd).toBe(0)
	})
})
