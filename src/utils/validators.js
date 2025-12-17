/**
 * @module utils/validators
 * Input validation utilities for security hardening
 *
 * Provides validation functions to prevent injection attacks and data corruption.
 * All validators throw descriptive errors on invalid input for easy error handling.
 *
 * @see {@link https://owasp.org/www-project-web-security-testing-guide/|OWASP Security Testing Guide}
 */

/**
 * Validates Finnish postal code format
 * Finnish postal codes are exactly 5 digits (00000-99999)
 *
 * Security: Prevents CQL injection in WFS requests by ensuring only valid postal codes
 * are used in query strings. Postal codes are used in CQL_FILTER expressions and must
 * be strictly validated before interpolation.
 *
 * @param {string|number} code - Postal code to validate
 * @returns {string} Validated postal code as string
 * @throws {TypeError} If code is not a string or number
 * @throws {Error} If postal code format is invalid
 *
 * @example
 * validatePostalCode('00100') // Returns: '00100'
 * validatePostalCode(100) // Returns: '00100'
 * validatePostalCode('00100 OR 1=1') // Throws: Error
 * validatePostalCode('ABC123') // Throws: Error
 */
export function validatePostalCode(code) {
	// Type check
	if (typeof code !== 'string' && typeof code !== 'number') {
		throw new TypeError(`Postal code must be string or number, got ${typeof code}`)
	}

	// Convert to string and pad if number
	let postalCode = String(code)

	// If numeric input, pad with leading zeros
	if (typeof code === 'number' || /^\d+$/.test(postalCode)) {
		postalCode = postalCode.padStart(5, '0')
	}

	// Finnish postal codes: exactly 5 digits
	if (!/^\d{5}$/.test(postalCode)) {
		throw new Error(
			`Invalid postal code format: "${code}". Finnish postal codes must be exactly 5 digits (00000-99999)`
		)
	}

	return postalCode
}

/**
 * Validates JSON string before parsing to prevent prototype pollution
 *
 * Security: Prevents prototype pollution attacks via JSON.parse by:
 * 1. Limiting size to prevent DoS attacks
 * 2. Validating parsed result is a plain object
 * 3. Checking for dangerous property names (__proto__, constructor, prototype)
 *
 * @param {string} jsonString - JSON string to validate and parse
 * @param {Object} [options] - Validation options
 * @param {number} [options.maxSize=100000] - Maximum allowed string length (default 100KB)
 * @returns {Object} Parsed and validated JSON object
 * @throws {TypeError} If jsonString is not a string
 * @throws {Error} If JSON is too large, invalid format, or contains dangerous keys
 *
 * @example
 * validateJSON('{"foo": "bar"}') // Returns: {foo: 'bar'}
 * validateJSON('{"__proto__": {"isAdmin": true}}') // Throws: Error
 * validateJSON('[1, 2, 3]') // Throws: Error (arrays not allowed)
 * validateJSON('invalid') // Throws: Error (invalid JSON)
 */
export function validateJSON(jsonString, options = {}) {
	const { maxSize = 100000 } = options

	// Type check
	if (typeof jsonString !== 'string') {
		throw new TypeError(`JSON input must be string, got ${typeof jsonString}`)
	}

	// Size validation (prevent DoS)
	if (jsonString.length > maxSize) {
		throw new Error(`JSON string too large: ${jsonString.length} characters (max ${maxSize})`)
	}

	// Parse JSON
	let parsed
	try {
		parsed = JSON.parse(jsonString)
	} catch (error) {
		throw new Error(`Invalid JSON format: ${error.message}`)
	}

	// Type validation - must be plain object
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		throw new Error(
			`JSON must be an object, got ${Array.isArray(parsed) ? 'array' : typeof parsed}`
		)
	}

	// Prototype pollution prevention
	const dangerousKeys = ['__proto__', 'constructor', 'prototype']
	for (const key of dangerousKeys) {
		if (Object.hasOwn(parsed, key)) {
			throw new Error(
				`Invalid configuration: detected dangerous key "${key}". This may be a prototype pollution attempt.`
			)
		}
	}

	// Deep check for nested dangerous keys
	if (hasDangerousKeys(parsed, dangerousKeys)) {
		throw new Error(
			'Invalid configuration: detected dangerous keys in nested objects. This may be a prototype pollution attempt.'
		)
	}

	return parsed
}

/**
 * Recursively checks object for dangerous keys
 * Helper function for validateJSON to detect nested prototype pollution attempts
 *
 * @param {Object} obj - Object to check
 * @param {string[]} dangerousKeys - List of dangerous key names
 * @returns {boolean} True if dangerous keys found in nested objects
 * @private
 */
function hasDangerousKeys(obj, dangerousKeys) {
	for (const key in obj) {
		if (Object.hasOwn(obj, key)) {
			const value = obj[key]

			// Check if value is a plain object
			if (value && typeof value === 'object' && !Array.isArray(value)) {
				// Check for dangerous keys in nested object
				for (const dangerousKey of dangerousKeys) {
					if (Object.hasOwn(value, dangerousKey)) {
						return true
					}
				}

				// Recursively check nested objects
				if (hasDangerousKeys(value, dangerousKeys)) {
					return true
				}
			}
		}
	}
	return false
}

/**
 * Validates and encodes URL parameter value
 *
 * Ensures parameter is properly encoded for use in URL query strings.
 * Uses encodeURIComponent for proper encoding of special characters.
 *
 * @param {string|number} value - Parameter value to encode
 * @returns {string} URL-encoded parameter value
 * @throws {TypeError} If value is not string or number
 *
 * @example
 * encodeURLParam('hello world') // Returns: 'hello%20world'
 * encodeURLParam('foo&bar=baz') // Returns: 'foo%26bar%3Dbaz'
 * encodeURLParam(12345) // Returns: '12345'
 */
export function encodeURLParam(value) {
	if (typeof value !== 'string' && typeof value !== 'number') {
		throw new TypeError(`URL parameter must be string or number, got ${typeof value}`)
	}
	return encodeURIComponent(String(value))
}
