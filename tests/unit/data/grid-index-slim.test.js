import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { DROPPED_KEYS, slimGridIndex } from '../../../scripts/slim-grid-index.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const GRID_FILE = resolve(__dirname, '../../../public/assets/data/r4c_stats_grid_index.json')

// Keys that src/ consumers actually read from the grid index file. Drive this
// list from the WO-6 property census + the PR verification table:
//   - Direct reads (SosEco250mGrid.vue, useGridStyling.js, the geojson worker,
//     LandcoverToParks.vue, mitigationStore.js, CoolingCenterOptimiser.vue).
//   - Selectable statsIndex values resolved dynamically via
//     `entity.properties[selectedIndex]` in useGridStyling.js, whose option
//     lists live in PopGridLegend.vue / StatisticalGridOptions.vue. Only the
//     options that exist as grid-file keys are listed here (combined_* and
//     avgheatexposure options belong to the population-grid layer).
const REQUIRED_KEYS = [
	// direct reads
	'grid_id',
	'euref_x',
	'euref_y',
	'heat_index',
	'flood_index',
	'green',
	'vegetation',
	'trees',
	'water',
	'kunta',
	'heat_exposure',
	'flood_exposure',
	'final_avg_conditional',
	'missing_values',
	// dynamically-selectable index components
	'sensitivity',
	'flood_prepare',
	'flood_respond',
	'flood_recover',
	'heat_prepare',
	'heat_respond',
	'age',
	'info',
	'tenure',
	'social_networks',
	'overcrowding',
]

const FEATURE_COUNT = 6710

describe('r4c_stats_grid_index.json slimming', { tags: ['@unit'] }, () => {
	let raw
	let data
	let keyUnion

	beforeAll(() => {
		raw = readFileSync(GRID_FILE, 'utf8')
		data = JSON.parse(raw)
		keyUnion = new Set(data.features.flatMap((f) => Object.keys(f.properties ?? {})))
	})

	it('is a FeatureCollection with the full feature count unchanged', () => {
		expect(data.type).toBe('FeatureCollection')
		expect(data.features).toHaveLength(FEATURE_COUNT)
	})

	it('keeps geometry intact for every feature', () => {
		for (const feature of data.features) {
			expect(feature.geometry).toBeTruthy()
			expect(feature.geometry.type).toBe('MultiPolygon')
			expect(Array.isArray(feature.geometry.coordinates)).toBe(true)
			expect(feature.geometry.coordinates.length).toBeGreaterThan(0)
		}
	})

	it('has dropped all 9 unused property keys from every feature', () => {
		for (const dropped of DROPPED_KEYS) {
			expect(keyUnion.has(dropped)).toBe(false)
		}
	})

	it('still contains every key that src/ consumers read', () => {
		const missing = REQUIRED_KEYS.filter((k) => !keyUnion.has(k))
		expect(missing).toEqual([])
	})

	it('is minified (no pretty-print whitespace)', () => {
		// A single trailing newline (end-of-file-fixer) is allowed; there must be
		// no internal newlines and no ": " pretty-print separators.
		expect(raw.replace(/\n$/, '')).not.toContain('\n')
		expect(raw).not.toMatch(/: /) // compact separators, no ": " after keys
	})
})

describe('slimGridIndex() transform', { tags: ['@unit'] }, () => {
	it('drops exactly the listed keys and is idempotent', () => {
		const input = {
			type: 'FeatureCollection',
			features: [
				{
					properties: {
						grid_id: 'a',
						heat_index: 1,
						total_green: 99,
						vegetation_m2_2022: 12,
						water_m2_2022: 3,
					},
					geometry: { type: 'MultiPolygon', coordinates: [[[[0, 0]]]] },
				},
			],
		}
		const out = slimGridIndex(structuredClone(input))
		expect(Object.keys(out.features[0].properties).sort()).toEqual(['grid_id', 'heat_index'])
		// idempotent
		const again = slimGridIndex(structuredClone(out))
		expect(Object.keys(again.features[0].properties).sort()).toEqual(['grid_id', 'heat_index'])
	})

	it('throws on a non-FeatureCollection input', () => {
		expect(() => slimGridIndex({})).toThrow()
		expect(() => slimGridIndex(null)).toThrow()
	})
})
