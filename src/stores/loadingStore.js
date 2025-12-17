/**
 * @module stores/loadingStore
 * Tracks loading progress, cache status, and data source health for all map layers.
 * Integrates with cacheService for intelligent data caching and performance metrics.
 *
 * Features:
 * - **Per-layer progress tracking**: Monitor loading of individual layers (trees, buildings, etc.)
 * - **Cache integration**: Check cache status, age, and size for each layer
 * - **Data source health**: Track response times and availability of external APIs
 * - **Performance metrics**: Record load times for optimization analysis
 * - **Error tracking**: Detailed error messages per layer with retry support
 *
 * Managed layers:
 * - Vegetation layers (trees, vegetation, otherNature)
 * - Building data (buildings, postalCodes)
 * - Background layers (landcover, NDVI, populationGrid)
 * - Environmental data (heatData)
 *
 * Data sources monitored:
 * - **pygeoapi**: Finland's geospatial API portal
 * - **hsyAction**: Helsinki Region Environmental Services
 * - **paavo**: Statistics Finland postal code data
 * - **digitransit**: Public transport API
 * - **terrain**: Helsinki 3D terrain service
 *
 * @see {@link https://pinia.vuejs.org/|Pinia Documentation}
 */

import { defineStore } from 'pinia'
import cacheService from '../services/cacheService.js'

/**
 * Loading Pinia Store
 * Comprehensive loading state management with cache integration and health monitoring.
 * All methods already documented with JSDoc.
 */
import logger from '../utils/logger.js'

export const useLoadingStore = defineStore('loading', {
	state: () => ({
		// Global loading state
		isLoading: false,

		// Stale loading cleanup timer ID (for automatic cleanup)
		_staleCleanupTimer: null,

		// Individual layer loading states
		layerLoading: {
			trees: false,
			vegetation: false,
			otherNature: false,
			buildings: false,
			postalCodes: false,
			landcover: false,
			ndvi: false,
			populationGrid: false,
			heatData: false,
		},

		// Loading progress tracking
		loadingProgress: {
			trees: { current: 0, total: 4, status: 'idle' }, // 4 height categories
			vegetation: { current: 0, total: 1, status: 'idle' },
			otherNature: { current: 0, total: 1, status: 'idle' },
			buildings: { current: 0, total: 1, status: 'idle' },
			postalCodes: { current: 0, total: 1, status: 'idle' },
			landcover: { current: 0, total: 1, status: 'idle' },
			ndvi: { current: 0, total: 1, status: 'idle' },
			populationGrid: { current: 0, total: 1, status: 'idle' },
			heatData: { current: 0, total: 1, status: 'idle' },
		},

		// Loading messages and details
		loadingMessages: {},

		// Error tracking
		loadingErrors: {},

		// Performance metrics
		loadingTimes: {},

		// Cache status tracking
		cacheStatus: {
			trees: { cached: false, age: null, size: null },
			vegetation: { cached: false, age: null, size: null },
			otherNature: { cached: false, age: null, size: null },
			buildings: { cached: false, age: null, size: null },
			postalCodes: { cached: false, age: null, size: null },
			landcover: { cached: false, age: null, size: null },
			ndvi: { cached: false, age: null, size: null },
			populationGrid: { cached: false, age: null, size: null },
			heatData: { cached: false, age: null, size: null },
		},

		// Data source health tracking
		dataSourceHealth: {
			pygeoapi: {
				status: 'unknown',
				lastCheck: null,
				responseTime: null,
				error: null,
			},
			hsyAction: {
				status: 'unknown',
				lastCheck: null,
				responseTime: null,
				error: null,
			},
			paavo: {
				status: 'unknown',
				lastCheck: null,
				responseTime: null,
				error: null,
			},
			digitransit: {
				status: 'unknown',
				lastCheck: null,
				responseTime: null,
				error: null,
			},
			terrain: {
				status: 'unknown',
				lastCheck: null,
				responseTime: null,
				error: null,
			},
		},
	}),

	getters: {
		// Check if any layer is currently loading
		hasActiveLoading: (state) => {
			return Object.values(state.layerLoading).some((loading) => loading)
		},

		// Get list of currently loading layers
		activeLoadingLayers: (state) => {
			return Object.entries(state.layerLoading)
				.filter(([_, loading]) => loading)
				.map(([layer, _]) => layer)
		},

		// Get loading progress for a specific layer
		getLayerProgress: (state) => (layerName) => {
			const progress = state.loadingProgress[layerName]
			if (!progress || progress.total === 0) return 0
			return Math.round((progress.current / progress.total) * 100)
		},

		// Get overall loading progress
		overallProgress: (state) => {
			const activeLoading = Object.entries(state.layerLoading).filter(([_, loading]) => loading)

			if (activeLoading.length === 0) return 100

			const totalProgress = activeLoading.reduce((sum, [layer, _]) => {
				const progress = state.loadingProgress[layer]
				if (!progress || progress.total === 0) return sum
				return sum + progress.current / progress.total
			}, 0)

			return Math.round((totalProgress / activeLoading.length) * 100)
		},

		// Get formatted loading message
		getLoadingMessage: (state) => (layerName) => {
			return state.loadingMessages[layerName] || `Loading ${layerName}...`
		},

		// Check if layer has error
		hasLayerError: (state) => (layerName) => {
			return !!state.loadingErrors[layerName]
		},

		// Get layer error message
		getLayerError: (state) => (layerName) => {
			return state.loadingErrors[layerName]
		},
	},

	actions: {
		// Start loading for a specific layer
		startLayerLoading(layerName, options = {}) {
			this.layerLoading[layerName] = true
			this.loadingProgress[layerName] = {
				current: 0,
				total: options.total || 1,
				status: 'loading',
			}
			this.loadingMessages[layerName] = options.message || `Loading ${layerName}...`
			delete this.loadingErrors[layerName]

			// Track start time for performance metrics
			this.loadingTimes[layerName] = { startTime: Date.now() }

			this.updateGlobalLoading()
		},

		// Update loading progress for a layer
		updateLayerProgress(layerName, current, message = null) {
			if (this.loadingProgress[layerName]) {
				this.loadingProgress[layerName].current = current
				if (message) {
					this.loadingMessages[layerName] = message
				}
			}
		},

		// Complete loading for a specific layer
		completeLayerLoading(layerName, success = true) {
			this.layerLoading[layerName] = false

			if (success) {
				this.loadingProgress[layerName].status = 'completed'
				this.loadingProgress[layerName].current = this.loadingProgress[layerName].total
				delete this.loadingMessages[layerName]
				delete this.loadingErrors[layerName]
			}

			// Calculate loading time
			if (this.loadingTimes[layerName]) {
				this.loadingTimes[layerName].duration = Date.now() - this.loadingTimes[layerName].startTime
			}

			this.updateGlobalLoading()
		},

		// Set error for a layer
		setLayerError(layerName, error) {
			this.layerLoading[layerName] = false
			this.loadingProgress[layerName].status = 'error'
			this.loadingErrors[layerName] = error
			this.loadingMessages[layerName] = `Error loading ${layerName}: ${error}`

			this.updateGlobalLoading()
		},

		// Update global loading state based on individual layers
		updateGlobalLoading() {
			this.isLoading = this.hasActiveLoading
		},

		// Clear all loading states
		clearAllLoading() {
			Object.keys(this.layerLoading).forEach((layer) => {
				this.layerLoading[layer] = false
				this.loadingProgress[layer] = { current: 0, total: 1, status: 'idle' }
			})
			this.loadingMessages = {}
			this.loadingErrors = {}
			this.isLoading = false
		},

		/**
		 * Clear stale loading states that have been loading for longer than the timeout.
		 * Also removes dynamic layer IDs (not in predefined list) that are still loading.
		 * This prevents the loading indicator from getting stuck due to:
		 * - Network timeouts not properly completing layer loading
		 * - Dynamic layer IDs (e.g., 'buildings-00100') that failed silently
		 * - Race conditions in navigation where layer loading was interrupted
		 *
		 * In E2E test mode (VITE_E2E_TEST=true), uses a shorter timeout (5s) to prevent
		 * test timeouts due to slow network responses in test environments.
		 *
		 * @param {number} staleTimeout - Maximum time in ms a layer can be loading before considered stale (default: 30000)
		 */
		clearStaleLoading(staleTimeout = 30000) {
			// Use shorter timeout in E2E test mode to prevent test timeouts
			const isE2ETest =
				typeof import.meta !== 'undefined' && import.meta.env?.VITE_E2E_TEST === 'true'
			const effectiveTimeout = isE2ETest ? Math.min(staleTimeout, 5000) : staleTimeout
			const now = Date.now()
			const predefinedLayers = [
				'trees',
				'vegetation',
				'otherNature',
				'buildings',
				'postalCodes',
				'landcover',
				'ndvi',
				'populationGrid',
				'heatData',
			]
			let clearedCount = 0

			Object.keys(this.layerLoading).forEach((layer) => {
				if (!this.layerLoading[layer]) return // Skip layers not currently loading

				const loadTime = this.loadingTimes[layer]
				const isStale = loadTime && now - loadTime.startTime > effectiveTimeout
				const isDynamicLayer = !predefinedLayers.includes(layer)

				// Clear if stale OR if it's a dynamic layer ID (these should be transient)
				if (isStale || isDynamicLayer) {
					logger.warn(
						`[loadingStore] Clearing stale loading state for ${layer}`,
						isDynamicLayer ? '(dynamic layer)' : `(loading for ${now - loadTime?.startTime}ms)`
					)
					this.layerLoading[layer] = false

					if (this.loadingProgress[layer]) {
						this.loadingProgress[layer].status = 'timeout'
					}

					delete this.loadingMessages[layer]
					clearedCount++
				}
			})

			if (clearedCount > 0) {
				logger.debug(`[loadingStore] Cleared ${clearedCount} stale loading states`)
				this.updateGlobalLoading()
			}

			return clearedCount
		},

		/**
		 * Start automatic stale loading cleanup.
		 * Runs clearStaleLoading periodically to prevent stuck loading indicators.
		 * In E2E test mode, uses more aggressive cleanup (every 3s with 5s timeout).
		 */
		startStaleCleanupTimer() {
			if (this._staleCleanupTimer) return // Already running

			const isE2ETest =
				typeof import.meta !== 'undefined' && import.meta.env?.VITE_E2E_TEST === 'true'
			const interval = isE2ETest ? 3000 : 10000 // 3s in tests, 10s in production
			const timeout = isE2ETest ? 5000 : 30000 // 5s in tests, 30s in production

			this._staleCleanupTimer = setInterval(() => {
				this.clearStaleLoading(timeout)
			}, interval)

			logger.debug(
				`[loadingStore] Started stale cleanup timer (${interval}ms interval, ${timeout}ms timeout)`
			)
		},

		/**
		 * Stop automatic stale loading cleanup.
		 */
		stopStaleCleanupTimer() {
			if (this._staleCleanupTimer) {
				clearInterval(this._staleCleanupTimer)
				this._staleCleanupTimer = null
				logger.debug('[loadingStore] Stopped stale cleanup timer')
			}
		},

		// Retry loading a layer that failed
		retryLayerLoading(layerName) {
			delete this.loadingErrors[layerName]
			this.loadingProgress[layerName].status = 'idle'
			// The actual retry logic should be handled by the calling component
		},

		// Get performance metrics
		getPerformanceMetrics() {
			return Object.entries(this.loadingTimes).map(([layer, times]) => ({
				layer,
				duration: times.duration || 0,
				startTime: times.startTime,
			}))
		},

		// Cache management actions
		async checkLayerCache(layerName, cacheKey = null) {
			const key = cacheKey || layerName
			try {
				const cached = await cacheService.getData(key)
				if (cached) {
					this.cacheStatus[layerName] = {
						cached: true,
						age: cached.age,
						size: new Blob([JSON.stringify(cached.data)]).size,
						timestamp: cached.timestamp,
					}
					return cached
				} else {
					this.cacheStatus[layerName] = {
						cached: false,
						age: null,
						size: null,
						timestamp: null,
					}
					return null
				}
			} catch (error) {
				logger.warn(`Cache check failed for ${layerName}:`, error?.message || error)
				return null
			}
		},

		async cacheLayerData(layerName, data, options = {}) {
			const key = options.cacheKey || layerName
			try {
				await cacheService.setData(key, data, {
					type: layerName,
					postalCode: options.postalCode,
					ttl: options.ttl || 24 * 60 * 60 * 1000, // 24 hours default
					metadata: options.metadata || {},
				})

				this.cacheStatus[layerName] = {
					cached: true,
					age: 0,
					size: new Blob([JSON.stringify(data)]).size,
					timestamp: Date.now(),
				}

				return true
			} catch (error) {
				logger.warn(`Cache storage failed for ${layerName}:`, error?.message || error)
				return false
			}
		},

		async clearLayerCache(layerName, cacheKey = null) {
			const key = cacheKey || layerName
			try {
				await cacheService.removeData(key)
				this.cacheStatus[layerName] = {
					cached: false,
					age: null,
					size: null,
					timestamp: null,
				}
				return true
			} catch (error) {
				logger.warn(`Cache clear failed for ${layerName}:`, error?.message || error)
				return false
			}
		},

		/**
		 * Update cache status for a layer (called by unifiedLoader after caching)
		 * @param {string} layerId - Layer identifier
		 * @param {boolean} cached - Whether data is cached
		 * @param {number} timestamp - Cache timestamp
		 */
		updateCacheStatus(layerId, cached, timestamp = null) {
			// Extract base layer name from layerId (e.g., "viewport_buildings_hsy_2499_6025" -> dynamic)
			// For dynamic layer IDs, we just acknowledge the cache update without state tracking
			// This prevents warnings while maintaining compatibility with unifiedLoader
			if (this.cacheStatus[layerId]) {
				this.cacheStatus[layerId] = {
					cached,
					age: timestamp ? Date.now() - timestamp : 0,
					timestamp,
				}
			}
			// For dynamic layer IDs not in predefined cacheStatus, silently succeed
		},

		// Data source health management
		updateDataSourceHealth(sourceName, status, responseTime = null, error = null) {
			if (this.dataSourceHealth[sourceName]) {
				this.dataSourceHealth[sourceName] = {
					status,
					lastCheck: Date.now(),
					responseTime,
					error,
				}
			}
		},

		getDataSourceHealth(sourceName) {
			return (
				this.dataSourceHealth[sourceName] || {
					status: 'unknown',
					lastCheck: null,
					responseTime: null,
					error: null,
				}
			)
		},

		getAllDataSourceHealth() {
			return Object.entries(this.dataSourceHealth).map(([source, health]) => ({
				source,
				...health,
			}))
		},

		// Enhanced loading with cache check
		async startLayerLoadingWithCache(layerName, options = {}) {
			// Check cache first
			const cacheKey = options.cacheKey || `${layerName}-${options.postalCode || 'global'}`
			const cached = await this.checkLayerCache(layerName, cacheKey)

			if (cached && !options.forceRefresh) {
				// Data is cached and valid
				this.loadingMessages[layerName] = `Using cached ${layerName} data`

				// Still show brief loading indicator for UI feedback
				this.layerLoading[layerName] = true
				setTimeout(() => {
					this.completeLayerLoading(layerName, true)
				}, 100)

				return cached.data
			}

			// Start normal loading process
			this.startLayerLoading(layerName, options)
			return null
		},

		// Enhanced completion with caching
		async completeLayerLoadingWithCache(layerName, success = true, data = null, options = {}) {
			this.completeLayerLoading(layerName, success)

			if (success && data && options.enableCaching !== false) {
				await this.cacheLayerData(layerName, data, options)
			}
		},
	},
})
