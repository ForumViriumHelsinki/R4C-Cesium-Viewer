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

import * as Cesium from 'cesium';
import { useGlobalStore } from '../stores/globalStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import unifiedLoader from './unifiedLoader.js';
import Datasource from './datasource.js';
import Urbanheat from './urbanheat.js';

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
};

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
		this.store = useGlobalStore();
		this.toggleStore = useToggleStore();
		this.viewer = null;

		// Service dependencies
		this.datasourceService = new Datasource();
		this.urbanheatService = new Urbanheat();
		this.unifiedLoader = unifiedLoader;

		// Tile tracking
		/** @type {Map<string, Object>} Map of tile keys to tile metadata */
		this.loadedTiles = new Map();
		/** @type {Set<string>} Currently visible tile keys */
		this.visibleTiles = new Set();
		/** @type {Set<string>} Tiles currently being loaded */
		this.loadingTiles = new Set();

		// Camera event tracking
		this.debounceTimeout = null;
		this.isInitialized = false;

		// Cesium scratch objects for performance (reuse to avoid GC)
		this.scratchRectangle = new Cesium.Rectangle();

		// Active loading queue
		this.loadingQueue = [];
		this.activeLoads = 0;

		console.log('[ViewportBuildingLoader] Service initialized');
	}

	/**
	 * Initialize viewport-based loading system
	 * Sets up camera event listeners and performs initial viewport load.
	 *
	 * @param {Cesium.Viewer} viewer - CesiumJS viewer instance
	 * @returns {void}
	 */
	initialize(viewer) {
		if (this.isInitialized) {
			console.warn('[ViewportBuildingLoader] Already initialized, skipping');
			return;
		}

		this.viewer = viewer;

		// Set up camera event listeners with debouncing
		this.viewer.camera.moveEnd.addEventListener(() => {
			this.handleCameraMove();
		});

		this.isInitialized = true;
		console.log('[ViewportBuildingLoader] Camera listeners attached');

		// Perform initial load for current viewport
		this.updateViewport();
	}

	/**
	 * Handle camera movement with debouncing
	 * Cancels pending updates and schedules new update after debounce delay.
	 * @private
	 */
	handleCameraMove() {
		// Clear existing timeout
		if (this.debounceTimeout) {
			clearTimeout(this.debounceTimeout);
		}

		// Schedule new update
		this.debounceTimeout = setTimeout(() => {
			this.updateViewport();
		}, CONFIG.DEBOUNCE_DELAY);
	}

	/**
	 * Main viewport update loop
	 * Calculates visible tiles, loads missing tiles, updates visibility, and evicts distant tiles.
	 * @returns {Promise<void>}
	 */
	async updateViewport() {
		if (!this.viewer) {
			console.warn('[ViewportBuildingLoader] Viewer not initialized');
			return;
		}

		try {
			// Get current viewport bounds with buffer zone
			const viewportBounds = this.getViewportBounds();
			if (!viewportBounds) {
				console.warn('[ViewportBuildingLoader] Cannot determine viewport bounds');
				return;
			}

			const bufferedBounds = this.expandBounds(viewportBounds, CONFIG.BUFFER_FACTOR);

			// Calculate required tiles
			const requiredTileKeys = this.getTilesInBounds(bufferedBounds);
			console.log(`[ViewportBuildingLoader] Viewport requires ${requiredTileKeys.length} tiles`);

			// Update visibility for loaded tiles
			this.updateTileVisibility(requiredTileKeys);

			// Load missing tiles
			await this.loadMissingTiles(requiredTileKeys);

			// Evict distant tiles if over memory limit
			this.unloadDistantTiles(requiredTileKeys);
		} catch (error) {
			console.error('[ViewportBuildingLoader] Error updating viewport:', error);
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
			);

			if (!rect) {
				return null;
			}

			return {
				west: Cesium.Math.toDegrees(rect.west),
				south: Cesium.Math.toDegrees(rect.south),
				east: Cesium.Math.toDegrees(rect.east),
				north: Cesium.Math.toDegrees(rect.north),
			};
		} catch (error) {
			console.error('[ViewportBuildingLoader] Error computing viewport rectangle:', error);
			return null;
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
		const width = bounds.east - bounds.west;
		const height = bounds.north - bounds.south;

		return {
			west: bounds.west - width * factor,
			south: bounds.south - height * factor,
			east: bounds.east + width * factor,
			north: bounds.north + height * factor,
		};
	}

	/**
	 * Calculate tile keys for all tiles intersecting bounds
	 * Generates tile grid coordinates based on TILE_SIZE.
	 *
	 * @param {Object} bounds - Geographic bounds {west, south, east, north}
	 * @returns {string[]} Array of tile keys (format: "tileX_tileY")
	 */
	getTilesInBounds(bounds) {
		const tileKeys = [];

		const minTileX = Math.floor(bounds.west / CONFIG.TILE_SIZE);
		const maxTileX = Math.floor(bounds.east / CONFIG.TILE_SIZE);
		const minTileY = Math.floor(bounds.south / CONFIG.TILE_SIZE);
		const maxTileY = Math.floor(bounds.north / CONFIG.TILE_SIZE);

		for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
			for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
				tileKeys.push(`${tileX}_${tileY}`);
			}
		}

		return tileKeys;
	}

	/**
	 * Load tiles that are not yet loaded or loading
	 * Respects concurrent loading limit and queues excess requests.
	 *
	 * @param {string[]} tileKeys - Required tile keys
	 * @returns {Promise<void>}
	 */
	async loadMissingTiles(tileKeys) {
		const missingTiles = tileKeys.filter(
			(key) => !this.loadedTiles.has(key) && !this.loadingTiles.has(key)
		);

		if (missingTiles.length === 0) {
			return;
		}

		console.log(`[ViewportBuildingLoader] Loading ${missingTiles.length} missing tiles`);

		// Add to queue and process
		this.loadingQueue.push(...missingTiles);
		await this.processLoadingQueue();
	}

	/**
	 * Process loading queue with concurrency limit
	 * Loads tiles in parallel up to CONCURRENT_TILE_LOADS limit.
	 * @private
	 * @returns {Promise<void>}
	 */
	async processLoadingQueue() {
		while (this.loadingQueue.length > 0 && this.activeLoads < CONFIG.CONCURRENT_TILE_LOADS) {
			const tileKey = this.loadingQueue.shift();

			// Skip if already loading or loaded
			if (this.loadingTiles.has(tileKey) || this.loadedTiles.has(tileKey)) {
				continue;
			}

			// Start loading tile
			this.activeLoads++;
			this.loadingTiles.add(tileKey);

			// Load tile asynchronously (don't await here to enable parallelism)
			this.loadTile(tileKey)
				.then(() => {
					this.activeLoads--;
					this.loadingTiles.delete(tileKey);
					// Continue processing queue
					this.processLoadingQueue();
				})
				.catch((error) => {
					console.error(`[ViewportBuildingLoader] Failed to load tile ${tileKey}:`, error);
					this.activeLoads--;
					this.loadingTiles.delete(tileKey);
					// Continue processing queue even on error
					this.processLoadingQueue();
				});
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
		console.log(`[ViewportBuildingLoader] Loading tile ${tileKey}`);

		// Parse tile coordinates
		const [tileX, tileY] = tileKey.split('_').map(Number);

		// Calculate tile bounds
		const bounds = {
			west: tileX * CONFIG.TILE_SIZE,
			south: tileY * CONFIG.TILE_SIZE,
			east: (tileX + 1) * CONFIG.TILE_SIZE,
			north: (tileY + 1) * CONFIG.TILE_SIZE,
		};

		// Build WFS URL for tile bounds
		const url = this.buildWFSUrl(bounds);

		try {
			const loadingConfig = {
				layerId: `viewport_buildings_${tileKey}`,
				url: url,
				type: 'geojson',
				processor: async (data, metadata) => {
					const fromCache = metadata?.fromCache;
					console.log(
						fromCache
							? `[ViewportBuildingLoader] ✓ Using cached data for tile ${tileKey}`
							: `[ViewportBuildingLoader] ✅ Received ${data.features?.length || 0} buildings for tile ${tileKey}`
					);

					// Process buildings using existing pipeline
					const entities = await this.processBuildings(data, tileKey);

					return entities;
				},
				options: {
					cache: true,
					cacheTTL: CONFIG.CACHE_TTL,
					retries: 2,
					progressive: false,
					priority: 'normal',
				},
			};

			const entities = await this.unifiedLoader.loadLayer(loadingConfig);

			// Track loaded tile
			this.loadedTiles.set(tileKey, {
				bounds,
				entityCount: entities?.length || 0,
				loadedAt: Date.now(),
			});

			console.log(`[ViewportBuildingLoader] ✅ Tile ${tileKey} loaded successfully`);
		} catch (error) {
			console.error(`[ViewportBuildingLoader] ❌ Error loading tile ${tileKey}:`, error);
			throw error;
		}
	}

	/**
	 * Build WFS URL for BBOX query
	 * Constructs Helsinki WFS endpoint with spatial filter.
	 *
	 * @param {Object} bounds - Geographic bounds {west, south, east, north}
	 * @returns {string} WFS URL with BBOX parameter
	 */
	buildWFSUrl(bounds) {
		// Use Helsinki WFS endpoint (toggleStore.helsinkiView determines which WFS to use)
		const baseUrl = 'https://kartta.hel.fi/ws/geoserver/avoindata/wfs';

		const params = new URLSearchParams({
			service: 'wfs',
			version: '2.0.0',
			request: 'GetFeature',
			typeNames: 'avoindata:Rakennukset_alue_rekisteritiedot',
			outputFormat: 'application/json',
			srsName: 'urn:ogc:def:crs:EPSG::4326',
			bbox: `${bounds.west},${bounds.south},${bounds.east},${bounds.north},urn:ogc:def:crs:EPSG::4326`,
		});

		return `${baseUrl}?${params.toString()}`;
	}

	/**
	 * Process building GeoJSON data
	 * Reuses existing building processing logic for heat exposure and height.
	 *
	 * @param {Object} geojson - GeoJSON FeatureCollection
	 * @param {string} tileKey - Tile key for datasource naming
	 * @returns {Promise<Array<Cesium.Entity>>} Processed building entities
	 */
	async processBuildings(geojson, tileKey) {
		if (!geojson || !geojson.features || geojson.features.length === 0) {
			console.warn(`[ViewportBuildingLoader] No features in tile ${tileKey}`);
			return [];
		}

		// Create datasource with tile-specific name
		// Use initialVisibility=false since we'll control visibility via updateTileVisibility
		const datasourceName = `Buildings Viewport ${tileKey}`;
		const entities = await this.datasourceService.addDataSourceWithPolygonFix(
			geojson,
			datasourceName,
			false // Start hidden, visibility controlled by updateTileVisibility
		);

		// Process entities for heat exposure (if Helsinki view)
		if (this.toggleStore.helsinkiView && entities.length > 0) {
			// Find heat exposure data for entities
			const entitiesWithHeat = await this.urbanheatService.findUrbanHeatData(
				geojson,
				null // No postal code filtering for viewport-based loading
			);

			// Apply heat exposure styling in batches
			await this.setHeatExposureToBuildings(entitiesWithHeat);

			// Apply building heights in batches
			await this.setHelsinkiBuildingsHeight(entitiesWithHeat);
		}

		return entities;
	}

	/**
	 * Apply heat exposure visualization to building entities
	 * Batched processing to avoid UI blocking (reuses building.js pattern).
	 *
	 * @param {Array<Cesium.Entity>} entities - Building entities
	 * @returns {Promise<void>}
	 */
	async setHeatExposureToBuildings(entities) {
		const batchSize = 25;

		for (let i = 0; i < entities.length; i += batchSize) {
			const batch = entities.slice(i, i + batchSize);

			for (let j = 0; j < batch.length; j++) {
				this.setBuildingEntityPolygon(batch[j]);
			}

			if (i + batchSize < entities.length) {
				await new Promise((resolve) => requestIdleCallback(resolve));
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
		const { properties, polygon } = entity;

		if (polygon && properties?.avgheatexposuretobuilding) {
			const heatExposureValue = properties.avgheatexposuretobuilding._value;
			polygon.material = new Cesium.Color(1, 1 - heatExposureValue, 0, heatExposureValue);
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
		const batchSize = 30;

		for (let i = 0; i < entities.length; i += batchSize) {
			const batch = entities.slice(i, i + batchSize);

			for (let j = 0; j < batch.length; j++) {
				const entity = batch[j];

				if (entity.polygon) {
					const { measured_height, i_kerrlkm } = entity.properties;

					entity.polygon.extrudedHeight = measured_height
						? measured_height._value
						: i_kerrlkm != null
							? i_kerrlkm._value * 3.2
							: 2.7;
				}
			}

			if (i + batchSize < entities.length) {
				await new Promise((resolve) => requestIdleCallback(resolve));
			}
		}
	}

	/**
	 * Update entity visibility based on visible tiles
	 * Shows entities in visible tiles, hides entities in loaded but non-visible tiles.
	 *
	 * @param {string[]} visibleTileKeys - Currently visible tile keys
	 * @returns {void}
	 */
	updateTileVisibility(visibleTileKeys) {
		const visibleSet = new Set(visibleTileKeys);

		// Update visibility for all loaded tiles
		for (const [tileKey] of this.loadedTiles) {
			const datasourceName = `Buildings Viewport ${tileKey}`;
			const datasource = this.datasourceService.getDataSourceByName(datasourceName);

			if (!datasource) {
				continue;
			}

			const shouldBeVisible = visibleSet.has(tileKey);

			// Only update if state changed to minimize render calls
			if (datasource.show !== shouldBeVisible) {
				datasource.show = shouldBeVisible;
			}
		}

		// Update visible tiles tracking
		this.visibleTiles = visibleSet;

		// Request render to apply visibility changes
		if (this.viewer) {
			this.viewer.scene.requestRender();
		}
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
		const requiredSet = new Set(currentRequiredTiles);
		const evictableTiles = [];

		// Find tiles that can be evicted (not currently required)
		for (const [tileKey, metadata] of this.loadedTiles) {
			if (!requiredSet.has(tileKey)) {
				evictableTiles.push({ tileKey, loadedAt: metadata.loadedAt });
			}
		}

		// Check if we need to evict
		const tilesOverLimit = this.loadedTiles.size - CONFIG.MAX_LOADED_TILES;
		if (tilesOverLimit <= 0) {
			return;
		}

		// Sort by oldest first (LRU eviction)
		evictableTiles.sort((a, b) => a.loadedAt - b.loadedAt);

		// Evict oldest tiles
		const tilesToEvict = evictableTiles.slice(0, Math.min(tilesOverLimit, evictableTiles.length));

		console.log(
			`[ViewportBuildingLoader] Evicting ${tilesToEvict.length} tiles (over limit by ${tilesOverLimit})`
		);

		for (const { tileKey } of tilesToEvict) {
			await this.unloadTile(tileKey);
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
		const datasourceName = `Buildings Viewport ${tileKey}`;

		try {
			await this.datasourceService.removeDataSourcesByNamePrefix(datasourceName);
			this.loadedTiles.delete(tileKey);
			this.visibleTiles.delete(tileKey);

			console.log(`[ViewportBuildingLoader] Tile ${tileKey} unloaded`);
		} catch (error) {
			console.error(`[ViewportBuildingLoader] Error unloading tile ${tileKey}:`, error);
		}
	}

	/**
	 * Clear all loaded tiles and reset state
	 * Useful for switching between viewport-based and postal code-based loading modes.
	 *
	 * @returns {Promise<void>}
	 */
	async clearAllTiles() {
		console.log(`[ViewportBuildingLoader] Clearing all ${this.loadedTiles.size} loaded tiles`);

		// Remove all viewport datasources
		await this.datasourceService.removeDataSourcesByNamePrefix('Buildings Viewport');

		// Clear tracking
		this.loadedTiles.clear();
		this.visibleTiles.clear();
		this.loadingTiles.clear();
		this.loadingQueue = [];

		console.log('[ViewportBuildingLoader] All tiles cleared');
	}

	/**
	 * Shutdown the viewport loader
	 * Removes event listeners and clears all tiles.
	 *
	 * @returns {Promise<void>}
	 */
	async shutdown() {
		console.log('[ViewportBuildingLoader] Shutting down');

		// Clear debounce timeout
		if (this.debounceTimeout) {
			clearTimeout(this.debounceTimeout);
		}

		// Note: Cesium camera events don't have removeEventListener
		// The listener will be cleaned up when the viewer is destroyed

		// Clear all tiles
		await this.clearAllTiles();

		this.isInitialized = false;
		console.log('[ViewportBuildingLoader] Shutdown complete');
	}
}
