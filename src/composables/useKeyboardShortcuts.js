/**
 * @module composables/useKeyboardShortcuts
 * Handles global keyboard shortcuts for camera animation control.
 * Provides ESC key handling for cancelling camera flights.
 */

import { onBeforeUnmount, onMounted } from 'vue'
import { useGlobalStore } from '../stores/globalStore.js'
import logger from '../utils/logger.js'

/**
 * Vue 3 composable for keyboard shortcut handling
 * Implements ESC key handling for camera animation cancellation.
 *
 * Features:
 * - ESC key cancellation of camera flights
 * - State-aware activation (only when canCancel is true)
 * - Automatic registration/cleanup via lifecycle hooks
 * - Camera service integration for flight cancellation
 *
 * @param {any} Camera - Camera service class reference
 * @returns {{
 *   handleCancelAnimation: () => void
 * }} Keyboard shortcut handlers
 *
 * @example
 * import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts';
 * const { handleCancelAnimation } = useKeyboardShortcuts(Camera);
 */
export function useKeyboardShortcuts(Camera) {
	const store = useGlobalStore()

	/**
	 * Handles cancellation of camera animation via ESC key or button.
	 * Restores previous view state and resets click processing state.
	 *
	 * @returns {void}
	 */
	const handleCancelAnimation = () => {
		logger.debug('[useKeyboardShortcuts] User requested animation cancellation')

		if (!Camera) {
			logger.warn('[useKeyboardShortcuts] Camera module not loaded yet')
			return
		}

		const camera = new Camera()
		const wasCancelled = camera.cancelFlight()

		if (wasCancelled) {
			logger.debug('[useKeyboardShortcuts] Animation cancelled successfully')
			// Camera service handles state restoration via callbacks
		} else {
			logger.warn('[useKeyboardShortcuts] No active flight to cancel')
			// Still reset state to clear UI
			store.resetClickProcessingState()
		}
	}

	/**
	 * Global ESC key handler for animation cancellation.
	 * Only active when canCancel is true to avoid interfering with other ESC key uses.
	 *
	 * @param {KeyboardEvent} event - Keyboard event
	 * @returns {void}
	 */
	const handleGlobalEscKey = (event) => {
		if (event.key === 'Escape' && store.clickProcessingState.canCancel) {
			handleCancelAnimation()
		}
	}

	onMounted(() => {
		// Register ESC key handler for animation cancellation
		document.addEventListener('keydown', handleGlobalEscKey)
		logger.debug('[useKeyboardShortcuts] ⌨️ ESC key handler registered')
	})

	onBeforeUnmount(() => {
		// Clean up ESC key handler
		document.removeEventListener('keydown', handleGlobalEscKey)
		logger.debug('[useKeyboardShortcuts] 🧹 ESC key handler removed')
	})

	return {
		handleCancelAnimation,
	}
}
