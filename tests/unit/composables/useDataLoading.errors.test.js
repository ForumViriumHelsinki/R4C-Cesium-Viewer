/**
 * Background data the app can run without is reported as a warning with Retry,
 * in the shared copy, never as an error with the raw exception (#1153).
 */

import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDataLoading } from '@/composables/useDataLoading.js'
import { DEGRADED_DATA_MESSAGES } from '@/constants/errorMessages.js'
import { useGlobalStore } from '@/stores/globalStore.js'

vi.mock('@/services/cacheWarmer.js', () => ({ default: {} }))

describe('useDataLoading degraded-data reporting', { tags: ['@unit'] }, () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.restoreAllMocks()
	})

	// Only fetch is stubbed; the store actions run for real. The stores used to
	// catch and log, so a spy that made the action reject passed while a real
	// outage never reached the warning.
	it.each([
		['socioeconomic', (url) => url === '/paavo'],
		['heatExposure', (url) => url.includes('/heatexposure_optimized/')],
	])('%s failure is a warning with the shared message and a working Retry', async (key, isFailing) => {
		const fetchMock = vi.fn(async (url) =>
			isFailing(String(url))
				? new Response('', { status: 503 })
				: new Response(JSON.stringify({ features: [] }), {
						status: 200,
						headers: { 'content-type': 'application/json' },
					})
		)
		vi.stubGlobal('fetch', fetchMock)
		const failingCalls = () => fetchMock.mock.calls.filter(([url]) => isFailing(String(url)))

		await useDataLoading(false).loadExternalData()

		const { errorNotification } = useGlobalStore()
		expect(errorNotification.message).toBe(DEGRADED_DATA_MESSAGES[key])
		expect(errorNotification.message).not.toContain('503')
		expect(errorNotification.severity).toBe('warning')
		expect(typeof errorNotification.retry).toBe('function')
		expect(failingCalls()).toHaveLength(1)

		useGlobalStore().retryError()
		await flushPromises()
		expect(failingCalls()).toHaveLength(2)
	})

	it('a 503 from both upstreams reaches the warning through the real store actions', async () => {
		const fetchMock = vi.fn(async () => new Response('', { status: 503 }))
		vi.stubGlobal('fetch', fetchMock)
		const showError = vi.spyOn(useGlobalStore(), 'showError')

		await useDataLoading(false).loadExternalData()

		expect(fetchMock).toHaveBeenCalledTimes(2)
		const messages = showError.mock.calls.map(([message, , options]) => [
			message,
			options?.severity,
		])
		expect(messages).toEqual(
			expect.arrayContaining([
				[DEGRADED_DATA_MESSAGES.socioeconomic, 'warning'],
				[DEGRADED_DATA_MESSAGES.heatExposure, 'warning'],
			])
		)
	})
})
