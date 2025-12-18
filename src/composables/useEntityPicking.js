/**
 * @module composables/useEntityPicking
 * Handles click event handling and entity picking on the Cesium map.
 * Implements drag detection, click debouncing, and feature selection.
 */

import { ref } from 'vue'
import { TIMING } from '../constants/timing.js'
import { useGlobalStore } from '../stores/globalStore.js'
import logger from '../utils/logger.js'

/**
 * Vue 3 composable for entity picking and click handling
 * Implements drag detection, click filtering, and debouncing for feature selection.
 *
 * Features:
 * - Drag detection to differentiate clicks from pans (5px threshold)
 * - Click filtering for control panel and timeline elements
 * - 500ms minimum interval between picks to prevent rapid-fire
 * - Temporary hiding of building info during processing
 *
 * @param {any} Featurepicker - Featurepicker service class
 * @returns {{
 *   addFeaturePicker: () => void,
 *   lastPickTime: import('vue').Ref<number>
 * }} Entity picking functions and state
 *
 * @example
 * import { useEntityPicking } from '@/composables/useEntityPicking';
 * const { addFeaturePicker } = useEntityPicking(Featurepicker);
 * addFeaturePicker();
 */
export function useEntityPicking(Featurepicker) {
	const store = useGlobalStore()
	const lastPickTime = ref(0)

	/**
	 * Registers click event handler for feature picking on the map.
	 * Implements drag detection to differentiate clicks from pans.
	 * Debounces clicks to prevent rapid-fire selections.
	 *
	 * Drag Detection:
	 * - Tracks mousedown position
	 * - Calculates distance moved between mousedown and mouseup
	 * - Ignores events where movement exceeds 5px threshold
	 *
	 * Click Filtering:
	 * - Ignores clicks on control panel and time series elements
	 * - Enforces 500ms minimum interval between picks
	 * - Temporarily hides building info during processing
	 *
	 * @returns {void}
	 */
	const addFeaturePicker = () => {
		if (!Featurepicker) {
			logger.warn('[useEntityPicking] Cannot add feature picker - Featurepicker not loaded')
			return
		}

		const cesiumContainer = document.getElementById('cesiumContainer')
		if (!cesiumContainer) {
			logger.warn('[useEntityPicking] Cannot add feature picker - cesiumContainer not found')
			return
		}

		const featurepicker = new Featurepicker()
		logger.debug('[useEntityPicking] ✅ FeaturePicker click handler added')

		// Drag detection: track mouse position to differentiate clicks from drags
		let mouseDownPosition = null
		const DRAG_THRESHOLD = 5 // pixels - movement beyond this is considered a drag

		// Track mouse down position
		cesiumContainer.addEventListener('mousedown', (event) => {
			mouseDownPosition = { x: event.clientX, y: event.clientY }
		})

		cesiumContainer.addEventListener('click', (event) => {
			const controlPanelElement = document.querySelector('.control-panel-main')
			const timeSeriesElement = document.querySelector('#heatTimeseriesContainer')
			const isClickOnControlPanel = controlPanelElement?.contains(event.target)
			const isClickOnTimeSeries = timeSeriesElement?.contains(event.target)
			const currentTime = Date.now()

			logger.debug('[useEntityPicking] 🖱️ Cesium click detected')
			logger.debug('[useEntityPicking] Click on control panel:', isClickOnControlPanel)
			logger.debug('[useEntityPicking] Click on time series:', isClickOnTimeSeries)
			logger.debug('[useEntityPicking] Time since last pick:', currentTime - lastPickTime.value)

			// Check if this was a drag (mouse moved significantly between mousedown and mouseup)
			if (mouseDownPosition) {
				const dx = event.clientX - mouseDownPosition.x
				const dy = event.clientY - mouseDownPosition.y
				const distance = Math.sqrt(dx * dx + dy * dy)

				if (distance > DRAG_THRESHOLD) {
					logger.debug(
						'[useEntityPicking] ⚠️ Click ignored - detected as drag (moved',
						distance.toFixed(1),
						'px)'
					)
					mouseDownPosition = null
					return
				}
			}
			mouseDownPosition = null

			if (
				!isClickOnControlPanel &&
				!isClickOnTimeSeries &&
				currentTime - lastPickTime.value > TIMING.CLICK_THROTTLE_MS
			) {
				logger.debug('[useEntityPicking] ✅ Processing click through FeaturePicker')
				store.setShowBuildingInfo(false)
				if (!store.showBuildingInfo) {
					featurepicker.processClick(event)
				}
				lastPickTime.value = currentTime // Update the last pick time
				setTimeout(() => {
					store.setShowBuildingInfo(true)
				}, 1000)
			} else {
				logger.debug('[useEntityPicking] ⚠️ Click ignored due to conditions')
			}
		})
	}

	return {
		addFeaturePicker,
		lastPickTime,
	}
}
