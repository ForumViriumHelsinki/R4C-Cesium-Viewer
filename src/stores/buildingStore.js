/**
 * @module stores/buildingStore
 * Stores currently selected building features and controls temporal heat exposure visualization.
 *
 * @see {@link https://pinia.vuejs.org/|Pinia Documentation}
 */

import { defineStore } from 'pinia';

/**
 * Building Pinia Store
 * Manages selected building entity data and time-series date for heat exposure visualization.
 *
 * @typedef {Object} BuildingState
 * @property {Object|null} buildingFeatures - Accumulated building GeoJSON features with properties from all loaded postal codes
 * @property {string} timeseriesDate - Selected date for building heat time-series (YYYY-MM-DD)
 */
export const useBuildingStore = defineStore('building', {
	state: () => ({
		buildingFeatures: null,
		timeseriesDate: '2023-06-23',
	}),
	actions: {
		/**
		 * Adds building features to the store, merging with existing features.
		 * This allows hover tooltips to work across multiple loaded postal codes.
		 * Features are deduplicated by ID to prevent duplicates on re-load.
		 *
		 * @param {Object} buildings - GeoJSON FeatureCollection with building features
		 */
		setBuildingFeatures(buildings) {
			if (!buildings?.features?.length) {
				return;
			}

			// If no existing features, just set directly
			if (!this.buildingFeatures?.features) {
				this.buildingFeatures = {
					type: 'FeatureCollection',
					features: [...buildings.features],
				};
				console.log(`[BuildingStore] 📦 Initialized with ${buildings.features.length} features`);
				return;
			}

			// Create a Set of existing feature IDs for fast lookup
			const existingIds = new Set(this.buildingFeatures.features.map((f) => f.id));

			// Add only new features (avoid duplicates)
			const newFeatures = buildings.features.filter((f) => !existingIds.has(f.id));

			if (newFeatures.length > 0) {
				this.buildingFeatures.features.push(...newFeatures);
				console.log(
					`[BuildingStore] 📦 Added ${newFeatures.length} new features (total: ${this.buildingFeatures.features.length})`
				);
			} else {
				console.log(
					`[BuildingStore] 📦 No new features to add (${buildings.features.length} already exist)`
				);
			}
		},

		/**
		 * Clears all building features (call when navigating away or resetting view)
		 */
		clearBuildingFeatures() {
			this.buildingFeatures = null;
			console.log('[BuildingStore] 🗑️ Cleared all building features');
		},

		/**
		 * Sets the selected date for building heat exposure time-series
		 * @param {string} date - Date string in YYYY-MM-DD format
		 */
		settTimeseriesDate(date) {
			this.timeseriesDate = date;
		},
	},
});
