/**
 * Unit tests for the urban-heat ↔ building merge.
 *
 * Focus: `mergeHeatFeaturesIntoBuildings` — the O(B+H) hash-join that replaced
 * the previous O(buildings × heat-features) linear scan
 * (`tmp/perf-investigation/WO-1-report.md`).
 *
 * Strategy:
 * - Correctness: matched buildings get heat attributes; unmatched buildings are
 *   left untouched; unmatched heat features are appended as orphan polygons.
 * - Equivalence: on randomized fixtures the new hash-join produces byte-for-byte
 *   the same merged array as a faithful re-implementation of the old algorithm.
 * - Benchmark: time the old O(B×H) scan vs the new hash-join on a realistic
 *   ~1,300-building fixture and log before/after (informational + a generous
 *   "new is faster" assertion).
 *
 * @see {@link file://../../../src/services/urbanheat.js}
 */

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Decoding from '@/services/decoding.js'
import { HEAT_MERGE_YIELD_INTERVAL, mergeHeatFeaturesIntoBuildings } from '@/services/urbanheat.js'

// Heavy / Cesium-touching deps imported transitively by urbanheat.js. The merge
// itself only depends on the (real) Decoding service, so stub the rest.
vi.mock('@/services/datasource.js', () => ({
	default: vi.fn(() => {}),
}))
vi.mock('@/services/cesiumEntityManager.js', () => ({
	cesiumEntityManager: { registerBuildingEntities: vi.fn() },
}))
vi.mock('@/services/unifiedLoader.js', () => ({
	default: { loadLayer: vi.fn(), cancelLoading: vi.fn() },
}))

/**
 * Faithful re-implementation of the previous merge algorithm (without the
 * per-25-feature idle yields, which never affected the *output*). Used as the
 * equivalence oracle and the benchmark baseline.
 */
function oldMergeReference(buildingFeatures, heatFeatures) {
	const decodingService = new Decoding()

	const setAttributesOld = (properties, features) => {
		for (let i = 0; i < features.length; i++) {
			const feature = features[i]
			if (properties.id === feature.properties.hki_id) {
				const hp = feature.properties
				if (hp.avgheatexposuretobuilding) {
					properties.avgheatexposuretobuilding = hp.avgheatexposuretobuilding
				}
				if (hp.distancetounder40) {
					properties.distanceToUnder40 = hp.distancetounder40
				}
				if (hp.distancetounder40) {
					properties.locationUnder40 = hp.locationunder40
				}
				if (hp.year_of_construction) {
					properties.year_of_construction = hp.year_of_construction
				}
				if (hp.measured_height) {
					properties.measured_height = hp.measured_height
				}
				if (hp.roof_type) {
					properties.roof_type = hp.roof_type
				}
				if (hp.area_m2) {
					properties.area_m2 = hp.area_m2
				}
				if (hp.roof_median_color) {
					properties.roof_median_color = decodingService.getColorValue(hp.roof_median_color)
				}
				if (hp.roof_mode_color) {
					properties.roof_mode_color = decodingService.getColorValue(hp.roof_mode_color)
				}
				properties.kayttotarkoitus = decodingService.decodeKayttotarkoitusHKI(hp.c_kayttark)
				properties.c_julkisivu = decodingService.decodeFacade(properties.c_julkisivu)
				properties.c_rakeaine = decodingService.decodeMaterial(properties.c_rakeaine)
				properties.c_lammtapa = decodingService.decodeHeatingMethod(properties.c_lammtapa)
				properties.c_poltaine = decodingService.decodeHeatingSource(properties.c_poltaine)
				features.splice(i, 1)
				return
			}
		}
	}

	for (let i = 0; i < buildingFeatures.length; i++) {
		setAttributesOld(buildingFeatures[i].properties, heatFeatures)
	}
	// addMissingHeatData: push the heat features that were never spliced out.
	for (let i = 0; i < heatFeatures.length; i++) {
		buildingFeatures.push(heatFeatures[i])
	}
}

/** Builds a building GeoJSON feature with the given id. */
const building = (id, extra = {}) => ({
	type: 'Feature',
	properties: { id, c_julkisivu: '1', c_rakeaine: '1', c_lammtapa: '1', c_poltaine: '1', ...extra },
	geometry: { type: 'Polygon', coordinates: [] },
})

/** Builds a heat-exposure GeoJSON feature keyed on hki_id. */
const heat = (hki_id, extra = {}) => ({
	type: 'Feature',
	properties: {
		hki_id,
		avgheatexposuretobuilding: 0.5,
		distancetounder40: 10,
		locationunder40: 'north',
		year_of_construction: 1990,
		measured_height: 12,
		roof_type: 'flat',
		area_m2: 100,
		c_kayttark: '011',
		...extra,
	},
	geometry: { type: 'Polygon', coordinates: [] },
})

describe('mergeHeatFeaturesIntoBuildings', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
	})

	it('copies heat attributes onto a matched building', async () => {
		const buildings = [building('A')]
		const heatFeatures = [heat('A')]

		await mergeHeatFeaturesIntoBuildings(buildings, heatFeatures)

		const props = buildings[0].properties
		expect(props.avgheatexposuretobuilding).toBe(0.5)
		expect(props.distanceToUnder40).toBe(10)
		expect(props.locationUnder40).toBe('north')
		expect(props.year_of_construction).toBe(1990)
		expect(props.measured_height).toBe(12)
		expect(props.area_m2).toBe(100)
		// Building's own coded fields are decoded only when matched.
		expect(props.kayttotarkoitus).toBe('Yhden asunnon talot')
	})

	it('leaves an unmatched building untouched', async () => {
		const buildings = [building('A'), building('NO_MATCH')]
		const heatFeatures = [heat('A')]

		await mergeHeatFeaturesIntoBuildings(buildings, heatFeatures)

		// buildings[0] matched; buildings[1] (NO_MATCH) gets no heat attributes.
		expect(buildings[1].properties.avgheatexposuretobuilding).toBeUndefined()
		expect(buildings[1].properties.kayttotarkoitus).toBeUndefined()
	})

	it('appends unmatched heat features as orphan polygons', async () => {
		const buildings = [building('A')]
		const orphan = heat('ORPHAN')
		const heatFeatures = [heat('A'), orphan]

		await mergeHeatFeaturesIntoBuildings(buildings, heatFeatures)

		// 1 matched building + 1 orphan heat feature appended.
		expect(buildings).toHaveLength(2)
		expect(buildings[1]).toBe(orphan)
	})

	it('appends a heat feature with a missing hki_id as an orphan', async () => {
		const buildings = [building('A')]
		const noKey = heat(undefined)
		const heatFeatures = [heat('A'), noKey]

		await mergeHeatFeaturesIntoBuildings(buildings, heatFeatures)

		expect(buildings).toHaveLength(2)
		expect(buildings[1]).toBe(noKey)
	})

	it('consumes one heat feature per matching building when ids repeat', async () => {
		const buildings = [building('DUP'), building('DUP'), building('DUP')]
		const h1 = heat('DUP', { avgheatexposuretobuilding: 1 })
		const h2 = heat('DUP', { avgheatexposuretobuilding: 2 })
		const heatFeatures = [h1, h2]

		await mergeHeatFeaturesIntoBuildings(buildings, heatFeatures)

		// First building takes h1, second takes h2 (FIFO), third gets nothing.
		expect(buildings[0].properties.avgheatexposuretobuilding).toBe(1)
		expect(buildings[1].properties.avgheatexposuretobuilding).toBe(2)
		expect(buildings[2].properties.avgheatexposuretobuilding).toBeUndefined()
		// Both heat features consumed → no orphans appended.
		expect(buildings).toHaveLength(3)
	})

	it('handles empty / non-array inputs without throwing', async () => {
		const buildings = [building('A')]
		await expect(mergeHeatFeaturesIntoBuildings(buildings, [])).resolves.toBeUndefined()
		expect(buildings).toHaveLength(1)
		await expect(mergeHeatFeaturesIntoBuildings(null, null)).resolves.toBeUndefined()
	})

	it('yields coarsely but still completes a fixture larger than the yield interval', async () => {
		const n = HEAT_MERGE_YIELD_INTERVAL * 2 + 7
		const buildings = Array.from({ length: n }, (_, i) => building(`B${i}`))
		const heatFeatures = Array.from({ length: n }, (_, i) => heat(`B${i}`))

		await mergeHeatFeaturesIntoBuildings(buildings, heatFeatures)

		// All matched (1:1), no orphans.
		expect(buildings).toHaveLength(n)
		expect(buildings.every((b) => b.properties.avgheatexposuretobuilding === 0.5)).toBe(true)
	})

	it('produces output identical to the previous algorithm on a randomized fixture', async () => {
		const ids = Array.from({ length: 200 }, (_, i) => `id_${i}`)
		// Buildings: most have ids, a few unmatched; include a duplicate id.
		const buildSpecs = [
			...ids.map((id) => building(id)),
			building('UNMATCHED_1'),
			building('id_5'), // duplicate of an existing id
		]
		// Heat: matches for most ids (shuffled), a couple of orphans, one no-key,
		// and a second feature for the duplicated id.
		const heatSpecs = [
			...ids.filter((_, i) => i % 7 !== 0).map((id) => heat(id)),
			heat('ORPHAN_A'),
			heat('ORPHAN_B'),
			heat(undefined),
			heat('id_5'),
		]
		// Shuffle heat deterministically.
		for (let i = heatSpecs.length - 1; i > 0; i--) {
			const j = (i * 7919) % (i + 1)
			;[heatSpecs[i], heatSpecs[j]] = [heatSpecs[j], heatSpecs[i]]
		}

		// Two independent deep copies so each algorithm mutates its own arrays.
		const cloneBuildings = () => buildSpecs.map((b) => structuredClone(b))
		const cloneHeat = () => heatSpecs.map((h) => structuredClone(h))

		const refBuildings = cloneBuildings()
		oldMergeReference(refBuildings, cloneHeat())

		const newBuildings = cloneBuildings()
		await mergeHeatFeaturesIntoBuildings(newBuildings, cloneHeat())

		expect(newBuildings).toEqual(refBuildings)
	})

	it('benchmark: hash-join scales linearly vs the old O(B×H) scan', async () => {
		// Worst case = heat features NOT in building order. This is the realistic
		// production case (pygeoapi heat and WFS buildings arrive in unrelated
		// orders), and the reason WO-1 saw super-linear scaling: when the match is
		// not at the head, the old splice-scan cannot short-circuit and pays a full
		// scan per building. (Pure CPU only — the production 11.7–137 s wall-clock
		// was dominated by the per-25-feature requestIdleCallback ping-pong, which a
		// node/jsdom benchmark cannot reproduce; the algorithmic win below is the
		// CPU component, the idle-yield elimination is the larger real-world win.)
		const makeBuildings = (B) => Array.from({ length: B }, (_, i) => building(`b_${i}`))
		// reverse() so building b_i matches the heat feature near the tail.
		const makeHeat = (H) =>
			Array.from({ length: H }, (_, i) =>
				heat(`b_${i}`, { avgheatexposuretobuilding: i + 1 })
			).reverse()

		const sizes = [378, 797, 1319] // WO-1 postal-code sizes (00190 / 00530 / 00100)
		let lastOldMs = 0
		let lastNewMs = 0
		for (const N of sizes) {
			const oldBuildings = makeBuildings(N)
			const t0 = performance.now()
			oldMergeReference(oldBuildings, makeHeat(N))
			const oldMs = performance.now() - t0

			const newBuildings = makeBuildings(N)
			const t1 = performance.now()
			await mergeHeatFeaturesIntoBuildings(newBuildings, makeHeat(N))
			const newMs = performance.now() - t1

			// Equivalent result on every benchmark fixture.
			expect(newBuildings).toEqual(oldBuildings)

			// eslint-disable-next-line no-console
			console.log(
				`[urbanheat benchmark] N=${N} (CPU only, unaligned, no idle yields): ` +
					`old O(B×H) = ${oldMs.toFixed(2)} ms, new O(B+H) = ${newMs.toFixed(2)} ms, ` +
					`speedup = ${(oldMs / Math.max(newMs, 0.001)).toFixed(1)}×`
			)
			lastOldMs = oldMs
			lastNewMs = newMs
		}

		// At the heaviest size the hash-join must be faster. Generous margin to
		// avoid CI flakiness on the small absolute numbers.
		expect(lastNewMs).toBeLessThan(lastOldMs)
	})
})
