/**
 * Background data the app can run without is reported as a warning with Retry,
 * in the shared copy, never as an error with the raw exception (#1153).
 */

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDataLoading } from '@/composables/useDataLoading.js'
import { DEGRADED_DATA_MESSAGES } from '@/constants/errorMessages.js'
import { useGlobalStore } from '@/stores/globalStore.js'
import { useHeatExposureStore } from '@/stores/heatExposureStore.js'
import { useSocioEconomicsStore } from '@/stores/socioEconomicsStore.js'

vi.mock('@/services/cacheWarmer.js', () => ({ default: {} }))

describe('useDataLoading degraded-data reporting', { tags: ['@unit'] }, () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.spyOn(console, 'warn').mockImplementation(() => {})
	})

	it.each([
		['socioeconomic', 'loadPaavo'],
		['heatExposure', 'loadHeatExposure'],
	])('%s failure is a warning with the shared message and a working Retry', async (key, failing) => {
		const loaders = {
			loadPaavo: vi.spyOn(useSocioEconomicsStore(), 'loadPaavo').mockResolvedValue(undefined),
			loadHeatExposure: vi
				.spyOn(useHeatExposureStore(), 'loadHeatExposure')
				.mockResolvedValue(undefined),
		}
		const loader = loaders[failing].mockRejectedValueOnce(new Error('HTTP 503 from upstream'))

		await useDataLoading(false).loadExternalData()

		const { errorNotification } = useGlobalStore()
		expect(errorNotification.message).toBe(DEGRADED_DATA_MESSAGES[key])
		expect(errorNotification.message).not.toContain('503')
		expect(errorNotification.severity).toBe('warning')
		expect(typeof errorNotification.retry).toBe('function')

		useGlobalStore().retryError()
		await Promise.resolve()
		expect(loader).toHaveBeenCalledTimes(2)
	})
})
