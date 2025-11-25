/**
 * Browser Caching Service using IndexedDB
 * Provides persistent storage for geospatial and climate data
 */

class CacheService {
	constructor() {
		this.dbName = 'R4C-CesiumViewer-Cache';
		this.version = 1;
		this.maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
		this.maxCacheSize = 100 * 1024 * 1024; // 100MB
		this.db = null;
	}

	/**
	 * Initialize the IndexedDB database
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
	 * Store data in cache
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
	 * Retrieve data from cache
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
	 * Check if data exists and is valid
	 */
	async hasValidData(key, maxAge = null) {
		const cached = await this.getData(key, maxAge);
		return cached !== null;
	}

	/**
	 * Remove specific data from cache
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
	 * Get cache statistics
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
	 * Generate cache key for layer data
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
