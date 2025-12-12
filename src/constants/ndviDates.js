/**
 * @module constants/ndviDates
 * @description NDVI (Normalized Difference Vegetation Index) date configuration
 * Defines available satellite capture dates and utilities for NDVI vegetation data.
 * NDVI data comes from satellite imagery captured during summer months when
 * vegetation is most visible and measurable.
 */

/**
 * Available NDVI (Normalized Difference Vegetation Index) dates
 * These are specific satellite capture dates when NDVI data is available.
 * The dates are typically from summer months when vegetation is most visible.
 *
 * NDVI measures vegetation health and density using satellite imagery reflectance.
 * Values range from -1 to +1, where higher values indicate healthier, denser vegetation.
 *
 * Data source: Landsat or Sentinel satellite imagery
 * Update frequency: New dates added as satellite data becomes available
 *
 * @type {string[]}
 * @constant
 *
 * @example
 * import { AVAILABLE_NDVI_DATES } from './constants/ndviDates.js';
 * console.log(AVAILABLE_NDVI_DATES); // ['2017-06-04', '2018-06-17', ...]
 */
export const AVAILABLE_NDVI_DATES = [
	'2017-06-04',
	'2018-06-17',
	'2019-07-27',
	'2020-06-26',
	'2021-06-18',
	'2022-06-26',
	'2023-06-23',
	'2024-06-27',
	'2025-06-20',
]

/**
 * Default NDVI date to use when none is selected
 * Set to a mid-range date with known good data quality.
 *
 * @type {string}
 * @constant
 *
 * @example
 * import { DEFAULT_NDVI_DATE } from './constants/ndviDates.js';
 * const selectedDate = userSelection || DEFAULT_NDVI_DATE;
 */
export const DEFAULT_NDVI_DATE = '2022-06-26'

/**
 * Get the most recent N NDVI dates for preloading
 * Returns dates in reverse chronological order (most recent first).
 * Useful for preloading recent vegetation data before user selection.
 *
 * @param {number} [count=4] - Number of recent dates to return
 * @returns {string[]} Array of ISO date strings in reverse chronological order
 *
 * @example
 * import { getRecentNDVIDates } from './constants/ndviDates.js';
 *
 * // Get 4 most recent dates (default)
 * const recent = getRecentNDVIDates();
 * // Returns: ['2025-06-20', '2024-06-27', '2023-06-23', '2022-06-26']
 *
 * @example
 * // Get 2 most recent dates
 * const twoRecent = getRecentNDVIDates(2);
 * // Returns: ['2025-06-20', '2024-06-27']
 */
export function getRecentNDVIDates(count = 4) {
	// Return the most recent dates (array is in chronological order)
	return AVAILABLE_NDVI_DATES.slice(-count).reverse()
}
