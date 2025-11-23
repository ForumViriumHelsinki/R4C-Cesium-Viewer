/**
 * Available NDVI (Normalized Difference Vegetation Index) dates
 * These are specific satellite capture dates when NDVI data is available.
 * The dates are typically from summer months when vegetation is most visible.
 *
 * Note: These dates are fixed based on available satellite imagery.
 * When new NDVI data becomes available, add the new date to this array.
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
];

/**
 * Default NDVI date to use when none is selected
 */
export const DEFAULT_NDVI_DATE = '2022-06-26';

/**
 * Get the most recent N NDVI dates for preloading
 * @param {number} count - Number of dates to return
 * @returns {string[]} Array of date strings
 */
export function getRecentNDVIDates(count = 4) {
	// Return the most recent dates (array is in chronological order)
	return AVAILABLE_NDVI_DATES.slice(-count).reverse();
}
