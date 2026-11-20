/**
 * One channel for user-triggered failures (#1152, #1153).
 *
 * globalStore.showError() is the snackbar every user-triggered failure goes
 * through, with a severity and an optional Retry. loadingStore.reportLayerFailure()
 * records a layer's failure and forwards it there with the layer's message from
 * constants/errorMessages.js. Plain setLayerError() stays quiet: unifiedLoader calls
 * it for every failed or cancelled tile, which must not raise a snackbar.
 */

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GENERIC_LAYER_FAILURE_MESSAGE, LAYER_FAILURE_MESSAGES } from '@/constants/errorMessages.js'
import { useGlobalStore } from '@/stores/globalStore.js'
import { useLoadingStore } from '@/stores/loadingStore.js'

describe('globalStore.showError severity and retry', { tags: ['@unit'] }, () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		vi.spyOn(console, 'error').mockImplementation(() => {})
	})

	it('defaults to severity error with no retry', () => {
		const store = useGlobalStore()
		store.showError('Unable to load X. Please try again.')

		expect(store.errorNotification.severity).toBe('error')
		expect(store.errorNotification.retry).toBeNull()
	})

	it('carries a warning severity and a retry action', () => {
		const store = useGlobalStore()
		const retry = vi.fn()
		store.showError('Unable to load Y. Some features may be unavailable.', 'ctx', {
			severity: 'warning',
			retry,
		})

		expect(store.errorNotification.severity).toBe('warning')
		expect(store.errorNotification.retry).toBe(retry)
	})

	it('retryError hides the notification and runs the retry once', () => {
		const store = useGlobalStore()
		const retry = vi.fn()
		store.showError('Unable to load Z. Please try again.', '', { retry })

		store.retryError()

		expect(retry).toHaveBeenCalledTimes(1)
		expect(store.errorNotification.show).toBe(false)
		expect(store.errorNotification.retry).toBeNull()
	})

	it('retryError hides before retrying, so a retry that fails again is shown', () => {
		const store = useGlobalStore()
		const retry = vi.fn(() => {
			store.showError('Unable to load Z. Please try again.', 'second failure', { retry })
		})
		store.showError('Unable to load Z. Please try again.', 'first failure', { retry })

		store.retryError()

		expect(retry).toHaveBeenCalledTimes(1)
		expect(store.errorNotification.show).toBe(true)
		expect(store.errorNotification.context).toBe('second failure')
		expect(store.errorNotification.retry).toBe(retry)
	})

	it('hideError clears severity and retry', () => {
		const store = useGlobalStore()
		store.showError('m', '', { severity: 'warning', retry: vi.fn() })
		store.hideError()

		expect(store.errorNotification).toEqual({
			show: false,
			message: '',
			context: '',
			severity: 'error',
			retry: null,
		})
	})
})

describe('loadingStore.reportLayerFailure', { tags: ['@unit'] }, () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		vi.spyOn(console, 'error').mockImplementation(() => {})
	})

	it('forwards to the snackbar with the layer message, never the raw error text', () => {
		const loadingStore = useLoadingStore()
		const globalStore = useGlobalStore()
		const retry = vi.fn()
		loadingStore.startLayerLoading('trees')

		loadingStore.reportLayerFailure('trees', new Error('HTTP 500 at /pygeoapi/trees'), { retry })

		expect(globalStore.errorNotification.show).toBe(true)
		expect(globalStore.errorNotification.message).toBe(LAYER_FAILURE_MESSAGES.trees)
		expect(globalStore.errorNotification.message).not.toContain('HTTP 500')
		expect(globalStore.errorNotification.context).toContain('HTTP 500')
		expect(globalStore.errorNotification.severity).toBe('error')
		expect(globalStore.errorNotification.retry).toBe(retry)
		// The loading state is settled the same way setLayerError settles it.
		expect(loadingStore.layerLoading.trees).toBe(false)
		expect(loadingStore.hasLayerError('trees')).toBe(true)
	})

	it('accepts a string error and falls back to a generic message for an unknown layer', () => {
		const loadingStore = useLoadingStore()
		const globalStore = useGlobalStore()

		loadingStore.reportLayerFailure('someNewLayer', 'boom')

		expect(globalStore.errorNotification.message).toBe(GENERIC_LAYER_FAILURE_MESSAGE)
		expect(globalStore.errorNotification.retry).toBeNull()
	})

	it('plain setLayerError does not raise the snackbar (tile errors stay quiet)', () => {
		const loadingStore = useLoadingStore()
		const globalStore = useGlobalStore()

		loadingStore.setLayerError('viewport_buildings_hsy_1_2', 'Loading cancelled')

		expect(globalStore.errorNotification.show).toBe(false)
	})
})
