/**
 * Entity Helper Utilities
 *
 * Provides validation functions for Cesium entity objects to prevent
 * null/undefined property access errors that occur when entities are:
 * - Not yet loaded (async timing)
 * - Already removed from datasource
 * - Missing expected properties
 *
 * @module utils/entityHelpers
 */

/**
 * Checks if an entity is a valid, non-destroyed Cesium entity
 *
 * @param {Object|null|undefined} entity - Entity to validate
 * @returns {boolean} True if entity is valid and not destroyed
 */
export function isValidEntity(entity) {
	if (entity == null || typeof entity !== 'object') {
		return false
	}

	// Check if entity has been destroyed (Cesium entities have this method)
	if (typeof entity.isDestroyed === 'function' && entity.isDestroyed()) {
		return false
	}

	return true
}

/**
 * Checks if an entity has valid _properties or properties object
 *
 * @param {Object|null|undefined} entity - Entity to check
 * @returns {boolean} True if entity has properties
 */
export function hasProperties(entity) {
	if (!isValidEntity(entity)) {
		return false
	}

	return Boolean(entity._properties || entity.properties)
}

/**
 * Checks if an entity has a valid _polygon or polygon object
 *
 * @param {Object|null|undefined} entity - Entity to check
 * @returns {boolean} True if entity has polygon
 */
export function hasPolygon(entity) {
	if (!isValidEntity(entity)) {
		return false
	}

	return Boolean(entity._polygon || entity.polygon)
}

/**
 * Checks if an entity is a valid building entity with required properties
 * Building entities need both polygon (for visualization) and properties (for data)
 *
 * @param {Object|null|undefined} entity - Entity to validate
 * @returns {boolean} True if entity is a valid building entity
 */
export function isValidBuildingEntity(entity) {
	return isValidEntity(entity) && hasPolygon(entity) && hasProperties(entity)
}

/**
 * Safely gets a property value from an entity's properties
 * Handles both _properties and properties formats, and the _value wrapper
 *
 * @param {Object|null|undefined} entity - Entity to get property from
 * @param {string} propertyName - Name of the property to retrieve
 * @returns {*} Property value or undefined if not found
 */
export function getPropertyValue(entity, propertyName) {
	if (!hasProperties(entity)) {
		return undefined
	}

	const props = entity._properties || entity.properties
	const prop = props[propertyName]

	if (prop == null) {
		return undefined
	}

	// Cesium properties often have a _value wrapper
	return prop._value
}
