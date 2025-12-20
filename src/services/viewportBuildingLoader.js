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

import * as Cesium from 'cesium'
import { useBuildingStore } from '../stores/buildingStore.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import { useURLStore } from '../stores/urlStore.js'
import { processBatch } from '../utils/batchProcessor.js'
import {
	calculateBuildingHeight,
	DEFAULT_BUILDING_HEIGHT,
	FLOOR_HEIGHT,
} from '../utils/entityStyling.js'
import logger from '../utils/logger.js'
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

		// Cesium scratch objects for performance (reuse to avoid GC)
		this.scratchRectangle = new Cesium.Rectangle()

		// Active loading queue
		this.loadingQueue = []
		this.activeLoads = 0

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
		this.viewer.camera.moveEnd.addEventListener(() => {
			this.handleCameraMove()
		})

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
	 * Cancels pending updates and schedules new update after debounce delay.
	 * @private
	 */
	handleCameraMove() {
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
	 * Main viewport update loop
	 * Calculates visible tiles, loads missing tiles, updates visibility, and evicts distant tiles.
	 * @returns {Promise<void>}
	 */
	async updateViewport() {
		if (!this.viewer) {
			logger.warn('[ViewportBuildingLoader] Viewer not initialized')
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
					const viewPrefix = this.toggleStore.helsinkiView ? 'Helsinki' : 'HSY'
					const datasourceName = `Buildings Viewport ${viewPrefix} ${tileKey}`
					const datasource = this.datasourceService.getDataSourceByName(datasourceName)
					if (datasource) {
						this.fadeInDatasource(datasource).catch((error) => {
							logger.error(`Failed to fade in datasource for tile ${tileKey}:`, error)
						})
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
			const loadingConfig = {
				layerId: `viewport_buildings_${viewPrefix}_${tileKey}`,
				url: url,
				type: 'geojson',
				processor: async (data, metadata) => {
					const fromCache = metadata?.fromCache
					logger.debug(
						fromCache
							? `[ViewportBuildingLoader] ✓ Using cached data for tile ${tileKey}`
							: `[ViewportBuildingLoader] ✅ Received ${data.features?.length || 0} buildings for tile ${tileKey}`
					)

					// Process buildings using existing pipeline
					const entities = await this.processBuildings(data, tileKey)

					return entities
				},
				options: {
					cache: true,
					cacheTTL: CONFIG.CACHE_TTL,
					retries: 2,
					progressive: false,
					priority: 'normal',
				},
			}

			const entities = await this.unifiedLoader.loadLayer(loadingConfig)

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
	 * Process building GeoJSON data
	 * Handles both Helsinki and HSY (Capital Region) building formats.
	 *
	 * @param {Object} geojson - GeoJSON FeatureCollection
	 * @param {string} tileKey - Tile key for datasource naming
	 * @returns {Promise<Array<Cesium.Entity>>} Processed building entities
	 */
	async processBuildings(geojson, tileKey) {
		if (!geojson || !geojson.features || geojson.features.length === 0) {
			logger.warn(`[ViewportBuildingLoader] No features in tile ${tileKey}`)
			return []
		}

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
			// Helsinki: Full heat exposure processing
			const entitiesWithHeat = await this.urbanheatService.findUrbanHeatData(
				geojson,
				null // No postal code filtering for viewport-based loading
			)
			await this.setHeatExposureToBuildings(entitiesWithHeat)
			await this.setHelsinkiBuildingsHeight(entitiesWithHeat)
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
			const heatExposureValue = properties.avgheatexposuretobuilding._value
			polygon.material = new Cesium.Color(1, 1 - heatExposureValue, 0, heatExposureValue)
		}
	}

	/**
	 * Apply building heights from floor count or measured height
	 * Batched processing (reuses building.js pattern).
	 *
	 * @param {Array<Cesium.Entity>} entities - Building entities
	 * @returns {Promise<void>}
	 */
	async setHelsinkiBuildingsHeight(entities) {
		await processBatch(
			entities,
			(entity) => {
				if (entity.polygon) {
					entity.polygon.extrudedHeight = calculateBuildingHeight(entity.properties)
				}
			},
			{ batchSize: 30 }
		)
	}

	/**
	 * Set HSY building attributes (height from floor count)
	 * HSY buildings use 'kerrosten_lkm' for floor count instead of 'i_kerrlkm'
	 *
	 * @param {Array<Cesium.Entity>} entities - Building entities
	 * @returns {Promise<void>}
	 */
	async setHSYBuildingAttributes(entities) {
		await processBatch(
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

					// Set a default color for HSY buildings (since no heat data)
					// Use a blue-ish color to differentiate from Helsinki's heat colors
					const alpha = 0.7
					entity.polygon.material = new Cesium.ColorMaterialProperty(
						new Cesium.Color(0.4, 0.6, 0.8, alpha)
					)
				}
			},
			{ batchSize: 30 }
		)

		logger.debug(`[ViewportBuildingLoader] ✅ HSY attributes set for ${entities.length} buildings`)
	}

	/**
	 * Fade in a datasource's entities smoothly
	 * Animates entity alpha from 0 to target value over FADE_CONFIG.DURATION_MS
	 *
	 * @param {Cesium.DataSource} datasource - Datasource containing building entities
	 * @returns {Promise<void>}
	 */
	async fadeInDatasource(datasource) {
		if (!datasource || !datasource.entities) return

		const entities = datasource.entities.values
		const stepDuration = FADE_CONFIG.DURATION_MS / FADE_CONFIG.STEPS

		// Store original alpha values for each entity
		const originalAlphas = new Map()

		for (const entity of entities) {
			if (entity.polygon?.material) {
				const color = entity.polygon.material.color?.getValue?.(Cesium.JulianDate.now())
				if (color) {
					originalAlphas.set(entity.id, color.alpha)
					// Start fully transparent
					entity.polygon.material = new Cesium.ColorMaterialProperty(
						new Cesium.Color(color.red, color.green, color.blue, 0)
					)
				}
			}
		}

		// Make datasource visible (entities are transparent)
		datasource.show = true

		// Animate alpha over time
		for (let step = 1; step <= FADE_CONFIG.STEPS; step++) {
			const progress = step / FADE_CONFIG.STEPS

			for (const entity of entities) {
				if (entity.polygon?.material && originalAlphas.has(entity.id)) {
					const targetAlpha = originalAlphas.get(entity.id)
					const currentAlpha = targetAlpha * progress
					const color = entity.polygon.material.color?.getValue?.(Cesium.JulianDate.now())
					if (color) {
						entity.polygon.material = new Cesium.ColorMaterialProperty(
							new Cesium.Color(color.red, color.green, color.blue, currentAlpha)
						)
					}
				}
			}

			// Request render and wait for next frame
			if (this.viewer) {
				this.viewer.scene.requestRender()
			}
			await new Promise((resolve) => setTimeout(resolve, stepDuration))
		}

		logger.debug(`[ViewportBuildingLoader] ✨ Fade-in complete for ${entities.length} entities`)
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
	 * Removes datasource and clears tile from tracking.
	 *
	 * @param {string} tileKey - Tile key to unload
	 * @returns {Promise<void>}
	 */
	async unloadTile(tileKey) {
		const viewPrefix = this.toggleStore.helsinkiView ? 'Helsinki' : 'HSY'
		const datasourceName = `Buildings Viewport ${viewPrefix} ${tileKey}`

		try {
			await this.datasourceService.removeDataSourcesByNamePrefix(datasourceName)
			this.loadedTiles.delete(tileKey)
			this.visibleTiles.delete(tileKey)

			logger.debug(`[ViewportBuildingLoader] Tile ${tileKey} unloaded`)
		} catch (error) {
			logger.error(`[ViewportBuildingLoader] Error unloading tile ${tileKey}:`, error)
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
		}

		// Note: Cesium camera events don't have removeEventListener
		// The listener will be cleaned up when the viewer is destroyed

		// Clear all tiles
		await this.clearAllTiles()

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
}
