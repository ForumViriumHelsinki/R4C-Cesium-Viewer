import { TIMING } from '../constants/timing.js'
import logger from '../utils/logger.js'
import cacheWarmer from './cacheWarmer.js'

/**
 * Postal Code Loader Service
 * Handles postal code data loading, retry mechanisms, and cache management.
 * Extracted from FeaturePicker to follow single responsibility principle.
 *
 * @module postalCodeLoader
 */

/**
 * Checks cache for preloaded postal code data (FR-3.3 optimization)
 * Note: Cache lookup is delegated to unifiedLoader. This function only logs cache warmer status.
 * @param {string} _cacheKey - Cache key (unused - kept for API compatibility)
 * @param {string} postalCode - Postal code to check in cache
 * @returns {Promise<null>} Always returns null - actual cache checking done by unifiedLoader
 */
export async function checkCacheForPostalCode(_cacheKey, postalCode) {
	try {
		// Log if cache warmer has preloaded this data (informational only)
		if (cacheWarmer.warmedPostalCodes.has(postalCode)) {
			logger.debug('[PostalCodeLoader] ✓ Cache warmer preloaded this postal code')
		}

		// Cache lookup delegated to unifiedLoader - it will check IndexedDB automatically
		return null
	} catch (error) {
		logger.warn('[PostalCodeLoader] Cache check failed:', error?.message || error)
		return null
	}
}

/**
 * Starts camera animation and returns a promise
 * Note: This uses Promise constructor because it wraps a setTimeout-based animation
 * that needs to complete after a fixed duration. This is a valid use of Promise constructor.
 *
 * @param {Object} cameraService - Camera service instance
 * @param {Function} updateProgressCallback - Callback to update loading progress
 * @param {Function} setStateCallback - Callback to set click processing state
 * @returns {Promise<void>}
 */
export function startCameraAnimation(cameraService, updateProgressCallback, setStateCallback) {
	return new Promise((resolve, reject) => {
		let timeoutId

		try {
			// Update state to animating
			setStateCallback({
				stage: 'animating',
				canCancel: true,
			})

			// Start camera animation
			cameraService.switchTo3DView()

			// Camera animation is 3 seconds, resolve after that
			// In a real implementation, we'd hook into the camera completion callback
			timeoutId = setTimeout(() => {
				logger.debug('[PostalCodeLoader] ✓ Camera animation completed')
				updateProgressCallback(1, 2)
				resolve()
			}, 3000)
		} catch (error) {
			// Clean up timeout on error to prevent memory leak
			if (timeoutId) {
				clearTimeout(timeoutId)
			}
			logger.error('[PostalCodeLoader] ❌ Camera animation failed:', error?.message || error)
			reject(error)
		}
	})
}

/**
 * Determines if an error is retriable (network/timeout vs. permanent failure)
 * @param {Error} error - Error to check
 * @returns {boolean} True if error is retriable
 */
export function isRetriableError(error) {
	// Network errors, timeouts, and 5xx server errors are retriable
	const errorString = error.toString().toLowerCase()
	return (
		errorString.includes('network') ||
		errorString.includes('timeout') ||
		errorString.includes('fetch') ||
		errorString.includes('500') ||
		errorString.includes('502') ||
		errorString.includes('503') ||
		errorString.includes('504')
	)
}

/**
 * Loads postal code data with retry logic (FR-3.4 error handling)
 * Implements exponential backoff for transient failures.
 *
 * @param {string} postalCode - Postal code to load
 * @param {Object} services - Service instances needed for loading
 * @param {Object} services.elementsDisplayService - Elements display service
 * @param {Object} services.datasourceService - Datasource service
 * @param {Object} services.capitalRegionService - Capital region service
 * @param {Object} services.helsinkiService - Helsinki service
 * @param {Object} stores - Store instances
 * @param {Object} stores.toggleStore - Toggle store
 * @param {Object} stores.store - Global store
 * @param {Function} setNameOfZoneCallback - Callback to set zone name
 * @param {Function} updateProgressCallback - Callback to update loading progress
 * @param {Function} setStateCallback - Callback to set click processing state
 * @param {number} retryCount - Current retry attempt (default 0)
 * @returns {Promise<Object>} Loaded data
 */
export async function loadPostalCodeDataWithRetry(
	postalCode,
	services,
	stores,
	setNameOfZoneCallback,
	updateProgressCallback,
	setStateCallback,
	retryCount = 0
) {
	const maxRetries = 3
	const baseDelay = 1000 // 1 second

	try {
		// Clear stale loading states before starting new postal code load
		// This prevents loading indicator from getting stuck due to previous incomplete loads
		try {
			const { useLoadingStore } = await import('../stores/loadingStore.js')
			const loadingStore = useLoadingStore()
			loadingStore.clearStaleLoading(TIMING.STALE_LOADING_TIMEOUT_MS)
		} catch (error) {
			logger.warn('[PostalCodeLoader] Could not clear stale loading:', error?.message || error)
		}

		// Set zone name and prepare UI
		setNameOfZoneCallback()
		services.elementsDisplayService.setSwitchViewElementsDisplay('inline-block')
		services.elementsDisplayService.setViewDisplay('none')

		// Clean up previous data sources and building features
		services.datasourceService.removeDataSourcesAndEntities()
		const { useBuildingStore } = await import('../stores/buildingStore.js')
		const buildingStore = useBuildingStore()
		buildingStore.clearBuildingFeatures()

		// Load region-specific data with performance tracking
		performance.mark('data-load-start')

		if (!stores.toggleStore.helsinkiView) {
			logger.debug('[PostalCodeLoader] Loading Capital Region elements...')
			await services.capitalRegionService.loadCapitalRegionElements()
		} else {
			logger.debug('[PostalCodeLoader] Loading Helsinki elements...')
			await services.helsinkiService.loadHelsinkiElements()
		}

		performance.mark('data-load-complete')
		performance.measure('data-load-duration', 'data-load-start', 'data-load-complete')

		const measure = performance.getEntriesByName('data-load-duration')[0]
		logger.debug(`[PostalCodeLoader] Data loaded in ${measure.duration.toFixed(2)}ms`)

		performance.clearMarks('data-load-start')
		performance.clearMarks('data-load-complete')
		performance.clearMeasures('data-load-duration')

		// Update level
		stores.store.setLevel('postalCode')

		updateProgressCallback(2, 2)

		return { success: true, fromCache: false }
	} catch (error) {
		logger.error(`[PostalCodeLoader] ❌ Data loading failed (attempt ${retryCount + 1}):`, error)

		// Retry with exponential backoff for transient failures
		if (retryCount < maxRetries && isRetriableError(error)) {
			const delay = baseDelay * 2 ** retryCount
			logger.debug(`[PostalCodeLoader] 🔄 Retrying in ${delay}ms...`)

			// Update retry count in state
			setStateCallback({
				retryCount: retryCount + 1,
			})

			await new Promise((resolve) => setTimeout(resolve, delay))
			return loadPostalCodeDataWithRetry(
				postalCode,
				services,
				stores,
				setNameOfZoneCallback,
				updateProgressCallback,
				setStateCallback,
				retryCount + 1
			)
		}

		// Max retries exceeded or non-retriable error
		throw error
	}
}

/**
 * Updates loading progress for progressive UI updates (FR-3.2)
 * @param {number} current - Current completed tasks
 * @param {number} total - Total tasks
 * @param {Function} setStateCallback - Callback to set click processing state
 */
export function updateLoadingProgress(current, total, setStateCallback) {
	setStateCallback({
		loadingProgress: { current, total },
	})

	const percentage = Math.round((current / total) * 100)
	logger.debug(`[PostalCodeLoader] 📊 Loading progress: ${current}/${total} (${percentage}%)`)
}

/**
 * Processes results from parallel loading with error handling (FR-3.4)
 * Handles partial success (one operation succeeds, other fails).
 *
 * @param {Array<PromiseSettledResult>} results - Results from Promise.allSettled
 * @param {string} postalCode - Postal code being loaded
 * @param {Function} setStateCallback - Callback to set click processing state
 * @param {Function} resetStateCallback - Callback to reset click processing state
 */
export function processParallelLoadingResults(
	results,
	postalCode,
	setStateCallback,
	resetStateCallback
) {
	const [cameraResult, dataResult] = results

	const cameraSuccess = cameraResult.status === 'fulfilled'
	const dataSuccess = dataResult.status === 'fulfilled'

	logger.debug('[PostalCodeLoader] Results:', {
		camera: cameraSuccess ? '✓' : '✗',
		data: dataSuccess ? '✓' : '✗',
	})

	// Handle error scenarios
	if (!cameraSuccess) {
		logger.error('[PostalCodeLoader] ❌ Camera animation failed:', cameraResult.reason)
		// Camera failure is not critical - data can still be shown
	}

	if (!dataSuccess) {
		logger.error('[PostalCodeLoader] ❌ Data loading failed:', dataResult.reason)

		// Set error state for user feedback
		setStateCallback({
			stage: 'complete',
			error: {
				message: 'Failed to load postal code data',
				details: dataResult.reason?.message || 'Unknown error',
				canRetry: isRetriableError(dataResult.reason),
			},
		})

		// Keep error state visible for user to see retry option
		// Don't auto-reset in this case
		return
	}

	// Success path - both operations completed
	setStateCallback({
		stage: 'complete',
		error: null,
	})

	// Reset state after brief delay to allow UI transition
	setTimeout(() => {
		resetStateCallback()
	}, 500)

	logger.debug('[PostalCodeLoader] ✅ Postal code loading complete:', postalCode)
}

/**
 * Loads postal code with parallel camera animation and data loading (Phase 3)
 * Implements FR-3.1 (Parallel Loading), FR-3.3 (Performance Optimization), FR-3.4 (Error Handling)
 *
 * Performance optimizations:
 * - Checks cacheWarmer for preloaded data before network requests
 * - Runs camera animation and data loading in parallel using Promise.allSettled
 * - Implements retry logic with exponential backoff for failed requests
 * - Shows partial data if some datasets load successfully
 *
 * @param {string} postalCode - Postal code to load
 * @param {Object} services - Service instances needed for loading
 * @param {Object} stores - Store instances
 * @param {Function} setNameOfZoneCallback - Callback to set zone name
 * @returns {Promise<void>}
 */
export async function loadPostalCodeWithParallelStrategy(
	postalCode,
	services,
	stores,
	setNameOfZoneCallback
) {
	performance.mark('parallel-load-start')

	// Helper functions bound to stores
	const updateProgress = (current, total) => {
		updateLoadingProgress(current, total, (state) => stores.store.setClickProcessingState(state))
	}

	const setState = (state) => {
		stores.store.setClickProcessingState(state)
	}

	const resetState = () => {
		stores.store.resetClickProcessingState()
	}

	// Start camera animation immediately (will update state to 'animating')
	const cameraPromise = startCameraAnimation(services.cameraService, updateProgress, setState)

	// Check cache first for instant loading (FR-3.3 optimization)
	const cacheKey = `buildings_${postalCode}_${stores.toggleStore.helsinkiView ? 'helsinki' : 'capital'}`
	const cachedData = await checkCacheForPostalCode(cacheKey, postalCode)

	let dataPromise
	if (cachedData) {
		logger.debug('[PostalCodeLoader] ⚡ Using cached data for instant loading')
		// Wrap cached data in Promise.resolve for consistent handling
		dataPromise = Promise.resolve({ data: cachedData, fromCache: true })

		// Update progress immediately
		updateProgress(1, 2)
	} else {
		logger.debug('[PostalCodeLoader] 🌐 Loading data from network')
		// Load from network with retry logic
		dataPromise = loadPostalCodeDataWithRetry(
			postalCode,
			services,
			stores,
			setNameOfZoneCallback,
			updateProgress,
			setState
		)
	}

	// Wait for both camera and data loading to complete (FR-3.1 parallel loading)
	const results = await Promise.allSettled([cameraPromise, dataPromise])

	// Process results with comprehensive error handling (FR-3.4)
	processParallelLoadingResults(results, postalCode, setState, resetState)

	performance.mark('parallel-load-complete')
	performance.measure('parallel-load-total', 'parallel-load-start', 'parallel-load-complete')

	const measure = performance.getEntriesByName('parallel-load-total')[0]
	logger.debug(
		`[PostalCodeLoader] ⏱️ Parallel loading completed in ${measure.duration.toFixed(2)}ms`
	)

	performance.clearMarks('parallel-load-start')
	performance.clearMarks('parallel-load-complete')
	performance.clearMeasures('parallel-load-total')
}

/**
 * Sets the name of the current zone from postal code data
 * Searches through postal code entities to find matching postal code and extracts zone name.
 *
 * @param {string} postalCode - Postal code to find name for
 * @param {Object} postalCodeData - Postal code data from propStore
 * @param {Function} setNameCallback - Callback to set zone name in store
 * @returns {void}
 */
export function setNameOfZone(postalCode, postalCodeData, setNameCallback) {
	const entitiesArray = postalCodeData._entityCollection?._entities._array

	if (Array.isArray(entitiesArray)) {
		for (let i = 0; i < entitiesArray.length; i++) {
			const entity = entitiesArray[i]
			if (
				entity &&
				entity._properties &&
				entity._properties._nimi &&
				typeof entity._properties._nimi._value !== 'undefined' &&
				entity._properties._posno._value === postalCode
			) {
				setNameCallback(entity._properties._nimi._value)
				break // Exit the loop after finding the first match
			}
		}
	}
}
