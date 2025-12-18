/**
 * Building Handler Module
 * Handles building selection, feature processing, and building-level navigation.
 * Manages the transition to building-level view and associated data loading.
 *
 * @module featurepicker/buildingHandler
 */
import { TIMING } from '../../constants/timing.js'
import logger from '../../utils/logger.js'
import { findAddressForBuilding } from '../address.js'
import { eventBus } from '../eventEmitter.js'

/**
 * Handles building feature selection and visualization
 * Updates application level to 'building', shows loading indicator, emits visibility events,
 * and creates building-specific charts. Manages loading state throughout the process.
 *
 * @param {Object} properties - Building properties object containing building attributes
 * @param {string} properties._postinumero - Postal code of the building
 * @param {number} [properties.treeArea] - Nearby tree area
 * @param {number} [properties._avg_temp_c] - Average temperature
 * @param {Object} context - Context object with services and stores
 * @param {Object} context.store - Global store instance
 * @param {Object} context.toggleStore - Toggle store instance
 * @param {Object} context.buildingService - Building service instance
 * @param {Object} context.elementsDisplayService - Elements display service instance
 * @returns {Promise<void>}
 * @fires eventBus#hideHelsinki - Emitted when switching away from Helsinki view
 * @fires eventBus#hideCapitalRegion - Emitted when switching away from Capital Region view
 * @fires eventBus#showBuilding - Emitted when building level view is activated
 */
export async function handleBuildingFeature(properties, context) {
	const { store, toggleStore, buildingService, elementsDisplayService } = context

	// Clear stale loading states before transitioning to building level
	// This prevents the loading indicator from staying visible due to:
	// - Previous postal code loading that didn't complete properly
	// - Dynamic layer IDs (e.g., 'buildings-00100') that timed out
	try {
		const { useLoadingStore } = await import('../../stores/loadingStore.js')
		const loadingStore = useLoadingStore()
		// Clear any stale loading states (older than 15s or dynamic layer IDs)
		loadingStore.clearStaleLoading(TIMING.STALE_LOADING_TIMEOUT_MS)
	} catch (error) {
		logger.warn('Loading store not available for cleanup:', error?.message || error)
	}

	try {
		// Update application state to building level
		store.setLevel('building')
		store.setPostalCode(properties._postinumero._value)
		if (toggleStore.helsinkiView) {
			eventBus.emit('hideHelsinki')
		} else {
			eventBus.emit('hideCapitalRegion')
		}
		eventBus.emit('showBuilding')
		elementsDisplayService.setBuildingDisplay('none')
		buildingService.resetBuildingOutline()

		// Process building charts asynchronously
		await buildingService.createBuildingCharts(
			properties.treeArea,
			properties._avg_temp_c,
			properties
		)
	} catch (error) {
		logger.error('Error handling building feature:', error?.message || error)
	}
}

/**
 * Processes building-specific properties when at postal code level
 * Handles cold area point display and triggers building feature handling.
 *
 * @param {Cesium.Entity} entity - Entity with building properties
 * @param {Object} context - Context object with services and stores
 * @param {Object} context.store - Global store instance
 * @param {Object} context.coldAreaService - Cold area service instance
 * @returns {Promise<void>}
 */
export async function processBuildingAtPostalCodeLevel(entity, context) {
	const { store, coldAreaService } = context
	const properties = entity.properties

	store.setBuildingAddress(findAddressForBuilding(properties))

	if (properties._locationUnder40) {
		if (properties._locationUnder40._value) {
			coldAreaService.addColdPoint(properties._locationUnder40._value)
		}
	}

	await handleBuildingFeature(properties, context)
}

/**
 * Sets up click processing state for postal code navigation
 * Captures view state and initializes loading progress tracking.
 *
 * @param {string} newPostalCode - Postal code being navigated to
 * @param {string} postalCodeName - Display name of the postal code
 * @param {Object} store - Global store instance
 * @returns {void}
 */
export function initializePostalCodeNavigation(newPostalCode, postalCodeName, store) {
	// Capture view state before any changes
	store.captureViewState()

	// Set loading state immediately for instant visual feedback
	store.setClickProcessingState({
		isProcessing: true,
		postalCode: newPostalCode,
		postalCodeName: postalCodeName,
		stage: 'loading',
		startTime: performance.now(),
		canCancel: false,
		loadingProgress: { current: 0, total: 2 }, // Track camera + data loading
	})

	// Update postal code in store
	store.setPostalCode(newPostalCode)
}

/**
 * Determines if postal code navigation should be triggered
 * Checks if the postal code is different from current or if navigation is needed from other levels.
 *
 * @param {string} newPostalCode - New postal code from clicked feature
 * @param {string} currentPostalCode - Currently selected postal code
 * @param {string} currentLevel - Current navigation level
 * @returns {boolean} True if navigation should proceed
 */
export function shouldNavigateToPostalCode(newPostalCode, currentPostalCode, currentLevel) {
	return (
		newPostalCode !== currentPostalCode || currentLevel === 'start' || currentLevel === 'building'
	)
}

/**
 * Logs diagnostic information about skipped postal code navigation
 *
 * @returns {void}
 */
export function logSkippedNavigation() {
	logger.debug(
		'[BuildingHandler] Same postal code already selected at postalCode level, skipping reload'
	)
}

/**
 * Logs diagnostic information about missing postal code property
 *
 * @returns {void}
 */
export function logMissingPostalCodeProperty() {
	logger.debug('[BuildingHandler] No postal code property (posno) found in clicked feature')
}
