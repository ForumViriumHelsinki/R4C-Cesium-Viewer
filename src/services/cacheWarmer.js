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

import { useFeatureFlagStore } from '../stores/featureFlagStore'
import { useGlobalStore } from '../stores/globalStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import { useURLStore } from '../stores/urlStore.js'
import logger from '../utils/logger.js'
import { encodeURLParam, validatePostalCode } from '../utils/validators.js'
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
	 * Initializes store references and the warmed-postal-code tracking set
	 * shared with `postalCodeLoader.checkCacheForPostalCode`.
	 */
	constructor() {
		/** @type {Object|null} Lazy-loaded global store instance */
		this._store = null
		/** @type {Object|null} Lazy-loaded toggle store instance */
		this._toggleStore = null
		/** @type {Object|null} Lazy-loaded URL store instance */
		this._urlStore = null
		/** @type {Object|null} Lazy-loaded feature flag store instance */
		this._featureFlagStore = null
		/** @type {Set<string>} Tracking set of already-warmed postal codes */
		this.warmedPostalCodes = new Set()
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
	 * Get feature flag store instance (lazy-loaded to avoid initialization issues)
	 * @returns {Object} Feature flag store instance
	 * @private
	 */
	get featureFlagStore() {
		if (!this._featureFlagStore) this._featureFlagStore = useFeatureFlagStore()
		return this._featureFlagStore
	}

	/**
	 * Warm critical data caches on app startup
	 *
	 * **No-op** (since 2026-05). The previous implementation fanned out 8
	 * parallel `/hsy_buildings_optimized/items?postinumero=*` requests at
	 * page load (one per "popular" postal code), which triggered Sentry's
	 * N+1 detector (R4C-CESIUM-VIEWER-5, R4C-CESIUM-VIEWER-6) and shipped
	 * 8 large GeoJSON payloads the user had not yet asked for
	 * (R4C-CESIUM-VIEWER-4). Buildings are now loaded lazily on first
	 * postal-code selection, and predictive warming for nearby postal
	 * codes (`warmNearbyPostalCodes`) handles the warm-cache case once
	 * the user has expressed intent.
	 *
	 * Method retained as a callable no-op so `useDataLoading` and any
	 * existing tests/imports keep working. If a future use case
	 * resurrects startup warming, gate it behind a GoFeatureFlag
	 * (org-wide standard, see CLAUDE.md "feature-flags" rule) and not an
	 * env-var build flag.
	 *
	 * @returns {Promise<void>}
	 */
	async warmCriticalData() {
		logger.debug(
			'[CacheWarmer] ⏭️ Startup warming disabled — buildings load on first selection (see perf/#722,#724,#726)'
		)
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
			logger.debug(`[CacheWarmer] ⏭️ Skipping ${postalCode} (already warmed)`)
			return
		}

		// Skip per-postal-code bulk warming when viewport streaming is enabled —
		// the tile pipeline (viewportBuildingLoader) already covers the visible
		// area lazily with bbox-filtered requests, so a `?postinumero=*` fetch
		// here is duplicate work and re-introduces the large-payload regression
		// (R4C-CESIUM-VIEWER-4, issue #755). The HSY view shares the same
		// pygeoapi endpoint as tile loading; the Helsinki WFS path is gated
		// the same way because the WFS predictive warm would still ship a
		// per-postal-code GeoJSON payload that duplicates the viewport tiles.
		//
		// Don't add to `warmedPostalCodes`: if the user toggles
		// `viewportStreaming` off later in the session, predictive warming
		// for already-visited areas should be allowed to run.
		if (this.featureFlagStore.isEnabled('viewportStreaming')) {
			logger.debug(
				`[CacheWarmer] ⏭️ Skipping ${postalCode} (viewport streaming handles building loading)`
			)
			return
		}

		try {
			const validated = validatePostalCode(postalCode)
			const helsinkiView = this.toggleStore.helsinkiView

			if (helsinkiView) {
				// Helsinki buildings from WFS
				const url =
					'https://kartta.hel.fi/ws/geoserver/avoindata/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=avoindata%3ARakennukset_alue_rekisteritiedot&outputFormat=application/json&srsName=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A4326&CQL_FILTER=postinumero%3D%27' +
					encodeURLParam(validated) +
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
				// HSY Capital Region buildings (validated is already validated above)
				const url = this.urlStore.hsyBuildings(validated)

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
			logger.debug(`[CacheWarmer] ✓ Warmed buildings for ${postalCode}`)
		} catch (error) {
			logger.warn(`[CacheWarmer] ⚠️ Failed to warm ${postalCode}:`, error.message)
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
		if (import.meta.env.VITE_E2E_TEST === 'true') return

		logger.debug('[CacheWarmer] 🎯 Predictively warming nearby postal codes...')

		// Filter out current postal code and already warmed ones
		const postalCodesToWarm = nearbyPostalCodes.filter(
			(code) => code !== currentPostalCode && !this.warmedPostalCodes.has(code)
		)

		if (postalCodesToWarm.length === 0) {
			logger.debug('[CacheWarmer] All nearby postal codes already warmed')
			return
		}

		logger.debug('[CacheWarmer] Warming', postalCodesToWarm.length, 'nearby postal codes')

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
		logger.debug('[CacheWarmer] 🧹 Clearing warmed postal codes tracking')
		this.warmedPostalCodes.clear()
	}
}

// Export singleton instance
export default new CacheWarmer()
