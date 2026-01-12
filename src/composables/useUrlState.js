/**
 * @module composables/useUrlState
 * Handles URL query parameter state management for map position and navigation.
 * Enables deep linking and page refresh without losing map position.
 *
 * URL Parameters:
 * - lon: Camera longitude in degrees
 * - lat: Camera latitude in degrees
 * - alt: Camera altitude in meters
 * - heading: Camera heading in degrees (0 = North)
 * - pitch: Camera pitch in degrees (negative = looking down)
 * - level: Navigation level ('start', 'postalcode', 'building')
 * - postalcode: Selected postal code (e.g., '00100')
 * - date: Heat data date (e.g., '2022-06-28')
 */

import * as Cesium from 'cesium'
import { ref } from 'vue'
import { useGlobalStore } from '../stores/globalStore.js'
import logger from '../utils/logger.js'

// Debounce timer for URL updates
let urlUpdateTimer = null
const URL_UPDATE_DEBOUNCE_MS = 500

/**
 * Vue 3 composable for URL state management
 * Handles reading and writing map state to/from URL query parameters.
 *
 * @returns {{
 *   hasUrlState: import('vue').Ref<boolean>,
 *   getUrlState: () => Object|null,
 *   restoreStateFromUrl: (viewer: any) => Promise<boolean>,
 *   updateUrlFromCamera: (viewer: any) => void,
 *   updateUrlFromNavigation: (options: Object) => void,
 *   clearUrlState: () => void
 * }}
 */
export function useUrlState() {
	const store = useGlobalStore()
	const hasUrlState = ref(false)

	/**
	 * Parses current URL and extracts map state parameters
	 * @returns {Object|null} Parsed state object or null if no state in URL
	 */
	const getUrlState = () => {
		const params = new URLSearchParams(window.location.search)

		// Check if we have any camera state parameters
		const lon = params.get('lon')
		const lat = params.get('lat')

		if (!lon || !lat) {
			return null
		}

		const state = {
			camera: {
				longitude: parseFloat(lon),
				latitude: parseFloat(lat),
				altitude: parseFloat(params.get('alt')) || 4000,
				heading: parseFloat(params.get('heading')) || 0,
				pitch: parseFloat(params.get('pitch')) || -35,
			},
			navigation: {
				level: params.get('level') || 'start',
				postalcode: params.get('postalcode') || null,
				date: params.get('date') || null,
			},
		}

		// Validate numeric values
		if (
			Number.isNaN(state.camera.longitude) ||
			Number.isNaN(state.camera.latitude) ||
			Number.isNaN(state.camera.altitude)
		) {
			logger.warn('[useUrlState] Invalid numeric values in URL parameters')
			return null
		}

		// Validate longitude/latitude ranges
		if (
			state.camera.longitude < -180 ||
			state.camera.longitude > 180 ||
			state.camera.latitude < -90 ||
			state.camera.latitude > 90
		) {
			logger.warn('[useUrlState] Longitude/latitude values out of range')
			return null
		}

		hasUrlState.value = true
		return state
	}

	/**
	 * Restores map state from URL parameters
	 * Sets camera position and navigation state based on URL.
	 *
	 * @param {Object} viewer - Cesium viewer instance
	 * @param {Object} featurepickerClass - Featurepicker class for postal code loading
	 * @returns {Promise<boolean>} True if state was restored, false otherwise
	 */
	const restoreStateFromUrl = async (viewer, featurepickerClass) => {
		const state = getUrlState()

		if (!state) {
			logger.debug('[useUrlState] No URL state to restore')
			return false
		}

		logger.debug('[useUrlState] Restoring state from URL:', state)

		// Restore camera position immediately (no animation on page load)
		if (viewer?.camera) {
			viewer.camera.setView({
				destination: Cesium.Cartesian3.fromDegrees(
					state.camera.longitude,
					state.camera.latitude,
					state.camera.altitude
				),
				orientation: {
					heading: Cesium.Math.toRadians(state.camera.heading),
					pitch: Cesium.Math.toRadians(state.camera.pitch),
					roll: 0.0,
				},
			})
			logger.debug('[useUrlState] Camera position restored')
		}

		// Restore navigation state
		// Normalize level value - URL may have lowercase 'postalcode' but store uses 'postalCode'
		const normalizedLevel =
			state.navigation.level === 'postalcode' ? 'postalCode' : state.navigation.level

		if (normalizedLevel && normalizedLevel !== 'start') {
			store.setLevel(normalizedLevel)

			if (state.navigation.postalcode) {
				store.setPostalCode(state.navigation.postalcode)

				// Load postal code data if we're at postal code or building level
				if (
					featurepickerClass &&
					(normalizedLevel === 'postalCode' || normalizedLevel === 'building')
				) {
					try {
						const featurepicker = new featurepickerClass()
						// Load postal code data without camera animation (we already set camera position)
						await featurepicker.loadPostalCodeData(state.navigation.postalcode, {
							skipCameraAnimation: true,
						})
						logger.debug('[useUrlState] Postal code data loaded:', state.navigation.postalcode)
					} catch (error) {
						logger.error('[useUrlState] Failed to load postal code data:', error)
					}
				}
			}
		}

		// Restore heat data date if specified
		if (state.navigation.date && store.minMaxKelvin[state.navigation.date]) {
			store.setHeatDataDate(state.navigation.date)
			logger.debug('[useUrlState] Heat data date restored:', state.navigation.date)
		}

		return true
	}

	/**
	 * Updates URL query parameters from current camera state
	 * Debounced to avoid excessive URL updates during camera movement.
	 *
	 * @param {Object} viewer - Cesium viewer instance
	 */
	const updateUrlFromCamera = (viewer) => {
		if (!viewer || !viewer.camera) {
			return
		}

		// Clear existing timer
		if (urlUpdateTimer) {
			clearTimeout(urlUpdateTimer)
		}

		// Debounce URL updates
		urlUpdateTimer = setTimeout(() => {
			const camera = viewer.camera
			const cartographic = Cesium.Cartographic.fromCartesian(camera.position)

			const params = new URLSearchParams(window.location.search)

			// Update camera position parameters
			params.set('lon', Cesium.Math.toDegrees(cartographic.longitude).toFixed(6))
			params.set('lat', Cesium.Math.toDegrees(cartographic.latitude).toFixed(6))
			params.set('alt', Math.round(cartographic.height))
			params.set('heading', Math.round(Cesium.Math.toDegrees(camera.heading)))
			params.set('pitch', Math.round(Cesium.Math.toDegrees(camera.pitch)))

			// Preserve navigation state (use lowercase in URL for consistency)
			if (store.level && store.level !== 'start') {
				// Convert 'postalCode' to 'postalcode' for URL
				const urlLevel = store.level === 'postalCode' ? 'postalcode' : store.level.toLowerCase()
				params.set('level', urlLevel)
			} else {
				params.delete('level')
			}

			if (store.postalcode) {
				params.set('postalcode', store.postalcode)
			} else {
				params.delete('postalcode')
			}

			// Preserve heat data date if not default
			if (store.heatDataDate && store.heatDataDate !== '2022-06-28') {
				params.set('date', store.heatDataDate)
			} else {
				params.delete('date')
			}

			// Update URL without page reload
			const newUrl = `${window.location.pathname}?${params.toString()}`
			window.history.replaceState({ path: newUrl }, '', newUrl)

			logger.debug('[useUrlState] URL updated with camera state')
		}, URL_UPDATE_DEBOUNCE_MS)
	}

	/**
	 * Updates URL query parameters for navigation state changes
	 * Called when postal code is selected or navigation level changes.
	 *
	 * @param {Object} options - Navigation state options
	 * @param {string} [options.level] - Navigation level
	 * @param {string} [options.postalcode] - Selected postal code
	 * @param {string} [options.date] - Heat data date
	 */
	const updateUrlFromNavigation = (options = {}) => {
		const params = new URLSearchParams(window.location.search)

		// Update navigation parameters
		if (options.level !== undefined) {
			if (options.level && options.level !== 'start') {
				params.set('level', options.level)
			} else {
				params.delete('level')
			}
		}

		if (options.postalcode !== undefined) {
			if (options.postalcode) {
				params.set('postalcode', options.postalcode)
			} else {
				params.delete('postalcode')
			}
		}

		if (options.date !== undefined) {
			if (options.date && options.date !== '2022-06-28') {
				params.set('date', options.date)
			} else {
				params.delete('date')
			}
		}

		// Update URL without page reload
		const newUrl = `${window.location.pathname}?${params.toString()}`
		window.history.replaceState({ path: newUrl }, '', newUrl)

		logger.debug('[useUrlState] URL updated with navigation state:', options)
	}

	/**
	 * Clears all map state from URL
	 * Used when returning to start view or resetting the application.
	 */
	const clearUrlState = () => {
		// Clear debounce timer
		if (urlUpdateTimer) {
			clearTimeout(urlUpdateTimer)
		}

		// Remove all map state parameters
		const newUrl = window.location.pathname
		window.history.replaceState({ path: newUrl }, '', newUrl)
		hasUrlState.value = false

		logger.debug('[useUrlState] URL state cleared')
	}

	return {
		hasUrlState,
		getUrlState,
		restoreStateFromUrl,
		updateUrlFromCamera,
		updateUrlFromNavigation,
		clearUrlState,
	}
}
