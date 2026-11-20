/**
 * The layer-failure channel with the real loaders between the component and the
 * network (#1152). Tests that mocked the Tree class and changeTIFF into rejecting
 * passed while the real loaders swallowed every failure: Tree.loadTrees counted
 * loadLayers' `{ error }` values as successes, and changeTIFF caught and only
 * logged. So the trees and NDVI cases live here, and only the network edge is stubbed:
 * fetch for trees (so unifiedLoader and progressiveLoader run for real),
 * TIFFImageryProvider.fromUrl for NDVI.
 */

import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TIFFImageryProvider from 'tiff-imagery-provider'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import DataLayersControl from '@/components/controls/DataLayersControl.vue'
import MapControls from '@/components/MapControls.vue'
import NDVIPanel from '@/components/NDVIPanel.vue'
import { LAYER_FAILURE_MESSAGES } from '@/constants/errorMessages.js'
import unifiedLoader from '@/services/unifiedLoader.js'
import { useGlobalStore } from '@/stores/globalStore.js'
import { useLoadingStore } from '@/stores/loadingStore.js'
import { useToggleStore } from '@/stores/toggleStore.js'

vi.mock('tiff-imagery-provider', () => ({ default: { fromUrl: vi.fn() } }))
vi.mock('@/services/building.js', () => ({
	default: class {
		filterBuildings = vi.fn(async () => {})
		showAllBuildings = vi.fn()
		resetBuildingEntities = vi.fn()
	},
}))
vi.mock('@/services/datasource.js', () => ({
	default: class {
		getDataSourceByName = vi.fn(() => undefined)
		changeDataSourceShowByName = vi.fn(async () => {})
		addDataSourceWithPolygonFix = vi.fn(async () => [])
	},
}))
vi.mock('@/services/wms.js', () => ({
	default: class {
		createHelsinkiImageryLayer = vi.fn(() => ({}))
	},
}))
vi.mock('@/services/backgroundPreloader.js', () => ({ default: { trackLayerUsage: vi.fn() } }))
vi.mock('@/services/landcover', () => ({
	createHSYImageryLayer: vi.fn(async () => {}),
	removeLandcover: vi.fn(),
	setLandcoverEnabled: vi.fn(async () => {}),
}))

/** Asserts the snackbar shows `layer`'s message with a Retry, and returns the Retry. */
const expectLayerFailure = (layer) => {
	const { errorNotification } = useGlobalStore()
	expect(errorNotification.show).toBe(true)
	expect(errorNotification.message).toBe(LAYER_FAILURE_MESSAGES[layer])
	expect(errorNotification.severity).toBe('error')
	expect(typeof errorNotification.retry).toBe('function')
	return errorNotification.retry
}

const vuetify = createVuetify({ components, directives })

/**
 * Flips a layer's LayerSwitch the way the user does: in the Layers tab group, or in
 * `host` when given (#1155).
 */
const flipLayerSwitch = async (layer, value, host = null) => {
	const mounted =
		host ??
		mount(DataLayersControl, {
			props: {
				showTrees: false,
				showVegetation: false,
				showOtherNature: false,
				landCover: false,
				ndvi: false,
				helsinkiView: false,
				view: 'capitalRegion',
				postalCode: null,
			},
			global: { plugins: [vuetify] },
		})
	await mounted.find(`[data-layer="${layer}"] input[type="checkbox"]`).setValue(value)
	await flushPromises()
	return mounted
}

/** Mounts MapControls and switches a Layers-tab control the way the user does. */
const switchLayer = async (field, value) => {
	const mounted = shallowMount(MapControls)
	mounted.findComponent(DataLayersControl).vm.$emit(`update:${field}`, value)
	await flushPromises()
	return mounted
}

describe('layer failures with the real loaders', { tags: ['@unit'] }, () => {
	/** @type {import('@vue/test-utils').VueWrapper<any> | null} */
	let wrapper = null

	beforeEach(() => {
		setActivePinia(createPinia())
		// unifiedLoader is a singleton that keeps the loadingStore of the first pinia
		// it saw. Calling an action on that store makes its pinia active again, so a
		// later useGlobalStore() in this file would read an earlier test's store.
		unifiedLoader._loadingStore = null
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.spyOn(console, 'warn').mockImplementation(() => {})
		vi.mocked(TIFFImageryProvider.fromUrl)
			.mockReset()
			.mockRejectedValue(new Error('TIFF 404 Not Found'))
	})

	afterEach(() => {
		wrapper?.unmount()
		wrapper = null
		vi.unstubAllGlobals()
		vi.restoreAllMocks()
	})

	it('trees: an outage of every category shows the trees message and is not cached as loaded', async () => {
		const fetchMock = vi.fn(async () => new Response('', { status: 503 }))
		vi.stubGlobal('fetch', fetchMock)
		useGlobalStore().setPostalCode('00100')
		const loadingStore = useLoadingStore()
		const cacheLayerData = vi.spyOn(loadingStore, 'cacheLayerData')

		wrapper = await switchLayer('showTrees', true)

		expect(fetchMock).toHaveBeenCalled()
		const retry = expectLayerFailure('trees')
		expect(cacheLayerData).not.toHaveBeenCalled()
		expect(loadingStore.layerLoading.trees).toBe(false)

		const callsBeforeRetry = fetchMock.mock.calls.length
		retry()
		await flushPromises()
		expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBeforeRetry)
	})

	it('trees: a successful load reports no failure', async () => {
		const fetchMock = vi.fn(
			async () =>
				new Response(JSON.stringify({ type: 'FeatureCollection', features: [] }), {
					status: 200,
					headers: { 'content-type': 'application/geo+json' },
				})
		)
		vi.stubGlobal('fetch', fetchMock)
		useGlobalStore().setPostalCode('00100')
		const globalStore = useGlobalStore()
		const loadingStore = useLoadingStore()

		wrapper = await switchLayer('showTrees', true)
		// The success path yields to timers (batch processing, caching); wait for it
		// to finish so none of it runs into the next test.
		await vi.waitFor(() => expect(loadingStore.loadingProgress.trees?.status).toBe('completed'))

		expect(fetchMock).toHaveBeenCalled()
		expect(globalStore.errorNotification.show).toBe(false)
	})

	describe('NDVI', () => {
		beforeEach(() => {
			useGlobalStore().setCesiumViewer({ imageryLayers: { contains: () => false } })
		})

		it('Layers tab: a failed COG load shows the NDVI message', async () => {
			wrapper = await flipLayerSwitch('ndvi', true)

			expect(TIFFImageryProvider.fromUrl).toHaveBeenCalled()
			expectLayerFailure('ndvi')
		})

		// The COG stays unreachable in the Retry cases below. A successful Retry would
		// put the layer in changeTIFF's module-level cache, and later tests for the
		// same date would read the cache instead of calling fromUrl.
		it('Layers tab: Retry loads the COG again', async () => {
			wrapper = await flipLayerSwitch('ndvi', true)
			const retry = expectLayerFailure('ndvi')

			retry()
			await flushPromises()

			expect(TIFFImageryProvider.fromUrl).toHaveBeenCalledTimes(2)
		})

		it('Layers tab: a Retry after the user switched NDVI off does not load the COG', async () => {
			wrapper = await flipLayerSwitch('ndvi', true)
			const retry = expectLayerFailure('ndvi')

			useToggleStore().setNDVI(false)
			retry()
			await flushPromises()

			expect(TIFFImageryProvider.fromUrl).toHaveBeenCalledTimes(1)
		})

		it('Analysis tab: a failed date change shows the NDVI message, and Retry loads the COG again', async () => {
			wrapper = shallowMount(NDVIPanel)
			// The date select is disabled while NDVI is off.
			useToggleStore().setNDVI(true)

			await wrapper.vm.updateImage()
			await flushPromises()

			const retry = expectLayerFailure('ndvi')
			retry()
			await flushPromises()
			expect(TIFFImageryProvider.fromUrl).toHaveBeenCalledTimes(2)
		})

		it('Analysis tab: a Retry after the user switched NDVI off does not load the COG', async () => {
			wrapper = shallowMount(NDVIPanel)
			useToggleStore().setNDVI(true)
			await wrapper.vm.updateImage()
			await flushPromises()
			const retry = expectLayerFailure('ndvi')

			useToggleStore().setNDVI(false)
			retry()
			await flushPromises()

			expect(TIFFImageryProvider.fromUrl).toHaveBeenCalledTimes(1)
		})

		it('Analysis tab: a failed switch-on from the panel shows the NDVI message', async () => {
			const panel = mount(NDVIPanel, {
				global: { plugins: [vuetify], stubs: { NDVIChart: true } },
			})

			wrapper = await flipLayerSwitch('ndvi', true, panel)

			expect(TIFFImageryProvider.fromUrl).toHaveBeenCalledTimes(1)
			expectLayerFailure('ndvi')
		})

		it('Analysis tab: a failed COG load shows the NDVI message', async () => {
			useToggleStore().setNDVI(true)
			wrapper = shallowMount(NDVIPanel)
			await flushPromises()

			expect(TIFFImageryProvider.fromUrl).toHaveBeenCalled()
			expectLayerFailure('ndvi')
		})
	})
})
