/**
 * @module stores/socioEconomicsStore
 * Manages demographic, housing, and socioeconomic indicators for Helsinki Capital Region.
 * Provides statistical aggregations, regional comparisons, and Helsinki-specific subsets.
 *
 * Data source: Statistics Finland Paavo postal code statistics
 * Coverage: Helsinki, Espoo, Vantaa, Kauniainen (Capital Region)
 * Temporal scope: Annual updates (latest year data)
 *
 * Key indicators:
 * - **Demographics**: Age groups (he_0_2, he_3_6, he_7_12, he_65_69, he_70_74, he_80_84, he_85_)
 * - **Population**: Total population (he_vakiy)
 * - **Employment**: Unemployment rate (pt_tyott)
 * - **Education**: Education level (ko_perus, ko_ika18y)
 * - **Housing**: Household types (te_taly), rented dwellings (te_vuok_as)
 * - **Income**: Average income per capita (ra_as_kpa)
 * - **Household size**: Persons per household (hr_ktu)
 *
 * Statistical processing:
 * - Region-wide min/max for normalization
 * - Helsinki-specific statistics (kunta === '091')
 * - "Whole Region" aggregated entry for Capital Region totals
 * - Filtered postal codes (excludes: 00230, 02290, 01770)
 *
 * @see {@link https://www.stat.fi/org/avoindata/paikkatietoaineistot/paavo_en.html|Paavo Documentation}
 * @see {@link https://pinia.vuejs.org/|Pinia Documentation}
 */

import { defineStore } from 'pinia';

/**
 * Socio-Economics Pinia Store
 * Manages Paavo postal code statistics with regional and Helsinki-specific aggregations.
 *
 * @typedef {Object} SocioEconomicsState
 * @property {Array<Object>|null} data - Paavo postal code statistics (filtered)
 * @property {Object|null} regionStatistics - Min/max values for Capital Region
 * @property {Object|null} helsinkiStatistics - Min/max values for Helsinki only
 */
export const useSocioEconomicsStore = defineStore('socioEconomics', {
	state: () => ({
		data: null, // Stores the raw Paavo data
		regionStatistics: null, // Stores min and max values for attributes
		helsinkiStatistics: null,
	}),
	getters: {
		/**
		 * Retrieves socioeconomic data for a specific postal code
		 * @param {Object} state - Pinia state
		 * @returns {(postcode: string) => Object|undefined} Function accepting postcode and returning Paavo data
		 * @example
		 * const data = getDataByPostcode('00100');
		 * console.log(data.he_vakiy); // Total population
		 */
		getDataByPostcode: (state) => (postcode) => {
			return state.data.find((item) => item.postinumeroalue === postcode);
		},
		/**
		 * Retrieves socioeconomic data by area name
		 * @param {Object} state - Pinia state
		 * @returns {(nimi: string) => Object|undefined} Function accepting area name and returning Paavo data
		 * @example
		 * const data = getDataByNimi('Alppila - Vallila');
		 */
		getDataByNimi: (state) => (nimi) => {
			return state.data.find((item) => item.nimi === nimi);
		},
		/**
		 * Gets sorted list of all area names in Capital Region
		 * @param {Object} state - Pinia state
		 * @returns {() => Array<string>} Function returning sorted array of area names
		 */
		getNimiForCapital: (state) => () => {
			return state.data.map((item) => item.nimi).sort();
		},
		/**
		 * Gets sorted list of area names in Helsinki only (kunta === '091')
		 * @param {Object} state - Pinia state
		 * @returns {() => Array<string>} Function returning sorted array of Helsinki area names
		 */
		getNimiForHelsinki: (state) => () => {
			return state.data
				.filter((item) => item.kunta === '091')
				.map((item) => item.nimi)
				.sort();
		},
	},
	actions: {
		/**
		 * Loads Paavo socioeconomic data from proxied endpoint
		 * Fetches all Capital Region postal code statistics and calculates min/max values.
		 * Automatically filters excluded postal codes and adds "Whole Region" aggregate entry.
		 *
		 * @returns {Promise<void>}
		 * @throws {Error} If Paavo data fetch fails
		 */
		async loadPaavo() {
			try {
				const response = await fetch('/paavo');
				if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
				const data = await response.json(); // Parse as JSON

				this.addDataToStore(data);
				this.addRegionStatisticsToStore();
				this.addHelsinkiStatisticsToStore();
				this.calculateRegionTotal();
			} catch (error) {
				console.error('Error fetching Paavo data:', error);
			}
		},

		/**
		 * Fetches all Paavo features from proxied endpoint
		 * @private
		 * @param {string} requestUrl - Paavo API endpoint URL
		 * @returns {Promise<Object>} GeoJSON feature collection
		 * @throws {Error} If HTTP request fails or data structure is invalid
		 */
		async getAllPaavoData(requestUrl) {
			try {
				const response = await fetch(requestUrl);
				if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
				const data = await response.json();
				if (!data || !data.features) throw new Error('Invalid data structure');
				return data;
			} catch (error) {
				console.error('Error fetching socio-economic data:', error);
				throw error; // Rethrow to handle it in the calling function
			}
		},

		/**
		 * Processes and stores Paavo data with statistical calculations
		 * Filters excluded postal codes, calculates min/max for both Capital Region
		 * and Helsinki-only subsets for income and household size indicators.
		 *
		 * Excluded postal codes: 00230, 02290, 01770
		 *
		 * @param {Object} data - GeoJSON feature collection from Paavo API
		 * @returns {void}
		 */
		addPaavoDataToStore(data) {
			// Filter out rows where postinumeroalue is "00230", then map the rest
			this.data = data.features
				.filter(
					(feature) => !['00230', '02290', '01770'].includes(feature.properties.postinumeroalue)
				)
				.map((feature) => feature.properties);

			// Example statistics calculation (adjust according to actual data attributes)
			this.regionStatistics = {
				// Assuming 'someAttribute' is part of your data, replace with actual attribute names
				ra_as_kpa: {
					min: Math.min(...this.data.map((item) => Number(item.ra_as_kpa))),
					max: Math.max(...this.data.map((item) => Number(item.ra_as_kpa))),
				},
				hr_ktu: {
					min: Math.min(...this.data.map((item) => Number(item.hr_ktu))),
					max: Math.max(...this.data.map((item) => Number(item.hr_ktu))),
				},
				// Add more attributes as needed
			};

			// Filter data for Helsinki (kunta = "091")
			const helsinkiData = this.data.filter((item) => item.kunta === '091');

			// Helsinki specific statistics
			this.helsinkiStatistics = {
				ra_as_kpa: {
					min:
						helsinkiData.length > 0
							? Math.min(...helsinkiData.map((item) => Number(item.ra_as_kpa)))
							: null,
					max:
						helsinkiData.length > 0
							? Math.max(...helsinkiData.map((item) => Number(item.ra_as_kpa)))
							: null,
				},
				hr_ktu: {
					min:
						helsinkiData.length > 0
							? Math.min(...helsinkiData.map((item) => Number(item.hr_ktu)))
							: null,
					max:
						helsinkiData.length > 0
							? Math.max(...helsinkiData.map((item) => Number(item.hr_ktu)))
							: null,
				},
			};
		},

		/**
		 * Stores filtered Paavo data without calculations
		 * Simple data storage step excluding problematic postal codes.
		 *
		 * @param {Object} data - GeoJSON feature collection
		 * @returns {void}
		 */
		addDataToStore(data) {
			// Filter out rows where postinumeroalue is "00230", "02290", "01770", then map the rest
			this.data = data.features
				.filter(
					(feature) => !['00230', '02290', '01770'].includes(feature.properties.postinumeroalue)
				)
				.map((feature) => feature.properties);
		},

		/**
		 * Calculates Capital Region-wide min/max statistics
		 * Computes normalization bounds for income (ra_as_kpa) and household size (hr_ktu).
		 *
		 * @returns {void}
		 */
		addRegionStatisticsToStore() {
			// Example statistics calculation (adjust according to actual data attributes)
			this.regionStatistics = {
				// Assuming 'someAttribute' is part of your data, replace with actual attribute names
				ra_as_kpa: {
					min: Math.min(...this.data.map((item) => Number(item.ra_as_kpa))),
					max: Math.max(...this.data.map((item) => Number(item.ra_as_kpa))),
				},
				hr_ktu: {
					min: Math.min(...this.data.map((item) => Number(item.hr_ktu))),
					max: Math.max(...this.data.map((item) => Number(item.hr_ktu))),
				},
			};
		},

		/**
		 * Calculates Helsinki-specific min/max statistics
		 * Computes normalization bounds for Helsinki municipality only (kunta === '091').
		 *
		 * @returns {void}
		 */
		addHelsinkiStatisticsToStore() {
			// Filter data for Helsinki (kunta = "091")
			const helsinkiData = this.data.filter((item) => item.kunta === '091');

			// Helsinki specific statistics
			this.helsinkiStatistics = {
				ra_as_kpa: {
					min:
						helsinkiData.length > 0
							? Math.min(...helsinkiData.map((item) => Number(item.ra_as_kpa)))
							: null,
					max:
						helsinkiData.length > 0
							? Math.max(...helsinkiData.map((item) => Number(item.ra_as_kpa)))
							: null,
				},
				hr_ktu: {
					min:
						helsinkiData.length > 0
							? Math.min(...helsinkiData.map((item) => Number(item.hr_ktu)))
							: null,
					max:
						helsinkiData.length > 0
							? Math.max(...helsinkiData.map((item) => Number(item.hr_ktu)))
							: null,
				},
			};
		},

		/**
		 * Calculates and appends "Whole Region" aggregate entry
		 * Sums demographic/housing indicators and averages income/household size
		 * across all postal codes to create Capital Region total entry.
		 *
		 * Summed attributes: Population groups, unemployment, education, housing types
		 * Averaged attributes: Income per capita (ra_as_kpa), household size (hr_ktu)
		 *
		 * Result: Appends entry with postinumeroalue='99999', nimi='Whole Region'
		 *
		 * @returns {void}
		 */
		calculateRegionTotal() {
			if (!this.data || this.data.length === 0) return;

			const attributesToSum = [
				'he_0_2',
				'he_3_6',
				'he_7_12',
				'he_65_69',
				'he_70_74',
				'he_80_84',
				'he_85_',
				'he_vakiy',
				'pt_tyott',
				'ko_perus',
				'ko_ika18y',
				'te_taly',
				'te_vuok_as',
			];

			const attributesToAverage = ['ra_as_kpa', 'hr_ktu'];

			let totalSums = {};
			let totalAverages = {};
			let count = this.data.length;

			// Initialize sums
			attributesToSum.forEach((attr) => (totalSums[attr] = 0));
			attributesToAverage.forEach((attr) => (totalAverages[attr] = 0));

			// Calculate sums and prepare averages
			this.data.forEach((item) => {
				attributesToSum.forEach((attr) => {
					if (item[attr] !== undefined) {
						totalSums[attr] += Number(item[attr]) || 0;
					}
				});

				attributesToAverage.forEach((attr) => {
					if (item[attr] !== undefined) {
						totalAverages[attr] += Number(item[attr]) || 0;
					}
				});
			});

			// Compute averages
			attributesToAverage.forEach((attr) => {
				totalAverages[attr] = count > 0 ? totalAverages[attr] / count : 0;
			});

			// Create the new "whole region" object
			const wholeRegionEntry = {
				nimi: 'Whole Region',
				postinumeroalue: '99999',
				...totalSums,
				...totalAverages,
			};

			// Append the new entry to the dataset
			this.data.push(wholeRegionEntry);
		},
	},
});
