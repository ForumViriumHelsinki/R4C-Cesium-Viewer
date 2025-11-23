/**
 * Cache Warmer Service
 * Proactively preloads frequently-accessed data into IndexedDB cache
 * to provide instant loading for common user workflows.
 *
 * Strategy:
 * - Warm critical data on app startup (non-blocking)
 * - Predictively warm nearby postal codes during navigation
 * - Prioritize popular areas (Helsinki city center)
 * - Use low-priority background requests
 *
 * @class CacheWarmer
 */

import unifiedLoader from './unifiedLoader.js';
import { useGlobalStore } from '../stores/globalStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import { useURLStore } from '../stores/urlStore.js';

class CacheWarmer {
	constructor() {
		this._store = null;
		this._toggleStore = null;
		this._urlStore = null;
		this.warmingInProgress = false;
		this.warmedPostalCodes = new Set();

		// Most popular postal codes in Helsinki (based on typical usage patterns)
		// These will be warmed on app startup
		this.popularPostalCodes = [
			'00100', // Helsinki center (Keskusta)
			'00150', // Punavuori
			'00170', // Kamppi
			'00180', // Länsisatama
			'00200', // Lauttasaari
			'00530', // Munkkiniemi
			'00250', // Taka-Töölö
			'00260', // Katajanokka
		];
	}

	/**
	 * Lazy-loaded store getters to avoid initialization issues
	 */
	get store() {
		if (!this._store) this._store = useGlobalStore();
		return this._store;
	}

	get toggleStore() {
		if (!this._toggleStore) this._toggleStore = useToggleStore();
		return this._toggleStore;
	}

	get urlStore() {
		if (!this._urlStore) this._urlStore = useURLStore();
		return this._urlStore;
	}

	/**
	 * Warm critical data caches on app startup
	 * Runs in background using requestIdleCallback to avoid blocking UI.
	 * Loads building data for most popular postal codes.
	 *
	 * @returns {Promise<void>}
	 */
	async warmCriticalData() {
		if (this.warmingInProgress) {
			console.log('[CacheWarmer] ⏳ Warming already in progress, skipping');
			return;
		}

		this.warmingInProgress = true;
		console.log('[CacheWarmer] 🔥 Starting cache warming for critical data...');

		try {
			// Warm popular postal codes' building data
			await this.warmPopularBuildingData();

			console.log('[CacheWarmer] ✅ Cache warming complete');
		} catch (error) {
			console.warn('[CacheWarmer] ⚠️ Cache warming encountered error:', error?.message || error);
		} finally {
			this.warmingInProgress = false;
		}
	}

	/**
	 * Preload building data for most popular postal codes
	 * Loads data into cache only (doesn't process or display)
	 *
	 * @returns {Promise<void>}
	 */
	async warmPopularBuildingData() {
		console.log(
			'[CacheWarmer] 🏢 Warming building caches for',
			this.popularPostalCodes.length,
			'popular areas...'
		);

		// Use Promise.allSettled to continue even if some fail
		const results = await Promise.allSettled(
			this.popularPostalCodes.map((postalCode) => this.warmBuildingsForPostalCode(postalCode))
		);

		const successful = results.filter((r) => r.status === 'fulfilled').length;
		const failed = results.filter((r) => r.status === 'rejected').length;

		console.log(`[CacheWarmer] 📊 Warming complete: ${successful} successful, ${failed} failed`);
	}

	/**
	 * Warm building data for a specific postal code
	 * Loads data into cache without processing or displaying.
	 *
	 * @param {string} postalCode - Postal code to warm
	 * @returns {Promise<void>}
	 */
	async warmBuildingsForPostalCode(postalCode) {
		// Skip if already warmed
		if (this.warmedPostalCodes.has(postalCode)) {
			console.log(`[CacheWarmer] ⏭️ Skipping ${postalCode} (already warmed)`);
			return;
		}

		try {
			const helsinkiView = this.toggleStore.helsinkiView;

			if (helsinkiView) {
				// Helsinki buildings from WFS
				const url =
					'https://kartta.hel.fi/ws/geoserver/avoindata/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=avoindata%3ARakennukset_alue_rekisteritiedot&outputFormat=application/json&srsName=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A4326&CQL_FILTER=postinumero%3D%27' +
					postalCode +
					'%27';

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
				});
			} else {
				// HSY Capital Region buildings
				const url = this.urlStore.hsyBuildings(postalCode);

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
				});
			}

			this.warmedPostalCodes.add(postalCode);
			console.log(`[CacheWarmer] ✓ Warmed buildings for ${postalCode}`);
		} catch (error) {
			console.warn(`[CacheWarmer] ⚠️ Failed to warm ${postalCode}:`, error.message);
			throw error; // Re-throw for Promise.allSettled tracking
		}
	}

	/**
	 * Predictive warming: preload buildings for nearby postal codes
	 * Called when user navigates to a postal code, warms adjacent areas.
	 *
	 * @param {string} currentPostalCode - Currently selected postal code
	 * @param {Array<string>} nearbyPostalCodes - Nearby postal codes to warm
	 * @returns {void}
	 */
	warmNearbyPostalCodes(currentPostalCode, nearbyPostalCodes) {
		console.log('[CacheWarmer] 🎯 Predictively warming nearby postal codes...');

		// Filter out current postal code and already warmed ones
		const postalCodesToWarm = nearbyPostalCodes.filter(
			(code) => code !== currentPostalCode && !this.warmedPostalCodes.has(code)
		);

		if (postalCodesToWarm.length === 0) {
			console.log('[CacheWarmer] All nearby postal codes already warmed');
			return;
		}

		console.log('[CacheWarmer] Warming', postalCodesToWarm.length, 'nearby postal codes');

		// Warm in background with low priority
		// Use requestIdleCallback to run during browser idle time
		postalCodesToWarm.forEach((postalCode) => {
			if (typeof requestIdleCallback !== 'undefined') {
				requestIdleCallback(
					async () => {
						try {
							await this.warmBuildingsForPostalCode(postalCode);
						} catch (_error) {
							// Silent fail for predictive warming
							console.debug(`[CacheWarmer] Predictive warming failed for ${postalCode}`);
						}
					},
					{ timeout: 5000 }
				); // 5 second timeout
			} else {
				// Fallback for browsers without requestIdleCallback
				setTimeout(async () => {
					try {
						await this.warmBuildingsForPostalCode(postalCode);
					} catch (_error) {
						console.debug(`[CacheWarmer] Predictive warming failed for ${postalCode}`);
					}
				}, 100);
			}
		});
	}

	/**
	 * Clear warmed postal codes tracking
	 * Useful when switching between Helsinki/Capital Region views.
	 *
	 * @returns {void}
	 */
	clearWarmedTracking() {
		console.log('[CacheWarmer] 🧹 Clearing warmed postal codes tracking');
		this.warmedPostalCodes.clear();
	}
}

// Export singleton instance
export default new CacheWarmer();
