/**
 * The layer-failure channel with the real loaders between the component and the
 * network (#1152). layerFailureChannel.test.js mocks the Tree class and changeTIFF
 * into rejecting, so it passed while the real loaders swallowed every failure:
 * Tree.loadTrees counted loadLayers' `{ error }` values as successes, and
 * changeTIFF caught and only logged. Here only the network edge is stubbed:
 * fetch for trees (so unifiedLoader and progressiveLoader run for real),
 * TIFFImageryProvider.fromUrl for NDVI.
 */

import { flushPromises, shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TIFFImageryProvider from 'tiff-imagery-provider'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DataLayersControl from '@/components/controls/DataLayersControl.vue'
import MapControls from '@/components/MapControls.vue'
import NDVIPanel from '@/components/NDVIPanel.vue'
import { LAYER_FAILURE_MESSAGES } from '@/constants/errorMessages.js'
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

/** Asserts the snackbar shows `layer`'s message with a Retry. */
const expectLayerFailure = (layer) => {
	const { errorNotification } = useGlobalStore()
	expect(errorNotification.show).toBe(true)
	expect(errorNotification.message).toBe(LAYER_FAILURE_MESSAGES[layer])
	expect(errorNotification.severity).toBe('error')
	expect(typeof errorNotification.retry).toBe('function')
}

describe('layer failures with the real loaders', { tags: ['@unit'] }, () => {
	/** @type {import('@vue/test-utils').VueWrapper<any> | null} */
	let wrapper = null

	beforeEach(() => {
		setActivePinia(createPinia())
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

		wrapper = shallowMount(MapControls)
		wrapper.findComponent(DataLayersControl).vm.$emit('update:showTrees', true)
		await flushPromises()

		expect(fetchMock).toHaveBeenCalled()
		expectLayerFailure('trees')
		expect(cacheLayerData).not.toHaveBeenCalled()
	})

	describe('NDVI', () => {
		beforeEach(() => {
			useGlobalStore().setCesiumViewer({ imageryLayers: { contains: () => false } })
		})

		it('Layers tab: a failed COG load shows the NDVI message', async () => {
			wrapper = shallowMount(MapControls)
			wrapper.findComponent(DataLayersControl).vm.$emit('update:ndvi', true)
			await flushPromises()

			expect(TIFFImageryProvider.fromUrl).toHaveBeenCalled()
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
