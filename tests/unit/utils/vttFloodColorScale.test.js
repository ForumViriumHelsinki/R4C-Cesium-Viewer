/**
 * Colour classes for the VTT flood layer (#issue 5: "everything is either red or
 * blue"). A linear min/max blue→red ramp over VTT's bimodal and heavy-tailed
 * distributions put almost every cell at one end. The distributions below are
 * shaped after production frames measured on 2026-10-08.
 *
 * Classes are fixed per scenario (constants/vttFloodClassBreaks.ts, generated
 * by scripts/vtt-flood/derive-class-breaks.mjs), so legend labels and the
 * colour of a value do not change while scrubbing frames.
 */
import { describe, expect, it } from 'vitest'
import {
	VTT_COLOR_STEPS,
	VTT_DEFAULT_DIMENSION,
	VTT_DEPTH_CLASS_BREAKS_M,
	VTT_DIMENSIONS,
	VTT_MAX_EXTRUSION_M,
	VTT_MIN_EXTRUSION_M,
	VTT_PALETTE_T_RANGES,
	VTT_ROBUST_LOWER_QUANTILE,
	VTT_ROBUST_UPPER_QUANTILE,
	VTT_SCENARIOS,
	VTT_WET_DEPTH_THRESHOLD_M,
} from '@/constants/vttFlood.ts'
import { VTT_CLASS_BREAKS, VTT_CLASS_BREAKS_DERIVATION } from '@/constants/vttFloodClassBreaks.ts'
import {
	buildColorScale,
	classExtrusion,
	classIndex,
	formatLegendValue,
	legendGradientCss,
	legendTicks,
} from '@/utils/vttFloodColorScale.js'
import { equalCountBreaks } from '../../../scripts/vtt-flood/equalCountBreaks.mjs'

const dim = (key) => VTT_DIMENSIONS.find((d) => d.key === key)
const SCENARIO_DIMENSIONS = VTT_DIMENSIONS.filter((d) => d.scale.kind === 'scenario')

/** Scenario 1 from the VTT API, the default scenario. */
const S1 = { scenarioId: '1', synthetic: false }
const S1_TRANSPIRATION = VTT_CLASS_BREAKS.vtt['1'].transpiration

/**
 * A transpiration frame: 370 zero cells, the rest spread up to `max`.
 * Transpiration is cumulative, so an early frame tops out low and a late one
 * high; Float32 like the frames the store holds.
 */
function transpirationFrame(max) {
	const values = []
	for (let i = 0; i < 370; i++) values.push(0)
	for (let i = 0; i < 630; i++) values.push((max * (i + 1)) / 630)
	return Float32Array.from(values)
}

describe('buildColorScale', () => {
	it("uses the scenario's breaks and hides zero cells", () => {
		const scale = buildColorScale(dim('transpiration'), transpirationFrame(0.17), S1)

		expect(scale).toMatchObject({ mode: 'classes', kind: 'scenario' })
		expect(scale.classes.map((c) => c.lo)).toEqual(S1_TRANSPIRATION.breaks)
		expect(scale.classes.at(-1).hi).toBe(S1_TRANSPIRATION.upper)
		expect(scale.hiddenCount).toBe(370)
		expect(scale.shownCount).toBe(630)
		expect(classIndex(scale, 0)).toBe(-1)
	})

	it('colours a value the same in every frame of a scenario', () => {
		// Frame 24 of scenario 1 tops out at 0.0149, frame 287 at 0.178. With
		// per-frame classes the same value moved classes as the frame changed.
		const early = buildColorScale(dim('transpiration'), transpirationFrame(0.0149), S1)
		const late = buildColorScale(dim('transpiration'), transpirationFrame(0.178), S1)

		expect(late.classes).toEqual(early.classes)
		for (const v of [0.002, 0.01, 0.0149, 0.03, 0.08, 0.15]) {
			expect(classIndex(late, v)).toBe(classIndex(early, v))
		}
	})

	it('puts an early frame of a cumulative variable in the low classes', () => {
		const values = transpirationFrame(0.0149)
		const scale = buildColorScale(dim('transpiration'), values, S1)
		const used = new Set(Array.from(values, (v) => classIndex(scale, v)))
		used.delete(-1)
		expect(Math.max(...used)).toBeLessThan(2)
	})

	it('selects breaks by scenario and data source', () => {
		const values = transpirationFrame(0.17)
		const s3 = buildColorScale(dim('transpiration'), values, { scenarioId: '3', synthetic: false })
		const synthetic = buildColorScale(dim('transpiration'), values, {
			scenarioId: '1',
			synthetic: true,
		})

		expect(s3.classes.map((c) => c.lo)).toEqual(VTT_CLASS_BREAKS.vtt['3'].transpiration.breaks)
		expect(synthetic.classes.map((c) => c.lo)).toEqual(
			VTT_CLASS_BREAKS.synthetic['1'].transpiration.breaks
		)
	})

	it('fails fast when a scenario has no breaks', () => {
		const values = transpirationFrame(0.17)
		expect(() =>
			buildColorScale(dim('transpiration'), values, { scenarioId: '9', synthetic: false })
		).toThrow(/No vtt colour classes for scenario "9"/)
		expect(() => buildColorScale(dim('transpiration'), values)).toThrow(/derive-class-breaks/)
	})

	it('reports a frame where every cell is equal as no-variation (frame 0, canopy = 5)', () => {
		const scale = buildColorScale(dim('canopy_air_temperature'), new Array(50).fill(5), S1)
		expect(scale).toMatchObject({ mode: 'empty', reason: 'no-variation', value: 5, totalCount: 50 })
	})

	it('reports an all-zero frame as no-variation even when zeros are hidden', () => {
		const scale = buildColorScale(dim('transpiration'), new Float32Array(20), S1)
		expect(scale).toMatchObject({ mode: 'empty', reason: 'no-variation', value: 0 })
	})

	it('still draws a uniform depth above the wet threshold (fixed classes)', () => {
		const scale = buildColorScale(dim('overland_water_depth'), [0.4, 0.4, 0.4])
		expect(scale.mode).toBe('classes')
		expect(classIndex(scale, 0.4)).toBe(3) // 30–50 cm
	})

	it('reports an all-zero depth frame as all-hidden', () => {
		expect(buildColorScale(dim('overland_water_depth'), [0, 0, 0])).toMatchObject({
			mode: 'empty',
			reason: 'all-hidden',
		})
	})

	it('reports overland depth with no cell above the wet threshold as all-hidden', () => {
		const scale = buildColorScale(dim('overland_water_depth'), [0, 0.001, 0.002, 0.009, 0])
		expect(scale).toMatchObject({
			mode: 'empty',
			reason: 'all-hidden',
			threshold: VTT_WET_DEPTH_THRESHOLD_M,
		})
	})

	it('puts overland depth into the fixed physical classes', () => {
		const scale = buildColorScale(dim('overland_water_depth'), [0, 0.001, 0.02, 0.2, 1.4])

		expect(scale.mode).toBe('classes')
		expect(scale.classes).toHaveLength(VTT_DEPTH_CLASS_BREAKS_M.length)
		expect(scale.hiddenCount).toBe(2)
		expect(classIndex(scale, 0)).toBe(-1)
		expect(classIndex(scale, 0.001)).toBe(-1)
		expect(classIndex(scale, 0.02)).toBe(0) // 1–5 cm
		expect(classIndex(scale, 0.2)).toBe(2) // 10–30 cm
		expect(classIndex(scale, 1.4)).toBe(VTT_DEPTH_CLASS_BREAKS_M.length - 1) // ≥ 1 m
		expect(scale.clippedHigh).toBe(true)
		expect(scale.classes.at(-1).hi).toBe(Number.POSITIVE_INFINITY)
	})

	it('separates the two upper storage depths of scenario 1 by class', () => {
		// Scenario 1 frames hold 0 plus 0.001 m (frames 12–168) or 0.0009 m
		// (frames 180–287); per-frame scales drew each as the same single colour.
		const values = Float32Array.from([0, 0, 0.0009, 0.001, 0.001, 0])
		const scale = buildColorScale(dim('upper_storage_water_depth'), values, S1)

		expect(scale.mode).toBe('classes')
		expect(scale.shownCount).toBe(3)
		expect(classIndex(scale, Math.fround(0.0009))).toBe(0)
		expect(classIndex(scale, Math.fround(0.001))).toBe(1)
		expect(classIndex(scale, 0)).toBe(-1)
	})

	it('shows a scenario whose shown values were all equal as a single-colour mask', () => {
		// No real scenario has such an entry today; a regenerated one could. The
		// generated object is mutable at runtime, so swap one in for this test.
		const set = VTT_CLASS_BREAKS.vtt['1']
		const saved = set.upper_storage_water_depth
		set.upper_storage_water_depth = { breaks: [0.001], upper: 0.001 }
		try {
			const scale = buildColorScale(
				dim('upper_storage_water_depth'),
				[0, 0, 0.001, 0.001, 0.001, 0],
				S1
			)
			expect(scale).toMatchObject({ mode: 'mask', value: 0.001, shownCount: 3 })
			expect(scale.classes).toHaveLength(1)
			expect(classIndex(scale, 0.001)).toBe(0)
			expect(classIndex(scale, 0)).toBe(-1)
		} finally {
			set.upper_storage_water_depth = saved
		}
	})

	it('folds values outside the breaks into the end classes and flags it', () => {
		const values = [...transpirationFrame(0.17), 1000, 0.0001]
		const scale = buildColorScale(dim('transpiration'), values, S1)

		expect(scale.clippedHigh).toBe(true)
		expect(scale.clippedLow).toBe(true)
		expect(classIndex(scale, 1000)).toBe(scale.classes.length - 1)
		expect(classIndex(scale, 0.0001)).toBe(0)
	})

	it('ignores non-finite values', () => {
		const scale = buildColorScale(dim('transpiration'), [Number.NaN, 0.01, 0.02, 0.03], S1)
		expect(scale.mode).toBe('classes')
		expect(scale.hiddenCount).toBe(1)
		expect(classIndex(scale, Number.NaN)).toBe(-1)
	})

	it('reports an empty frame as no-data', () => {
		expect(buildColorScale(dim('transpiration'), [], S1)).toMatchObject({
			mode: 'empty',
			reason: 'no-data',
		})
	})

	it('gives every class an rgb colour string and matching bytes', () => {
		const scale = buildColorScale(dim('transpiration'), transpirationFrame(0.17), S1)
		for (const c of scale.classes) {
			expect(c.color).toMatch(/^rgb\(\d+, \d+, \d+\)$/)
			expect(c.color).toBe(`rgb(${c.rgb[0]}, ${c.rgb[1]}, ${c.rgb[2]})`)
		}
		// Sequential ramp: classes are distinct colours.
		expect(new Set(scale.classes.map((c) => c.color)).size).toBe(scale.classes.length)
	})
})

describe('equalCountBreaks (derivation of the scenario breaks)', () => {
	const derive = (values) =>
		equalCountBreaks(
			Float64Array.from(values).sort(),
			VTT_ROBUST_LOWER_QUANTILE,
			VTT_ROBUST_UPPER_QUANTILE,
			VTT_COLOR_STEPS
		)

	it('gives no class more than 30% of the pooled values of a cumulative variable', () => {
		// Transpiration accumulates: each cell grows at its own rate, frame by
		// frame. Pooled over the scenario's frames the classes hold about equal
		// counts, even though an early frame alone sits in the lowest classes.
		const pooled = []
		for (let frame = 12; frame < 288; frame += 12) {
			for (let cell = 0; cell < 500; cell++) {
				const rate = 0.0004 + ((cell * 7919) % 500) / 500 / 1600
				pooled.push(Math.round(rate * frame * 1e4) / 1e4) // 4 decimals, like VTT
			}
		}
		const { breaks, upper } = derive(pooled)
		const counts = new Array(breaks.length).fill(0)
		for (const v of pooled) {
			let i = 0
			while (i + 1 < breaks.length && breaks[i + 1] <= v) i++
			counts[i]++
		}

		expect(breaks).toHaveLength(VTT_COLOR_STEPS)
		expect(upper).toBeGreaterThan(breaks.at(-1))
		expect(Math.max(...counts) / pooled.length).toBeLessThanOrEqual(0.3)
	})

	it('merges class breaks that coincide on tied values', () => {
		// Half the values share one value, so several quantiles land on it.
		const values = [
			...new Array(100).fill(0.05),
			...Array.from({ length: 100 }, (_, i) => i / 1000),
		]
		const { breaks } = derive(values)

		expect(breaks.length).toBeLessThan(VTT_COLOR_STEPS)
		for (let i = 1; i < breaks.length; i++) expect(breaks[i]).toBeGreaterThan(breaks[i - 1])
		expect(breaks).toContain(0.05)
	})

	it('widens the domain to min..max when the quantiles coincide', () => {
		const values = [...new Array(99).fill(0.001), 0.0009]
		expect(derive(values)).toEqual({ breaks: [0.0009, 0.001], upper: 0.001 })
	})

	it('returns one break for a constant dimension', () => {
		expect(derive(new Array(10).fill(5))).toEqual({ breaks: [5], upper: 5 })
	})
})

describe('VTT_CLASS_BREAKS (generated by scripts/vtt-flood/derive-class-breaks.mjs)', () => {
	it('has strictly increasing breaks for every scenario and scenario-scale dimension', () => {
		// buildColorScale throws for a missing entry, and classIndex's binary
		// search needs ascending class bounds. Adding a scenario or dimension
		// without regenerating fails here: run the script and commit its output.
		for (const source of ['vtt', 'synthetic']) {
			expect(Object.keys(VTT_CLASS_BREAKS[source]).sort()).toEqual(
				VTT_SCENARIOS.map((s) => s.id).sort()
			)
			for (const scenario of VTT_SCENARIOS) {
				for (const d of SCENARIO_DIMENSIONS) {
					const entry = VTT_CLASS_BREAKS[source][scenario.id][d.key]
					const where = `${source} scenario ${scenario.id} ${d.key}`
					expect(entry, where).toBeDefined()
					expect(entry.breaks.length, where).toBeGreaterThan(0)
					expect(entry.breaks.every(Number.isFinite), where).toBe(true)
					for (let i = 1; i < entry.breaks.length; i++) {
						expect(entry.breaks[i], where).toBeGreaterThan(entry.breaks[i - 1])
					}
					expect(entry.upper, where).toBeGreaterThanOrEqual(entry.breaks.at(-1))
				}
			}
		}
	})

	it('was derived with the current class count and quantiles', () => {
		// Changing VTT_COLOR_STEPS or a dimension's quantiles leaves the breaks
		// stale until the script is re-run.
		expect(VTT_CLASS_BREAKS_DERIVATION.steps).toBe(VTT_COLOR_STEPS)
		expect(VTT_CLASS_BREAKS_DERIVATION.quantiles).toEqual(
			Object.fromEntries(
				SCENARIO_DIMENSIONS.map((d) => [
					d.key,
					{ lowerQuantile: d.scale.lowerQuantile, upperQuantile: d.scale.upperQuantile },
				])
			)
		)
	})

	it('splits real transpiration, the default view, into the full class count', () => {
		for (const scenario of VTT_SCENARIOS) {
			expect(VTT_CLASS_BREAKS.vtt[scenario.id].transpiration.breaks).toHaveLength(VTT_COLOR_STEPS)
		}
	})
})

describe('classExtrusion', () => {
	it('rises monotonically from the minimum to the maximum extrusion', () => {
		const scale = buildColorScale(dim('transpiration'), transpirationFrame(0.17), S1)
		const heights = scale.classes.map((_, i) => classExtrusion(scale, i))

		expect(heights[0]).toBeGreaterThanOrEqual(VTT_MIN_EXTRUSION_M)
		expect(heights.at(-1)).toBe(VTT_MAX_EXTRUSION_M)
		for (let i = 1; i < heights.length; i++) expect(heights[i]).toBeGreaterThan(heights[i - 1])
	})

	it('gives a value the same height in every frame of a scenario', () => {
		const early = buildColorScale(dim('transpiration'), transpirationFrame(0.0149), S1)
		const late = buildColorScale(dim('transpiration'), transpirationFrame(0.178), S1)
		const v = 0.012
		expect(classExtrusion(late, classIndex(late, v))).toBe(
			classExtrusion(early, classIndex(early, v))
		)
	})

	it('uses the minimum extrusion for a mask', () => {
		const scale = { mode: 'mask', classes: [{ lo: 1, hi: 1 }] }
		expect(classExtrusion(scale, 0)).toBe(VTT_MIN_EXTRUSION_M)
	})
})

describe('legend helpers', () => {
	it('builds the legend gradient from exactly the class colours, in order', () => {
		const scale = buildColorScale(dim('overland_water_depth'), [0.02, 0.2, 1.4])
		const css = legendGradientCss(scale)
		const found = [...css.matchAll(/rgb\(\d+, \d+, \d+\)/g)].map((m) => m[0])
		// Hard stops repeat each colour at the start and end of its band.
		expect([...new Set(found)]).toEqual(scale.classes.map((c) => c.color))
	})

	it('has no gradient for an empty scale', () => {
		expect(legendGradientCss(buildColorScale(dim('transpiration'), [5, 5], S1))).toBeNull()
	})

	it('labels fixed classes at every break, the last one open-ended', () => {
		const scale = buildColorScale(dim('overland_water_depth'), [0.02, 0.2, 1.4])
		const ticks = legendTicks(scale)
		expect(ticks.map((t) => t.label)).toEqual(['0.01', '0.05', '0.1', '0.3', '0.5', '≥ 1'])
		expect(ticks[0].at).toBe(0)
	})

	it("labels a scenario scale from the scenario's breaks, the same in every frame", () => {
		const { breaks, upper } = S1_TRANSPIRATION
		const fmt = formatLegendValue
		const early = legendTicks(buildColorScale(dim('transpiration'), transpirationFrame(0.0149), S1))
		const late = legendTicks(buildColorScale(dim('transpiration'), transpirationFrame(0.178), S1))

		expect(late).toEqual(early)
		// Every second boundary of the eight classes, so labels do not overlap,
		// and no ≤ / ≥ on the ends: in the panel's 301 px bar the prefix left a
		// 1 px gap to the next label (measured headless, 2026-10-08).
		expect(early).toEqual([
			{ label: fmt(breaks[0]), at: 0 },
			{ label: fmt(breaks[2]), at: 2 / 8 },
			{ label: fmt(breaks[4]), at: 4 / 8 },
			{ label: fmt(breaks[6]), at: 6 / 8 },
			{ label: fmt(upper), at: 1 },
		])
	})

	it('labels every boundary of a short scale, without repeating a single-value last class', () => {
		// Scenario 1 upper storage: classes [0.0009, 0.001) and [0.001, 0.001].
		const scale = buildColorScale(
			dim('upper_storage_water_depth'),
			Float32Array.from([0, 0.001]),
			S1
		)
		expect(legendTicks(scale)).toEqual([
			{ label: '0.0009', at: 0 },
			{ label: '0.001', at: 0.5 },
		])
	})

	it('formats values to three significant digits', () => {
		expect(formatLegendValue(0.067812)).toBe('0.0678')
		expect(formatLegendValue(293.54)).toBe('294')
		expect(formatLegendValue(0)).toBe('0')
	})
})

describe('dimension constants', () => {
	it('defaults to transpiration, which is a known dimension', () => {
		expect(VTT_DEFAULT_DIMENSION).toBe('transpiration')
		expect(VTT_DIMENSIONS.map((d) => d.key)).toContain(VTT_DEFAULT_DIMENSION)
	})

	it('gives every dimension a palette and scale spec', () => {
		for (const d of VTT_DIMENSIONS) {
			expect(['YlGn', 'Blues']).toContain(d.palette)
			expect(['fixed', 'scenario']).toContain(d.scale.kind)
		}
	})

	it('draws water depths in blue and transpiration in green', () => {
		// Lauri: green for flooding felt wrong. The lightest blue is clipped so the
		// lowest class does not wash out over the pale base map.
		const dominant = ([r, g, b]) => (b >= r && b >= g ? 'blue' : g >= r && g >= b ? 'green' : 'red')
		const depth = buildColorScale(dim('overland_water_depth'), [0.02, 0.2, 1.4])
		const storage = buildColorScale(
			dim('upper_storage_water_depth'),
			Float32Array.from([0, 0.0009, 0.001]),
			S1
		)
		const transpiration = buildColorScale(dim('transpiration'), transpirationFrame(0.17), S1)

		for (const c of [...depth.classes, ...storage.classes]) expect(dominant(c.rgb)).toBe('blue')
		for (const c of transpiration.classes) expect(dominant(c.rgb)).toBe('green')
		expect(VTT_PALETTE_T_RANGES[dim('overland_water_depth').palette][0]).toBeGreaterThanOrEqual(0.3)
	})

	it('has strictly ascending depth breaks starting at the wet threshold', () => {
		expect(VTT_DEPTH_CLASS_BREAKS_M[0]).toBe(VTT_WET_DEPTH_THRESHOLD_M)
		for (let i = 1; i < VTT_DEPTH_CLASS_BREAKS_M.length; i++) {
			expect(VTT_DEPTH_CLASS_BREAKS_M[i]).toBeGreaterThan(VTT_DEPTH_CLASS_BREAKS_M[i - 1])
		}
	})
})
