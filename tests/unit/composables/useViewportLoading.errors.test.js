/**
 * A failed viewport building load shows the shared copy in the indicator, never
 * the exception text (#1153). The technical detail goes to the log only.
 */

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { useViewportLoading } from '@/composables/useViewportLoading.js'
import { VIEWPORT_BUILDINGS_FAILURE_MESSAGE } from '@/constants/errorMessages.js'
import { useFeatureFlagStore } from '@/stores/featureFlagStore'
import { useGlobalStore } from '@/stores/globalStore.js'

vi.mock('@/services/datasource.js', () => ({ default: class {} }))
vi.mock('@/services/viewportBuildingLoader.js', () => ({ default: class {} }))

const RAW_ERROR = 'HTTP 500 Internal Server Error from pygeoapi.dataportal.fi'

class FakeCamera {
	getViewportRectangle() {
		return { west: 24.9, south: 60.1, east: 25.0, north: 60.2 }
	}
	getCameraHeight() {
		return 1000
	}
}

class FailingFeaturepicker {
	getVisiblePostalCodes() {
		return ['00100']
	}
	async loadBuildingsForVisiblePostalCodes() {
		throw new Error(RAW_ERROR)
	}
}

describe('useViewportLoading error message', { tags: ['@unit'] }, () => {
	/** @type {import('@vue/test-utils').VueWrapper | null} */
	let wrapper = null

	beforeEach(() => {
		setActivePinia(createPinia())
		vi.spyOn(console, 'error').mockImplementation(() => {})
		// Postal-code loading runs only with tile streaming off.
		useFeatureFlagStore().setFlag('viewportStreaming', false)
		useGlobalStore().setLevel('postalCode')
	})

	afterEach(() => {
		wrapper?.unmount()
		wrapper = null
		vi.restoreAllMocks()
	})

	it('sets the shared message, not the exception text, when the load throws', async () => {
		/** @type {ReturnType<typeof useViewportLoading> | null} */
		let loading = null
		wrapper = mount(
			defineComponent({
				setup() {
					loading = useViewportLoading(
						{},
						() => FakeCamera,
						() => FailingFeaturepicker
					)
					return () => h('div')
				},
			})
		)

		await loading.handleCameraSettled()

		expect(loading.viewportLoadingError.value).toBe(VIEWPORT_BUILDINGS_FAILURE_MESSAGE)
		expect(loading.isLoadingBuildings.value).toBe(false)
	})
})
