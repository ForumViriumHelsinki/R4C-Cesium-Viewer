/**
 * @file buildingStore.js
 * @module stores/buildingStore
 * @description Building Store - Pinia store for managing building-specific data and selections.
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
 * @property {Object|null} buildingFeatures - Currently selected building GeoJSON features with properties
 * @property {string} timeseriesDate - Selected date for building heat time-series (YYYY-MM-DD)
 */
export const useBuildingStore = defineStore( 'building', {
	state: () => ( {
		buildingFeatures: null,
		timeseriesDate: '2023-06-23'
	} ),
	actions: {
		/**
		 * Sets the currently selected building features
		 * @param {Object} buildings - GeoJSON building features with heat exposure data
		 */
		setBuildingFeatures( buildings ) {
			this.buildingFeatures = buildings;
		},
		/**
		 * Sets the selected date for building heat exposure time-series
		 * @param {string} date - Date string in YYYY-MM-DD format
		 */
		settTimeseriesDate( date ) {
			this.timeseriesDate = date;
		},
	},
} );