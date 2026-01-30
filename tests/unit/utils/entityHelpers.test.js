import { describe, expect, it } from 'vitest'
import {
	getPropertyValue,
	hasPolygon,
	hasProperties,
	isValidBuildingEntity,
	isValidEntity,
} from '@/utils/entityHelpers'

describe('entityHelpers', () => {
	describe('isValidEntity', () => {
		it('should return true for valid entity objects', () => {
			const entity = { id: '123', show: true }
			expect(isValidEntity(entity)).toBe(true)
		})

		it('should return false for null', () => {
			expect(isValidEntity(null)).toBe(false)
		})

		it('should return false for undefined', () => {
			expect(isValidEntity(undefined)).toBe(false)
		})

		it('should return false for non-objects', () => {
			expect(isValidEntity('string')).toBe(false)
			expect(isValidEntity(123)).toBe(false)
			expect(isValidEntity(true)).toBe(false)
		})

		it('should return false for destroyed entities', () => {
			const entity = { id: '123', isDestroyed: () => true }
			expect(isValidEntity(entity)).toBe(false)
		})

		it('should return true for entities with isDestroyed returning false', () => {
			const entity = { id: '123', isDestroyed: () => false }
			expect(isValidEntity(entity)).toBe(true)
		})
	})

	describe('hasProperties', () => {
		it('should return true for entity with _properties', () => {
			const entity = { _properties: { foo: 'bar' } }
			expect(hasProperties(entity)).toBe(true)
		})

		it('should return false for entity without _properties', () => {
			const entity = { id: '123' }
			expect(hasProperties(entity)).toBe(false)
		})

		it('should return false for null entity', () => {
			expect(hasProperties(null)).toBe(false)
		})

		it('should return false for undefined entity', () => {
			expect(hasProperties(undefined)).toBe(false)
		})

		it('should return false if _properties is null', () => {
			const entity = { _properties: null }
			expect(hasProperties(entity)).toBe(false)
		})
	})

	describe('hasPolygon', () => {
		it('should return true for entity with _polygon', () => {
			const entity = { _polygon: { outline: true } }
			expect(hasPolygon(entity)).toBe(true)
		})

		it('should return true for entity with polygon (no underscore)', () => {
			const entity = { polygon: { outline: true } }
			expect(hasPolygon(entity)).toBe(true)
		})

		it('should return false for entity without polygon', () => {
			const entity = { id: '123' }
			expect(hasPolygon(entity)).toBe(false)
		})

		it('should return false for null entity', () => {
			expect(hasPolygon(null)).toBe(false)
		})

		it('should return false for undefined entity', () => {
			expect(hasPolygon(undefined)).toBe(false)
		})

		it('should return false if polygon is null', () => {
			const entity = { polygon: null, _polygon: null }
			expect(hasPolygon(entity)).toBe(false)
		})
	})

	describe('isValidBuildingEntity', () => {
		it('should return true for valid building entity', () => {
			const entity = {
				id: '123',
				_polygon: { outline: true },
				_properties: { foo: 'bar' },
			}
			expect(isValidBuildingEntity(entity)).toBe(true)
		})

		it('should return false for null', () => {
			expect(isValidBuildingEntity(null)).toBe(false)
		})

		it('should return false for undefined', () => {
			expect(isValidBuildingEntity(undefined)).toBe(false)
		})

		it('should return false for entity without _polygon', () => {
			const entity = {
				id: '123',
				_properties: { foo: 'bar' },
			}
			expect(isValidBuildingEntity(entity)).toBe(false)
		})

		it('should return false for entity without _properties', () => {
			const entity = {
				id: '123',
				_polygon: { outline: true },
			}
			expect(isValidBuildingEntity(entity)).toBe(false)
		})

		it('should return false for destroyed entity', () => {
			const entity = {
				id: '123',
				_polygon: { outline: true },
				_properties: { foo: 'bar' },
				isDestroyed: () => true,
			}
			expect(isValidBuildingEntity(entity)).toBe(false)
		})

		it('should return true for entity with polygon (no underscore) and properties', () => {
			const entity = {
				id: '123',
				polygon: { outline: true },
				properties: { foo: 'bar' },
			}
			expect(isValidBuildingEntity(entity)).toBe(true)
		})
	})

	describe('getPropertyValue', () => {
		it('should return property value from _properties', () => {
			const entity = {
				_properties: {
					c_kayttark: { _value: 123 },
				},
			}
			expect(getPropertyValue(entity, 'c_kayttark')).toBe(123)
		})

		it('should return property value from properties (without underscore)', () => {
			const entity = {
				properties: {
					c_kayttark: { _value: 123 },
				},
			}
			expect(getPropertyValue(entity, 'c_kayttark')).toBe(123)
		})

		it('should return undefined for missing property', () => {
			const entity = {
				_properties: { foo: { _value: 'bar' } },
			}
			expect(getPropertyValue(entity, 'nonexistent')).toBeUndefined()
		})

		it('should return undefined for null entity', () => {
			expect(getPropertyValue(null, 'foo')).toBeUndefined()
		})

		it('should return undefined for entity without properties', () => {
			const entity = { id: '123' }
			expect(getPropertyValue(entity, 'foo')).toBeUndefined()
		})

		it('should return undefined if property exists but _value is missing', () => {
			const entity = {
				_properties: {
					c_kayttark: { notValue: 123 },
				},
			}
			expect(getPropertyValue(entity, 'c_kayttark')).toBeUndefined()
		})

		it('should handle property with underscore prefix', () => {
			const entity = {
				_properties: {
					_c_valmpvm: { _value: '2020-01-01' },
				},
			}
			expect(getPropertyValue(entity, '_c_valmpvm')).toBe('2020-01-01')
		})
	})
})
