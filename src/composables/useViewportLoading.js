/**
 * @module composables/useViewportLoading
 * Handles viewport-based building loading after camera movement.
 * Implements postal code detection and tile-based building streaming.
 */

import { onBeforeUnmount, ref, watch } from 'vue'
import { VIEWPORT } from '../constants/viewport.js'
import ViewportBuildingLoader from '../services/viewportBuildingLoader.js'
import { useFeatureFlagStore } from '../stores/featureFlagStore'
import { useGlobalStore } from '../stores/globalStore.js'
import logger from '../utils/logger.js'

/**
 * Vue 3 composable for viewport-based building loading
 * Handles both postal code-based and tile-based building streaming.
 *
 * Features:
 * - Postal code viewport detection and building loading
 * - Camera height threshold checking (50km max)
 * - Loading progress tracking
 * - Error handling and retry logic
 * - Feature flag integration for tile-based streaming
 * - Automatic cleanup on unmount
 *
 * @param {any} viewer - Cesium viewer reference
 * @param {any} Camera - Camera service class
 * @param {any} Featurepicker - Featurepicker service class
 * @returns {{
 *   isLoadingBuildings: import('vue').Ref<boolean>,
 *   viewportLoadingProgress: import('vue').Ref<{current: number, total: number}>,
 *   viewportLoadingError: import('vue').Ref<string|null>,
 *   viewportFeaturepicker: any,
 *   viewportBuildingLoader: any,
 *   handleCameraSettled: () => Promise<void>,
 *   handleRetryViewportLoading: () => Promise<void>,
 *   initViewportStreaming: () => Promise<void>
 * }} Viewport loading state and functions
 *
 * @example
 * import { useViewportLoading } from '@/composables/useViewportLoading';
 * const { handleCameraSettled, initViewportStreaming } = useViewportLoading(viewer.value, Camera, Featurepicker);
 * await initViewportStreaming();
 */
export function useViewportLoading(viewer, Camera, Featurepicker) {
	const store = useGlobalStore()
	const featureFlagStore = useFeatureFlagStore()

	const isLoadingBuildings = ref(false)
	const viewportLoadingProgress = ref({ current: 0, total: 0 })
	const viewportLoadingError = ref(null)

	// Persistent FeaturePicker instance for viewport-based loading
	// Reusing the same instance maintains visiblePostalCodes state across camera moves
	let viewportFeaturepicker = null

	// ViewportBuildingLoader instance for tile-based building streaming
	// This is an alternative to postal code-based loading (via viewportFeaturepicker)
	let viewportBuildingLoader = null

	/**
	 * Handles viewport-based building loading after camera stops moving.
	 * Only triggers at postalCode level when zoomed in sufficiently.
	 *
	 * Viewport Loading Logic:
	 * - Only active at 'postalCode' level (not 'start' or 'building')
	 * - Requires camera height below 50km threshold
	 * - Detects visible postal codes in viewport
	 * - Loads buildings for all visible postal codes
	 * - Reuses FeaturePicker instance to maintain state
	 * - Tracks loading progress and errors
	 * - Skipped when viewport streaming feature flag is enabled (tile-based loading active)
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	const handleCameraSettled = async () => {
		// Skip postal code-based viewport loading if viewport streaming is active
		if (featureFlagStore.isEnabled('viewportStreaming')) {
			logger.debug(
				'[useViewportLoading] Viewport streaming active, skipping postal code-based loading'
			)
			return
		}

		// Prevent overlapping calls to avoid visibility blinking
		// Log camera settled event for visibility debugging
		logger.debug(
			`%c[VISIBILITY] Camera settled - triggering viewport check`,
			'color: blue; font-weight: bold'
		)
		if (isLoadingBuildings.value) {
			logger.debug('[useViewportLoading] Already loading buildings, skipping...')
			return
		}

		const currentLevel = store.level

		logger.debug('[useViewportLoading] Current level:', currentLevel)

		// Only handle viewport-based loading at postalCode level
		// At 'start' level: user should click to select postal code
		// At 'building' level: building detail view, no automatic loading
		if (currentLevel !== 'postalCode') {
			logger.debug('[useViewportLoading] Not at postalCode level, skipping viewport check')
			return
		}

		if (!Camera) {
			logger.warn('[useViewportLoading] Camera module not loaded')
			return
		}

		// Get camera utilities
		const camera = new Camera()

		// Get viewport rectangle
		const viewportRect = camera.getViewportRectangle()
		if (!viewportRect) {
			logger.warn('[useViewportLoading] Could not determine viewport rectangle')
			return
		}

		// Get camera height to determine if we should load buildings
		const cameraHeight = camera.getCameraHeight()
		const MAX_HEIGHT_FOR_BUILDING_LOAD = VIEWPORT.MAX_CAMERA_HEIGHT_FOR_BUILDINGS // 50km

		if (cameraHeight > MAX_HEIGHT_FOR_BUILDING_LOAD) {
			logger.debug('[useViewportLoading] Camera too high for building loading:', cameraHeight, 'm')
			return
		}
		logger.debug(
			'[useViewportLoading] Camera height:',
			cameraHeight,
			'm - proceeding with viewport-based building loading'
		)

		if (!Featurepicker) {
			logger.warn('[useViewportLoading] Featurepicker module not loaded')
			return
		}

		try {
			isLoadingBuildings.value = true
			viewportLoadingError.value = null

			// Reuse the same FeaturePicker instance to maintain visiblePostalCodes state
			if (!viewportFeaturepicker) {
				viewportFeaturepicker = new Featurepicker()
			}
			const visiblePostalCodes = viewportFeaturepicker.getVisiblePostalCodes(viewportRect)

			// Update progress tracking
			viewportLoadingProgress.value = {
				current: 0,
				total: visiblePostalCodes.length,
			}

			// Load buildings for visible postal codes
			await viewportFeaturepicker.loadBuildingsForVisiblePostalCodes(visiblePostalCodes)

			// Update to complete
			viewportLoadingProgress.value = {
				current: visiblePostalCodes.length,
				total: visiblePostalCodes.length,
			}
		} catch (error) {
			logger.error('[useViewportLoading] Error loading buildings:', error?.message || error)
			viewportLoadingError.value = error?.message || 'Failed to load buildings'
		} finally {
			isLoadingBuildings.value = false
		}
	}

	/**
	 * Handles retry of viewport-based building loading after an error.
	 * Clears error state and re-triggers camera settled handler.
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	const handleRetryViewportLoading = async () => {
		logger.debug('[useViewportLoading] Retrying viewport building loading')
		viewportLoadingError.value = null
		await handleCameraSettled()
	}

	/**
	 * Initializes viewport-based building loader if viewport streaming is enabled.
	 * Uses tile-based spatial grid loading instead of postal code boundaries.
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	const initViewportStreaming = async () => {
		logger.debug('[useViewportLoading] initViewportStreaming called')
		logger.debug('[useViewportLoading] viewer ref:', viewer)
		logger.debug('[useViewportLoading] viewer.value:', viewer?.value)
		logger.debug('[useViewportLoading] viewer.value?.camera:', viewer?.value?.camera)

		if (!viewer?.value) {
			logger.warn('[useViewportLoading] Cannot init viewport streaming - viewer not ready')
			return
		}

		if (featureFlagStore.isEnabled('viewportStreaming')) {
			viewportBuildingLoader = new ViewportBuildingLoader()
			// Await initialization - includes retry logic for globe readiness
			await viewportBuildingLoader.initialize(viewer.value)
			logger.debug('[useViewportLoading] ✅ ViewportBuildingLoader initialized (tile-based mode)')
		}
	}

	/**
	 * Watch for changes to viewport streaming feature flag
	 * Dynamically enables/disables tile-based viewport loading at runtime.
	 */
	watch(
		() => featureFlagStore.isEnabled('viewportStreaming'),
		async (newValue, _oldValue) => {
			if (!viewer?.value) {
				logger.warn('[useViewportLoading] Viewer not initialized, cannot toggle viewport streaming')
				return
			}

			if (newValue && !viewportBuildingLoader) {
				// Enable viewport streaming
				logger.debug('[useViewportLoading] Enabling viewport streaming (tile-based loading)')
				viewportBuildingLoader = new ViewportBuildingLoader()
				await viewportBuildingLoader.initialize(viewer.value)
			} else if (!newValue && viewportBuildingLoader) {
				// Disable viewport streaming
				logger.debug('[useViewportLoading] Disabling viewport streaming')
				await viewportBuildingLoader.shutdown()
				viewportBuildingLoader = null
			}
		}
	)

	onBeforeUnmount(async () => {
		// Clean up viewport building loader if initialized
		if (viewportBuildingLoader) {
			await viewportBuildingLoader.shutdown()
			logger.debug('[useViewportLoading] 🧹 ViewportBuildingLoader shutdown complete')
		}
	})

	return {
		isLoadingBuildings,
		viewportLoadingProgress,
		viewportLoadingError,
		viewportFeaturepicker,
		viewportBuildingLoader,
		handleCameraSettled,
		handleRetryViewportLoading,
		initViewportStreaming,
	}
}
