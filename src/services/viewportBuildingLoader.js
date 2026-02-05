/**
 * @module services/viewportBuildingLoader
 * Viewport-Based Building Streaming Service
 *
 * Implements efficient building loading based on camera viewport rather than postal code boundaries.
 * Uses a spatial tile grid system to load and cache building data for visible areas only.
 *
 * Features:
 * - Spatial tile grid with camera-based viewport detection
 * - Debounced camera movement handling for performance
 * - Tile-based caching with memory limits
 * - Visibility culling for buildings outside viewport
 * - Concurrent tile loading with rate limiting
 * - Integration with existing building processing pipeline
 *
 * Performance Optimizations:
 * - Uses Cesium's computeViewRectangle for efficient viewport calculation
 * - Reuses Cesium.Rectangle scratch objects to avoid GC pressure
 * - Batched entity visibility updates with requestRender()
 * - Debounced camera events to prevent excessive updates
 * - LRU-style tile eviction when memory limit reached
 *
 * Integration Points:
 * - Uses unifiedLoader for HTTP requests and retry logic
 * - Integrates with datasource service for GeoJSON loading
 * - Reuses building service for entity processing (heat, height)
 * - Respects toggleStore.helsinkiView for correct WFS endpoint
 *
 * @see {@link module:services/building}
 * @see {@link module:services/unifiedLoader}
 */

import { useBuildingStore } from '../stores/buildingStore.js'
import { useFeatureFlagStore } from '../stores/featureFlagStore.ts'
import { useGlobalStore } from '../stores/globalStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import { useURLStore } from '../stores/urlStore.js'
import { processBatchAdaptive } from '../utils/batchProcessor.js'
import {
	calculateBuildingHeight,
	DEFAULT_BUILDING_HEIGHT,
	FLOOR_HEIGHT,
} from '../utils/entityStyling.js'
import logger from '../utils/logger.js'
import { getCesium } from './cesiumProvider.js'
import Datasource from './datasource.js'
import unifiedLoader from './unifiedLoader.js'
import Urbanheat from './urbanheat.js'

/**
 * Configuration constants for viewport-based loading
 */
const CONFIG = {
	/** Tile size in degrees (~1km at Helsinki latitude) */
	TILE_SIZE: 0.01,
	/** Buffer zone around viewport (20% expansion) */
	BUFFER_FACTOR: 0.2,
	/** Maximum number of tiles to keep in memory */
	MAX_LOADED_TILES: 50,
	/** Debounce delay for camera movement (ms) */
	DEBOUNCE_DELAY: 300,
	/** Maximum concurrent tile loading requests */
	CONCURRENT_TILE_LOADS: 3,
	/** Cache TTL for building tiles (1 hour) */
	CACHE_TTL: 60 * 60 * 1000,
	/** Maximum camera altitude (meters) for building loading - prevents mass loading at region overview */
	MAX_ALTITUDE_FOR_LOADING: 3000,
}

/**
 * Configuration constants for predictive prefetching
 */
const PREFETCH_CONFIG = {
	/** Maximum concurrent prefetch requests */
	maxConcurrent: 2,
	/** Maximum tiles in prefetch queue */
	maxPending: 8,
	/** Minimum idle time (ms) to start prefetch work */
	minIdleTime: 10,
	/** Cooldown after user interaction before resuming prefetch (ms) */
	cooldownMs: 1000,
}

/**
 * Configuration for fade animation
 */
const FADE_CONFIG = {
	/** Fade duration in milliseconds */
	DURATION_MS: 300,
	/** Number of animation steps */
	STEPS: 10,
}

/**
 * ViewportBuildingLoader Class
 * Manages viewport-based building streaming with spatial tile grid system.
 *
 * @class ViewportBuildingLoader
 */
export default class ViewportBuildingLoader {
	/**
	 * Creates a ViewportBuildingLoader instance
	 * Initializes services and tile tracking structures.
	 */
	constructor() {
		this.store = useGlobalStore()
		this.toggleStore = useToggleStore()
		this.urlStore = useURLStore()
		this.buildingStore = useBuildingStore()
		this.featureFlagStore = useFeatureFlagStore()
		this.viewer = null

		// Service dependencies
		this.datasourceService = new Datasource()
		this.urbanheatService = new Urbanheat()
		this.unifiedLoader = unifiedLoader

		// Tile tracking
		/** @type {Map<string, Object>} Map of tile keys to tile metadata */
		this.loadedTiles = new Map()
		/** @type {Set<string>} Currently visible tile keys */
		this.visibleTiles = new Set()
		/** @type {Set<string>} Tiles currently being loaded */
		this.loadingTiles = new Set()

		// Camera event tracking
		this.debounceTimeout = null
		this.isInitialized = false
		this.cameraMovedHandler = null

		// Cesium scratch objects for performance (reuse to avoid GC)
		// Initialized lazily after Cesium is loaded
		this.scratchRectangle = null

		// Active loading queue
		this.loadingQueue = []
		this.activeLoads = 0

		// Prefetch state tracking
		/** @type {string[]} Queue of tile keys to prefetch */
		this.prefetchQueue = []
		/** @type {number} Currently active prefetch requests */
		this.activePrefetches = 0
		/** @type {number|null} Handle for requestIdleCallback */
		this.prefetchHandle = null
		/** @type {boolean} Flag to cancel prefetch operations */
		this.prefetchCancelled = false
		/** @type {Set<string>} Tiles already prefetched (in cache) */
		this.prefetchedTiles = new Set()
		/** @type {{x: number, y: number}} Last camera velocity for priority sorting */
		this.lastCameraVelocity = { x: 0, y: 0 }
		/** @type {{lat: number, lon: number}|null} Previous camera position for velocity calculation */
		this.previousCameraPosition = null
		/** @type {number|null} Previous camera timestamp */
		this.previousCameraTimestamp = null

		logger.debug('[ViewportBuildingLoader] Service initialized')
	}

	/**
	 * Initialize viewport-based loading system
	 * Sets up camera event listeners and performs initial viewport load.
	 * Waits for globe to be ready before initial load to avoid race conditions.
	 *
	 * @param {Cesium.Viewer} viewer - CesiumJS viewer instance
	 * @returns {Promise<void>}
	 */
	async initialize(viewer) {
		if (this.isInitialized) {
			logger.warn('[ViewportBuildingLoader] Already initialized, skipping')
			return
		}

		// Validate viewer is a proper Cesium.Viewer instance
		if (!viewer) {
			logger.error('[ViewportBuildingLoader] Cannot initialize - viewer is null/undefined')
			return
		}

		if (!viewer.camera) {
			logger.error('[ViewportBuildingLoader] Cannot initialize - viewer.camera is undefined')
			logger.error(
				'[ViewportBuildingLoader] Viewer type:',
				typeof viewer,
				viewer?.constructor?.name
			)
			return
		}

		if (!viewer.camera.moveEnd) {
			logger.error(
				'[ViewportBuildingLoader] Cannot initialize - viewer.camera.moveEnd is undefined'
			)
			return
		}

		this.viewer = viewer

		// Set up camera event listeners with debouncing
		// Store handler reference for cleanup in destroy()
		this.cameraMovedHandler = () => {
			this.handleCameraMove()
		}
		this.viewer.camera.moveEnd.addEventListener(this.cameraMovedHandler)

		this.isInitialized = true
		logger.debug('[ViewportBuildingLoader] Camera listeners attached')

		// Wait for globe to be ready, then perform initial load with retry
		await this.waitForGlobeAndLoadInitial()
	}

	/**
	 * Wait for globe tiles to load, then perform initial viewport update.
	 * Uses retry with exponential backoff if viewport bounds unavailable.
	 *
	 * @private
	 * @returns {Promise<void>}
	 */
	async waitForGlobeAndLoadInitial() {
		const MAX_RETRIES = 5
		const BASE_DELAY_MS = 200

		for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
			// Check if globe is ready (tiles loaded)
			const globe = this.viewer?.scene?.globe
			if (!globe) {
				logger.warn('[ViewportBuildingLoader] Globe not available, retrying...')
				await this.delay(BASE_DELAY_MS * attempt)
				continue
			}

			// Try to get viewport bounds
			const bounds = this.getViewportBounds()
			if (bounds) {
				logger.debug(
					`[ViewportBuildingLoader] Globe ready, starting initial load (attempt ${attempt})`
				)
				await this.updateViewport()
				return
			}

			// Bounds not available yet, wait with exponential backoff
			const delay = BASE_DELAY_MS * 2 ** (attempt - 1)
			logger.debug(
				`[ViewportBuildingLoader] Viewport bounds not ready, retry ${attempt}/${MAX_RETRIES} in ${delay}ms`
			)
			await this.delay(delay)
		}

		// All retries exhausted, set up listener for first camera move
		logger.warn(
			'[ViewportBuildingLoader] Initial load failed after retries, will load on first camera move'
		)
	}

	/**
	 * Simple delay helper
	 * @private
	 * @param {number} ms - Milliseconds to wait
	 * @returns {Promise<void>}
	 */
	delay(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}

	/**
	 * Handle camera movement with debouncing
	 * Cancels pending updates, tracks camera velocity, and schedules new update after debounce delay.
	 * @private
	 */
	handleCameraMove() {
		// Cancel any pending prefetch when user is actively moving
		if (this.featureFlagStore.isEnabled('predictivePrefetch')) {
			this.cancelPrefetch()
		}

		// Track camera velocity for prefetch prioritization
		this.updateCameraVelocity()

		// Clear existing timeout
		if (this.debounceTimeout) {
			clearTimeout(this.debounceTimeout)
		}

		// Schedule new update
		this.debounceTimeout = setTimeout(() => {
			this.updateViewport().catch((error) => {
				logger.error('Failed to update viewport:', error)
			})
		}, CONFIG.DEBOUNCE_DELAY)
	}

	/**
	 * Update camera velocity tracking for prefetch prioritization
	 * Calculates direction and speed of camera movement.
	 * @private
	 */
	updateCameraVelocity() {
		if (!this.viewer) return

		const Cesium = getCesium()
		const cameraCartographic = this.viewer.camera.positionCartographic
		const currentPosition = {
			lat: Cesium.Math.toDegrees(cameraCartographic.latitude),
			lon: Cesium.Math.toDegrees(cameraCartographic.longitude),
		}
		const currentTimestamp = Date.now()

		if (this.previousCameraPosition && this.previousCameraTimestamp) {
			const dt = (currentTimestamp - this.previousCameraTimestamp) / 1000 // seconds
			if (dt > 0 && dt < 5) {
				// Only calculate if reasonable time delta
				this.lastCameraVelocity = {
					x: (currentPosition.lon - this.previousCameraPosition.lon) / dt,
					y: (currentPosition.lat - this.previousCameraPosition.lat) / dt,
				}
			}
		}

		this.previousCameraPosition = currentPosition
		this.previousCameraTimestamp = currentTimestamp
	}

	/**
	 * Main viewport update loop
	 * Calculates visible tiles, loads missing tiles, updates visibility, and evicts distant tiles.
	 * @returns {Promise<void>}
	 */
	async updateViewport() {
		if (!this.viewer) {
			logger.warn('[ViewportBuildingLoader] Viewer not initialized')
			return
		}

		// Skip building loading when in statistical grid view - grid has 18K+ entities
		// and doesn't need building overlays. This prevents unnecessary loading during
		// the grid transition which compounds performance issues.
		// Also skip when 250m statistical grid is active at capital region level.
		if (this.toggleStore.gridView || this.toggleStore.grid250m) {
			logger.debug('[ViewportBuildingLoader] Grid view active, skipping building load')
			return
		}

		// Check camera altitude - skip loading if too high (region overview)
		const cameraHeight = this.viewer.camera.positionCartographic.height
		if (cameraHeight > CONFIG.MAX_ALTITUDE_FOR_LOADING) {
			logger.debug(
				`[ViewportBuildingLoader] Camera too high (${Math.round(cameraHeight)}m > ${CONFIG.MAX_ALTITUDE_FOR_LOADING}m), skipping building load`
			)
			return
		}

		try {
			// Get current viewport bounds with buffer zone
			const viewportBounds = this.getViewportBounds()
			if (!viewportBounds) {
				logger.warn('[ViewportBuildingLoader] Cannot determine viewport bounds')
				return
			}

			const bufferedBounds = this.expandBounds(viewportBounds, CONFIG.BUFFER_FACTOR)

			// Calculate required tiles
			const requiredTileKeys = this.getTilesInBounds(bufferedBounds)
			logger.debug(`[ViewportBuildingLoader] Viewport requires ${requiredTileKeys.length} tiles`)

			// Update visibility for loaded tiles
			this.updateTileVisibility(requiredTileKeys)

			// Load missing tiles
			await this.loadMissingTiles(requiredTileKeys)

			// Evict distant tiles if over memory limit
			this.unloadDistantTiles(requiredTileKeys).catch((error) => {
				logger.error('Failed to unload distant tiles:', error)
			})

			// Schedule prefetch for adjacent tiles if feature is enabled
			if (this.featureFlagStore.isEnabled('predictivePrefetch')) {
				this.schedulePrefetchForAdjacent()
			}
		} catch (error) {
			logger.error('[ViewportBuildingLoader] Error updating viewport:', error)
		}
	}

	/**
	 * Get current viewport rectangle in geographic coordinates
	 * Uses Cesium's computeViewRectangle for efficient viewport calculation.
	 *
	 * @returns {Object|null} {west, south, east, north} in degrees, or null if viewport cannot be determined
	 */
	getViewportBounds() {
		try {
			const Cesium = getCesium()
			// Lazily initialize scratch rectangle
			if (!this.scratchRectangle) {
				this.scratchRectangle = new Cesium.Rectangle()
			}

			const rect = this.viewer.camera.computeViewRectangle(
				this.viewer.scene.globe.ellipsoid,
				this.scratchRectangle
			)

			if (!rect) {
				return null
			}

			return {
				west: Cesium.Math.toDegrees(rect.west),
				south: Cesium.Math.toDegrees(rect.south),
				east: Cesium.Math.toDegrees(rect.east),
				north: Cesium.Math.toDegrees(rect.north),
			}
		} catch (error) {
			logger.error('[ViewportBuildingLoader] Error computing viewport rectangle:', error)
			return null
		}
	}

	/**
	 * Expand bounds by a factor to create buffer zone
	 * Adds margin around viewport to preload adjacent tiles.
	 *
	 * @param {Object} bounds - Original bounds {west, south, east, north}
	 * @param {number} factor - Expansion factor (0.2 = 20% buffer)
	 * @returns {Object} Expanded bounds
	 */
	expandBounds(bounds, factor) {
		const width = bounds.east - bounds.west
		const height = bounds.north - bounds.south

		return {
			west: bounds.west - width * factor,
			south: bounds.south - height * factor,
			east: bounds.east + width * factor,
			north: bounds.north + height * factor,
		}
	}

	/**
	 * Calculate tile keys for all tiles intersecting bounds
	 * Generates tile grid coordinates based on TILE_SIZE.
	 *
	 * @param {Object} bounds - Geographic bounds {west, south, east, north}
	 * @returns {string[]} Array of tile keys (format: "tileX_tileY")
	 */
	getTilesInBounds(bounds) {
		const tileKeys = []

		const minTileX = Math.floor(bounds.west / CONFIG.TILE_SIZE)
		const maxTileX = Math.floor(bounds.east / CONFIG.TILE_SIZE)
		const minTileY = Math.floor(bounds.south / CONFIG.TILE_SIZE)
		const maxTileY = Math.floor(bounds.north / CONFIG.TILE_SIZE)

		for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
			for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
				tileKeys.push(`${tileX}_${tileY}`)
			}
		}

		return tileKeys
	}

	/**
	 * Load tiles that are not yet loaded or loading
	 * Respects concurrent loading limit and queues excess requests.
	 * Uses center-out loading priority for better perceived performance.
	 *
	 * @param {string[]} tileKeys - Required tile keys
	 * @returns {Promise<void>}
	 */
	async loadMissingTiles(tileKeys) {
		const missingTiles = tileKeys.filter(
			(key) => !this.loadedTiles.has(key) && !this.loadingTiles.has(key)
		)

		if (missingTiles.length === 0) {
			return
		}

		// Get viewport bounds for center calculation
		const viewportBounds = this.getViewportBounds()
		if (!viewportBounds) {
			logger.warn('[ViewportBuildingLoader] Cannot determine viewport center for priority sorting')
			// Fall back to unsorted loading
			this.loadingQueue.push(...missingTiles)
			await this.processLoadingQueue()
			return
		}

		// Calculate viewport center for distance-based priority
		const viewportCenter = {
			lat: (viewportBounds.north + viewportBounds.south) / 2,
			lon: (viewportBounds.east + viewportBounds.west) / 2,
		}

		// Sort by distance from center (closest first)
		missingTiles.sort(
			(a, b) =>
				this.getDistanceFromCenter(a, viewportCenter) -
				this.getDistanceFromCenter(b, viewportCenter)
		)

		logger.debug(
			`[ViewportBuildingLoader] Loading ${missingTiles.length} tiles (center-out priority)`
		)

		// Add to queue and process
		this.loadingQueue.push(...missingTiles)
		await this.processLoadingQueue()
	}

	/**
	 * Process loading queue with concurrency limit
	 * Loads tiles in parallel up to CONCURRENT_TILE_LOADS limit.
	 * @private
	 * @returns {Promise<void>}
	 */
	async processLoadingQueue() {
		while (this.loadingQueue.length > 0 && this.activeLoads < CONFIG.CONCURRENT_TILE_LOADS) {
			const tileKey = this.loadingQueue.shift()

			// Skip if already loading or loaded
			if (this.loadingTiles.has(tileKey) || this.loadedTiles.has(tileKey)) {
				continue
			}

			// Start loading tile
			this.activeLoads++
			this.loadingTiles.add(tileKey)

			// Load tile asynchronously (don't await here to enable parallelism)
			this.loadTile(tileKey)
				.then(() => {
					this.activeLoads--
					this.loadingTiles.delete(tileKey)

					// Show the newly loaded tile with fade-in animation
					// Skip fade-in if grid became active during load
					const viewPrefix = this.toggleStore.helsinkiView ? 'Helsinki' : 'HSY'
					const datasourceName = `Buildings Viewport ${viewPrefix} ${tileKey}`
					const datasource = this.datasourceService.getDataSourceByName(datasourceName)
					if (datasource) {
						if (this.toggleStore.grid250m) {
							datasource.show = false
							logger.debug(
								`[ViewportBuildingLoader] Tile ${tileKey} loaded but hidden (grid active)`
							)
						} else {
							this.fadeInDatasource(datasource).catch((error) => {
								logger.error(`Failed to fade in datasource for tile ${tileKey}:`, error)
							})
						}
					}

					// Continue processing queue
					this.processLoadingQueue().catch((error) => {
						logger.error('Failed to continue processing loading queue:', error)
					})
				})
				.catch((error) => {
					logger.error(`Failed to load tile ${tileKey}:`, error)
					this.activeLoads--
					this.loadingTiles.delete(tileKey)
					// Continue processing queue even on error
					this.processLoadingQueue().catch((err) => {
						logger.error('Failed to continue processing loading queue after error:', err)
					})
				})
		}
	}

	/**
	 * Load a single tile via WFS BBOX query
	 * Fetches building data for tile bounds and processes entities.
	 * For Helsinki view, also fetches heat data in parallel if postal code available.
	 *
	 * @param {string} tileKey - Tile key (format: "tileX_tileY")
	 * @returns {Promise<void>}
	 */
	async loadTile(tileKey) {
		logger.debug(`[ViewportBuildingLoader] Loading tile ${tileKey}`)

		// Parse tile coordinates
		const [tileX, tileY] = tileKey.split('_').map(Number)

		// Calculate tile bounds
		const bounds = {
			west: tileX * CONFIG.TILE_SIZE,
			south: tileY * CONFIG.TILE_SIZE,
			east: (tileX + 1) * CONFIG.TILE_SIZE,
			north: (tileY + 1) * CONFIG.TILE_SIZE,
		}

		// Build BBOX URL for tile bounds (uses different endpoint based on view mode)
		const url = this.buildBboxUrl(bounds)

		try {
			const viewPrefix = this.toggleStore.helsinkiView ? 'hki' : 'hsy'
			const isHelsinkiView = this.toggleStore.helsinkiView
			const currentPostalCode = this.store.postalcode

			// For Helsinki view with postal code, fetch heat data in parallel with building data
			// Heat data is optional - buildings render even if heat API fails
			let heatDataPromise = null
			if (isHelsinkiView && currentPostalCode) {
				logger.debug(
					`[ViewportBuildingLoader] Initiating parallel heat data fetch for postal code ${currentPostalCode}`
				)
				heatDataPromise = this.urbanheatService.getHeatData(currentPostalCode)
			}

			const loadingConfig = {
				layerId: `viewport_buildings_${viewPrefix}_${tileKey}`,
				url: url,
				type: 'geojson',
				options: {
					cache: true,
					cacheTTL: CONFIG.CACHE_TTL,
					retries: 2,
					progressive: false,
					priority: 'normal',
				},
			}

			// Fetch building data and heat data in parallel
			const [buildingData, heatResult] = await Promise.all([
				this.unifiedLoader.loadLayer(loadingConfig),
				heatDataPromise
					? heatDataPromise.catch((error) => {
							logger.warn(
								`[ViewportBuildingLoader] Heat data fetch failed:`,
								error?.message || error
							)
							return null
						})
					: Promise.resolve(null),
			])

			logger.debug(
				`[ViewportBuildingLoader] ✅ Received ${buildingData?.features?.length || 0} buildings for tile ${tileKey}`
			)

			// Process buildings with pre-fetched heat data
			const entities = await this.processBuildings(buildingData, tileKey, heatResult)

			// Track loaded tile
			this.loadedTiles.set(tileKey, {
				bounds,
				entityCount: entities?.length || 0,
				loadedAt: Date.now(),
			})

			logger.debug(`[ViewportBuildingLoader] ✅ Tile ${tileKey} loaded successfully`)
		} catch (error) {
			logger.error(`[ViewportBuildingLoader] ❌ Error loading tile ${tileKey}:`, error)
			throw error
		}
	}

	/**
	 * Build URL for BBOX query based on current view mode
	 * Uses Helsinki WFS for Helsinki view, HSY pygeoapi for Capital Region view.
	 *
	 * @param {Object} bounds - Geographic bounds {west, south, east, north}
	 * @returns {string} API URL with BBOX parameter
	 */
	buildBboxUrl(bounds) {
		// Format bbox string as "minLon,minLat,maxLon,maxLat"
		const bboxString = `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`

		if (this.toggleStore.helsinkiView) {
			// Helsinki WFS endpoint
			const baseUrl = 'https://kartta.hel.fi/ws/geoserver/avoindata/wfs'
			const params = new URLSearchParams({
				service: 'wfs',
				version: '2.0.0',
				request: 'GetFeature',
				typeNames: 'avoindata:Rakennukset_alue_rekisteritiedot',
				outputFormat: 'application/json',
				srsName: 'urn:ogc:def:crs:EPSG::4326',
				bbox: `${bounds.west},${bounds.south},${bounds.east},${bounds.north},urn:ogc:def:crs:EPSG::4326`,
			})
			return `${baseUrl}?${params.toString()}`
		} else {
			// Capital Region - HSY pygeoapi endpoint
			// Use the urlStore getter for consistency
			return this.urlStore.hsyGridBuildings(bboxString, 5000)
		}
	}

	/**
	 * Normalize feature IDs in GeoJSON to ensure top-level 'id' property exists.
	 * PyGeoAPI may return features without a top-level 'id' field, but Cesium extracts
	 * entity IDs from properties.vtj_prt. This normalization ensures feature.id matches
	 * what Cesium uses for entity._id, enabling proper tooltip lookup.
	 *
	 * @param {Object} geojson - GeoJSON FeatureCollection to normalize
	 * @returns {Object} Normalized GeoJSON with top-level IDs on all features
	 * @private
	 */
	normalizeFeatureIds(geojson) {
		if (!geojson?.features) {
			return geojson
		}

		let normalizedCount = 0
		for (const feature of geojson.features) {
			// If feature already has a top-level id, keep it
			if (feature.id != null) {
				continue
			}

			// Extract ID from properties (vtj_prt for HSY buildings)
			const vtjPrt = feature.properties?.vtj_prt
			if (vtjPrt) {
				feature.id = vtjPrt
				normalizedCount++
			}
		}

		if (normalizedCount > 0) {
			logger.debug(
				`[ViewportBuildingLoader] 🔧 Normalized ${normalizedCount} feature IDs from properties.vtj_prt`
			)
		}

		return geojson
	}

	/**
	 * Process building GeoJSON data
	 * Handles both Helsinki and HSY (Capital Region) building formats.
	 * Uses pre-fetched heat data when available (parallel fetch optimization).
	 *
	 * @param {Object} geojson - GeoJSON FeatureCollection
	 * @param {string} tileKey - Tile key for datasource naming
	 * @param {Object|null} [prefetchedHeatData=null] - Pre-fetched heat data (optional, for parallel fetch optimization)
	 * @returns {Promise<Array<Cesium.Entity>>} Processed building entities
	 */
	async processBuildings(geojson, tileKey, prefetchedHeatData = null) {
		if (!geojson || !geojson.features || geojson.features.length === 0) {
			logger.warn(`[ViewportBuildingLoader] No features in tile ${tileKey}`)
			return []
		}

		// Normalize feature IDs to ensure top-level 'id' exists for tooltip lookup
		// This fixes the "No matching feature found for Id" issue where PyGeoAPI
		// returns features without top-level IDs but Cesium extracts IDs from properties.vtj_prt
		this.normalizeFeatureIds(geojson)

		const isHelsinkiView = this.toggleStore.helsinkiView
		const viewType = isHelsinkiView ? 'Helsinki' : 'Capital Region'
		logger.debug(
			`[ViewportBuildingLoader] Processing ${geojson.features.length} ${viewType} buildings for tile ${tileKey}`
		)

		// Create datasource with tile-specific name
		const viewPrefix = isHelsinkiView ? 'Helsinki' : 'HSY'
		const datasourceName = `Buildings Viewport ${viewPrefix} ${tileKey}`
		const entities = await this.datasourceService.addDataSourceWithPolygonFix(
			geojson,
			datasourceName,
			false // Start hidden, visibility controlled by updateTileVisibility
		)

		if (entities.length === 0) {
			return []
		}

		// Process entities based on view type
		if (isHelsinkiView) {
			// Helsinki: Merge pre-fetched heat data with buildings (parallel fetch optimization)
			// If prefetchedHeatData is available, use it; otherwise heat data was unavailable
			if (prefetchedHeatData) {
				logger.debug(
					`[ViewportBuildingLoader] Using pre-fetched heat data (${prefetchedHeatData?.features?.length || 0} features)`
				)
				await this.urbanheatService.mergeHeatWithBuildings(geojson, prefetchedHeatData, tileKey)
			} else {
				// No heat data available - buildings still render, just without heat attributes
				logger.debug(
					'[ViewportBuildingLoader] No heat data available, proceeding without heat attributes'
				)
				this.buildingStore.setBuildingFeatures(geojson, tileKey)
			}
			await this.setHeatExposureToBuildings(entities)
			await this.setHelsinkiBuildingsHeight(entities)
		} else {
			// Capital Region (HSY): Different property names
			await this.setHSYBuildingAttributes(entities)
		}

		// Note: Alpha is set to 0 by fadeInDatasource (after tile loading completes)
		// Do NOT set alpha to 0 here - fadeInDatasource reads current alpha as target

		// Populate building store for tooltip/hover info display
		// Uses tileKey as cache key (similar to postal code in other loaders)
		logger.debug(
			`[ViewportBuildingLoader] 📦 Storing ${geojson.features.length} features for tooltip lookup. Sample IDs:`,
			geojson.features.slice(0, 3).map((f) => f.id)
		)
		this.buildingStore.setBuildingFeatures(geojson, tileKey)

		return entities
	}

	/**
	 * Apply heat exposure visualization to building entities
	 * Batched processing to avoid UI blocking (reuses building.js pattern).
	 *
	 * @param {Array<Cesium.Entity>} entities - Building entities
	 * @returns {Promise<void>}
	 */
	async setHeatExposureToBuildings(entities) {
		const batchSize = 25

		for (let i = 0; i < entities.length; i += batchSize) {
			const batch = entities.slice(i, i + batchSize)

			for (let j = 0; j < batch.length; j++) {
				this.setBuildingEntityPolygon(batch[j])
			}

			if (i + batchSize < entities.length) {
				await new Promise((resolve) => requestIdleCallback(resolve))
			}
		}
	}

	/**
	 * Set building entity polygon color based on heat exposure
	 * Simplified version from building.js for viewport-based loading.
	 *
	 * @param {Cesium.Entity} entity - Building entity
	 * @private
	 */
	setBuildingEntityPolygon(entity) {
		const { properties, polygon } = entity

		if (polygon && properties?.avgheatexposuretobuilding) {
			const Cesium = getCesium()
			const heatExposureValue = properties.avgheatexposuretobuilding._value
			polygon.material = new Cesium.Color(1, 1 - heatExposureValue, 0, heatExposureValue)
		}
	}

	/**
	 * Apply building heights from floor count or measured height
	 * Uses adaptive batched processing for optimal performance.
	 *
	 * @param {Array<Cesium.Entity>} entities - Building entities
	 * @returns {Promise<void>}
	 */
	async setHelsinkiBuildingsHeight(entities) {
		await processBatchAdaptive(
			entities,
			(entity) => {
				if (entity.polygon) {
					entity.polygon.extrudedHeight = calculateBuildingHeight(entity.properties)
				}
			},
			{ processorName: 'viewportHeightExtrusion' }
		)
	}

	/**
	 * Set HSY building attributes (height and heat-based color)
	 * HSY buildings use 'kerrosten_lkm' for floor count instead of 'i_kerrlkm'
	 * Colors are derived from heat_timeseries data when available.
	 * Uses adaptive batching for optimal performance across devices.
	 *
	 * @param {Array<Cesium.Entity>} entities - Building entities
	 * @returns {Promise<void>}
	 */
	async setHSYBuildingAttributes(entities) {
		const Cesium = getCesium()
		const targetDate = this.store.heatDataDate
		let coloredCount = 0

		await processBatchAdaptive(
			entities,
			(entity) => {
				if (entity.polygon) {
					// HSY uses 'kerrosten_lkm' for floor count (not i_kerrlkm)
					const floorCount = entity.properties?.kerrosten_lkm?._value

					// Set height based on floor count (3.2m per floor) or default
					// Filter out invalid floor counts (>= 999 indicates data quality issue)
					entity.polygon.extrudedHeight =
						floorCount != null && floorCount < 999
							? floorCount * FLOOR_HEIGHT
							: DEFAULT_BUILDING_HEIGHT

					// Try to get heat exposure from heat_timeseries for the current date
					const heatTimeseries = entity.properties?.heat_timeseries?._value
					let heatExposure = null

					if (Array.isArray(heatTimeseries) && heatTimeseries.length > 0) {
						const matchingEntry = heatTimeseries.find((entry) => entry.date === targetDate)
						if (matchingEntry?.avgheatexposure != null) {
							heatExposure = matchingEntry.avgheatexposure
						}
					}

					// Also check direct avgheatexposure property (mock data format)
					if (heatExposure == null) {
						heatExposure = entity.properties?.avgheatexposure?._value
					}

					// Apply heat-based color if available, otherwise use default blue
					if (heatExposure != null && heatExposure >= 0 && heatExposure <= 1) {
						// Heat color gradient: green (low) -> yellow -> red (high)
						const alpha = 0.7
						entity.polygon.material = new Cesium.ColorMaterialProperty(
							new Cesium.Color(1, 1 - heatExposure, 0, alpha)
						)
						coloredCount++
					} else {
						// Default blue color for buildings without heat data
						const alpha = 0.7
						entity.polygon.material = new Cesium.ColorMaterialProperty(
							new Cesium.Color(0.4, 0.6, 0.8, alpha)
						)
					}
				}
			},
			{ processorName: 'hsyBuildingAttributes' }
		)

		logger.debug(
			`[ViewportBuildingLoader] ✅ HSY attributes set for ${entities.length} buildings (${coloredCount} with heat colors)`
		)
	}

	/**
	 * Fade in a datasource's entities smoothly
	 * Animates entity alpha from 0 to target value over FADE_CONFIG.DURATION_MS
	 *
	 * Performance optimizations:
	 * - Hoists JulianDate creation (single allocation instead of entities.length × steps)
	 * - Pre-caches entity color data before animation loop
	 * - Uses requestAnimationFrame for frame-aligned animation
	 * - Reuses scratch Color object to reduce GC pressure
	 *
	 * @param {Cesium.DataSource} datasource - Datasource containing building entities
	 * @returns {Promise<void>}
	 */
	async fadeInDatasource(datasource) {
		if (!datasource?.entities) return

		const Cesium = getCesium()
		const entities = datasource.entities.values
		const stepDuration = FADE_CONFIG.DURATION_MS / FADE_CONFIG.STEPS

		// OPTIMIZATION: Create JulianDate once (hoisted from inner loop)
		const now = Cesium.JulianDate.now()

		// Pre-cache entity color data before animation to avoid getValue() calls per frame
		const entityData = []
		for (const entity of entities) {
			if (entity.polygon?.material) {
				const color = entity.polygon.material.color?.getValue?.(now)
				if (color) {
					entityData.push({
						entity,
						r: color.red,
						g: color.green,
						b: color.blue,
						targetAlpha: color.alpha,
					})
					// Set initial transparent state
					entity.polygon.material = new Cesium.ColorMaterialProperty(
						new Cesium.Color(color.red, color.green, color.blue, 0)
					)
				}
			}
		}

		// Make datasource visible (entities are transparent)
		datasource.show = true

		// Use requestAnimationFrame for frame-aligned animation
		return new Promise((resolve) => {
			let step = 0

			const animate = () => {
				step++
				const progress = step / FADE_CONFIG.STEPS

				// Update all entities with pre-cached color data
				for (const data of entityData) {
					const currentAlpha = data.targetAlpha * progress
					data.entity.polygon.material = new Cesium.ColorMaterialProperty(
						new Cesium.Color(data.r, data.g, data.b, currentAlpha)
					)
				}

				// Request render
				if (this.viewer) {
					this.viewer.scene.requestRender()
				}

				if (step < FADE_CONFIG.STEPS) {
					// Schedule next frame with stepDuration delay
					setTimeout(() => requestAnimationFrame(animate), stepDuration)
				} else {
					logger.debug(
						`[ViewportBuildingLoader] ✨ Fade-in complete for ${entityData.length} entities`
					)
					resolve()
				}
			}

			requestAnimationFrame(animate)
		})
	}

	/**
	 * Update entity visibility based on visible tiles
	 * Shows entities in visible tiles, hides entities in loaded but non-visible tiles.
	 *
	 * @param {string[]} visibleTileKeys - Currently visible tile keys
	 * @returns {void}
	 */
	updateTileVisibility(visibleTileKeys) {
		const visibleSet = new Set(visibleTileKeys)
		const viewPrefix = this.toggleStore.helsinkiView ? 'Helsinki' : 'HSY'

		// Update visibility for all loaded tiles
		for (const [tileKey] of this.loadedTiles) {
			const datasourceName = `Buildings Viewport ${viewPrefix} ${tileKey}`
			const datasource = this.datasourceService.getDataSourceByName(datasourceName)

			if (!datasource) {
				continue
			}

			const shouldBeVisible = visibleSet.has(tileKey)
			const isCurrentlyVisible = datasource.show

			// Only update if state changed
			if (shouldBeVisible && !isCurrentlyVisible) {
				// Fade in (async, non-blocking)
				this.fadeInDatasource(datasource).catch((error) => {
					logger.error(`Failed to fade in datasource for tile ${tileKey}:`, error)
				})
			} else if (!shouldBeVisible && isCurrentlyVisible) {
				// Instant hide (no fade-out for performance)
				datasource.show = false
			}
		}

		// Update visible tiles tracking
		this.visibleTiles = visibleSet
	}

	/**
	 * Set visibility of all loaded building datasources
	 * Used when toggling statistical grid to hide/show buildings without unloading.
	 *
	 * @param {boolean} visible - Whether buildings should be visible
	 * @returns {void}
	 */
	setAllBuildingsVisible(visible) {
		const viewPrefix = this.toggleStore.helsinkiView ? 'Helsinki' : 'HSY'
		let updatedCount = 0

		for (const [tileKey] of this.loadedTiles) {
			const datasourceName = `Buildings Viewport ${viewPrefix} ${tileKey}`
			const datasource = this.datasourceService.getDataSourceByName(datasourceName)

			if (datasource && datasource.show !== visible) {
				datasource.show = visible
				updatedCount++
			}
		}

		logger.debug(
			`[ViewportBuildingLoader] Set ${updatedCount} building datasources to visible=${visible}`
		)
	}

	/**
	 * Unload tiles beyond memory limit
	 * Evicts oldest tiles when loaded tile count exceeds MAX_LOADED_TILES.
	 * Uses LRU-style eviction based on load time.
	 *
	 * @param {string[]} currentRequiredTiles - Currently required tile keys (won't be evicted)
	 * @returns {Promise<void>}
	 */
	async unloadDistantTiles(currentRequiredTiles) {
		const requiredSet = new Set(currentRequiredTiles)
		const evictableTiles = []

		// Find tiles that can be evicted (not currently required)
		for (const [tileKey, metadata] of this.loadedTiles) {
			if (!requiredSet.has(tileKey)) {
				evictableTiles.push({ tileKey, loadedAt: metadata.loadedAt })
			}
		}

		// Check if we need to evict
		const tilesOverLimit = this.loadedTiles.size - CONFIG.MAX_LOADED_TILES
		if (tilesOverLimit <= 0) {
			return
		}

		// Sort by oldest first (LRU eviction)
		evictableTiles.sort((a, b) => a.loadedAt - b.loadedAt)

		// Evict oldest tiles
		const tilesToEvict = evictableTiles.slice(0, Math.min(tilesOverLimit, evictableTiles.length))

		logger.debug(
			`[ViewportBuildingLoader] Evicting ${tilesToEvict.length} tiles (over limit by ${tilesOverLimit})`
		)

		for (const { tileKey } of tilesToEvict) {
			await this.unloadTile(tileKey)
		}
	}

	/**
	 * Unload a single tile
	 * Removes datasource, evicts features from building store, and clears tile from tracking.
	 *
	 * @param {string} tileKey - Tile key to unload
	 * @returns {Promise<void>}
	 */
	async unloadTile(tileKey) {
		const viewPrefix = this.toggleStore.helsinkiView ? 'Helsinki' : 'HSY'
		const datasourceName = `Buildings Viewport ${viewPrefix} ${tileKey}`

		try {
			await this.datasourceService.removeDataSourcesByNamePrefix(datasourceName)

			// Also evict features from building store to keep cache in sync with visible entities
			// This prevents orphaned features in the cache and ensures consistent behavior
			this.buildingStore.evictPostalCode(tileKey)

			this.loadedTiles.delete(tileKey)
			this.visibleTiles.delete(tileKey)

			logger.debug(`[ViewportBuildingLoader] Tile ${tileKey} unloaded (entities + features)`)
		} catch (error) {
			logger.error(`[ViewportBuildingLoader] Error unloading tile ${tileKey}:`, error)
		}
	}

	/**
	 * Cancel all pending tile loads in the queue.
	 * Called when grid view is enabled to stop further building loading.
	 *
	 * @returns {void}
	 */
	cancelPendingLoads() {
		const cancelled = this.loadingQueue.length
		this.loadingQueue = []
		if (cancelled > 0) {
			logger.debug(`[ViewportBuildingLoader] Cancelled ${cancelled} pending tile loads`)
		}
	}

	/**
	 * Clear all loaded tiles and reset state
	 * Useful for switching between viewport-based and postal code-based loading modes.
	 *
	 * @returns {Promise<void>}
	 */
	async clearAllTiles() {
		logger.debug(`[ViewportBuildingLoader] Clearing all ${this.loadedTiles.size} loaded tiles`)

		// Remove all viewport datasources
		await this.datasourceService.removeDataSourcesByNamePrefix('Buildings Viewport')

		// Clear tracking
		this.loadedTiles.clear()
		this.visibleTiles.clear()
		this.loadingTiles.clear()
		this.loadingQueue = []

		logger.debug('[ViewportBuildingLoader] All tiles cleared')
	}

	/**
	 * Handle view mode change (Helsinki <-> Capital Region)
	 * Clears all loaded tiles since the data source changes.
	 *
	 * @returns {Promise<void>}
	 */
	async handleViewModeChange() {
		logger.debug('[ViewportBuildingLoader] View mode changed, clearing tiles')
		await this.clearAllTiles()
		// Trigger reload for new view
		this.updateViewport().catch((error) => {
			logger.error('Failed to update viewport after view mode change:', error)
		})
	}

	/**
	 * Shutdown the viewport loader
	 * Removes event listeners and clears all tiles.
	 *
	 * @returns {Promise<void>}
	 */
	async shutdown() {
		logger.debug('[ViewportBuildingLoader] Shutting down')

		// Clear debounce timeout
		if (this.debounceTimeout) {
			clearTimeout(this.debounceTimeout)
			this.debounceTimeout = null
		}

		// Cancel any pending prefetch operations
		this.cancelPrefetch()
		this.prefetchedTiles.clear()

		// Remove camera event listener to prevent memory leaks
		if (this.cameraMovedHandler && this.viewer?.camera?.moveEnd) {
			this.viewer.camera.moveEnd.removeEventListener(this.cameraMovedHandler)
			this.cameraMovedHandler = null
			logger.debug('[ViewportBuildingLoader] Camera listener removed')
		}

		// Clear all tiles
		await this.clearAllTiles()

		this.viewer = null
		this.isInitialized = false
		logger.debug('[ViewportBuildingLoader] Shutdown complete')
	}
	/**
	 * Calculate tile center coordinates from tile key
	 * @param {string} tileKey - Tile key (format: "tileX_tileY")
	 * @returns {{lat: number, lon: number}} Tile center coordinates
	 */
	getTileCenter(tileKey) {
		const [tileX, tileY] = tileKey.split('_').map(Number)
		return {
			lon: (tileX + 0.5) * CONFIG.TILE_SIZE,
			lat: (tileY + 0.5) * CONFIG.TILE_SIZE,
		}
	}

	/**
	 * Calculate squared distance from viewport center (faster than actual distance)
	 * Uses squared Euclidean distance which is sufficient for sorting.
	 * @param {string} tileKey - Tile key
	 * @param {{lat: number, lon: number}} viewportCenter - Viewport center
	 * @returns {number} Squared distance
	 */
	getDistanceFromCenter(tileKey, viewportCenter) {
		const tileCenter = this.getTileCenter(tileKey)
		const dLat = tileCenter.lat - viewportCenter.lat
		const dLon = tileCenter.lon - viewportCenter.lon
		return dLat * dLat + dLon * dLon // Squared distance is fine for sorting
	}

	// ============================================================
	// Predictive Prefetching Methods
	// ============================================================

	/**
	 * Get tiles adjacent to the currently visible tiles
	 * Returns tiles in 8 cardinal and diagonal directions that are not already loaded.
	 *
	 * @param {Set<string>} visibleTiles - Currently visible tile keys
	 * @returns {Set<string>} Adjacent tile keys not yet loaded
	 */
	getAdjacentTiles(visibleTiles) {
		const adjacent = new Set()

		for (const tile of visibleTiles) {
			const [x, y] = tile.split('_').map(Number)

			// 8-directional adjacency (N, NE, E, SE, S, SW, W, NW)
			const neighbors = [
				[x - 1, y - 1],
				[x, y - 1],
				[x + 1, y - 1],
				[x - 1, y],
				[x + 1, y],
				[x - 1, y + 1],
				[x, y + 1],
				[x + 1, y + 1],
			]

			for (const [nx, ny] of neighbors) {
				const key = `${nx}_${ny}`
				// Exclude tiles that are already visible, loaded, loading, or prefetched
				if (
					!visibleTiles.has(key) &&
					!this.loadedTiles.has(key) &&
					!this.loadingTiles.has(key) &&
					!this.prefetchedTiles.has(key)
				) {
					adjacent.add(key)
				}
			}
		}

		return adjacent
	}

	/**
	 * Prioritize tiles based on camera movement direction
	 * Tiles in the direction of camera movement are prioritized higher.
	 *
	 * @param {Set<string>} adjacentTiles - Adjacent tile keys
	 * @param {{x: number, y: number}} cameraVelocity - Camera velocity vector
	 * @returns {string[]} Sorted array of tile keys (highest priority first)
	 */
	prioritizeTiles(adjacentTiles, cameraVelocity) {
		return [...adjacentTiles].sort((a, b) => {
			const [ax, ay] = a.split('_').map(Number)
			const [bx, by] = b.split('_').map(Number)

			// Score based on alignment with camera velocity (dot product)
			// Higher score = tile is in the direction of movement
			const scoreA = ax * cameraVelocity.x + ay * cameraVelocity.y
			const scoreB = bx * cameraVelocity.x + by * cameraVelocity.y

			return scoreB - scoreA // Higher score = higher priority
		})
	}

	/**
	 * Schedule prefetching for adjacent tiles
	 * Determines which tiles to prefetch and starts the idle-time prefetch process.
	 */
	schedulePrefetchForAdjacent() {
		// Reset cancellation flag
		this.prefetchCancelled = false

		const visibleTiles = this.visibleTiles
		const adjacentTiles = this.getAdjacentTiles(visibleTiles)

		if (adjacentTiles.size === 0) {
			logger.debug('[ViewportBuildingLoader] No adjacent tiles to prefetch')
			return
		}

		const prioritized = this.prioritizeTiles(adjacentTiles, this.lastCameraVelocity)

		// Limit to configured maximum pending tiles
		this.prefetchQueue = prioritized.slice(0, PREFETCH_CONFIG.maxPending)

		logger.debug(
			`[ViewportBuildingLoader] Scheduled ${this.prefetchQueue.length} tiles for prefetch`
		)

		this.startPrefetch()
	}

	/**
	 * Start the prefetch process using requestIdleCallback
	 * Begins processing the prefetch queue during browser idle time.
	 */
	startPrefetch() {
		// Don't start if already running or cancelled
		if (this.prefetchHandle || this.prefetchCancelled) return

		// Don't start if queue is empty
		if (this.prefetchQueue.length === 0) return

		this.prefetchHandle = requestIdleCallback(
			(deadline) => this.processPrefetchQueue(deadline),
			{ timeout: 5000 } // Process within 5 seconds even if not idle
		)
	}

	/**
	 * Process the prefetch queue during idle time
	 * Fetches tiles as long as there's idle time and concurrency budget allows.
	 *
	 * @param {IdleDeadline} deadline - requestIdleCallback deadline object
	 */
	processPrefetchQueue(deadline) {
		// Process tiles while we have idle time, queue items, and concurrency budget
		while (
			this.prefetchQueue.length > 0 &&
			this.activePrefetches < PREFETCH_CONFIG.maxConcurrent &&
			deadline.timeRemaining() > PREFETCH_CONFIG.minIdleTime &&
			!this.prefetchCancelled
		) {
			const tile = this.prefetchQueue.shift()

			// Skip if tile was loaded while in queue
			if (this.loadedTiles.has(tile) || this.loadingTiles.has(tile)) {
				continue
			}

			// Start prefetch (fire and forget - errors are logged internally)
			this.prefetchTile(tile).catch((error) => {
				logger.debug(`[ViewportBuildingLoader] Prefetch error for ${tile}:`, error?.message)
			})
		}

		// Continue if more tiles and not cancelled
		if (this.prefetchQueue.length > 0 && !this.prefetchCancelled) {
			this.prefetchHandle = requestIdleCallback((deadline) => this.processPrefetchQueue(deadline), {
				timeout: 5000,
			})
		} else {
			this.prefetchHandle = null
		}
	}

	/**
	 * Prefetch a single tile (cache-only, no rendering)
	 * Fetches the tile data and stores it in cache without creating datasources.
	 *
	 * @param {string} tileKey - Tile key to prefetch
	 */
	async prefetchTile(tileKey) {
		this.activePrefetches++

		try {
			// Parse tile coordinates
			const [tileX, tileY] = tileKey.split('_').map(Number)

			// Calculate tile bounds
			const bounds = {
				west: tileX * CONFIG.TILE_SIZE,
				south: tileY * CONFIG.TILE_SIZE,
				east: (tileX + 1) * CONFIG.TILE_SIZE,
				north: (tileY + 1) * CONFIG.TILE_SIZE,
			}

			// Build URL for tile bounds
			const url = this.buildBboxUrl(bounds)

			const viewPrefix = this.toggleStore.helsinkiView ? 'hki' : 'hsy'

			// Cache-only fetch - store in cache but don't create datasource
			await this.unifiedLoader.loadLayer({
				layerId: `prefetch_${viewPrefix}_${tileKey}`,
				url: url,
				type: 'geojson',
				options: {
					cache: true,
					cacheTTL: CONFIG.CACHE_TTL,
					retries: 1, // Fewer retries for prefetch (non-critical)
					cacheOnly: true, // New flag: store in cache but don't return data
				},
			})

			// Mark tile as prefetched
			this.prefetchedTiles.add(tileKey)

			logger.debug(`[ViewportBuildingLoader] ✓ Prefetched tile ${tileKey}`)
		} catch (error) {
			// Prefetch failures are non-critical, just log at debug level
			logger.debug(`[ViewportBuildingLoader] Prefetch failed for ${tileKey}:`, error.message)
		} finally {
			this.activePrefetches--
		}
	}

	/**
	 * Cancel all pending prefetch operations
	 * Called when user starts interacting with the map.
	 */
	cancelPrefetch() {
		this.prefetchCancelled = true
		this.prefetchQueue = []

		if (this.prefetchHandle) {
			cancelIdleCallback(this.prefetchHandle)
			this.prefetchHandle = null
		}

		// Reset cancellation flag after cooldown to allow new prefetch
		setTimeout(() => {
			this.prefetchCancelled = false
		}, PREFETCH_CONFIG.cooldownMs)
	}
}
