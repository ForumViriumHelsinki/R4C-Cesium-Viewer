import { describe, expect, it, vi } from 'vitest'
import { getPropertyValue } from '@/utils/entityHelpers.js'
import { calculateBuildingHeight, FLOOR_HEIGHT } from '@/utils/entityStyling.js'

// Real Cesium (tests/setup.js mocks `cesium` globally). The other unit tests use
// hand-written property mocks; these run the public-API reads against a real
// GeoJSON-style entity, so a getter name or getValue() behaviour that differs
// from the mocks fails here.
const { Entity } = await vi.importActual('cesium')

const buildingEntity = (properties) => new Entity({ properties })

describe('Cesium entity property access (real PropertyBag)', () => {
	it('exposes each property under its public name and its private backing field', () => {
		const { properties } = buildingEntity({ posno: '00100' })

		expect(properties.posno.getValue()).toBe('00100')
		expect(properties.posno).toBe(properties._posno)
	})

	it('returns the stored array itself from getValue(), as ._value did', () => {
		const heatTimeseries = [{ date: '2024-06-26', avg_temp_c: 28 }]
		const { properties } = buildingEntity({ heat_timeseries: heatTimeseries })

		expect(properties.heat_timeseries.getValue()).toBe(heatTimeseries)
	})

	it('calculateBuildingHeight reads floor count from a real entity', () => {
		const entity = buildingEntity({ i_kerrlkm: 5 })

		expect(calculateBuildingHeight(entity.properties)).toBe(5 * FLOOR_HEIGHT)
	})

	it('getPropertyValue reads public and underscore-prefixed names from a real entity', () => {
		const entity = buildingEntity({ c_kayttark: 131 })

		expect(getPropertyValue(entity, 'c_kayttark')).toBe(131)
		expect(getPropertyValue(entity, '_c_kayttark')).toBe(131)
	})
})
