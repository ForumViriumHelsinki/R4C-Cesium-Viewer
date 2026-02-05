/**
 * Postal Code Index Service
 *
 * Provides O(1) lookup for postal code entities by postal code value.
 * Replaces O(n) linear searches in postalCodeLoader.js, camera.js, and PrintBox.vue.
 *
 * Usage:
 * 1. Call buildIndex(entities) when PostCodes data source loads
 * 2. Use getByPostalCode(postalCode) for instant entity lookup
 *
 * @module services/postalCodeIndex
 */

import logger from '../utils/logger.js'

/**
 * PostalCodeIndex Class
 * Maintains a Map index of postal code entities for O(1) lookups.
 */
class PostalCodeIndex {
	constructor() {
		/** @type {Map<string, Object>} Map of postal code to entity */
		this.byPostalCode = new Map()
	}

	/**
	 * Builds the index from an array of postal code entities.
	 * Call this when PostCodes data source is loaded.
	 *
	 * @param {Array<Object>} entities - Array of Cesium entities with _properties._posno
	 */
	buildIndex(entities) {
		this.byPostalCode.clear()

		for (const entity of entities) {
			const posno = entity._properties?._posno?._value
			if (posno) {
				this.byPostalCode.set(posno, entity)
			}
		}

		logger.debug(`[PostalCodeIndex] Indexed ${this.byPostalCode.size} postal codes`)
	}

	/**
	 * Gets an entity by postal code (O(1) lookup).
	 *
	 * @param {string} postalCode - Postal code to find
	 * @returns {Object|undefined} Cesium entity or undefined if not found
	 */
	getByPostalCode(postalCode) {
		return this.byPostalCode.get(postalCode)
	}

	/**
	 * Checks if a postal code exists in the index.
	 *
	 * @param {string} postalCode - Postal code to check
	 * @returns {boolean} True if postal code exists
	 */
	hasPostalCode(postalCode) {
		return this.byPostalCode.has(postalCode)
	}

	/**
	 * Gets the number of indexed postal codes.
	 *
	 * @returns {number} Count of postal codes in index
	 */
	get size() {
		return this.byPostalCode.size
	}

	/**
	 * Clears the index.
	 * Call this when postal codes data source is unloaded.
	 */
	clear() {
		this.byPostalCode.clear()
	}
}

/** Singleton instance for global access */
export const postalCodeIndex = new PostalCodeIndex()

export default postalCodeIndex
