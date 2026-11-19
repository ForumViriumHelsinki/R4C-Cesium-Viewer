/**
 * The runtime error snackbar renders globalStore.showError's severity and Retry
 * (#1152, #1153): error colour and mdi-alert-circle for a failed action, warning
 * colour and mdi-alert-circle-outline for degraded data, and a Retry button only
 * when the failure can be retried.
 */

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ErrorNotificationSnackbar from '@/components/ErrorNotificationSnackbar.vue'
import { useGlobalStore } from '@/stores/globalStore.js'

describe('ErrorNotificationSnackbar', { tags: ['@unit'] }, () => {
	/** @type {import('@vue/test-utils').VueWrapper | null} */
	let wrapper = null

	beforeEach(() => {
		setActivePinia(createPinia())
		// VOverlay reads the bare global `visualViewport`, which jsdom lacks.
		vi.stubGlobal('visualViewport', undefined)
		vi.spyOn(console, 'error').mockImplementation(() => {})
		wrapper = mount(
			{ render: () => h(components.VApp, null, () => h(ErrorNotificationSnackbar)) },
			{ attachTo: document.body, global: { plugins: [createVuetify({ components, directives })] } }
		)
	})

	afterEach(() => {
		wrapper?.unmount()
		wrapper = null
		vi.unstubAllGlobals()
		vi.restoreAllMocks()
		document.body.innerHTML = ''
	})

	const snackbar = () => document.body.querySelector('.v-snackbar')
	const buttonNamed = (name) =>
		[...document.body.querySelectorAll('.v-snackbar button')].find((b) =>
			b.textContent?.includes(name)
		)

	const show = async (...args) => {
		useGlobalStore().showError(...args)
		await nextTick()
		await nextTick()
	}

	it('renders a failed action in error colour with a Retry that re-runs it', async () => {
		const retry = vi.fn()
		await show('Unable to load trees. Please try again.', 'ctx', { retry })

		expect(snackbar()?.textContent).toContain('Unable to load trees.')
		expect(snackbar()?.querySelector('.bg-error')).not.toBeNull()
		expect(snackbar()?.querySelector('.mdi-alert-circle')).not.toBeNull()
		expect(snackbar()?.getAttribute('role')).toBe('alert')

		buttonNamed('Retry')?.click()
		expect(retry).toHaveBeenCalledTimes(1)
		expect(useGlobalStore().errorNotification.show).toBe(false)
	})

	it('renders degraded data in warning colour with the outline icon, as a polite status', async () => {
		await show('Unable to load heat exposure data. Some features may be unavailable.', '', {
			severity: 'warning',
		})

		expect(snackbar()?.querySelector('.bg-warning')).not.toBeNull()
		expect(snackbar()?.querySelector('.mdi-alert-circle-outline')).not.toBeNull()
		expect(snackbar()?.getAttribute('role')).toBe('status')
	})

	it('offers no Retry when the failure has no retry action', async () => {
		await show('Unable to load cold area data. Please try again.')

		expect(buttonNamed('Retry')).toBeUndefined()
		expect(buttonNamed('Close')).toBeDefined()
	})
})
