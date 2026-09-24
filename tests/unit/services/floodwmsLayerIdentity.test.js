/**
 * Flood layer identity through Pinia (#1019).
 *
 * createFloodImageryLayer() pushed the Cesium ImageryLayer into
 * backgroundMapStore.floodLayers as-is. Pinia hands array elements back as
 * reactive proxies, and ImageryLayerCollection.contains()/remove() match by
 * identity (`this._layers.indexOf(layer)`), so removeFloodLayers() never found
 * the layer: switching scenarios stacked flood layers and "none" cleared
 * nothing. floodwms.test.js cannot see this, because it mocks the stores as
 * plain objects and `contains` as always true.
 *
 * Here the stores are real Pinia stores and the collection is Cesium's own
 * ImageryLayerCollection (with real ImageryLayer objects), so identity
 * behaves as it does in the app.
 */
import GeographicTilingScheme from '@cesium/engine/Source/Core/GeographicTilingScheme.js'
import ImageryLayerCollection from '@cesium/engine/Source/Scene/ImageryLayerCollection.js'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isProxy } from 'vue'
import { createFloodImageryLayer, removeFloodLayers } from '../../../src/services/floodwms.js'
import { useBackgroundMapStore } from '../../../src/stores/backgroundMapStore.js'
import { useGlobalStore } from '../../../src/stores/globalStore.js'

/**
 * Stand-in for WebMapServiceImageryProvider (no network). ImageryLayer's
 * constructor reads the provider's tilingScheme, so it gets the real
 * GeographicTilingScheme the service passes in.
 */
class FakeWmsProvider {
	constructor(options) {
		this.url = options.url
		this.layers = options.layers
		this.tilingScheme = options.tilingScheme
		this.errorEvent = { addEventListener: vi.fn(), removeEventListener: vi.fn() }
	}
}

vi.mock('../../../src/services/cesiumProvider.js', () => ({
	getCesium: () => ({
		WebMapServiceImageryProvider: FakeWmsProvider,
		GeographicTilingScheme,
	}),
}))

const SCENARIO_A = 'https://paikkatiedot.ymparisto.fi/geoserver/wms?SERVICE=WMS'
const SCENARIO_B = 'https://paikkatiedot.ymparisto.fi/geoserver/wms?SERVICE=WMS&v=2'

describe('flood layers through a real Pinia store and ImageryLayerCollection', () => {
	/** @type {ImageryLayerCollection} */
	let imageryLayers

	beforeEach(() => {
		setActivePinia(createPinia())
		imageryLayers = new ImageryLayerCollection()
		useGlobalStore().setCesiumViewer({ imageryLayers })
	})

	it('tracks the same ImageryLayer object the collection holds', async () => {
		await createFloodImageryLayer(SCENARIO_A, 'flood_a')

		const backgroundMapStore = useBackgroundMapStore()
		expect(imageryLayers.length).toBe(1)
		expect(backgroundMapStore.floodLayers).toHaveLength(1)
		expect(isProxy(backgroundMapStore.floodLayers[0])).toBe(false)
		expect(backgroundMapStore.floodLayers[0]).toBe(imageryLayers.get(0))
		expect(imageryLayers.contains(backgroundMapStore.floodLayers[0])).toBe(true)
	})

	it('switching scenarios leaves only the new layer, and "none" leaves none', async () => {
		// BackgroundMapBrowser: select a scenario, switch to another (remove, then add),
		// then clear the selection (remove).
		await createFloodImageryLayer(SCENARIO_A, 'flood_a')

		removeFloodLayers()
		await createFloodImageryLayer(SCENARIO_B, 'flood_b')
		expect(imageryLayers.length).toBe(1)
		expect(imageryLayers.get(0).imageryProvider.layers).toBe('flood_b')

		removeFloodLayers()
		expect(imageryLayers.length).toBe(0)
		expect(useBackgroundMapStore().floodLayers).toHaveLength(0)
	})
})
