/**
 * @module stores/heatExposureStore
 * Loads and stores aggregated heat exposure indices for all Capital Region postal codes.
 * Provides quick lookup of heat statistics by postal code ID.
 *
 * Data structure:
 * - Raw feature collection from pygeoapi heatexposure endpoint
 * - Contains normalized heat exposure values (0-1) aggregated by postal code
 * - Supports temporal heat data for multiple years (2015-2025)
 *
 * @see {@link https://pinia.vuejs.org/|Pinia Documentation}
 */

import { defineStore } from 'pinia'
import logger from '../utils/logger.js'
import { useURLStore } from './urlStore.js'

/**
 * Heat Exposure Pinia Store
 * Manages postal code-level heat exposure data with async loading and lookup.
 *
 * @typedef {Object} HeatExposureState
 * @property {Array<Object>|null} data - Raw postal code heat exposure features
 * @property {Map<string, Object>|null} dataByPostcode - Indexed lookup by postal code ID for O(1) access
 */
export const useHeatExposureStore = defineStore('heatExposure', {
	state: () => ({
		data: null, // Stores the raw Postal code data
		dataByPostcode: null, // Map-based index for O(1) lookups
	}),
	getters: {
		/**
		 * Retrieves heat exposure data for a specific postal code
		 * Uses Map-based index for O(1) lookup instead of O(n) find()
		 * @param {Object} state - Pinia state
		 * @returns {(postcode: string) => Object|undefined} Function accepting postcode and returning feature data
		 *
		 * @example
		 * const heatData = getDataById('00100');
		 * console.log(heatData.properties.average_heat_exposure);
		 */
		getDataById: (state) => (postcode) => {
			// Use indexed lookup for O(1) performance
			if (state.dataByPostcode) {
				return state.dataByPostcode.get(postcode)
			}
			// Fallback to linear search if index not built
			return state.data?.find((item) => item.id === postcode)
		},
	},
	actions: {
		/**
		 * Loads postal code heat exposure data from pygeoapi
		 * Fetches all heat exposure records and stores them in state.
		 * Automatically uses the latest available heat data endpoint.
		 * Builds Map-based index for O(1) lookups by postal code ID.
		 *
		 * @returns {Promise<void>}
		 * @throws {Error} If heat exposure data fetch fails
		 *
		 * @example
		 * await heatExposureStore.loadHeatExposure();
		 * // data is now available via state.data or getDataById getter
		 */
		async loadHeatExposure() {
			const urlStore = useURLStore() // Get the URL from the store
			try {
				let data = null

				if (!data) {
					data = await this.getAllHeatExposureData(urlStore.heatExposure())
				}

				this.data = data

				// Build indexed lookup for O(1) access by postal code
				this.dataByPostcode = new Map(data.map((item) => [item.id, item]))
			} catch (error) {
				logger.error('Error fetching postal codedata:', error)
			}
		},

		/**
		 * Fetches all heat exposure features from pygeoapi endpoint
		 * Internal method used by loadHeatExposure action.
		 *
		 * @private
		 * @param {string} requestUrl - Pygeoapi heatexposure collection URL
		 * @returns {Promise<Array<Object>>} Array of heat exposure GeoJSON features
		 * @throws {Error} If HTTP request fails or data structure is invalid
		 */
		async getAllHeatExposureData(requestUrl) {
			try {
				const response = await fetch(requestUrl)
				if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
				const data = await response.json()
				if (!data || !data.features) throw new Error('Invalid data structure')
				return data.features
			} catch (error) {
				logger.error('Error fetching postal code data:', error)
				throw error // Rethrow to handle it in the calling function
			}
		},
	},
})
