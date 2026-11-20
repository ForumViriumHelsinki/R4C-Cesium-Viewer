/**
 * loadingStore.loadingErrors.buildings holds technical detail (unifiedLoader
 * writes the exception message there); the indicator shows the shared copy
 * instead (#1153).
 */

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ViewportLoadingIndicator from '@/components/ViewportLoadingIndicator.vue'
import { VIEWPORT_BUILDINGS_FAILURE_MESSAGE } from '@/constants/errorMessages.js'
import { useLoadingStore } from '@/stores/loadingStore.js'

const RAW_ERROR = 'HTTP 500 Internal Server Error from pygeoapi.dataportal.fi'

describe('ViewportLoadingIndicator error text', { tags: ['@unit'] }, () => {
	/** @type {import('@vue/test-utils').VueWrapper | null} */
	let wrapper = null

	beforeEach(() => {
		setActivePinia(createPinia())
	})

	afterEach(() => {
		wrapper?.unmount()
		wrapper = null
	})

	it('shows the shared message, not loadingErrors.buildings, for a store-reported failure', () => {
		useLoadingStore().setLayerError('buildings', RAW_ERROR)

		wrapper = mount(ViewportLoadingIndicator, {
			global: { plugins: [createVuetify({ components, directives })] },
		})

		const text = wrapper.find('.error-text')
		expect(text.exists()).toBe(true)
		expect(text.text()).toBe(VIEWPORT_BUILDINGS_FAILURE_MESSAGE)
		expect(wrapper.text()).not.toContain('HTTP 500')
	})
})
