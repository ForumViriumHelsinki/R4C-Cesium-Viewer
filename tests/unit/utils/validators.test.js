import { describe, it, expect } from 'vitest'
import { validatePostalCode, validateJSON, encodeURLParam } from '@/utils/validators'

describe('validators', () => {
	describe('validatePostalCode', () => {
		it('should validate correct Finnish postal codes', () => {
			expect(validatePostalCode('00100')).toBe('00100')
			expect(validatePostalCode('00150')).toBe('00150')
			expect(validatePostalCode('99999')).toBe('99999')
		})

		it('should pad numeric postal codes with leading zeros', () => {
			expect(validatePostalCode(100)).toBe('00100')
			expect(validatePostalCode(150)).toBe('00150')
			expect(validatePostalCode('100')).toBe('00100')
			expect(validatePostalCode('150')).toBe('00150')
		})

		it('should reject invalid postal code formats', () => {
			// Too short
			expect(() => validatePostalCode('100')).toThrow(/Invalid postal code format/)
			expect(() => validatePostalCode('99')).toThrow(/Invalid postal code format/)

			// Too long
			expect(() => validatePostalCode('001000')).toThrow(/Invalid postal code format/)

			// Non-numeric
			expect(() => validatePostalCode('ABC12')).toThrow(/Invalid postal code format/)
			expect(() => validatePostalCode('0010A')).toThrow(/Invalid postal code format/)
		})

		it('should prevent CQL injection attempts', () => {
			// SQL-like injection patterns
			expect(() => validatePostalCode("00100' OR '1'='1")).toThrow(/Invalid postal code format/)
			expect(() => validatePostalCode("00100'; DROP TABLE--")).toThrow(/Invalid postal code format/)
			expect(() => validatePostalCode('00100 OR 1=1')).toThrow(/Invalid postal code format/)

			// Special characters
			expect(() => validatePostalCode('00100;')).toThrow(/Invalid postal code format/)
			expect(() => validatePostalCode("00100'")).toThrow(/Invalid postal code format/)
			expect(() => validatePostalCode('00100%')).toThrow(/Invalid postal code format/)
		})

		it('should reject invalid input types', () => {
			expect(() => validatePostalCode(null)).toThrow(TypeError)
			expect(() => validatePostalCode(undefined)).toThrow(TypeError)
			expect(() => validatePostalCode({})).toThrow(TypeError)
			expect(() => validatePostalCode([])).toThrow(TypeError)
		})
	})

	describe('validateJSON', () => {
		it('should validate and parse correct JSON objects', () => {
			const result = validateJSON('{"foo": "bar"}')
			expect(result).toEqual({ foo: 'bar' })

			const complex = validateJSON('{"a": 1, "b": {"c": 2}}')
			expect(complex).toEqual({ a: 1, b: { c: 2 } })
		})

		it('should reject prototype pollution attempts', () => {
			// Top-level __proto__
			expect(() => validateJSON('{"__proto__": {"isAdmin": true}}')).toThrow(
				/dangerous key "__proto__"/
			)

			// Constructor
			expect(() => validateJSON('{"constructor": {"prototype": {"isAdmin": true}}}')).toThrow(
				/dangerous key "constructor"/
			)

			// Prototype
			expect(() => validateJSON('{"prototype": {"isAdmin": true}}')).toThrow(
				/dangerous key "prototype"/
			)
		})

		it('should detect nested prototype pollution attempts', () => {
			// Nested __proto__
			expect(() =>
				validateJSON('{"settings": {"__proto__": {"isAdmin": true}}}')
			).toThrow(/dangerous keys in nested objects/)

			// Deeply nested
			expect(() =>
				validateJSON('{"a": {"b": {"__proto__": {"isAdmin": true}}}}')
			).toThrow(/dangerous keys in nested objects/)
		})

		it('should reject non-object JSON', () => {
			// Arrays
			expect(() => validateJSON('[1, 2, 3]')).toThrow(/must be an object, got array/)
			expect(() => validateJSON('[]')).toThrow(/must be an object, got array/)

			// Primitives
			expect(() => validateJSON('null')).toThrow(/must be an object/)
			expect(() => validateJSON('123')).toThrow(/must be an object/)
			expect(() => validateJSON('"string"')).toThrow(/must be an object/)
			expect(() => validateJSON('true')).toThrow(/must be an object/)
		})

		it('should reject invalid JSON syntax', () => {
			expect(() => validateJSON('invalid')).toThrow(/Invalid JSON format/)
			expect(() => validateJSON('{foo: bar}')).toThrow(/Invalid JSON format/)
			expect(() => validateJSON('{"foo": bar}')).toThrow(/Invalid JSON format/)
		})

		it('should enforce size limits to prevent DoS', () => {
			// Large string
			const largeString = '{"data": "' + 'a'.repeat(100000) + '"}'
			expect(() => validateJSON(largeString)).toThrow(/JSON string too large/)

			// Custom size limit
			expect(() => validateJSON('{"foo": "bar"}', { maxSize: 5 })).toThrow(
				/JSON string too large/
			)
		})

		it('should accept valid JSON within size limits', () => {
			const validJSON = '{"a": 1, "b": 2, "c": {"d": 3}}'
			const result = validateJSON(validJSON)
			expect(result).toEqual({ a: 1, b: 2, c: { d: 3 } })

			// With explicit size limit
			const result2 = validateJSON(validJSON, { maxSize: 1000 })
			expect(result2).toEqual({ a: 1, b: 2, c: { d: 3 } })
		})

		it('should reject invalid input types', () => {
			expect(() => validateJSON(123)).toThrow(TypeError)
			expect(() => validateJSON(null)).toThrow(TypeError)
			expect(() => validateJSON(undefined)).toThrow(TypeError)
			expect(() => validateJSON({})).toThrow(TypeError)
		})

		it('should handle boolean values correctly', () => {
			const result = validateJSON('{"enabled": true, "disabled": false}')
			expect(result).toEqual({ enabled: true, disabled: false })
		})

		it('should handle number values correctly', () => {
			const result = validateJSON('{"count": 42, "price": 9.99}')
			expect(result).toEqual({ count: 42, price: 9.99 })
		})
	})

	describe('encodeURLParam', () => {
		it('should encode string parameters correctly', () => {
			expect(encodeURLParam('hello world')).toBe('hello%20world')
			expect(encodeURLParam('foo&bar=baz')).toBe('foo%26bar%3Dbaz')
			expect(encodeURLParam('test@example.com')).toBe('test%40example.com')
		})

		it('should handle numeric parameters', () => {
			expect(encodeURLParam(12345)).toBe('12345')
			expect(encodeURLParam(0)).toBe('0')
			expect(encodeURLParam(9.99)).toBe('9.99')
		})

		it('should encode special characters', () => {
			expect(encodeURLParam('foo/bar')).toBe('foo%2Fbar')
			expect(encodeURLParam('foo?bar')).toBe('foo%3Fbar')
			expect(encodeURLParam('foo#bar')).toBe('foo%23bar')
		})

		it('should handle Finnish postal codes', () => {
			expect(encodeURLParam('00100')).toBe('00100')
			expect(encodeURLParam('99999')).toBe('99999')
		})

		it('should reject invalid input types', () => {
			expect(() => encodeURLParam(null)).toThrow(TypeError)
			expect(() => encodeURLParam(undefined)).toThrow(TypeError)
			expect(() => encodeURLParam({})).toThrow(TypeError)
			expect(() => encodeURLParam([])).toThrow(TypeError)
		})

		it('should encode empty strings', () => {
			expect(encodeURLParam('')).toBe('')
		})
	})
})
