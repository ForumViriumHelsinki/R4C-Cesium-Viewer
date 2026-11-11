import { describe, expect, it } from 'vitest'
import {
	calculateBuildingHeight,
	DEFAULT_BUILDING_HEIGHT,
	FLOOR_HEIGHT,
} from '@/utils/entityStyling.js'

describe('entityStyling', () => {
	describe('calculateBuildingHeight', () => {
		it('should return measured_height when available', () => {
			const properties = {
				measured_height: { getValue: () => 25.5 },
				i_kerrlkm: { getValue: () => 5 },
			}

			expect(calculateBuildingHeight(properties)).toBe(25.5)
		})

		it('should calculate height from floor count when measured_height is missing', () => {
			const properties = {
				i_kerrlkm: { getValue: () => 5 },
			}

			// 5 floors * 3.2m per floor = 16.0m
			expect(calculateBuildingHeight(properties)).toBe(16.0)
		})

		it('should use default height when no height data is available', () => {
			const properties = {}

			expect(calculateBuildingHeight(properties)).toBe(DEFAULT_BUILDING_HEIGHT)
		})

		it('should use default height when properties is undefined', () => {
			expect(calculateBuildingHeight(undefined)).toBe(DEFAULT_BUILDING_HEIGHT)
		})

		it('should use default height when properties is null', () => {
			expect(calculateBuildingHeight(null)).toBe(DEFAULT_BUILDING_HEIGHT)
		})

		it('should handle zero floor count', () => {
			const properties = {
				i_kerrlkm: { getValue: () => 0 },
			}

			// Zero floors should return default height, not 0
			expect(calculateBuildingHeight(properties)).toBe(DEFAULT_BUILDING_HEIGHT)
		})

		it('should handle negative measured_height by returning it as-is', () => {
			// Edge case - implementation should handle this gracefully
			const properties = {
				measured_height: { getValue: () => -5 },
			}

			// Negative height is technically invalid but we return as-is for transparency
			expect(calculateBuildingHeight(properties)).toBe(-5)
		})

		it('should prefer measured_height over floor count', () => {
			const properties = {
				measured_height: { getValue: () => 30 },
				i_kerrlkm: { getValue: () => 5 }, // Would be 16.0m
			}

			expect(calculateBuildingHeight(properties)).toBe(30)
		})

		it('should handle measured_height with no value', () => {
			const properties = {
				measured_height: { getValue: () => undefined }, // Has key but no value
				i_kerrlkm: { getValue: () => 3 },
			}

			// Should fall back to floor count
			expect(calculateBuildingHeight(properties)).toBeCloseTo(9.6) // 3 * 3.2
		})

		it('should handle null measured_height value', () => {
			const properties = {
				measured_height: { getValue: () => null },
				i_kerrlkm: { getValue: () => 4 },
			}

			// Should fall back to floor count
			expect(calculateBuildingHeight(properties)).toBeCloseTo(12.8) // 4 * 3.2
		})
	})

	describe('constants', () => {
		it('should export DEFAULT_BUILDING_HEIGHT as 2.7', () => {
			expect(DEFAULT_BUILDING_HEIGHT).toBe(2.7)
		})

		it('should export FLOOR_HEIGHT as 3.2', () => {
			expect(FLOOR_HEIGHT).toBe(3.2)
		})
	})
})
