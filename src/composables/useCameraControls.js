/**
 * @module composables/useCameraControls
 * Handles camera movement events and debouncing for viewport-based loading.
 * Provides camera settled detection with configurable debounce delay.
 */

import { TIMING } from '../constants/timing.js'
import logger from '../utils/logger.js'

/**
 * Vue 3 composable for camera movement control and detection
 * Implements debounced camera moveEnd handling to prevent rapid-fire viewport checks.
 *
 * @param {any} viewer - Cesium viewer reference
 * @param {Function} onCameraSettled - Callback function to invoke when camera stops moving
 * @param {Function} [onUrlUpdate] - Optional callback to update URL with camera state
 * @returns {{
 *   addCameraMoveEndListener: () => void,
 *   cleanup: () => void
 * }} Camera control functions
 *
 * @example
 * import { useCameraControls } from '@/composables/useCameraControls';
 * const { addCameraMoveEndListener, cleanup } = useCameraControls(viewer.value, handleCameraSettled, updateUrl);
 * addCameraMoveEndListener();
 * // Later: cleanup() in onBeforeUnmount
 */
export function useCameraControls(viewer, onCameraSettled, onUrlUpdate = null) {
	let cameraMoveTimeout = null
	const DEBOUNCE_DELAY_MS = TIMING.CAMERA_DEBOUNCE_MS // Wait 1500ms after camera stops moving to prevent blinking

	/**
	 * Registers camera moveEnd event listener with debouncing.
	 * Prevents rapid-fire viewport checks by waiting for camera to settle.
	 * Uses 1500ms debounce delay to avoid flickering during navigation.
	 *
	 * @returns {void}
	 */
	const addCameraMoveEndListener = () => {
		if (!viewer) {
			logger.warn('[useCameraControls] Cannot add listener - viewer not initialized')
			return
		}

		viewer.camera.moveEnd.addEventListener(() => {
			// Clear any pending timeout
			if (cameraMoveTimeout) {
				clearTimeout(cameraMoveTimeout)
			}

			// Set new timeout
			cameraMoveTimeout = setTimeout(() => {
				logger.debug('[useCameraControls] 📷 Camera movement ended, checking viewport state...')
				if (onCameraSettled) {
					onCameraSettled().catch((error) => {
						logger.error('[useCameraControls] Failed to handle camera settled event:', error)
					})
				}

				// Update URL with current camera state
				if (onUrlUpdate) {
					onUrlUpdate()
				}
			}, DEBOUNCE_DELAY_MS)
		})

		logger.debug(
			'[useCameraControls] ✅ Camera moveEnd listener added with',
			DEBOUNCE_DELAY_MS,
			'ms debounce'
		)
	}

	/**
	 * Cleans up camera timeout if active.
	 * Should be called in onBeforeUnmount to prevent memory leaks.
	 *
	 * @returns {void}
	 */
	const cleanup = () => {
		if (cameraMoveTimeout) {
			clearTimeout(cameraMoveTimeout)
			cameraMoveTimeout = null
			logger.debug('[useCameraControls] 🧹 Camera timeout cleared')
		}
	}

	return {
		addCameraMoveEndListener,
		cleanup,
	}
}
