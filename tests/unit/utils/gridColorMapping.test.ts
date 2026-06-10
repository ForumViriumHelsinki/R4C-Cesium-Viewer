import { describe, expect, it } from 'vitest'
import {
	getGridColorString,
	getGridFillColorRgba,
	heatColors,
	hexToRgba,
	indexToColorScheme,
} from '@/utils/gridColorMapping'

describe('gridColorMapping', () => {
	describe('getGridColorString — threshold buckets', () => {
		// heatColors indices 2-6: < 0.2, 0.2-0.4, 0.4-0.6, 0.6-0.8, > 0.8
		it.each([
			[0.0, '#ffffcc'],
			[0.19, '#ffffcc'],
			[0.2, '#ffeda0'],
			[0.39, '#ffeda0'],
			[0.4, '#feb24c'],
			[0.59, '#feb24c'],
			[0.6, '#f03b20'],
			[0.79, '#f03b20'],
			[0.8, '#bd0026'],
			[1.0, '#bd0026'],
		])('heat_index value %f -> %s', (value, expected) => {
			expect(getGridColorString(value, 'heat_index')).toBe(expected)
		})

		it('falls back to heatColors for an unknown index type', () => {
			expect(getGridColorString(0.5, 'totally_unknown_index')).toBe('#feb24c')
		})

		it('clamps to the last entry for shorter (greenSpace) schemes', () => {
			// greenSpaceColors has 5 entries (indices 0-4); a > 0.8 value must not overflow.
			expect(getGridColorString(0.9, 'green')).toBe('#e5f5e0')
		})
	})

	describe('hexToRgba', () => {
		it('parses #rrggbb with default opaque alpha', () => {
			expect(hexToRgba('#feb24c')).toEqual([254, 178, 76, 255])
		})

		it('expands #rgb shorthand', () => {
			expect(hexToRgba('#fff', 128)).toEqual([255, 255, 255, 128])
		})

		it('tolerates a missing leading # and applies alpha', () => {
			expect(hexToRgba('bd0026', 204)).toEqual([189, 0, 38, 204])
		})
	})

	describe('getGridFillColorRgba — mirrors Cesium styleGridEntity', () => {
		it('colors a present heat_index value with the shared threshold color', () => {
			// 0.5 -> #feb24c -> [254,178,76,204]
			expect(getGridFillColorRgba({ heat_index: 0.5 }, 'heat_index', 204)).toEqual([
				254, 178, 76, 204,
			])
		})

		it('returns white for a null/absent index value (incomplete data)', () => {
			expect(getGridFillColorRgba({ heat_index: null }, 'heat_index')).toEqual([255, 255, 255, 204])
			expect(getGridFillColorRgba({}, 'heat_index')).toEqual([255, 255, 255, 204])
		})

		it('returns gray when missing_values is set for a guarded index', () => {
			expect(getGridFillColorRgba({ missing_values: true, heat_index: 0.5 }, 'heat_index')).toEqual(
				[169, 169, 169, 204]
			)
		})

		it('ignores missing_values for green/flood_exposure/avgheatexposure indices', () => {
			// Not gray: missing_values is bypassed for these indices, so the value is
			// colored with the shared threshold logic (preserving the existing Cesium
			// behavior exactly, quirks included — do not fork).
			const result = getGridFillColorRgba({ missing_values: true, green: 0.5 }, 'green')
			expect(result).not.toEqual([169, 169, 169, 204]) // not the missing-values gray
			expect(result).toEqual(hexToRgba(getGridColorString(0.5, 'green'), 204))
		})
	})

	describe('palette integrity', () => {
		it('exposes heat_index -> heatColors in the scheme map', () => {
			expect(indexToColorScheme.heat_index).toBe(heatColors)
		})
	})
})
