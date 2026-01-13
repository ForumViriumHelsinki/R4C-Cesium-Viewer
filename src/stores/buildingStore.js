/**
 * @module stores/buildingStore
 * Stores currently selected building features and controls temporal heat exposure visualization.
 *
 * @see {@link https://pinia.vuejs.org/|Pinia Documentation}
 */

import { defineStore } from 'pinia'
import logger from '../utils/logger.js'

/**
 * Building Pinia Store
 * Manages selected building entity data and time-series date for heat exposure visualization.
 * Uses an LRU cache to limit memory usage by keeping only the most recently accessed postal codes.
 *
 * @typedef {Object} BuildingState
 * @property {Object|null} buildingFeatures - Accumulated building GeoJSON features with properties from loaded postal codes
 * @property {string} timeseriesDate - Selected date for building heat time-series (YYYY-MM-DD)
 * @property {Map<string, number>} postalCodeCache - LRU cache tracking postal codes and their access timestamps
 * @property {number} maxPostalCodes - Maximum number of postal codes to keep in cache (default: 10)
 */
export const useBuildingStore = defineStore('building', {
	state: () => ({
		buildingFeatures: null,
		timeseriesDate: '2023-06-23',
		postalCodeCache: new Map(),
		// Must match MAX_LOADED_TILES in viewportBuildingLoader.js to prevent
		// tooltip data being evicted while buildings are still visible on screen
		maxPostalCodes: 50,
	}),
	actions: {
		/**
		 * Adds building features to the store, merging with existing features.
		 * This allows hover tooltips to work across multiple loaded postal codes.
		 * Features are deduplicated by ID to prevent duplicates on re-load.
		 * Implements LRU eviction when cache exceeds maxPostalCodes limit.
		 *
		 * @param {Object} buildings - GeoJSON FeatureCollection with building features
		 * @param {string} [postalCode] - Postal code for the features (for LRU cache tracking). If not provided, features are added without cache management.
		 */
		setBuildingFeatures(buildings, postalCode) {
			if (!buildings?.features?.length) {
				return
			}

			// Tag features with postal code for eviction tracking
			if (postalCode) {
				buildings.features.forEach((feature) => {
					if (!feature.properties) {
						feature.properties = {}
					}
					feature.properties._cached_postal_code = postalCode
				})

				// Update LRU cache: remove and re-add to update position (most recent at end)
				this.postalCodeCache.delete(postalCode)
				this.postalCodeCache.set(postalCode, Date.now())

				// Evict oldest postal code if over limit
				if (this.postalCodeCache.size > this.maxPostalCodes) {
					const oldestPostalCode = this.postalCodeCache.keys().next().value
					this.evictPostalCode(oldestPostalCode)
					logger.debug(
						`[BuildingStore] 🧹 Evicted postal code ${oldestPostalCode} (LRU cache limit: ${this.maxPostalCodes})`
					)
				}
			}

			// If no existing features, just set directly
			if (!this.buildingFeatures?.features) {
				this.buildingFeatures = {
					type: 'FeatureCollection',
					features: [...buildings.features],
				}
				logger.debug(
					`[BuildingStore] 📦 Initialized with ${buildings.features.length} features${postalCode ? ` for postal code ${postalCode}` : ''}`
				)
				return
			}

			// Create a Set of existing feature IDs for fast lookup
			const existingIds = new Set(this.buildingFeatures.features.map((f) => f.id))

			// Add only new features (avoid duplicates)
			const newFeatures = buildings.features.filter((f) => !existingIds.has(f.id))

			if (newFeatures.length > 0) {
				this.buildingFeatures.features.push(...newFeatures)
				logger.debug(
					`[BuildingStore] 📦 Added ${newFeatures.length} new features (total: ${this.buildingFeatures.features.length})${postalCode ? ` for postal code ${postalCode}` : ''}, cache size: ${this.postalCodeCache.size}/${this.maxPostalCodes}`
				)
			} else {
				logger.debug(
					`[BuildingStore] 📦 No new features to add (${buildings.features.length} already exist)${postalCode ? ` for postal code ${postalCode}` : ''}`
				)
			}
		},

		/**
		 * Evicts all features belonging to a specific postal code from the cache.
		 * This is called automatically when the LRU cache exceeds its size limit.
		 *
		 * @param {string} postalCode - Postal code to evict
		 * @private
		 */
		evictPostalCode(postalCode) {
			if (!this.buildingFeatures?.features) {
				return
			}

			const beforeCount = this.buildingFeatures.features.length
			this.buildingFeatures.features = this.buildingFeatures.features.filter(
				(f) => f.properties?._cached_postal_code !== postalCode
			)
			const afterCount = this.buildingFeatures.features.length
			const evictedCount = beforeCount - afterCount

			this.postalCodeCache.delete(postalCode)
			logger.debug(
				`[BuildingStore] 🗑️ Evicted ${evictedCount} features for postal code ${postalCode} (remaining: ${afterCount})`
			)
		},

		/**
		 * Clears all building features and LRU cache (call when navigating away or resetting view)
		 */
		clearBuildingFeatures() {
			this.buildingFeatures = null
			this.postalCodeCache.clear()
			logger.debug('[BuildingStore] 🗑️ Cleared all building features and cache')
		},

		/**
		 * Sets the selected date for building heat exposure time-series
		 * @param {string} date - Date string in YYYY-MM-DD format
		 */
		settTimeseriesDate(date) {
			this.timeseriesDate = date
		},
	},
})
