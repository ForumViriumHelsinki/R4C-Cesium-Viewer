/**
 * @module services/cacheWarmer
 * Cache Warmer Service
 *
 * Proactively preloads frequently-accessed data into IndexedDB cache
 * to provide instant loading for common user workflows.
 *
 * Features:
 * - Proactive cache warming on app startup (non-blocking)
 * - Predictive warming of nearby postal codes during navigation
 * - Popular area prioritization (Helsinki city center focus)
 * - Low-priority background requests using requestIdleCallback
 * - Duplicate warming prevention via tracking
 *
 * Strategy:
 * - **Startup warming**: Popular postal codes (00100, 00150, 00170, etc.)
 * - **Predictive warming**: Adjacent postal codes when user navigates
 * - **Background loading**: Uses idle time to avoid UI impact
 * - **Smart tracking**: Prevents redundant warming of same areas
 *
 * Performance Considerations:
 * - Uses requestIdleCallback for minimal UI impact (5-second timeout)
 * - Falls back to setTimeout for browser compatibility
 * - Silent failure for background operations (logs debug, doesn't throw)
 * - Tracks warmed postal codes to prevent duplicate requests
 *
 * Integration:
 * - Works with unifiedLoader for actual data loading
 * - Coordinates with urlStore for correct WFS endpoint selection
 * - Respects toggleStore helsinkiView setting
 *
 * @see {@link module:services/unifiedLoader}
 * @see {@link module:stores/urlStore}
 * @see {@link module:stores/toggleStore}
 */

import { useGlobalStore } from '../stores/globalStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import { useURLStore } from '../stores/urlStore.js'
import unifiedLoader from './unifiedLoader.js'

/**
 * Warming result object
 * @typedef {Object} WarmingResult
 * @property {string} type - Data type warmed ('buildings', 'trees', etc.)
 * @property {string} postalCode - Postal code warmed
 * @property {boolean} cached - Whether data was successfully cached
 * @property {number} [age] - Age of existing cache in milliseconds (if already cached)
 */

/**
 * CacheWarmer Class
 * Manages proactive cache warming for frequently-accessed geospatial data.
 *
 * @class CacheWarmer
 */
class CacheWarmer {
	/**
	 * Creates a CacheWarmer instance
	 * Initializes store references and defines popular postal codes for warming.
	 */
	constructor() {
		/** @type {Object|null} Lazy-loaded global store instance */
		this._store = null
		/** @type {Object|null} Lazy-loaded toggle store instance */
		this._toggleStore = null
		/** @type {Object|null} Lazy-loaded URL store instance */
		this._urlStore = null
		/** @type {boolean} Flag to prevent concurrent warming operations */
		this.warmingInProgress = false
		/** @type {Set<string>} Tracking set of already-warmed postal codes */
		this.warmedPostalCodes = new Set()

		/**
		 * Most popular postal codes in Helsinki (based on typical usage patterns)
		 * These will be warmed on app startup for instant loading.
		 * @type {string[]}
		 */
		this.popularPostalCodes = [
			'00100', // Helsinki center (Keskusta)
			'00150', // Punavuori
			'00170', // Kamppi
			'00180', // Länsisatama
			'00200', // Lauttasaari
			'00530', // Munkkiniemi
			'00250', // Taka-Töölö
			'00260', // Katajanokka
		]
	}

	/**
	 * Get global store instance (lazy-loaded to avoid initialization issues)
	 * @returns {Object} Global store instance
	 * @private
	 */
	get store() {
		if (!this._store) this._store = useGlobalStore()
		return this._store
	}

	/**
	 * Get toggle store instance (lazy-loaded to avoid initialization issues)
	 * @returns {Object} Toggle store instance
	 * @private
	 */
	get toggleStore() {
		if (!this._toggleStore) this._toggleStore = useToggleStore()
		return this._toggleStore
	}

	/**
	 * Get URL store instance (lazy-loaded to avoid initialization issues)
	 * @returns {Object} URL store instance
	 * @private
	 */
	get urlStore() {
		if (!this._urlStore) this._urlStore = useURLStore()
		return this._urlStore
	}

	/**
	 * Warm critical data caches on app startup
	 * Runs in background using requestIdleCallback to avoid blocking UI.
	 * Loads building data for most popular postal codes into IndexedDB.
	 *
	 * Warming Strategy:
	 * - Loads building data only (most frequently accessed)
	 * - Uses low-priority background loading
	 * - 1-hour cache TTL (shorter than normal for freshness)
	 * - Continues on failure (doesn't block app startup)
	 *
	 * @returns {Promise<void>}
	 *
	 * @example
	 * // Call on app initialization
	 * import cacheWarmer from './services/cacheWarmer.js';
	 * cacheWarmer.warmCriticalData();
	 */
	async warmCriticalData() {
		if (this.warmingInProgress) {
			console.log('[CacheWarmer] ⏳ Warming already in progress, skipping')
			return
		}

		this.warmingInProgress = true
		console.log('[CacheWarmer] 🔥 Starting cache warming for critical data...')

		try {
			// Warm popular postal codes' building data
			await this.warmPopularBuildingData()

			console.log('[CacheWarmer] ✅ Cache warming complete')
		} catch (error) {
			console.warn('[CacheWarmer] ⚠️ Cache warming encountered error:', error?.message || error)
		} finally {
			this.warmingInProgress = false
		}
	}

	/**
	 * Preload building data for most popular postal codes
	 * Loads data into cache only (doesn't process or display).
	 * Uses Promise.allSettled to continue warming even if some areas fail.
	 *
	 * @returns {Promise<void>}
	 * @private
	 */
	async warmPopularBuildingData() {
		console.log(
			'[CacheWarmer] 🏢 Warming building caches for',
			this.popularPostalCodes.length,
			'popular areas...'
		)

		// Use Promise.allSettled to continue even if some fail
		const results = await Promise.allSettled(
			this.popularPostalCodes.map((postalCode) => this.warmBuildingsForPostalCode(postalCode))
		)

		const successful = results.filter((r) => r.status === 'fulfilled').length
		const failed = results.filter((r) => r.status === 'rejected').length

		console.log(`[CacheWarmer] 📊 Warming complete: ${successful} successful, ${failed} failed`)
	}

	/**
	 * Warm building data for a specific postal code
	 * Loads data into cache without processing or displaying.
	 * Automatically selects correct WFS endpoint based on helsinkiView setting.
	 *
	 * Data Sources:
	 * - **Helsinki view**: Helsinki WFS (kartta.hel.fi/ws/geoserver)
	 * - **Capital Region view**: HSY buildings via urlStore
	 *
	 * Cache Configuration:
	 * - 1-hour TTL (shorter for frequently-accessed data)
	 * - Single retry attempt (background operation)
	 * - Low priority, background mode
	 * - Null processor (cache only, no rendering)
	 *
	 * @param {string} postalCode - Postal code to warm (e.g., '00100')
	 * @returns {Promise<void>}
	 * @throws {Error} If warming fails (re-thrown for Promise.allSettled tracking)
	 *
	 * @example
	 * // Warm specific postal code
	 * await cacheWarmer.warmBuildingsForPostalCode('00100');
	 */
	async warmBuildingsForPostalCode(postalCode) {
		// Skip if already warmed
		if (this.warmedPostalCodes.has(postalCode)) {
			console.log(`[CacheWarmer] ⏭️ Skipping ${postalCode} (already warmed)`)
			return
		}

		try {
			const helsinkiView = this.toggleStore.helsinkiView

			if (helsinkiView) {
				// Helsinki buildings from WFS
				const url =
					'https://kartta.hel.fi/ws/geoserver/avoindata/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=avoindata%3ARakennukset_alue_rekisteritiedot&outputFormat=application/json&srsName=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A4326&CQL_FILTER=postinumero%3D%27' +
					postalCode +
					'%27'

				await unifiedLoader.loadLayer({
					layerId: `warmcache_helsinki_buildings_${postalCode}`,
					url,
					type: 'geojson',
					processor: null, // Cache only, don't process
					options: {
						cache: true,
						cacheTTL: 60 * 60 * 1000, // 1 hour
						retries: 1, // Fewer retries for background warming
						priority: 'low',
						background: true,
					},
				})
			} else {
				// HSY Capital Region buildings
				const url = this.urlStore.hsyBuildings(postalCode)

				await unifiedLoader.loadLayer({
					layerId: `warmcache_hsy_buildings_${postalCode}`,
					url,
					type: 'geojson',
					processor: null, // Cache only, don't process
					options: {
						cache: true,
						cacheTTL: 60 * 60 * 1000, // 1 hour
						retries: 1,
						priority: 'low',
						background: true,
					},
				})
			}

			this.warmedPostalCodes.add(postalCode)
			console.log(`[CacheWarmer] ✓ Warmed buildings for ${postalCode}`)
		} catch (error) {
			console.warn(`[CacheWarmer] ⚠️ Failed to warm ${postalCode}:`, error.message)
			throw error // Re-throw for Promise.allSettled tracking
		}
	}

	/**
	 * Predictive warming: preload buildings for nearby postal codes
	 * Called when user navigates to a postal code, warms adjacent areas
	 * for instant loading if user navigates nearby.
	 *
	 * Warming Strategy:
	 * - Filters out current and already-warmed postal codes
	 * - Uses requestIdleCallback for zero UI impact
	 * - 5-second timeout guarantee (falls back if idle time unavailable)
	 * - Falls back to 100ms setTimeout for unsupported browsers
	 * - Silent failure (debug logs only)
	 *
	 * @param {string} currentPostalCode - Currently selected postal code
	 * @param {string[]} nearbyPostalCodes - Nearby postal codes to warm
	 * @returns {void}
	 *
	 * @example
	 * // Warm adjacent areas when user selects postal code
	 * cacheWarmer.warmNearbyPostalCodes('00100', ['00150', '00170', '00180']);
	 */
	warmNearbyPostalCodes(currentPostalCode, nearbyPostalCodes) {
		console.log('[CacheWarmer] 🎯 Predictively warming nearby postal codes...')

		// Filter out current postal code and already warmed ones
		const postalCodesToWarm = nearbyPostalCodes.filter(
			(code) => code !== currentPostalCode && !this.warmedPostalCodes.has(code)
		)

		if (postalCodesToWarm.length === 0) {
			console.log('[CacheWarmer] All nearby postal codes already warmed')
			return
		}

		console.log('[CacheWarmer] Warming', postalCodesToWarm.length, 'nearby postal codes')

		// Warm in background with low priority
		// Use requestIdleCallback to run during browser idle time
		postalCodesToWarm.forEach((postalCode) => {
			if (typeof requestIdleCallback !== 'undefined') {
				requestIdleCallback(
					async () => {
						try {
							await this.warmBuildingsForPostalCode(postalCode)
						} catch (_error) {
							// Silent fail for predictive warming
							console.debug(`[CacheWarmer] Predictive warming failed for ${postalCode}`)
						}
					},
					{ timeout: 5000 }
				) // 5 second timeout
			} else {
				// Fallback for browsers without requestIdleCallback
				setTimeout(async () => {
					try {
						await this.warmBuildingsForPostalCode(postalCode)
					} catch (_error) {
						console.debug(`[CacheWarmer] Predictive warming failed for ${postalCode}`)
					}
				}, 100)
			}
		})
	}

	/**
	 * Clear warmed postal codes tracking
	 * Resets the internal tracking set, allowing postal codes to be warmed again.
	 * Useful when switching between Helsinki/Capital Region views since
	 * data sources are different.
	 *
	 * @returns {void}
	 *
	 * @example
	 * // Clear tracking when view mode changes
	 * watch(() => toggleStore.helsinkiView, () => {
	 *   cacheWarmer.clearWarmedTracking();
	 * });
	 */
	clearWarmedTracking() {
		console.log('[CacheWarmer] 🧹 Clearing warmed postal codes tracking')
		this.warmedPostalCodes.clear()
	}
}

// Export singleton instance
export default new CacheWarmer()
