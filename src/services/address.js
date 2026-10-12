/**
 * Finds building's address based on its properties
 *
 * @param {Object} properties - Building properties
 * @returns {string} The building's address, or 'n/a' if not found
 */
export const findAddressForBuilding = (properties) => {
	let address = ''

	// Fetch address components, trying both prefixed and non-prefixed versions
	const katunimi_suomi = getProperty(properties, 'katunimi_suomi')
	const osoitenumero = getProperty(properties, 'osoitenumero')
	const katu = getProperty(properties, 'katu')
	const osno1 = getProperty(properties, 'osno1')
	const oski1 = getProperty(properties, 'oski1')
	const osno2 = getProperty(properties, 'osno2')

	if (isValidValue(katunimi_suomi)) {
		address += String(katunimi_suomi).trim()
		if (isValidValue(osoitenumero)) {
			address += ` ${String(osoitenumero).trim()}`
		}
	} else if (isValidValue(katu)) {
		address += String(katu).trim()
		if (isValidValue(osno1) && !isMissingSentinel(osno1)) {
			address += ` ${String(osno1).trim()}`
			if (isValidValue(oski1) && !isMissingSentinel(oski1)) {
				address += ` ${String(oski1).trim()}`
				if (isValidValue(osno2) && !isMissingSentinel(osno2)) {
					address += ` ${String(osno2).trim()}`
				}
			}
		}
	} else {
		address = 'n/a'
	}

	return removeNulls(address) // Ensure to remove any null or undefined values
}

/**
 * Removes all instances of 'null' from a string and handles whitespace
 *
 * @param {string} str - The input string
 * @returns {string} - The string with all 'null' occurrences removed and proper trimming
 */
const removeNulls = (str) => {
	// Convert to string to handle non-string values
	const stringValue = String(str)
	// Replace all 'null' strings but preserve existing spacing, then trim edges
	return stringValue.replace(/null/g, '').replace(/^\s+|\s+$/g, '')
}

/**
 * HSY building register value for a missing house number or letter
 * @private
 */
const MISSING_VALUE_SENTINEL = 999999999

/**
 * Checks for the HSY missing-value sentinel, as a number or a numeric string
 *
 * @param {*} value - Value to check
 * @returns {boolean} True if the value is the sentinel
 * @private
 */
const isMissingSentinel = (value) => Number(value) === MISSING_VALUE_SENTINEL

/**
 * Unwraps a Cesium property (e.g. ConstantProperty) to its plain value
 *
 * @param {*} value - Plain value or Cesium property
 * @returns {*} The plain value
 * @private
 */
const unwrap = (value) => (typeof value?.getValue === 'function' ? value.getValue() : value)

/**
 * Retrieves property value from building properties object
 * Checks for both non-prefixed and underscore-prefixed property names.
 * Prefers non-prefixed version if both exist.
 * Accepts plain GeoJSON properties or a Cesium PropertyBag (entity.properties),
 * whose values are ConstantProperty wrappers.
 *
 * @param {Object} properties - Building properties object or Cesium PropertyBag
 * @param {string} key - Property key to look up
 * @returns {*} Property value, or undefined if not found
 * @private
 */
const getProperty = (properties, key) => {
	return unwrap(properties[key]) ?? unwrap(properties[`_${key}`])
}

/**
 * Validates if a value is suitable for address construction
 * Accepts all values except null, undefined, and empty strings.
 * Explicitly allows boolean false and numeric zero.
 *
 * @param {*} value - Value to validate
 * @returns {boolean} True if value is valid for address building
 * @private
 */
const isValidValue = (value) => {
	// Include boolean false, but exclude null, undefined, and empty strings
	return value !== null && value !== undefined && value !== ''
}
