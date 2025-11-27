/**
 * @module services/cacheService
 * Browser Caching Service using IndexedDB
 * Provides persistent storage for geospatial and climate data with automatic
 * cache management, size limits, and expiration policies.
 *
 * Features:
 * - IndexedDB-based persistent storage (survives browser restarts)
 * - Automatic size management with LRU eviction (100MB default limit)
 * - Per-entry TTL (time-to-live) with automatic expiration
 * - Efficient querying via indexes (timestamp, type, postalCode)
 * - Cache statistics and health monitoring
 * - Metadata storage for data source tracking
 *
 * Storage Strategy:
 * - Large datasets (GeoJSON, WMS responses) stored with compression awareness
 * - Automatic cleanup of expired entries
 * - Size-based eviction when approaching limits
 * - Separate object stores for layer data and metadata
 *
 * Performance Considerations:
 * - Uses IndexedDB indexes for fast lookup (timestamp, type, postalCode)
 * - Batched operations to minimize transaction overhead
 * - Async operations to prevent UI blocking
 * - Blob size estimation for accurate cache sizing
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API|IndexedDB API Documentation}
 */

/**
 * Cache entry metadata structure
 * @typedef {Object} CacheEntry
 * @property {string} id - Unique cache key
 * @property {*} data - Cached data (typically GeoJSON or JSON)
 * @property {number} timestamp - Cache creation timestamp (milliseconds since epoch)
 * @property {string} type - Data type identifier (e.g., 'trees', 'buildings', 'vegetation')
 * @property {string|null} postalCode - Associated postal code for geographic data
 * @property {number} size - Entry size in bytes
 * @property {number} ttl - Time-to-live in milliseconds
 * @property {Object} metadata - Additional metadata (URL, layerId, etc.)
 */

/**
 * Cache retrieval result
 * @typedef {Object} CacheResult
 * @property {*} data - Retrieved data
 * @property {number} timestamp - Original cache timestamp
 * @property {number} age - Age in milliseconds since cached
 * @property {boolean} cached - Always true for cache hits
 * @property {Object} metadata - Stored metadata object
 */

/**
 * Cache statistics object
 * @typedef {Object} CacheStats
 * @property {number} totalEntries - Total number of cached entries
 * @property {number} totalSize - Total cache size in bytes
 * @property {number} expiredCount - Number of expired entries
 * @property {Object} typeStats - Entry count by type (e.g., {trees: 5, buildings: 3})
 * @property {number} maxSize - Maximum cache size limit in bytes
 * @property {number} utilizationPercent - Cache utilization percentage (0-100)
 */

/**
 * Cache storage options
 * @typedef {Object} CacheOptions
 * @property {string} [type='unknown'] - Data type identifier for categorization
 * @property {string|null} [postalCode=null] - Postal code for geographic data indexing
 * @property {number} [ttl] - Custom time-to-live in milliseconds (overrides default)
 * @property {Object} [metadata={}] - Additional metadata to store with entry
 */

/**
 * CacheService Class
 * Manages IndexedDB operations for persistent browser-based caching
 * of geospatial and climate data.
 *
 * @class CacheService
 */
class CacheService {
	/**
	 * Creates a CacheService instance
	 * Initializes cache configuration with size limits and TTL defaults.
	 */
	constructor() {
		/** @type {string} Database name */
		this.dbName = 'R4C-CesiumViewer-Cache';
		/** @type {number} Database schema version */
		this.version = 1;
		/** @type {number} Default cache entry TTL (24 hours in milliseconds) */
		this.maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
		/** @type {number} Maximum total cache size (100MB in bytes) */
		this.maxCacheSize = 100 * 1024 * 1024; // 100MB
		/** @type {IDBDatabase|null} IndexedDB database instance */
		this.db = null;
	}

	/**
	 * Initialize the IndexedDB database
	 * Creates object stores and indexes on first run or version upgrade.
	 * Safe to call multiple times - returns existing database if already initialized.
	 *
	 * Database Schema:
	 * - **layers** object store: Main cache storage with indexes on timestamp, type, postalCode
	 * - **metadata** object store: Data source metadata and configuration
	 *
	 * @returns {Promise<IDBDatabase>} Initialized database instance
	 * @throws {Error} If IndexedDB is not supported or initialization fails
	 *
	 * @example
	 * const db = await cacheService.init();
	 * console.log('Cache initialized:', db.name);
	 */
	async init() {
		if (this.db) return this.db;

		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, this.version);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				this.db = request.result;
				resolve(this.db);
			};

			request.onupgradeneeded = (event) => {
				const db = event.target.result;

				// Create object stores
				if (!db.objectStoreNames.contains('layers')) {
					const layerStore = db.createObjectStore('layers', { keyPath: 'id' });
					layerStore.createIndex('timestamp', 'timestamp');
					layerStore.createIndex('type', 'type');
					layerStore.createIndex('postalCode', 'postalCode');
				}

				if (!db.objectStoreNames.contains('metadata')) {
					db.createObjectStore('metadata', { keyPath: 'key' });
				}
			};
		});
	}

	/**
	 * Store data in cache with automatic size management
	 * Creates a cache entry with metadata and ensures cache size limits are respected.
	 * Automatically evicts oldest entries if adding new data would exceed size limit.
	 *
	 * @param {string} key - Unique cache key (use generateKey() for consistency)
	 * @param {*} data - Data to cache (will be JSON stringified for size calculation)
	 * @param {CacheOptions} [options={}] - Cache options including type, TTL, and metadata
	 * @returns {Promise<boolean>} True if successfully stored
	 * @throws {Error} If storage fails or database is not initialized
	 *
	 * @example
	 * // Cache building GeoJSON data
	 * await cacheService.setData(
	 *   'buildings-00100',
	 *   buildingFeatureCollection,
	 *   {
	 *     type: 'buildings',
	 *     postalCode: '00100',
	 *     ttl: 60 * 60 * 1000, // 1 hour
	 *     metadata: { source: 'HSY WFS', version: '2.0' }
	 *   }
	 * );
	 */
	async setData(key, data, options = {}) {
		await this.init();

		const cacheEntry = {
			id: key,
			data: data,
			timestamp: Date.now(),
			type: options.type || 'unknown',
			postalCode: options.postalCode || null,
			size: new Blob([JSON.stringify(data)]).size,
			ttl: options.ttl || this.maxCacheAge,
			metadata: options.metadata || {},
		};

		// Check cache size before storing
		await this.ensureCacheSize(cacheEntry.size);

		const transaction = this.db.transaction(['layers'], 'readwrite');
		const store = transaction.objectStore('layers');

		return new Promise((resolve, reject) => {
			const request = store.put(cacheEntry);
			request.onsuccess = () => resolve(true);
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Retrieve data from cache with automatic expiration checking
	 * Returns null for cache misses or expired entries.
	 * Automatically removes expired entries during retrieval.
	 *
	 * @param {string} key - Cache key to retrieve
	 * @param {number|null} [maxAge=null] - Override TTL for this retrieval (milliseconds)
	 * @returns {Promise<CacheResult|null>} Cache result with data and metadata, or null if not found/expired
	 * @throws {Error} If retrieval fails
	 *
	 * @example
	 * // Get cached data with default TTL
	 * const cached = await cacheService.getData('buildings-00100');
	 * if (cached) {
	 *   console.log('Cache age:', cached.age, 'ms');
	 *   return cached.data;
	 * }
	 *
	 * @example
	 * // Get cached data with custom max age (5 minutes)
	 * const cached = await cacheService.getData('buildings-00100', 5 * 60 * 1000);
	 */
	async getData(key, maxAge = null) {
		await this.init();

		const transaction = this.db.transaction(['layers'], 'readonly');
		const store = transaction.objectStore('layers');

		return new Promise((resolve, reject) => {
			const request = store.get(key);

			request.onsuccess = () => {
				const result = request.result;

				if (!result) {
					resolve(null);
					return;
				}

				// Check if data is expired
				const age = Date.now() - result.timestamp;
				const maxAgeToUse = maxAge || result.ttl;

				if (age > maxAgeToUse) {
					// Data is expired, remove it
					this.removeData(key);
					resolve(null);
					return;
				}

				resolve({
					data: result.data,
					timestamp: result.timestamp,
					age: age,
					cached: true,
					metadata: result.metadata,
				});
			};

			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Check if valid (non-expired) data exists for a key
	 * Convenience method for cache hit testing without retrieving data.
	 *
	 * @param {string} key - Cache key to check
	 * @param {number|null} [maxAge=null] - Override TTL for validation (milliseconds)
	 * @returns {Promise<boolean>} True if valid cached data exists
	 *
	 * @example
	 * if (await cacheService.hasValidData('buildings-00100')) {
	 *   console.log('Cache hit - loading from cache');
	 * } else {
	 *   console.log('Cache miss - fetching from API');
	 * }
	 */
	async hasValidData(key, maxAge = null) {
		const cached = await this.getData(key, maxAge);
		return cached !== null;
	}

	/**
	 * Remove specific data from cache
	 * Immediately deletes the cache entry without checking expiration.
	 *
	 * @param {string} key - Cache key to remove
	 * @returns {Promise<boolean>} True if successfully removed
	 * @throws {Error} If removal fails
	 *
	 * @example
	 * // Force refresh by removing cached data
	 * await cacheService.removeData('buildings-00100');
	 */
	async removeData(key) {
		await this.init();

		const transaction = this.db.transaction(['layers'], 'readwrite');
		const store = transaction.objectStore('layers');

		return new Promise((resolve, reject) => {
			const request = store.delete(key);
			request.onsuccess = () => resolve(true);
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Get all cached data keys
	 * Useful for cache inspection and debugging.
	 *
	 * @returns {Promise<string[]>} Array of all cache keys
	 * @throws {Error} If retrieval fails
	 *
	 * @example
	 * const keys = await cacheService.getCachedKeys();
	 * console.log('Cached layers:', keys);
	 * // ['buildings-00100', 'trees-00100', 'vegetation-00150']
	 */
	async getCachedKeys() {
		await this.init();

		const transaction = this.db.transaction(['layers'], 'readonly');
		const store = transaction.objectStore('layers');

		return new Promise((resolve, reject) => {
			const request = store.getAllKeys();
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Get comprehensive cache statistics
	 * Provides metrics for monitoring cache health and utilization.
	 * Scans all entries to calculate current size and expiration status.
	 *
	 * @returns {Promise<CacheStats>} Cache statistics object
	 * @throws {Error} If statistics calculation fails
	 *
	 * @example
	 * const stats = await cacheService.getCacheStats();
	 * console.log(`Cache: ${stats.totalEntries} entries, ${stats.utilizationPercent.toFixed(1)}% full`);
	 * console.log('By type:', stats.typeStats);
	 * // By type: { buildings: 3, trees: 2, vegetation: 1 }
	 */
	async getCacheStats() {
		await this.init();

		const transaction = this.db.transaction(['layers'], 'readonly');
		const store = transaction.objectStore('layers');

		return new Promise((resolve, reject) => {
			const request = store.getAll();

			request.onsuccess = () => {
				const entries = request.result;
				let totalSize = 0;
				let expiredCount = 0;
				const typeStats = {};

				entries.forEach((entry) => {
					totalSize += entry.size || 0;

					if (Date.now() - entry.timestamp > entry.ttl) {
						expiredCount++;
					}

					typeStats[entry.type] = (typeStats[entry.type] || 0) + 1;
				});

				resolve({
					totalEntries: entries.length,
					totalSize,
					expiredCount,
					typeStats,
					maxSize: this.maxCacheSize,
					utilizationPercent: (totalSize / this.maxCacheSize) * 100,
				});
			};

			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Clean up expired cache entries
	 * Removes all entries that have exceeded their TTL.
	 * Should be called periodically to maintain cache health.
	 *
	 * @returns {Promise<number>} Number of entries cleaned up
	 * @throws {Error} If cleanup fails
	 *
	 * @example
	 * // Periodic cleanup (e.g., on app startup)
	 * const cleaned = await cacheService.cleanupExpired();
	 * console.log(`Removed ${cleaned} expired cache entries`);
	 */
	async cleanupExpired() {
		await this.init();

		const transaction = this.db.transaction(['layers'], 'readwrite');
		const store = transaction.objectStore('layers');

		return new Promise((resolve, reject) => {
			const request = store.getAll();

			request.onsuccess = () => {
				const entries = request.result;
				const now = Date.now();
				let cleanedCount = 0;

				entries.forEach((entry) => {
					if (now - entry.timestamp > entry.ttl) {
						store.delete(entry.id);
						cleanedCount++;
					}
				});

				resolve(cleanedCount);
			};

			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Ensure cache doesn't exceed size limit
	 * Checks if adding a new entry would exceed cache size limit.
	 * If so, removes oldest entries (LRU eviction) to make space.
	 *
	 * @param {number} newEntrySize - Size of entry to be added (bytes)
	 * @returns {Promise<void>}
	 * @throws {Error} If size check or eviction fails
	 * @private
	 */
	async ensureCacheSize(newEntrySize) {
		const stats = await this.getCacheStats();

		if (stats.totalSize + newEntrySize > this.maxCacheSize) {
			// Remove oldest entries until we have enough space
			await this.removeOldestEntries(newEntrySize);
		}
	}

	/**
	 * Remove oldest cache entries to free up space
	 * Implements LRU (Least Recently Used) eviction strategy.
	 * Iterates through entries sorted by timestamp (oldest first) and removes
	 * until sufficient space is freed.
	 *
	 * @param {number} spaceNeeded - Minimum bytes to free
	 * @returns {Promise<number>} Total bytes freed
	 * @throws {Error} If eviction fails
	 * @private
	 */
	async removeOldestEntries(spaceNeeded) {
		await this.init();

		const transaction = this.db.transaction(['layers'], 'readwrite');
		const store = transaction.objectStore('layers');
		const index = store.index('timestamp');

		return new Promise((resolve, reject) => {
			const request = index.openCursor();
			let freedSpace = 0;

			request.onsuccess = (event) => {
				const cursor = event.target.result;

				if (cursor && freedSpace < spaceNeeded) {
					const entry = cursor.value;
					freedSpace += entry.size || 0;
					cursor.delete();
					cursor.continue();
				} else {
					resolve(freedSpace);
				}
			};

			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Clear all cached data
	 * Removes all entries from the cache. Cannot be undone.
	 * Use with caution - typically for testing or reset functionality.
	 *
	 * @returns {Promise<boolean>} True if successfully cleared
	 * @throws {Error} If clear operation fails
	 *
	 * @example
	 * // Clear cache on user logout or data refresh
	 * await cacheService.clearAll();
	 * console.log('All cache data cleared');
	 */
	async clearAll() {
		await this.init();

		const transaction = this.db.transaction(['layers'], 'readwrite');
		const store = transaction.objectStore('layers');

		return new Promise((resolve, reject) => {
			const request = store.clear();
			request.onsuccess = () => resolve(true);
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Generate standardized cache key for layer data
	 * Creates consistent, URL-safe cache keys from layer parameters.
	 * Uses format: `{type}[-{postalCode}][-param:value]...`
	 *
	 * @param {string} type - Data type (e.g., 'buildings', 'trees', 'vegetation')
	 * @param {string|null} [postalCode=null] - Postal code for geographic data
	 * @param {Object} [params={}] - Additional parameters to include in key
	 * @returns {string} Generated cache key
	 *
	 * @example
	 * // Generate key for buildings in postal code 00100
	 * const key = cacheService.generateKey('buildings', '00100');
	 * // 'buildings-00100'
	 *
	 * @example
	 * // Generate key with additional parameters
	 * const key = cacheService.generateKey('heat', '00100', { date: '2022-06-28' });
	 * // 'heat-00100-date:2022-06-28'
	 */
	generateKey(type, postalCode = null, params = {}) {
		const paramString =
			Object.keys(params).length > 0
				? '-' +
					Object.entries(params)
						.map(([k, v]) => `${k}:${v}`)
						.join('-')
				: '';

		return postalCode ? `${type}-${postalCode}${paramString}` : `${type}${paramString}`;
	}

	/**
	 * Preload data for a specific postal code
	 * Checks cache status for multiple data types for a given postal code.
	 * Useful for warming cache or verifying data availability before navigation.
	 *
	 * Note: This method only checks cache status. For active preloading,
	 * use cacheWarmer service.
	 *
	 * @param {string} postalCode - Postal code to check
	 * @param {string[]} [types=['trees', 'buildings', 'vegetation']] - Data types to check
	 * @returns {Promise<Object[]>} Array of cache status objects per type
	 *
	 * @example
	 * const status = await cacheService.preloadPostalCodeData('00100');
	 * status.forEach(({ type, cached, age }) => {
	 *   if (cached) {
	 *     console.log(`${type}: cached (${age}ms old)`);
	 *   } else {
	 *     console.log(`${type}: not cached - needs loading`);
	 *   }
	 * });
	 */
	async preloadPostalCodeData(postalCode, types = ['trees', 'buildings', 'vegetation']) {
		const preloadPromises = types.map(async (type) => {
			const key = this.generateKey(type, postalCode);
			const cached = await this.getData(key);

			if (!cached) {
				// Data not cached, could trigger background loading here
				console.log(`${type} data for ${postalCode} not cached - could preload`);
				return { type, postalCode, cached: false };
			}

			return { type, postalCode, cached: true, age: cached.age };
		});

		return Promise.all(preloadPromises);
	}

	/**
	 * Store metadata about data sources
	 * Stores configuration and metadata separate from cached data.
	 * Useful for API version tracking, schema information, and data source URLs.
	 *
	 * @param {string} key - Metadata key
	 * @param {Object} metadata - Metadata object to store
	 * @returns {Promise<boolean>} True if successfully stored
	 * @throws {Error} If storage fails
	 *
	 * @example
	 * // Store API version information
	 * await cacheService.setMetadata('api_version', {
	 *   version: '2.0',
	 *   endpoint: 'https://kartta.hel.fi/ws/geoserver',
	 *   lastUpdated: Date.now()
	 * });
	 */
	async setMetadata(key, metadata) {
		await this.init();

		const transaction = this.db.transaction(['metadata'], 'readwrite');
		const store = transaction.objectStore('metadata');

		return new Promise((resolve, reject) => {
			const request = store.put({ key, ...metadata, timestamp: Date.now() });
			request.onsuccess = () => resolve(true);
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Get metadata about data sources
	 * Retrieves stored metadata by key.
	 *
	 * @param {string} key - Metadata key to retrieve
	 * @returns {Promise<Object|null>} Metadata object or null if not found
	 * @throws {Error} If retrieval fails
	 *
	 * @example
	 * const apiInfo = await cacheService.getMetadata('api_version');
	 * if (apiInfo) {
	 *   console.log('API version:', apiInfo.version);
	 * }
	 */
	async getMetadata(key) {
		await this.init();

		const transaction = this.db.transaction(['metadata'], 'readonly');
		const store = transaction.objectStore('metadata');

		return new Promise((resolve, reject) => {
			const request = store.get(key);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}
}

// Export singleton instance
export const cacheService = new CacheService();
export default cacheService;
