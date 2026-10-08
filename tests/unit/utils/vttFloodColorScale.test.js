/**
 * Colour classes for the VTT flood layer (#issue 5: "everything is either red or
 * blue"). A linear min/max blue→red ramp over VTT's bimodal and heavy-tailed
 * distributions put almost every cell at one end. The distributions below are
 * shaped after production frames measured on 2026-10-08.
 */
import { describe, expect, it } from 'vitest'
import {
	VTT_COLOR_STEPS,
	VTT_DEFAULT_DIMENSION,
	VTT_DEPTH_CLASS_BREAKS_M,
	VTT_DIMENSIONS,
	VTT_MAX_EXTRUSION_M,
	VTT_MIN_EXTRUSION_M,
	VTT_WET_DEPTH_THRESHOLD_M,
} from '@/constants/vttFlood.ts'
import {
	buildColorScale,
	classExtrusion,
	classIndex,
	formatLegendValue,
	legendGradientCss,
	legendTicks,
} from '@/utils/vttFloodColorScale.js'

const dim = (key) => VTT_DIMENSIONS.find((d) => d.key === key)

/** Transpiration at scenario 1 frame 120: 37% zeros, the rest bunched near the top. */
function transpirationLike() {
	const values = []
	for (let i = 0; i < 370; i++) values.push(0)
	for (let i = 0; i < 63; i++) values.push(0.005 + (0.055 * i) / 62) // tail 0.005..0.06
	for (let i = 0; i < 567; i++) values.push(0.064 + (0.004 * i) / 566) // cluster 0.064..0.068
	return values
}

describe('buildColorScale', () => {
	it('spreads a bimodal transpiration frame over several classes and hides zero cells', () => {
		const values = transpirationLike()
		const scale = buildColorScale(dim('transpiration'), values)

		expect(scale.mode).toBe('classes')
		expect(scale.classes).toHaveLength(VTT_COLOR_STEPS)
		expect(scale.hiddenCount).toBe(370)
		expect(scale.shownCount).toBe(630)

		const used = new Set(values.filter((v) => v > 0).map((v) => classIndex(scale, v)))
		expect(used.size).toBeGreaterThan(VTT_COLOR_STEPS / 2)
		expect(classIndex(scale, 0)).toBe(-1)
	})

	it('reports a frame where every cell is equal as no-variation (frame 0, canopy = 5)', () => {
		const scale = buildColorScale(dim('canopy_air_temperature'), new Array(50).fill(5))
		expect(scale).toMatchObject({ mode: 'empty', reason: 'no-variation', value: 5, totalCount: 50 })
	})

	it('reports an all-zero frame as no-variation even when zeros are hidden', () => {
		const scale = buildColorScale(dim('transpiration'), new Float32Array(20))
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

	it('shows a two-valued upper storage frame as a single-colour mask', () => {
		const values = [0, 0, 0.001, 0.001, 0.001, 0]
		const scale = buildColorScale(dim('upper_storage_water_depth'), values)

		expect(scale.mode).toBe('mask')
		expect(scale.shownCount).toBe(3)
		expect(scale.classes).toHaveLength(1)
		expect(classIndex(scale, 0.001)).toBe(0)
		expect(classIndex(scale, 0)).toBe(-1)
	})

	it('clips outliers into the end classes and flags it', () => {
		const values = Array.from({ length: 200 }, (_, i) => 1 + i / 199)
		values.push(1000) // one extreme cell
		values.push(0.001)
		const scale = buildColorScale(dim('transpiration'), values)

		expect(scale.mode).toBe('classes')
		expect(scale.clippedHigh).toBe(true)
		expect(scale.clippedLow).toBe(true)
		expect(classIndex(scale, 1000)).toBe(VTT_COLOR_STEPS - 1)
		expect(classIndex(scale, 0.001)).toBe(0)
		// The outlier no longer stretches the domain: the middle of the bulk
		// lands mid-scale instead of in the first class.
		expect(classIndex(scale, 1.5)).toBeGreaterThan(1)
	})

	it('ignores non-finite values', () => {
		const scale = buildColorScale(dim('transpiration'), [Number.NaN, 0.1, 0.2, 0.3])
		expect(scale.mode).toBe('classes')
		expect(scale.hiddenCount).toBe(1)
		expect(classIndex(scale, Number.NaN)).toBe(-1)
	})

	it('reports an empty frame as no-data', () => {
		expect(buildColorScale(dim('transpiration'), [])).toMatchObject({
			mode: 'empty',
			reason: 'no-data',
		})
	})

	it('gives every class an rgb colour string and matching bytes', () => {
		const scale = buildColorScale(dim('transpiration'), transpirationLike())
		for (const c of scale.classes) {
			expect(c.color).toMatch(/^rgb\(\d+, \d+, \d+\)$/)
			expect(c.color).toBe(`rgb(${c.rgb[0]}, ${c.rgb[1]}, ${c.rgb[2]})`)
		}
		// Sequential ramp: classes are distinct colours.
		expect(new Set(scale.classes.map((c) => c.color)).size).toBe(scale.classes.length)
	})
})

describe('classExtrusion', () => {
	it('rises monotonically from the minimum to the maximum extrusion', () => {
		const scale = buildColorScale(dim('transpiration'), transpirationLike())
		const heights = scale.classes.map((_, i) => classExtrusion(scale, i))

		expect(heights[0]).toBeGreaterThanOrEqual(VTT_MIN_EXTRUSION_M)
		expect(heights.at(-1)).toBe(VTT_MAX_EXTRUSION_M)
		for (let i = 1; i < heights.length; i++) expect(heights[i]).toBeGreaterThan(heights[i - 1])
	})

	it('uses the minimum extrusion for a mask', () => {
		const scale = buildColorScale(dim('upper_storage_water_depth'), [0, 0.001, 0.001])
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
		expect(legendGradientCss(buildColorScale(dim('transpiration'), [5, 5]))).toBeNull()
	})

	it('labels fixed classes at every break, the last one open-ended', () => {
		const scale = buildColorScale(dim('overland_water_depth'), [0.02, 0.2, 1.4])
		const ticks = legendTicks(scale)
		expect(ticks.map((t) => t.label)).toEqual(['0.01', '0.05', '0.1', '0.3', '0.5', '≥ 1'])
		expect(ticks[0].at).toBe(0)
	})

	it('labels a robust scale at both ends, marking clipped ends', () => {
		const values = Array.from({ length: 200 }, (_, i) => 1 + i / 199)
		values.push(1000)
		const scale = buildColorScale(dim('transpiration'), values)
		const ticks = legendTicks(scale)
		expect(ticks).toHaveLength(2)
		expect(ticks[0]).toMatchObject({ at: 0 })
		expect(ticks[1]).toMatchObject({ at: 1 })
		expect(ticks[1].label.startsWith('≥ ')).toBe(true)
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
			expect(['YlGn', 'YlGnBu']).toContain(d.palette)
			expect(['fixed', 'robust']).toContain(d.scale.kind)
		}
	})

	it('has strictly ascending depth breaks starting at the wet threshold', () => {
		expect(VTT_DEPTH_CLASS_BREAKS_M[0]).toBe(VTT_WET_DEPTH_THRESHOLD_M)
		for (let i = 1; i < VTT_DEPTH_CLASS_BREAKS_M.length; i++) {
			expect(VTT_DEPTH_CLASS_BREAKS_M[i]).toBeGreaterThan(VTT_DEPTH_CLASS_BREAKS_M[i - 1])
		}
	})
})
