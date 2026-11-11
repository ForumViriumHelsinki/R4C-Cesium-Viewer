import { beforeEach, describe, expect, it, vi } from 'vitest'

// Real Cesium entity/property classes (tests/setup.js mocks `cesium` globally);
// nothing is rendered, so no WebGL is needed.
vi.mock('@/services/cesiumProvider.js', async () => {
	const Cesium = await vi.importActual('cesium')
	return { getCesium: () => Cesium }
})

const viewer = { scene: { requestRender: vi.fn() } }
vi.mock('@/stores/globalStore.js', () => ({
	useGlobalStore: () => ({ cesiumViewer: viewer }),
}))
vi.mock('@/stores/urlStore.js', () => ({ useURLStore: () => ({}) }))
vi.mock('@/utils/idle.js', () => ({ requestIdle: (cb) => cb() }))

const loadedEntities = { value: [] }
vi.mock('@/services/datasource.js', () => ({
	default: class {
		addDataSourceWithPolygonFix() {
			return Promise.resolve(loadedEntities.value)
		}
	},
}))

const Cesium = await vi.importActual('cesium')
const { default: Othernature } = await import('@/services/othernature.js')

/**
 * GeoJsonDataSource.load gives every polygon without a per-feature `fill`
 * the same ColorMaterialProperty instance (options.fillMaterialProperty).
 */
function makeEntities(categories) {
	const sharedMaterial = new Cesium.ColorMaterialProperty(Cesium.Color.WHITE)
	const entities = categories.map(
		(koodi) =>
			new Cesium.Entity({
				polygon: { hierarchy: [], material: sharedMaterial },
				properties: { koodi },
			})
	)
	return { sharedMaterial, entities }
}

const colorOf = (entity) => entity.polygon.material.color.getValue(Cesium.JulianDate.now())

describe('Othernature polygon colouring', () => {
	beforeEach(() => {
		viewer.scene.requestRender.mockClear()
	})

	it('colours each category independently when entities share one material', () => {
		const { sharedMaterial, entities } = makeEntities(['310', '410', '130'])
		const service = new Othernature()

		for (const entity of entities) {
			service.setOtherNaturePolygonMaterialColor(entity, entity.properties.koodi.getValue())
		}

		expect(colorOf(entities[0])).toEqual(Cesium.Color.LIGHTGREY.withAlpha(0.5))
		expect(colorOf(entities[1])).toEqual(Cesium.Color.SANDYBROWN.withAlpha(0.5))
		expect(colorOf(entities[2])).toEqual(Cesium.Color.ROSYBROWN.withAlpha(0.5))
		// The shared default material must not be mutated in place.
		expect(sharedMaterial.color.getValue(Cesium.JulianDate.now())).toEqual(Cesium.Color.WHITE)
	})

	it('raises the entity definitionChanged event so Cesium rebuilds the geometry', () => {
		const { entities } = makeEntities(['410'])
		const listener = vi.fn()
		entities[0].definitionChanged.addEventListener(listener)

		new Othernature().setOtherNaturePolygonMaterialColor(entities[0], '410')

		expect(listener).toHaveBeenCalled()
	})

	it('leaves the material untouched for an unknown category', () => {
		const { sharedMaterial, entities } = makeEntities(['999'])

		new Othernature().setOtherNaturePolygonMaterialColor(entities[0], '999')

		expect(entities[0].polygon.material).toBe(sharedMaterial)
	})

	it('requests one render after styling the loaded entities', async () => {
		loadedEntities.value = makeEntities(['310', '410']).entities

		await new Othernature().addOtherNatureDataSource({})

		expect(viewer.scene.requestRender).toHaveBeenCalledTimes(1)
		expect(colorOf(loadedEntities.value[1])).toEqual(Cesium.Color.SANDYBROWN.withAlpha(0.5))
	})
})
