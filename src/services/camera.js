import { POSTAL_CODE_ZOOM } from '../constants/viewport.js'
import { useGlobalStore } from '../stores/globalStore.js'
import logger from '../utils/logger.js'
import { getCesium } from './cesiumProvider.js'
import { postalCodeIndex } from './postalCodeIndex.js'

/**
 * Earth radius in meters (mean radius) — used by the haversine helper.
 * @private
 */
const EARTH_RADIUS_M = 6371000

/**
 * Computes great-circle distance between two lon/lat points in meters
 * using the haversine formula. Used to derive bbox diagonal length.
 *
 * @param {number} lon1 - First point longitude in degrees
 * @param {number} lat1 - First point latitude in degrees
 * @param {number} lon2 - Second point longitude in degrees
 * @param {number} lat2 - Second point latitude in degrees
 * @returns {number} Distance in meters
 * @private
 */
function haversineMeters(lon1, lat1, lon2, lat2) {
	const Cesium = getCesium()
	const dLat = Cesium.Math.toRadians(lat2 - lat1)
	const dLon = Cesium.Math.toRadians(lon2 - lon1)
	const lat1Rad = Cesium.Math.toRadians(lat1)
	const lat2Rad = Cesium.Math.toRadians(lat2)
	const a =
		Math.sin(dLat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2
	return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
}

/**
 * Computes camera altitude in meters that frames a postal-code polygon nicely.
 * Derives the polygon's geodesic bounding box, takes its diagonal length,
 * scales by the per-view-type factor, then clamps to MIN/MAX bounds.
 *
 * Falls back to FALLBACK_ALTITUDE if the polygon hierarchy cannot be read
 * (e.g. mocked entities in tests, missing geometry).
 *
 * @param {Object} entity - Cesium postal-code entity (with `polygon.hierarchy`)
 * @param {number} scale - View-specific multiplier (see POSTAL_CODE_ZOOM.SCALE_*)
 * @returns {number} Altitude in meters, clamped to [MIN_ALTITUDE, MAX_ALTITUDE]
 */
export function computePostalCodeAltitude(entity, scale) {
	const Cesium = getCesium()
	const hierarchy = entity?.polygon?.hierarchy
	const positions =
		typeof hierarchy?.getValue === 'function'
			? hierarchy.getValue(Cesium.JulianDate?.now?.())?.positions
			: hierarchy?.positions

	if (!positions || positions.length === 0) {
		logger.debug('[Camera] No polygon hierarchy on entity; using fallback altitude')
		return POSTAL_CODE_ZOOM.FALLBACK_ALTITUDE
	}

	// Cesium.Rectangle.fromCartesianArray returns west/east/south/north in radians and
	// handles the antimeridian edge case correctly — preferable to a hand-rolled bbox
	// loop over Cartographic.fromCartesian calls.
	const rectangle = Cesium.Rectangle.fromCartesianArray(positions)
	if (!rectangle) {
		logger.debug('[Camera] Polygon bbox computation failed; using fallback altitude')
		return POSTAL_CODE_ZOOM.FALLBACK_ALTITUDE
	}

	const minLon = Cesium.Math.toDegrees(rectangle.west)
	const maxLon = Cesium.Math.toDegrees(rectangle.east)
	const minLat = Cesium.Math.toDegrees(rectangle.south)
	const maxLat = Cesium.Math.toDegrees(rectangle.north)

	const diagonalMeters = haversineMeters(minLon, minLat, maxLon, maxLat)
	const altitude = diagonalMeters * scale

	return Math.min(POSTAL_CODE_ZOOM.MAX_ALTITUDE, Math.max(POSTAL_CODE_ZOOM.MIN_ALTITUDE, altitude))
}

/**
 * Camera Service
 * Manages CesiumJS camera operations including view modes, navigation, zoom, rotation,
 * and focus on geographic areas. Provides utilities for 2D/3D view transitions
 * and postal code-based camera positioning.
 *
 * Features:
 * - Supports cancellable camera animations (ESC key support)
 * - State tracking for click processing integration
 * - View state capture and restoration
 *
 * @class Camera
 */
export default class Camera {
	/**
	 * Creates a Camera service instance
	 */
	constructor() {
		this.store = useGlobalStore()
		this.viewer = this.store.cesiumViewer
		this.isRotated = false // Track rotation state for 180° rotations
		this.currentFlight = null // Track active camera flight for cancellation
		this.flightCancelRequested = false // Flag indicating cancellation was requested
		this.previousCameraState = null // Captured camera state for restoration
	}

	/**
	 * Cancels the current camera flight animation
	 * Sets the cancelFlight property on the active flight promise if one exists.
	 *
	 * @returns {boolean} True if cancellation was initiated, false if no active flight
	 */
	cancelFlight() {
		if (this.currentFlight && !this.flightCancelRequested) {
			this.currentFlight.cancelFlight = true
			this.flightCancelRequested = true
			logger.debug('[Camera] Flight cancellation requested')
			return true
		}
		logger.debug('[Camera] No active flight to cancel')
		return false
	}

	/**
	 * Captures current camera state for potential restoration
	 * Stores position and orientation for use if flight is cancelled.
	 */
	captureCurrentState() {
		if (!this.viewer || this.viewer.isDestroyed?.()) {
			logger.warn('[Camera] Cannot capture camera state: Viewer not initialized')
			return
		}

		const camera = this.viewer.camera
		this.previousCameraState = {
			position: camera.position.clone(),
			heading: camera.heading,
			pitch: camera.pitch,
			roll: camera.roll,
		}

		logger.debug('[Camera] Camera state captured for restoration')
	}

	/**
	 * Restores previously captured camera state
	 * Used when camera flight is cancelled to return to previous view.
	 */
	restoreCapturedState() {
		if (!this.previousCameraState) {
			logger.warn('[Camera] No previous camera state to restore')
			return
		}

		if (!this.viewer || this.viewer.isDestroyed?.()) {
			logger.warn('[Camera] Cannot restore camera state: Viewer not initialized')
			return
		}

		this.viewer.camera.setView({
			destination: this.previousCameraState.position,
			orientation: {
				heading: this.previousCameraState.heading,
				pitch: this.previousCameraState.pitch,
				roll: this.previousCameraState.roll,
			},
		})

		logger.debug('[Camera] Previous camera state restored')
	}

	/**
	 * Handles flight completion callback
	 * Cleans up flight tracking and resets cancellation flags.
	 * @private
	 */
	onFlightComplete() {
		logger.debug('[Camera] Flight completed')
		this.currentFlight = null
		this.flightCancelRequested = false
		this.previousCameraState = null

		// Update store state if click processing is active
		if (this.store.clickProcessingState.isProcessing) {
			this.store.setClickProcessingState({
				stage: 'complete',
				canCancel: false,
			})
		}
	}

	/**
	 * Handles flight cancellation callback
	 * Restores previous view state and updates store.
	 * @private
	 */
	onFlightCancelled() {
		logger.debug('[Camera] Flight cancelled')

		// Restore camera position
		this.restoreCapturedState()

		// Restore application state
		this.store.restorePreviousViewState()

		// Clean up
		this.currentFlight = null
		this.flightCancelRequested = false

		// Reset click processing state
		this.store.resetClickProcessingState()
	}

	/**
	 * Initializes the camera to default Helsinki region view
	 * Sets camera position to Helsinki capital region with top-down perspective.
	 *
	 * @returns {void}
	 */
	init() {
		if (!this.viewer || this.viewer.isDestroyed?.()) return
		const Cesium = getCesium()
		this.viewer.camera.setView({
			destination: Cesium.Cartesian3.fromDegrees(24.945, 60.17, 2800),
			orientation: {
				heading: Cesium.Math.toRadians(0.0),
				pitch: Cesium.Math.toRadians(-35.0),
				roll: 0.0,
			},
		})
	}

	/**
	 * Switches camera to 2D top-down view of the current postal code
	 * Flies camera to postal code center with 90° pitch (directly overhead).
	 * Uses PostalCodeIndex for O(1) entity lookup.
	 *
	 * @returns {void}
	 */
	switchTo2DView() {
		// Guard: Check viewer is initialized
		if (!this.viewer || this.viewer.isDestroyed?.() || !this.viewer.dataSources) {
			logger.warn('[Camera] Cannot switch to 2D view: Viewer not initialized')
			return
		}

		// O(1) lookup using postal code index
		const entity = postalCodeIndex.getByPostalCode(this.store.postalcode)

		if (!entity) {
			logger.warn(`[Camera] Postal code ${this.store.postalcode} not found for 2D view`)
			this.store.showError(
				'Unable to navigate to postal code area.',
				`Postal code ${this.store.postalcode} not found in index for 2D view`
			)
			return
		}

		// Adaptive altitude based on the postal-code polygon bbox (#678).
		// Larger areas zoom out further; smaller dense areas zoom in closer.
		// Clamped to MIN/MAX so sea-adjacent postal codes don't explode the view.
		const Cesium = getCesium()
		const altitude = computePostalCodeAltitude(entity, POSTAL_CODE_ZOOM.SCALE_2D)
		this.viewer.camera.flyTo({
			destination: Cesium.Cartesian3.fromDegrees(
				entity._properties._center_x._value,
				entity._properties._center_y._value,
				altitude
			),
			orientation: {
				heading: Cesium.Math.toRadians(0.0),
				pitch: Cesium.Math.toRadians(-90.0),
			},
			duration: 3,
		})
	}

	/**
	 * Switches camera to 3D perspective view of the current postal code
	 * Flies camera to postal code center with 35° pitch (angled perspective).
	 * Applies slight latitude offset for better framing.
	 * Supports cancellation and state tracking for UX improvements.
	 * Uses PostalCodeIndex for O(1) entity lookup.
	 *
	 * @returns {void}
	 */
	switchTo3DView() {
		// Guard: Check viewer is initialized
		if (!this.viewer || this.viewer.isDestroyed?.() || !this.viewer.dataSources) {
			logger.warn('[Camera] Cannot switch to 3D view: Viewer not initialized')
			return
		}

		// Capture current camera state before starting flight
		this.captureCurrentState()

		// O(1) lookup using postal code index
		const entity = postalCodeIndex.getByPostalCode(this.store.postalcode)

		if (!entity) {
			logger.warn(`[Camera] Postal code ${this.store.postalcode} not found for 3D view`)
			this.store.showError(
				'Unable to navigate to postal code area.',
				`Postal code ${this.store.postalcode} not found in index for 3D view`
			)
			return
		}

		// Update state to animating stage
		if (this.store.clickProcessingState.isProcessing) {
			this.store.setClickProcessingState({
				stage: 'animating',
				canCancel: true,
			})
		}

		// Fly to postal code with 3D perspective
		// Adaptive altitude (#678) — oblique view uses a smaller scale than 2D top-down.
		const Cesium = getCesium()
		const altitude = computePostalCodeAltitude(entity, POSTAL_CODE_ZOOM.SCALE_3D)
		this.currentFlight = this.viewer.camera.flyTo({
			destination: Cesium.Cartesian3.fromDegrees(
				entity._properties._center_x._value,
				entity._properties._center_y._value - 0.025,
				altitude
			),
			orientation: {
				heading: 0.0,
				pitch: Cesium.Math.toRadians(-35.0),
				roll: 0.0,
			},
			duration: 3,
			complete: () => this.onFlightComplete(),
			cancel: () => this.onFlightCancelled(),
		})

		logger.debug('[Camera] 3D view flight initiated')
	}

	/**
	 * Switches to 3D grid view mode
	 * Either flies to default Helsinki position (start level) or maintains current position
	 * while adjusting orientation. Preserves altitude and resets level state.
	 *
	 * @returns {void}
	 */
	switchTo3DGrid() {
		if (!this.viewer || this.viewer.isDestroyed?.()) return
		if (this.store.level === 'start') {
			this.flyCamera3D(24.991745, 60.045, 12000)
		} else {
			const Cesium = getCesium()
			// Get the current camera and its center coordinates
			const camera = this.viewer.scene.camera
			const centerCartographic = camera.positionCartographic

			// Get current longitude, latitude, and altitude from the camera's current center position
			const centerLongitude = Cesium.Math.toDegrees(centerCartographic.longitude)
			const centerLatitude = Cesium.Math.toDegrees(centerCartographic.latitude)
			const currentAltitude = centerCartographic.height // Get current altitude

			// Fly the camera to the current center position, preserving altitude and orientation
			this.viewer.camera.flyTo({
				destination: Cesium.Cartesian3.fromDegrees(
					centerLongitude,
					centerLatitude,
					currentAltitude
				), // Use current altitude
				orientation: {
					heading: 0.0,
					pitch: Cesium.Math.toRadians(-35.0),
					roll: 0.0,
				},
				duration: 1, // Animation duration in seconds
			})

			this.store.setLevel(null)
		}
	}

	/**
	 * Flies camera to specified coordinates in 3D perspective mode
	 * Quick 1-second animation to geographic position with default 3D orientation.
	 *
	 * @param {number} lat - Latitude in degrees
	 * @param {number} long - Longitude in degrees
	 * @param {number} z - Altitude/height in meters
	 * @returns {void}
	 */
	flyCamera3D(lat, long, z) {
		if (!this.viewer || this.viewer.isDestroyed?.()) return
		const Cesium = getCesium()
		this.viewer.camera.flyTo({
			destination: Cesium.Cartesian3.fromDegrees(lat, long, z),
			orientation: {
				heading: 0.0,
				pitch: Cesium.Math.toRadians(-35.0),
				roll: 0.0,
			},
			duration: 1,
		})
	}

	/**
	 * Sets camera view to specific coordinates instantly (no animation)
	 * Positions camera at building-level altitude (500m) with slight latitude offset.
	 * Uses immediate setView rather than animated flyTo.
	 *
	 * @param {number} longitude - Longitude in degrees
	 * @param {number} latitude - Latitude in degrees
	 * @returns {void}
	 */
	setCameraView(longitude, latitude) {
		const store = useGlobalStore()
		const viewer = store.cesiumViewer
		if (!viewer || viewer.isDestroyed?.()) return
		const Cesium = getCesium()
		viewer.camera.setView({
			destination: Cesium.Cartesian3.fromDegrees(longitude, latitude - 0.0065, 500.0),
			orientation: {
				heading: 0.0,
				pitch: Cesium.Math.toRadians(-35.0),
				roll: 0.0,
			},
		})
	}

	/**
	 * Zooms the camera in or out based on multiplier value
	 * Calculates zoom distance based on current altitude and multiplier.
	 *
	 * @param {number} multiplier - Zoom factor (>1 zooms in, <1 zooms out, 1 = no change)
	 * @returns {void}
	 */
	zoom(multiplier) {
		if (!this.viewer || this.viewer.isDestroyed?.()) return
		if (multiplier > 1) {
			// Zoom in: move camera closer to ground
			this.viewer.camera.zoomIn(
				this.viewer.camera.positionCartographic.height * (1 - 1 / multiplier)
			)
		} else {
			// Zoom out: move camera further from ground
			this.viewer.camera.zoomOut(this.viewer.camera.positionCartographic.height * (1 - multiplier))
		}
	}

	/**
	 * Rotates camera to specific compass heading with animation
	 * Maintains current position, pitch, and roll while changing heading.
	 *
	 * @param {number} headingInDegrees - Target heading (0° = North, 90° = East, 180° = South, 270° = West)
	 * @param {boolean} reduceMotion - If true, use instant view change instead of animation
	 * @returns {void}
	 */
	setHeading(headingInDegrees, reduceMotion = false) {
		if (!this.viewer || this.viewer.isDestroyed?.()) return
		const Cesium = getCesium()
		const orientation = {
			heading: Cesium.Math.toRadians(headingInDegrees),
			pitch: this.viewer.camera.pitch, // Keep current pitch
			roll: this.viewer.camera.roll, // Keep current roll
		}

		if (reduceMotion) {
			// Instant change for users who prefer reduced motion
			this.viewer.camera.setView({
				destination: this.viewer.camera.position,
				orientation,
			})
		} else {
			// Animated transition for standard users
			this.viewer.camera.flyTo({
				destination: this.viewer.camera.position,
				orientation,
				duration: 1.0, // Animation duration in seconds
			})
		}
	}

	/**
	 * Resets the camera orientation to face North with a default pitch.
	 */
	resetNorth() {
		if (!this.viewer || this.viewer.isDestroyed?.()) return
		const Cesium = getCesium()
		this.viewer.camera.flyTo({
			destination: this.viewer.camera.position,
			orientation: {
				heading: Cesium.Math.toRadians(0),
				pitch: Cesium.Math.toRadians(-35.0), // Default 3D pitch
				roll: 0.0,
			},
			duration: 1.0,
		})
	}

	/**
	 * Focuses camera on a specific postal code area
	 * Uses PostalCodeIndex for O(1) lookup and flies camera to its center.
	 * Applies latitude offset for better framing and uses 45° pitch.
	 *
	 * @param {string|number} postalCode - Postal code to focus on
	 * @returns {void}
	 */
	focusOnPostalCode(postalCode) {
		// Guard: Check viewer is initialized
		if (!this.viewer || this.viewer.isDestroyed?.()) {
			logger.warn('[Camera] Cannot focus on postal code: Viewer not initialized')
			return
		}

		// O(1) lookup using postal code index
		const entity = postalCodeIndex.getByPostalCode(postalCode)

		if (!entity) {
			logger.warn(`[Camera] Postal code ${postalCode} not found in index`)
			this.store.showError(
				'Unable to navigate to postal code area.',
				`Postal code ${postalCode} not found in index`
			)
			return
		}

		// Verify entity has required center coordinates
		if (!entity._properties._center_x || !entity._properties._center_y) {
			logger.warn(`[Camera] Postal code ${postalCode} missing center coordinates`)
			return
		}

		// Fly to postal code area with 2-second animation
		// Adaptive altitude (#678) — 45° pitch uses a middle-ground scale.
		const Cesium = getCesium()
		const altitude = computePostalCodeAltitude(entity, POSTAL_CODE_ZOOM.SCALE_FOCUS)
		this.viewer.camera.flyTo({
			destination: Cesium.Cartesian3.fromDegrees(
				entity._properties._center_x._value,
				entity._properties._center_y._value - 0.015,
				altitude
			),
			orientation: {
				heading: 0.0,
				pitch: Cesium.Math.toRadians(-45.0),
				roll: 0.0,
			},
			duration: 2,
		})
		logger.debug(`[Camera] Focusing on postal code: ${postalCode}`)
	}

	/**
	 * Rotates camera 180 degrees around the screen center point
	 * Calculates ellipsoid intersection at screen center and rotates around that point.
	 * Adjusts latitude based on rotation state to maintain proper framing.
	 * Toggles rotation state in global store for tracking.
	 *
	 * @returns {void}
	 */
	rotate180Degrees() {
		if (!this.viewer || this.viewer.isDestroyed?.()) return
		const Cesium = getCesium()
		const camera = this.viewer.camera
		const scene = this.viewer.scene

		// Get the center of the screen
		const screenWidth = scene.canvas.clientWidth
		const screenHeight = scene.canvas.clientHeight
		const centerX = screenWidth / 2
		const centerY = screenHeight / 2

		// Get the ellipsoid point (longitude, latitude) at the center of the screen
		const ellipsoid = scene.globe.ellipsoid
		const centerCartesian = camera.pickEllipsoid(new Cesium.Cartesian2(centerX, centerY), ellipsoid)

		// If the point is on the globe, convert to geographic coordinates
		if (centerCartesian) {
			const centerCartographic = Cesium.Cartographic.fromCartesian(centerCartesian)
			const longitude = Cesium.Math.toDegrees(centerCartographic.longitude)
			let latitude = Cesium.Math.toDegrees(centerCartographic.latitude)
			// Adjust latitude based on the rotation state from the global store
			if (this.store.isCameraRotated) {
				latitude -= 0.015 // Move latitude back for second rotation
			} else {
				latitude += 0.015 // Adjust latitude for first rotation
			}

			// Now, rotate the camera 180 degrees around this center point
			const currentHeading = camera.heading
			const newHeading = currentHeading + Math.PI // Rotate 180 degrees

			// Set the camera view
			this.viewer.camera.setView({
				destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 1200.0),
				orientation: {
					heading: newHeading,
					pitch: Cesium.Math.toRadians(-35.0),
					roll: 0.0,
				},
			})

			// Toggle the rotation state in the Pinia store
			this.store.toggleCameraRotation()
		} else {
			logger.debug('No ellipsoid point was found at the center of the screen.')
		}
	}

	/**
	 * Alias for rotate180Degrees() method
	 * Maintained for backward compatibility with existing code.
	 *
	 * @returns {void}
	 * @deprecated Use rotate180Degrees() instead
	 */
	rotateCamera() {
		this.rotate180Degrees()
	}

	/**
	 * Gets the current camera viewport rectangle in geographic coordinates
	 * Calculates viewport bounds by picking ellipsoid intersections at canvas corners.
	 * Returns null if camera is looking at space (no ellipsoid intersection).
	 *
	 * @returns {Object|null} { west, south, east, north } in degrees, or null if no ellipsoid intersection
	 */
	getViewportRectangle() {
		if (!this.viewer || this.viewer.isDestroyed?.()) return null
		const Cesium = getCesium()
		const camera = this.viewer.camera
		const canvas = this.viewer.scene.canvas

		// Get corner positions by picking ellipsoid at each canvas corner
		const topLeft = camera.pickEllipsoid(
			new Cesium.Cartesian2(0, 0),
			this.viewer.scene.globe.ellipsoid
		)
		const topRight = camera.pickEllipsoid(
			new Cesium.Cartesian2(canvas.clientWidth, 0),
			this.viewer.scene.globe.ellipsoid
		)
		const bottomLeft = camera.pickEllipsoid(
			new Cesium.Cartesian2(0, canvas.clientHeight),
			this.viewer.scene.globe.ellipsoid
		)
		const bottomRight = camera.pickEllipsoid(
			new Cesium.Cartesian2(canvas.clientWidth, canvas.clientHeight),
			this.viewer.scene.globe.ellipsoid
		)

		// Handle cases where camera is looking at space (no ellipsoid intersection)
		if (!topLeft || !topRight || !bottomLeft || !bottomRight) {
			logger.warn('[Camera] Cannot determine viewport rectangle - camera looking at space')
			return null
		}

		// Convert to cartographic coordinates
		const corners = [topLeft, topRight, bottomLeft, bottomRight].map((pos) =>
			Cesium.Cartographic.fromCartesian(pos)
		)

		// Find bounding rectangle
		const lons = corners.map((c) => Cesium.Math.toDegrees(c.longitude))
		const lats = corners.map((c) => Cesium.Math.toDegrees(c.latitude))

		return {
			west: Math.min(...lons),
			south: Math.min(...lats),
			east: Math.max(...lons),
			north: Math.max(...lats),
		}
	}

	/**
	 * Gets the camera height above ground in meters
	 * Returns the ellipsoidal height of the camera position.
	 *
	 * @returns {number} Height in meters
	 */
	getCameraHeight() {
		const Cesium = getCesium()
		const camera = this.viewer.camera
		const cartographic = Cesium.Cartographic.fromCartesian(camera.position)
		return cartographic.height
	}
}
