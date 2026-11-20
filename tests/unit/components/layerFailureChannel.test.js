/**
 * A layer failure reaches the same channel whichever tab switched the layer on
 * (#1152). Land cover and NDVI can be switched on from the Layers tab
 * (MapControls) and from their Analysis panels (LandcoverPanel with its year select,
 * NDVIPanel); trees,
 * vegetation and other nature only from the Layers tab. Every one of them must end
 * in globalStore.showError with the layer's message from constants/errorMessages.js
 * and a Retry that re-runs the operation. The statistical grid loads when its view
 * mounts, so it reports through the same channel without a Retry.
 *
 * Trees and NDVI are tested in layerFailureRealLoaders.test.js with the real Tree
 * service and changeTIFF: mocking those into rejecting passed while the real
 * loaders swallowed every failure.
 */

import { flushPromises, shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DataLayersControl from '@/components/controls/DataLayersControl.vue'
import HSYYearSelect from '@/components/HSYYearSelect.vue'
import LandcoverPanel from '@/components/LandcoverPanel.vue'
import MapControls from '@/components/MapControls.vue'
import SosEco250mGrid from '@/components/SosEco250mGrid.vue'
import { LAYER_FAILURE_MESSAGES } from '@/constants/errorMessages.js'
import { createHSYImageryLayer, setLandcoverEnabled } from '@/services/landcover'
import { useGlobalStore } from '@/stores/globalStore.js'
import { useToggleStore } from '@/stores/toggleStore.js'

const loaders = vi.hoisted(() => ({
	otherNature: vi.fn(async () => {}),
	vegetation: vi.fn(async () => {}),
	statsGrid: vi.fn(async () => {}),
}))

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
		removeDataSourcesByNamePrefix = vi.fn(async () => {})
		loadGeoJsonDataSourceWithWorker = loaders.statsGrid
	},
}))
vi.mock('@/composables/useGridStyling.js', () => ({
	useGridStyling: () => ({ updateGridColors: vi.fn(async () => {}) }),
}))
vi.mock('@/services/othernature.js', () => ({
	default: class {
		loadOtherNature = loaders.otherNature
	},
}))
vi.mock('@/services/vegetation', () => ({
	default: class {
		loadVegetation = loaders.vegetation
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

describe('layer failures reach one channel from every entry point', { tags: ['@unit'] }, () => {
	/** @type {import('@vue/test-utils').VueWrapper<any> | null} */
	let wrapper = null

	beforeEach(() => {
		setActivePinia(createPinia())
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.mocked(setLandcoverEnabled).mockReset().mockResolvedValue(undefined)
		vi.mocked(createHSYImageryLayer).mockReset().mockResolvedValue(undefined)
		loaders.otherNature.mockReset().mockResolvedValue(undefined)
		loaders.vegetation.mockReset().mockResolvedValue(undefined)
		loaders.statsGrid.mockReset().mockResolvedValue(undefined)
	})

	afterEach(() => {
		wrapper?.unmount()
		wrapper = null
		vi.restoreAllMocks()
	})

	/** Switches a Layers-tab control the way the user does. */
	const switchLayer = async (field, value) => {
		wrapper = shallowMount(MapControls)
		wrapper.findComponent(DataLayersControl).vm.$emit(`update:${field}`, value)
		await flushPromises()
	}

	describe('land cover', () => {
		it('Layers tab: a failed switch-on shows the land cover message with Retry', async () => {
			vi.mocked(setLandcoverEnabled).mockRejectedValueOnce(new Error('HSY 504'))

			await switchLayer('landCover', true)

			const retry = expectLayerFailure('landcover')
			retry()
			expect(setLandcoverEnabled).toHaveBeenLastCalledWith(true)
		})

		it('Analysis tab: a failed switch-on shows the same message with Retry', async () => {
			vi.mocked(setLandcoverEnabled).mockRejectedValueOnce(new Error('HSY 504'))
			useToggleStore().setLandCover(true)
			wrapper = shallowMount(LandcoverPanel)

			wrapper.vm.toggleLandCover()
			await flushPromises()

			const retry = expectLayerFailure('landcover')
			retry()
			expect(setLandcoverEnabled).toHaveBeenLastCalledWith(true)
		})

		it('Analysis tab: a failed year change shows the same message with Retry', async () => {
			vi.mocked(createHSYImageryLayer).mockRejectedValueOnce(new Error('HSY 504'))
			useToggleStore().setLandCover(true)
			wrapper = shallowMount(HSYYearSelect)

			wrapper.vm.selectedYear = 2018
			await flushPromises()

			const retry = expectLayerFailure('landcover')
			retry()
			await flushPromises()
			expect(createHSYImageryLayer).toHaveBeenCalledTimes(2)
		})

		it('Analysis tab: a year-change Retry after land cover was switched off does nothing', async () => {
			vi.mocked(createHSYImageryLayer).mockRejectedValueOnce(new Error('HSY 504'))
			useToggleStore().setLandCover(true)
			wrapper = shallowMount(HSYYearSelect)
			wrapper.vm.selectedYear = 2018
			await flushPromises()
			const retry = expectLayerFailure('landcover')

			useToggleStore().setLandCover(false)
			retry()

			expect(createHSYImageryLayer).toHaveBeenCalledTimes(1)
		})

		it('Layers tab: a Retry after the user switched land cover off does nothing', async () => {
			vi.mocked(setLandcoverEnabled).mockRejectedValueOnce(new Error('HSY 504'))
			await switchLayer('landCover', true)
			const retry = expectLayerFailure('landcover')

			useToggleStore().setLandCover(false)
			retry()

			expect(setLandcoverEnabled).toHaveBeenCalledTimes(1)
		})

		it('Analysis tab: a Retry after the user switched land cover off does nothing', async () => {
			vi.mocked(setLandcoverEnabled).mockRejectedValueOnce(new Error('HSY 504'))
			useToggleStore().setLandCover(true)
			wrapper = shallowMount(LandcoverPanel)
			wrapper.vm.toggleLandCover()
			await flushPromises()
			const retry = expectLayerFailure('landcover')

			useToggleStore().setLandCover(false)
			retry()

			expect(setLandcoverEnabled).toHaveBeenCalledTimes(1)
		})
	})

	describe('Layers-tab-only layers', () => {
		beforeEach(() => {
			useGlobalStore().setPostalCode('00100')
		})

		it('other nature: a failed load shows its message with Retry', async () => {
			loaders.otherNature.mockRejectedValueOnce(new Error('pygeoapi 429'))

			await switchLayer('showOtherNature', true)

			const retry = expectLayerFailure('otherNature')
			retry()
			await flushPromises()
			expect(loaders.otherNature).toHaveBeenCalledTimes(2)
		})

		it('vegetation: a failed load shows its message with Retry', async () => {
			loaders.vegetation.mockRejectedValueOnce(new Error('pygeoapi 500'))

			await switchLayer('showVegetation', true)

			const retry = expectLayerFailure('vegetation')
			retry()
			await flushPromises()
			expect(loaders.vegetation).toHaveBeenCalledTimes(2)
		})
	})

	describe('statistical grid', () => {
		it('a failed grid load shows its message (no Retry: re-entering the view retries)', async () => {
			loaders.statsGrid.mockRejectedValueOnce(new Error('worker parse failed'))

			wrapper = shallowMount(SosEco250mGrid)
			await flushPromises()

			const { errorNotification } = useGlobalStore()
			expect(errorNotification.show).toBe(true)
			expect(errorNotification.message).toBe(LAYER_FAILURE_MESSAGES.statsGrid)
			expect(errorNotification.message).not.toContain('worker')
			expect(errorNotification.severity).toBe('error')
		})
	})
})
