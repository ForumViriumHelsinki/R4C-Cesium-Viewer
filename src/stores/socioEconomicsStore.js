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

import { defineStore } from 'pinia'
import logger from '../utils/logger.js'

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
			return state.data.find((item) => item.postinumeroalue === postcode)
		},
		/**
		 * Retrieves socioeconomic data by area name
		 * @param {Object} state - Pinia state
		 * @returns {(nimi: string) => Object|undefined} Function accepting area name and returning Paavo data
		 * @example
		 * const data = getDataByNimi('Alppila - Vallila');
		 */
		getDataByNimi: (state) => (nimi) => {
			return state.data.find((item) => item.nimi === nimi)
		},
		/**
		 * Gets sorted list of all area names in Capital Region
		 * @param {Object} state - Pinia state
		 * @returns {() => Array<string>} Function returning sorted array of area names
		 */
		getNimiForCapital: (state) => () => {
			return state.data.map((item) => item.nimi).sort()
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
				.sort()
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
				const response = await fetch('/paavo')
				if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
				const data = await response.json() // Parse as JSON

				this.addDataToStore(data)
				this.addRegionStatisticsToStore()
				this.addHelsinkiStatisticsToStore()
				this.calculateRegionTotal()
			} catch (error) {
				logger.error('Error fetching Paavo data:', error)
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
				const response = await fetch(requestUrl)
				if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
				const data = await response.json()
				if (!data || !data.features) throw new Error('Invalid data structure')
				return data
			} catch (error) {
				logger.error('Error fetching socio-economic data:', error)
				throw error // Rethrow to handle it in the calling function
			}
		},

		/**
		 * Processes and stores Paavo data with statistical calculations
		 * Filters excluded postal codes, calculates min/max for both Capital Region
		 * and Helsinki-only subsets for income and household size indicators.
		 * Uses single-pass algorithm for O(n) performance.
		 *
		 * Excluded postal codes: 00230, 02290, 01770
		 *
		 * @param {Object} data - GeoJSON feature collection from Paavo API
		 * @returns {void}
		 */
		addPaavoDataToStore(data) {
			const excludedPostalCodes = ['00230', '02290', '01770']

			// Filter out excluded postal codes and map to properties
			this.data = data.features
				.filter((feature) => !excludedPostalCodes.includes(feature.properties.postinumeroalue))
				.map((feature) => feature.properties)

			// Single-pass calculation of both region and Helsinki statistics
			const stats = this.data.reduce(
				(acc, item) => {
					const raAsKpa = Number(item.ra_as_kpa)
					const hrKtu = Number(item.hr_ktu)
					const isHelsinki = item.kunta === '091'

					// Region-wide stats
					acc.ra_as_kpa_min = Math.min(acc.ra_as_kpa_min, raAsKpa)
					acc.ra_as_kpa_max = Math.max(acc.ra_as_kpa_max, raAsKpa)
					acc.hr_ktu_min = Math.min(acc.hr_ktu_min, hrKtu)
					acc.hr_ktu_max = Math.max(acc.hr_ktu_max, hrKtu)

					// Helsinki-specific stats
					if (isHelsinki) {
						acc.helsinki_count++
						acc.helsinki_ra_as_kpa_min = Math.min(acc.helsinki_ra_as_kpa_min, raAsKpa)
						acc.helsinki_ra_as_kpa_max = Math.max(acc.helsinki_ra_as_kpa_max, raAsKpa)
						acc.helsinki_hr_ktu_min = Math.min(acc.helsinki_hr_ktu_min, hrKtu)
						acc.helsinki_hr_ktu_max = Math.max(acc.helsinki_hr_ktu_max, hrKtu)
					}

					return acc
				},
				{
					ra_as_kpa_min: Infinity,
					ra_as_kpa_max: -Infinity,
					hr_ktu_min: Infinity,
					hr_ktu_max: -Infinity,
					helsinki_count: 0,
					helsinki_ra_as_kpa_min: Infinity,
					helsinki_ra_as_kpa_max: -Infinity,
					helsinki_hr_ktu_min: Infinity,
					helsinki_hr_ktu_max: -Infinity,
				}
			)

			this.regionStatistics = {
				ra_as_kpa: {
					min: stats.ra_as_kpa_min,
					max: stats.ra_as_kpa_max,
				},
				hr_ktu: {
					min: stats.hr_ktu_min,
					max: stats.hr_ktu_max,
				},
			}

			this.helsinkiStatistics = {
				ra_as_kpa: {
					min: stats.helsinki_count > 0 ? stats.helsinki_ra_as_kpa_min : null,
					max: stats.helsinki_count > 0 ? stats.helsinki_ra_as_kpa_max : null,
				},
				hr_ktu: {
					min: stats.helsinki_count > 0 ? stats.helsinki_hr_ktu_min : null,
					max: stats.helsinki_count > 0 ? stats.helsinki_hr_ktu_max : null,
				},
			}
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
				.map((feature) => feature.properties)
		},

		/**
		 * Calculates Capital Region-wide min/max statistics
		 * Computes normalization bounds for income (ra_as_kpa) and household size (hr_ktu).
		 * Uses single-pass algorithm for O(n) performance instead of O(4n) with map+spread.
		 *
		 * @returns {void}
		 */
		addRegionStatisticsToStore() {
			// Single-pass min/max calculation for all attributes
			const stats = this.data.reduce(
				(acc, item) => {
					const raAsKpa = Number(item.ra_as_kpa)
					const hrKtu = Number(item.hr_ktu)

					return {
						ra_as_kpa_min: Math.min(acc.ra_as_kpa_min, raAsKpa),
						ra_as_kpa_max: Math.max(acc.ra_as_kpa_max, raAsKpa),
						hr_ktu_min: Math.min(acc.hr_ktu_min, hrKtu),
						hr_ktu_max: Math.max(acc.hr_ktu_max, hrKtu),
					}
				},
				{
					ra_as_kpa_min: Infinity,
					ra_as_kpa_max: -Infinity,
					hr_ktu_min: Infinity,
					hr_ktu_max: -Infinity,
				}
			)

			this.regionStatistics = {
				ra_as_kpa: {
					min: stats.ra_as_kpa_min,
					max: stats.ra_as_kpa_max,
				},
				hr_ktu: {
					min: stats.hr_ktu_min,
					max: stats.hr_ktu_max,
				},
			}
		},

		/**
		 * Calculates Helsinki-specific min/max statistics
		 * Computes normalization bounds for Helsinki municipality only (kunta === '091').
		 * Uses single-pass algorithm combining filter and min/max for O(n) performance.
		 *
		 * @returns {void}
		 */
		addHelsinkiStatisticsToStore() {
			// Single-pass: filter Helsinki data and calculate min/max simultaneously
			const stats = this.data.reduce(
				(acc, item) => {
					// Skip non-Helsinki items
					if (item.kunta !== '091') return acc

					const raAsKpa = Number(item.ra_as_kpa)
					const hrKtu = Number(item.hr_ktu)

					return {
						count: acc.count + 1,
						ra_as_kpa_min: Math.min(acc.ra_as_kpa_min, raAsKpa),
						ra_as_kpa_max: Math.max(acc.ra_as_kpa_max, raAsKpa),
						hr_ktu_min: Math.min(acc.hr_ktu_min, hrKtu),
						hr_ktu_max: Math.max(acc.hr_ktu_max, hrKtu),
					}
				},
				{
					count: 0,
					ra_as_kpa_min: Infinity,
					ra_as_kpa_max: -Infinity,
					hr_ktu_min: Infinity,
					hr_ktu_max: -Infinity,
				}
			)

			// Helsinki specific statistics
			this.helsinkiStatistics = {
				ra_as_kpa: {
					min: stats.count > 0 ? stats.ra_as_kpa_min : null,
					max: stats.count > 0 ? stats.ra_as_kpa_max : null,
				},
				hr_ktu: {
					min: stats.count > 0 ? stats.hr_ktu_min : null,
					max: stats.count > 0 ? stats.hr_ktu_max : null,
				},
			}
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
			if (!this.data || this.data.length === 0) return

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
			]

			const attributesToAverage = ['ra_as_kpa', 'hr_ktu']

			const totalSums = {}
			const totalAverages = {}
			const count = this.data.length

			// Initialize sums
			attributesToSum.forEach((attr) => (totalSums[attr] = 0))
			attributesToAverage.forEach((attr) => (totalAverages[attr] = 0))

			// Calculate sums and prepare averages
			this.data.forEach((item) => {
				attributesToSum.forEach((attr) => {
					if (item[attr] !== undefined) {
						totalSums[attr] += Number(item[attr]) || 0
					}
				})

				attributesToAverage.forEach((attr) => {
					if (item[attr] !== undefined) {
						totalAverages[attr] += Number(item[attr]) || 0
					}
				})
			})

			// Compute averages
			attributesToAverage.forEach((attr) => {
				totalAverages[attr] = count > 0 ? totalAverages[attr] / count : 0
			})

			// Create the new "whole region" object
			const wholeRegionEntry = {
				nimi: 'Whole Region',
				postinumeroalue: '99999',
				...totalSums,
				...totalAverages,
			}

			// Append the new entry to the dataset
			this.data.push(wholeRegionEntry)
		},
	},
})
