/**
 * Entity Styling Utility
 *
 * Provides shared styling calculations for Cesium entities (buildings, trees, etc.).
 * Consolidates duplicated height calculation and extrusion logic.
 *
 * Usage:
 *   import { calculateBuildingHeight, FLOOR_HEIGHT } from '@/utils/entityStyling.js';
 *
 *   entity.polygon.extrudedHeight = calculateBuildingHeight(entity.properties);
 *
 * @module utils/entityStyling
 */

/**
 * Default height for buildings when no height data is available.
 * Represents approximately one floor/story height.
 * @type {number}
 */
export const DEFAULT_BUILDING_HEIGHT = 2.7

/**
 * Average height per floor in meters.
 * Used to estimate building height from floor count.
 * @type {number}
 */
export const FLOOR_HEIGHT = 3.2

/**
 * Calculates building height from entity properties.
 *
 * Priority order:
 * 1. measured_height - Direct measurement from source data (most accurate)
 * 2. Floor count (i_kerrlkm) * FLOOR_HEIGHT - Estimated from number of floors
 * 3. DEFAULT_BUILDING_HEIGHT - Fallback when no data available
 *
 * @param {Object} [properties] - Entity properties object from Cesium entity.
 * @param {Object} [properties.measured_height] - Measured height property.
 * @param {number} [properties.measured_height._value] - Height value in meters.
 * @param {Object} [properties.i_kerrlkm] - Floor count property (Finnish: kerrosluku).
 * @param {number} [properties.i_kerrlkm._value] - Number of floors.
 * @returns {number} Building height in meters.
 *
 * @example
 * // With measured height
 * const height = calculateBuildingHeight({ measured_height: { _value: 25.5 } });
 * // Returns: 25.5
 *
 * @example
 * // With floor count
 * const height = calculateBuildingHeight({ i_kerrlkm: { _value: 5 } });
 * // Returns: 16.0 (5 * 3.2)
 *
 * @example
 * // No data available
 * const height = calculateBuildingHeight({});
 * // Returns: 2.7 (DEFAULT_BUILDING_HEIGHT)
 */
export function calculateBuildingHeight(properties) {
	if (!properties) {
		return DEFAULT_BUILDING_HEIGHT
	}

	// Priority 1: Direct measured height
	const measuredHeight = properties.measured_height?._value
	if (measuredHeight != null) {
		return measuredHeight
	}

	// Priority 2: Estimate from floor count
	const floorCount = properties.i_kerrlkm?._value
	if (floorCount != null && floorCount > 0) {
		return floorCount * FLOOR_HEIGHT
	}

	// Fallback: Default height
	return DEFAULT_BUILDING_HEIGHT
}

export default { calculateBuildingHeight, DEFAULT_BUILDING_HEIGHT, FLOOR_HEIGHT }
