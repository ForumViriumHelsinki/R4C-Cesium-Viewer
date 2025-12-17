/**
 * @module stores/globalStore
 * Manages navigation hierarchy, view modes, current selections, and Cesium viewer reference.
 * Acts as the central state hub for the entire R4C climate adaptation application.
 *
 * Navigation hierarchy:
 * - **Capital Region View** → Postal Code View → Building View
 * - Three-level drill-down: Region (view='capitalRegion') → Postal Code (view='postalcode') → Building (view='building')
 *
 * Key responsibilities:
 * - Current view mode and navigation level tracking
 * - Selected postal code and zone name storage
 * - Cesium viewer instance reference
 * - Heat exposure normalization constants (min/max Kelvin by date)
 * - Temporal heat data date selection
 * - Current grid cell and picked entity references
 * - UI state (loading indicators, panel visibility, navbar width)
 *
 * Heat data normalization:
 * The store contains min/max Kelvin temperatures for each available heat date (2015-2025).
 * These values are used to denormalize heat exposure indices (0-1) back to actual temperatures:
 * Formula: `temp_K = normalized × (max_K - min_K) + min_K`
 *
 * @see {@link https://pinia.vuejs.org/|Pinia Documentation}
 */

import { defineStore } from 'pinia'
import { markRaw } from 'vue'

/**
 * Global Pinia Store
 * Core application state managing navigation, selections, and Cesium viewer reference.
 *
 * @typedef {Object} GlobalState
 * @property {string} view - Current view mode ('capitalRegion', 'postalcode', 'building')
 * @property {string|null} postalcode - Selected postal code (e.g., '00100')
 * @property {string|null} nameOfZone - Selected zone/neighborhood name
 * @property {number} averageHeatExposure - Average heat exposure for selected area (0-1)
 * @property {number} averageTreeArea - Average tree canopy area for selected area (m²)
 * @property {string} level - Navigation level ('start', 'postalcode', 'building')
 * @property {Object} minMaxKelvin - Min/max Kelvin temperatures by date for heat normalization
 * @property {string} heatDataDate - Selected date for heat exposure visualization (YYYY-MM-DD)
 * @property {Object|null} currentGridCell - Currently selected 250m grid cell entity
 * @property {Object|null} cesiumViewer - CesiumJS viewer instance reference
 * @property {string|null} buildingAddress - Selected building address string
 * @property {Object|null} pickedEntity - Currently picked Cesium entity
 * @property {boolean} isLoading - Global loading indicator state
 * @property {boolean} showBuildingInfo - Toggle building info panel visibility
 * @property {boolean} isCameraRotated - Camera 180° rotation state flag
 * @property {number} navbarWidth - Navigation drawer width in pixels (responsive, 400-800px)
 * @property {Object} clickProcessingState - Map click processing lifecycle state (Phase 3 enhanced)
 * @property {boolean} clickProcessingState.isProcessing - Whether a click is being processed
 * @property {string|null} clickProcessingState.postalCode - Target postal code being loaded
 * @property {string|null} clickProcessingState.postalCodeName - Display name for the postal code
 * @property {string|null} clickProcessingState.stage - Current processing stage ('loading'|'animating'|'complete')
 * @property {number|null} clickProcessingState.startTime - Performance timestamp when processing started
 * @property {boolean} clickProcessingState.canCancel - Whether user can interrupt the animation
 * @property {Object|null} clickProcessingState.error - Error object if loading failed
 * @property {Object|null} clickProcessingState.partialData - Successfully loaded data if partial failure
 * @property {number} clickProcessingState.retryCount - Number of retry attempts for failed loads
 * @property {Object|null} clickProcessingState.previousViewState - Captured state for restoration on cancel
 * @property {Object|null} clickProcessingState.loadingProgress - Progressive loading progress {current, total}
 * @property {Object} errorNotification - Error notification state for user-facing error messages
 * @property {boolean} errorNotification.show - Whether error notification is visible
 * @property {string} errorNotification.message - User-friendly error message
 * @property {string} errorNotification.context - Technical context for debugging (logged to console)
 */
import logger from '../utils/logger.js'

export const useGlobalStore = defineStore('global', {
	state: () => ({
		view: 'capitalRegion',
		postalcode: null,
		nameOfZone: null,
		averageHeatExposure: 0,
		averageTreeArea: 0,
		level: 'start',
		errorNotification: {
			show: false,
			message: '',
			context: '',
		},
		minMaxKelvin: {
			'2015-07-03': { min: 285.7481384277, max: 323.753112793 },
			'2016-06-03': { min: 273.0023498535, max: 326.4089050293 },
			'2018-07-27': { min: 280.1904296875, max: 322.5089416504 },
			'2019-06-05': { min: 284.0459594727, max: 323.6129760742 },
			'2020-06-23': { min: 291.6373901367, max: 325.2809753418 },
			'2021-07-12': { min: 285.3448181152, max: 329.929473877 },
			'2022-06-28': { min: 291.5040893555, max: 332.274230957 },
			'2023-06-23': { min: 288.9166564941, max: 324.6862182617 },
			'2024-06-26': { min: 284.6065368652, max: 323.5138549805 },
			'2025-07-14': { min: 284.924407958, max: 328.2204589844 },
		},
		heatDataDate: '2022-06-28',
		currentGridCell: null,
		cesiumViewer: null,
		buildingAddress: null,
		pickedEntity: null,
		isLoading: false,
		showBuildingInfo: true,
		isCameraRotated: false,
		navbarWidth: Math.min(Math.max(window.innerWidth * 0.375, 400), 800),
		clickProcessingState: {
			isProcessing: false,
			postalCode: null,
			postalCodeName: null,
			stage: null,
			startTime: null,
			canCancel: false,
			error: null,
			partialData: null,
			retryCount: 0,
			previousViewState: null,
			loadingProgress: null, // { current: number, total: number } for progressive updates (FR-3.2)
		},
	}),
	actions: {
		/**
		 * Toggles building info panel visibility
		 * @param {boolean} status - True to show building info panel
		 */
		setShowBuildingInfo(status) {
			this.showBuildingInfo = status
		},
		/**
		 * Sets global loading indicator state
		 * @param {boolean} isLoading - True to show loading indicator
		 */
		setIsLoading(isLoading) {
			this.isLoading = isLoading
		},
		/**
		 * Sets the selected date for heat exposure data visualization
		 * Must be one of the available dates in minMaxKelvin object.
		 * @param {string} date - Date string in YYYY-MM-DD format
		 */
		setHeatDataDate(date) {
			this.heatDataDate = date
		},
		/**
		 * Sets the current navigation level
		 * @param {string} level - Level name ('start', 'postalcode', 'building')
		 */
		setLevel(level) {
			this.level = level
		},
		/**
		 * Sets the CesiumJS viewer instance reference
		 * Called during application initialization to store the Cesium viewer.
		 * Uses markRaw() to prevent Vue reactivity on Cesium viewer,
		 * which contains non-serializable properties.
		 * @param {Object} viewer - Cesium.Viewer instance
		 */
		setCesiumViewer(viewer) {
			this.cesiumViewer = viewer ? markRaw(viewer) : null
		},
		/**
		 * Sets the currently selected 250m population grid cell
		 * Uses markRaw() to prevent Vue reactivity on Cesium entities.
		 * @param {Object} currentGridCell - Cesium entity representing the grid cell
		 */
		setCurrentGridCell(currentGridCell) {
			this.currentGridCell = currentGridCell ? markRaw(currentGridCell) : null
		},
		/**
		 * Sets the current view mode
		 * Controls which level of the navigation hierarchy is active.
		 * @param {string} view - View mode ('capitalRegion', 'postalcode', 'building')
		 */
		setView(view) {
			this.view = view
		},
		/**
		 * Sets the selected postal code for data loading
		 * Triggers loading of postal code-specific data layers.
		 * @param {string} postalcode - Five-digit postal code (e.g., '00100')
		 */
		setPostalCode(postalcode) {
			this.postalcode = postalcode
		},
		/**
		 * Sets the name of the selected zone or neighborhood
		 * @param {string} nameOfZone - Zone name (e.g., 'Alppila - Vallila')
		 */
		setNameOfZone(nameOfZone) {
			this.nameOfZone = nameOfZone
		},
		/**
		 * Sets the average heat exposure for the selected area
		 * Used for area-level heat statistics display.
		 * @param {number} averageHeatExposure - Normalized heat exposure (0-1)
		 */
		setAverageHeatExposure(averageHeatExposure) {
			this.averageHeatExposure = averageHeatExposure
		},
		/**
		 * Sets the average tree canopy area for the selected area
		 * @param {number} averageTreeArea - Tree coverage in square meters
		 */
		setAverageTreeArea(averageTreeArea) {
			this.averageTreeArea = averageTreeArea
		},
		/**
		 * Sets the selected building address string
		 * @param {string} buildingAddress - Building address (e.g., 'Aleksanterinkatu 1')
		 */
		setBuildingAddress(buildingAddress) {
			this.buildingAddress = buildingAddress
		},
		/**
		 * Sets the currently picked Cesium entity
		 * Updated when user clicks on map features.
		 * Uses markRaw() to prevent Vue reactivity on Cesium entities,
		 * which contain non-serializable properties that cause DataCloneError
		 * when Cesium's web workers attempt postMessage() calls.
		 * @param {Object} picked - Cesium entity that was clicked
		 */
		setPickedEntity(picked) {
			this.pickedEntity = picked ? markRaw(picked) : null
		},
		/**
		 * Toggles camera 180° rotation state
		 * Used to track whether camera has been flipped for different viewing angles.
		 */
		toggleCameraRotation() {
			this.isCameraRotated = !this.isCameraRotated
		},
		/**
		 * Updates the click processing state with new values
		 * Merges provided state with existing state to allow partial updates.
		 * @param {Object} newState - Partial state object to merge
		 */
		setClickProcessingState(newState) {
			this.clickProcessingState = {
				...this.clickProcessingState,
				...newState,
			}

			// Track metrics for performance monitoring
			if (newState.stage === 'loading' && newState.startTime) {
				performance.mark('map-click-start')
			}

			if (newState.stage === 'complete') {
				performance.mark('map-click-complete')

				// Only measure if the start mark exists
				const startMark = performance.getEntriesByName('map-click-start', 'mark')[0]
				if (startMark) {
					performance.measure('map-click-interaction', 'map-click-start', 'map-click-complete')

					const measure = performance.getEntriesByName('map-click-interaction')[0]
					if (measure) {
						logger.debug(
							`[GlobalStore] Map click completed in ${measure.duration.toFixed(2)}ms for postal code ${this.clickProcessingState.postalCode}`
						)
					}

					// Clean up performance entries
					performance.clearMarks('map-click-start')
					performance.clearMarks('map-click-complete')
					performance.clearMeasures('map-click-interaction')
				}
			}
		},
		/**
		 * Resets click processing state to initial values
		 * Called after processing is complete or cancelled.
		 */
		resetClickProcessingState() {
			this.clickProcessingState = {
				isProcessing: false,
				postalCode: null,
				postalCodeName: null,
				stage: null,
				startTime: null,
				canCancel: false,
				error: null,
				partialData: null,
				retryCount: 0,
				previousViewState: null,
				loadingProgress: null,
			}
		},
		/**
		 * Captures current view state for restoration if animation is cancelled
		 * Stores camera position, orientation, and UI state.
		 */
		captureViewState() {
			if (!this.cesiumViewer) {
				logger.warn('[GlobalStore] Cannot capture view state: Cesium viewer not initialized')
				return
			}

			const camera = this.cesiumViewer.camera
			this.clickProcessingState.previousViewState = {
				position: camera.position.clone(),
				orientation: {
					heading: camera.heading,
					pitch: camera.pitch,
					roll: camera.roll,
				},
				showBuildingInfo: this.showBuildingInfo,
				buildingAddress: this.buildingAddress,
			}

			logger.debug('[GlobalStore] View state captured for potential restoration')
		},
		/**
		 * Restores previously captured view state
		 * Used when user cancels camera animation to return to previous view.
		 */
		restorePreviousViewState() {
			const prevState = this.clickProcessingState.previousViewState
			if (!prevState) {
				logger.warn('[GlobalStore] No previous view state to restore')
				return
			}

			if (!this.cesiumViewer) {
				logger.warn('[GlobalStore] Cannot restore view state: Cesium viewer not initialized')
				return
			}

			this.cesiumViewer.camera.setView({
				destination: prevState.position,
				orientation: prevState.orientation,
			})

			this.showBuildingInfo = prevState.showBuildingInfo
			this.buildingAddress = prevState.buildingAddress

			logger.debug('[GlobalStore] Previous view state restored')
		},
		/**
		 * Shows a user-facing error notification
		 * Displays error messages in the UI for network failures or data loading issues.
		 * Technical context is logged to console for debugging purposes.
		 *
		 * @param {string} message - User-friendly error message to display
		 * @param {string} [context=''] - Technical context for debugging (logged to console)
		 *
		 * @example
		 * store.showError('Unable to load cold area data. Please try again.', 'Network error at /api/coldareas/00100');
		 */
		showError(message, context = '') {
			this.errorNotification = {
				show: true,
				message,
				context,
			}

			// Log technical context to console for developer debugging
			if (context) {
				logger.error('[GlobalStore] Error context:', context)
			}
		},
		/**
		 * Hides the error notification
		 * Clears error state when user dismisses the notification.
		 */
		hideError() {
			this.errorNotification = {
				show: false,
				message: '',
				context: '',
			}
		},
	},
})
