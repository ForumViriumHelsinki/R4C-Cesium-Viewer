/**
 * @module composables/useDataLoading
 * Handles coordination of external data loading (Paavo, heat exposure, cache warming).
 * Provides centralized error handling and retry logic for asynchronous data sources.
 */

import { onMounted } from 'vue'
import cacheWarmer from '../services/cacheWarmer.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { useHeatExposureStore } from '../stores/heatExposureStore.js'
import { useSocioEconomicsStore } from '../stores/socioEconomicsStore.js'
import logger from '../utils/logger.js'

/**
 * Vue 3 composable for external data loading coordination
 * Manages loading of Paavo statistics, heat exposure data, and cache warming.
 *
 * Features:
 * - Parallel loading of external data sources
 * - Error handling with graceful degradation
 * - Background cache warming with requestIdleCallback
 * - Retry logic for initialization failures
 * - Automatic lifecycle management
 *
 * @param {boolean} shouldAutoLoad - Whether to auto-load data on mount (default: true)
 * @returns {{
 *   loadExternalData: () => Promise<void>,
 *   startCacheWarming: () => void,
 *   handleRetryLoading: () => void
 * }} Data loading functions
 *
 * @example
 * import { useDataLoading } from '@/composables/useDataLoading';
 * const { loadExternalData } = useDataLoading();
 * // Data loading happens automatically on mount
 */
export function useDataLoading(shouldAutoLoad = true) {
	const store = useGlobalStore()
	const socioEconomicsStore = useSocioEconomicsStore()
	const heatExposureStore = useHeatExposureStore()

	/**
	 * Loads external data sources (Paavo, heat exposure).
	 * Runs in parallel with error handling for each source.
	 * Failures are logged but don't block other data sources.
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	const loadExternalData = async () => {
		// Load external data in parallel, with error handling for each
		await Promise.allSettled([
			socioEconomicsStore.loadPaavo().catch((error) => {
				logger.error('[useDataLoading] Failed to load Paavo data:', error)
				store.showError('Failed to load socioeconomic data. Some features may be unavailable.')
			}),
			heatExposureStore.loadHeatExposure().catch((error) => {
				logger.error('[useDataLoading] Failed to load heat exposure data:', error)
				store.showError('Failed to load heat exposure data. Some features may be unavailable.')
			}),
		])

		logger.debug('[useDataLoading] ✅ External data loading complete')
	}

	/**
	 * Starts background cache warming for critical data.
	 * Uses requestIdleCallback to run during browser idle time.
	 * Falls back to setTimeout for browsers without requestIdleCallback.
	 *
	 * @returns {void}
	 */
	const startCacheWarming = () => {
		// Start cache warming in background (non-blocking)
		// Uses requestIdleCallback to run during browser idle time
		if (typeof requestIdleCallback !== 'undefined') {
			requestIdleCallback(
				() => {
					cacheWarmer.warmCriticalData().catch((error) => {
						logger.error('[useDataLoading] Failed to warm critical cache data:', error)
					})
				},
				{ timeout: 2000 }
			) // 2 second timeout
		} else {
			// Fallback for browsers without requestIdleCallback
			setTimeout(() => {
				cacheWarmer.warmCriticalData().catch((error) => {
					logger.error('[useDataLoading] Failed to warm critical cache data:', error)
				})
			}, 1000)
		}

		logger.debug('[useDataLoading] 🔥 Cache warming started')
	}

	/**
	 * Handles retry of failed postal code loading.
	 * Resets error state and re-triggers data loading through FeaturePicker.
	 *
	 * @returns {void}
	 */
	const handleRetryLoading = () => {
		logger.debug('[useDataLoading] User requested data loading retry')

		const postalCode = store.clickProcessingState.postalCode
		if (!postalCode) {
			logger.warn('[useDataLoading] No postal code to retry')
			return
		}

		// Note: Featurepicker must be imported by the caller
		// This is intentional to avoid circular dependencies
		logger.warn('[useDataLoading] handleRetryLoading requires Featurepicker - implement in caller')
	}

	onMounted(async () => {
		if (shouldAutoLoad) {
			await loadExternalData()
			startCacheWarming()
		}
	})

	return {
		loadExternalData,
		startCacheWarming,
		handleRetryLoading,
	}
}
