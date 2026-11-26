import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { COORDINATE_DECIMALS, slimHsyPo } from '../../../scripts/slim-hsy-po.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HSY_PO_FILE = resolve(__dirname, '../../../public/assets/data/hsy_po.json')

const FEATURE_COUNT = 172
// Property keys are untouched by the slim (docs/data/GRID_INDEX.md: PieChart.vue
// and NDVIChart.vue read the landcover and ndvi keys dynamically). 85 distinct
// keys at the time of the slim; the count pins that no key was dropped.
const PROPERTY_KEY_COUNT = 85

/** Yield every [lon, lat] position of a MultiPolygon. */
function* positions(geometry) {
	for (const polygon of geometry.coordinates) {
		for (const ring of polygon) {
			yield* ring
		}
	}
}

describe('hsy_po.json slimming', { tags: ['@unit'] }, () => {
	let raw
	let data

	beforeAll(() => {
		raw = readFileSync(HSY_PO_FILE, 'utf8')
		data = JSON.parse(raw)
	})

	it('keeps every feature and every property key', () => {
		expect(data.type).toBe('FeatureCollection')
		expect(data.features).toHaveLength(FEATURE_COUNT)
		const keyUnion = new Set(data.features.flatMap((f) => Object.keys(f.properties)))
		expect(keyUnion.size).toBe(PROPERTY_KEY_COUNT)
		for (const key of [
			'posno',
			'nimi',
			'center_x',
			'center_y',
			'ndvi_2025-06-20',
			'tree2_m2_2022',
		]) {
			expect(keyUnion.has(key)).toBe(true)
		}
	})

	it('is minified (no pretty-print whitespace)', () => {
		expect(raw.replace(/\n$/, '')).not.toContain('\n')
		expect(raw).not.toContain('\t')
		expect(raw).not.toMatch(/": /)
	})

	it(`rounds coordinates to at most ${COORDINATE_DECIMALS} decimals`, () => {
		for (const feature of data.features) {
			for (const [lon, lat] of positions(feature.geometry)) {
				expect(Number(lon.toFixed(COORDINATE_DECIMALS))).toBe(lon)
				expect(Number(lat.toFixed(COORDINATE_DECIMALS))).toBe(lat)
			}
		}
	})

	it('leaves every ring closed, with no repeated points and at least 4 positions', () => {
		for (const feature of data.features) {
			expect(feature.geometry.type).toBe('MultiPolygon')
			for (const polygon of feature.geometry.coordinates) {
				for (const ring of polygon) {
					expect(ring.length).toBeGreaterThanOrEqual(4)
					expect(ring.at(-1)).toEqual(ring[0])
					for (let i = 1; i < ring.length; i++) {
						expect(ring[i]).not.toEqual(ring[i - 1])
					}
				}
			}
		}
	})
})

describe('slimHsyPo() transform', { tags: ['@unit'] }, () => {
	const input = () => ({
		type: 'FeatureCollection',
		features: [
			{
				type: 'Feature',
				properties: { posno: '00100', center_x: 24.123456789 },
				geometry: {
					type: 'MultiPolygon',
					coordinates: [
						[
							[
								[24.1234567891, 60.1234567891],
								[24.1234567, 60.1234568], // rounds onto the previous point
								[24.2, 60.1],
								[24.3, 60.2],
								[24.1234567891, 60.1234567891],
							],
						],
					],
				},
			},
		],
	})

	it('rounds coordinates, drops repeated points and leaves properties alone', () => {
		const out = slimHsyPo(input())
		expect(out.features[0].geometry.coordinates[0][0]).toEqual([
			[24.123457, 60.123457],
			[24.2, 60.1],
			[24.3, 60.2],
			[24.123457, 60.123457],
		])
		expect(out.features[0].properties).toEqual({ posno: '00100', center_x: 24.123456789 })
	})

	it('is idempotent', () => {
		const once = slimHsyPo(input())
		expect(slimHsyPo(structuredClone(once))).toEqual(once)
	})

	it('throws on a non-FeatureCollection input', () => {
		expect(() => slimHsyPo({})).toThrow()
		expect(() => slimHsyPo(null)).toThrow()
	})
})
