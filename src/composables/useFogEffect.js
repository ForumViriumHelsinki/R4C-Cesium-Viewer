/**
 * @module composables/useFogEffect
 * Manages a CSS overlay effect based on camera altitude.
 * Overlay appears above 3000m (building loading threshold) and fades as you zoom in,
 * providing a natural visual indicator that buildings won't load until zoomed in.
 */

import { VIEWPORT } from '../constants/viewport.js'
import logger from '../utils/logger.js'

/**
 * Configuration for altitude-based overlay effect
 */
const OVERLAY_CONFIG = {
	/** Altitude where overlay starts appearing (meters) - matches building loading threshold */
	START_HEIGHT: VIEWPORT.FOG_START_HEIGHT,
	/** Altitude where overlay reaches maximum opacity (meters) */
	FULL_HEIGHT: VIEWPORT.FOG_FULL_HEIGHT,
	/** Maximum overlay opacity (0-1) */
	MAX_OPACITY: 0.4,
	/** Minimum overlay opacity (no overlay below threshold) */
	MIN_OPACITY: 0,
	/** Debounce delay for overlay updates (ms) */
	UPDATE_DEBOUNCE_MS: 50,
	/** Transition duration for smooth opacity changes (ms) */
	TRANSITION_MS: 300,
}

/**
 * Calculate overlay opacity based on camera altitude.
 * Uses quadratic easing for natural appearance.
 *
 * @param {number} altitude - Camera altitude in meters
 * @returns {number} Overlay opacity value (0-1)
 */
const calculateOverlayOpacity = (altitude) => {
	if (altitude <= OVERLAY_CONFIG.START_HEIGHT) {
		return OVERLAY_CONFIG.MIN_OPACITY
	}

	if (altitude >= OVERLAY_CONFIG.FULL_HEIGHT) {
		return OVERLAY_CONFIG.MAX_OPACITY
	}

	// Linear interpolation between start and full height
	const t =
		(altitude - OVERLAY_CONFIG.START_HEIGHT) /
		(OVERLAY_CONFIG.FULL_HEIGHT - OVERLAY_CONFIG.START_HEIGHT)

	// Use easeInQuad for gradual appearance
	const easedT = t * t

	return (
		OVERLAY_CONFIG.MIN_OPACITY + (OVERLAY_CONFIG.MAX_OPACITY - OVERLAY_CONFIG.MIN_OPACITY) * easedT
	)
}

/**
 * Vue 3 composable for altitude-based CSS overlay effect
 *
 * @param {any} viewer - Cesium viewer instance
 * @returns {{
 *   initFog: () => void,
 *   cleanup: () => void
 * }}
 *
 * @example
 * import { useFogEffect } from '@/composables/useFogEffect';
 * const { initFog, cleanup } = useFogEffect(viewer.value);
 * initFog();
 * // Later: cleanup() in onBeforeUnmount
 */
export function useFogEffect(viewer) {
	let cameraChangedHandler = null
	let updateDebounceTimeout = null
	let overlayElement = null

	/**
	 * Create and inject the overlay element into the Cesium container
	 */
	const createOverlayElement = () => {
		const cesiumContainer = document.getElementById('cesiumContainer')
		if (!cesiumContainer) {
			logger.warn('[useFogEffect] Cannot create overlay - cesiumContainer not found')
			return null
		}

		// Create overlay element
		const overlay = document.createElement('div')
		overlay.id = 'altitude-fog-overlay'
		overlay.style.cssText = `
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: linear-gradient(
				to bottom,
				rgba(180, 195, 210, 0.7) 0%,
				rgba(200, 210, 220, 0.4) 50%,
				rgba(220, 225, 230, 0.2) 100%
			);
			pointer-events: none;
			opacity: 0;
			transition: opacity ${OVERLAY_CONFIG.TRANSITION_MS}ms ease-out;
			z-index: 10;
		`

		cesiumContainer.appendChild(overlay)
		return overlay
	}

	/**
	 * Update overlay opacity based on current camera altitude.
	 * Called on camera change events with debouncing.
	 */
	const updateOverlayFromAltitude = () => {
		if (!viewer?.camera?.positionCartographic || !overlayElement) return

		const altitude = viewer.camera.positionCartographic.height
		const opacity = calculateOverlayOpacity(altitude)

		overlayElement.style.opacity = opacity.toString()

		logger.debug(
			`[useFogEffect] Altitude: ${Math.round(altitude)}m, Overlay opacity: ${opacity.toFixed(2)}`
		)
	}

	/**
	 * Debounced overlay update handler
	 */
	const debouncedOverlayUpdate = () => {
		if (updateDebounceTimeout) {
			clearTimeout(updateDebounceTimeout)
		}
		updateDebounceTimeout = setTimeout(updateOverlayFromAltitude, OVERLAY_CONFIG.UPDATE_DEBOUNCE_MS)
	}

	/**
	 * Initialize overlay effect with camera event listener
	 */
	const initFog = () => {
		if (!viewer?.camera) {
			logger.warn('[useFogEffect] Cannot init overlay - viewer not ready')
			return
		}

		// Create the overlay element
		overlayElement = createOverlayElement()
		if (!overlayElement) return

		// Set initial overlay state
		updateOverlayFromAltitude()

		// Listen for camera changes
		cameraChangedHandler = debouncedOverlayUpdate
		viewer.camera.changed.addEventListener(cameraChangedHandler)

		logger.debug('[useFogEffect] Overlay effect initialized')
	}

	/**
	 * Clean up event listeners, timeouts, and DOM element
	 */
	const cleanup = () => {
		if (updateDebounceTimeout) {
			clearTimeout(updateDebounceTimeout)
			updateDebounceTimeout = null
		}

		if (viewer?.camera && cameraChangedHandler) {
			viewer.camera.changed.removeEventListener(cameraChangedHandler)
			cameraChangedHandler = null
		}

		if (overlayElement) {
			overlayElement.remove()
			overlayElement = null
		}

		logger.debug('[useFogEffect] Overlay effect cleaned up')
	}

	return {
		initFog,
		cleanup,
	}
}
