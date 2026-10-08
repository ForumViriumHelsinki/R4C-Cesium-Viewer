/**
 * @module utils/vttFloodColorScale
 * Colour classes for the VTT flood-simulation layer. Pure: no Cesium import.
 *
 * {@link buildColorScale} is the single palette function: the renderer reads
 * `classes[].rgb` and the panel legend reads `classes[].color` from the same
 * scale object, so the map and the legend cannot drift apart.
 *
 * Every dimension maps to a few discrete classes rather than a continuous
 * ramp. VTT values are bimodal (transpiration: a fixed set of zero cells plus
 * a tight cluster), heavy-tailed (overland depth) or two-valued (upper storage),
 * so a linear min/max ramp puts nearly every cell at one end.
 *
 * Scale modes:
 *  - `empty`: nothing to draw. `reason` is `no-data`, `no-variation` (every
 *    cell has the same value, e.g. frame 0; robust scales only) or
 *    `all-hidden` (no cell passes the dimension's `hideBelow`).
 *  - `mask`: the shown cells share one value; one class.
 *  - `classes`: fixed physical breaks or a robust (quantile-bounded) domain
 *    split into equal-count classes. Equal-width classes put 67–84% of shown
 *    transpiration cells in the top class on real frames, because most cells
 *    sit in a narrow cluster near the maximum.
 */

import {
	VTT_COLOR_STEPS,
	VTT_MAX_EXTRUSION_M,
	VTT_MIN_EXTRUSION_M,
	VTT_PALETTE_T_RANGE,
} from '../constants/vttFlood'
import { interpolateYlGn, interpolateYlGnBu, quantileSorted } from './d3'

/**
 * @typedef {Object} VttColorClass
 * @property {number} lo - Inclusive lower bound.
 * @property {number} hi - Upper bound (`Infinity` for an open-ended last class).
 * @property {string} color - CSS colour, `rgb(r, g, b)`.
 * @property {readonly [number, number, number]} rgb - Colour bytes 0..255.
 */

/**
 * @typedef {Object} VttColorScale
 * @property {'empty'|'mask'|'classes'} mode
 * @property {'no-data'|'no-variation'|'all-hidden'} [reason] - `empty` only.
 * @property {number} [value] - The single value (`no-variation` and `mask`).
 * @property {number} [threshold] - The hiding threshold (`all-hidden` only).
 * @property {'fixed'|'robust'} [kind] - `classes` only.
 * @property {VttColorClass[]} classes - Empty when `mode` is `empty`.
 * @property {number} hideBelow - Values at or below this are hidden.
 * @property {boolean} clippedLow - Values below the first class were folded into it.
 * @property {boolean} clippedHigh - Values above the last class were folded into it.
 * @property {number} totalCount
 * @property {number} shownCount
 * @property {number} hiddenCount
 */

const INTERPOLATORS = {
	YlGn: interpolateYlGn,
	YlGnBu: interpolateYlGnBu,
}

/** Position on the palette ramp (0..1 within VTT_PALETTE_T_RANGE) used for a mask. */
const MASK_RAMP_POSITION = 0.75

const RGB_PATTERN = /^rgb\((\d+), (\d+), (\d+)\)$/

/**
 * @param {string} palette
 * @param {number} position - 0..1 within VTT_PALETTE_T_RANGE.
 * @returns {{color: string, rgb: [number, number, number]}}
 */
function paletteColor(palette, position) {
	const interpolate = INTERPOLATORS[palette]
	if (!interpolate) throw new Error(`Unknown VTT palette "${palette}"`)
	const [t0, t1] = VTT_PALETTE_T_RANGE
	const color = interpolate(t0 + position * (t1 - t0))
	const match = RGB_PATTERN.exec(color)
	if (!match) throw new Error(`Unexpected colour "${color}" from palette ${palette}`)
	return { color, rgb: [Number(match[1]), Number(match[2]), Number(match[3])] }
}

/**
 * @param {string} palette
 * @param {number[][]} bounds - [lo, hi] per class.
 * @returns {VttColorClass[]}
 */
function makeClasses(palette, bounds) {
	const n = bounds.length
	return bounds.map(([lo, hi], i) => ({ lo, hi, ...paletteColor(palette, (i + 0.5) / n) }))
}

/**
 * Build the colour scale for one dimension of one frame.
 *
 * @param {import('../constants/vttFlood').VttDimension} dimension
 * @param {ArrayLike<number>} values - One value per cell; non-finite values are hidden.
 * @returns {VttColorScale}
 */
export function buildColorScale(dimension, values) {
	const { hideBelow, palette, scale: spec } = dimension
	const totalCount = values.length
	const base = { hideBelow, clippedLow: false, clippedHigh: false, totalCount }

	let min = Number.POSITIVE_INFINITY
	let max = Number.NEGATIVE_INFINITY
	const shown = []
	for (let i = 0; i < values.length; i++) {
		const v = values[i]
		if (!Number.isFinite(v)) continue
		if (v < min) min = v
		if (v > max) max = v
		if (v > hideBelow) shown.push(v)
	}
	const counts = { shownCount: shown.length, hiddenCount: totalCount - shown.length }

	if (min > max) return { ...base, ...counts, mode: 'empty', reason: 'no-data', classes: [] }
	// A uniform frame has no per-frame range to colour. Fixed physical classes
	// still apply (a uniform 40 cm flood is drawn), so only robust scales stop here.
	if (min === max && spec.kind === 'robust') {
		return { ...base, ...counts, mode: 'empty', reason: 'no-variation', value: min, classes: [] }
	}
	if (shown.length === 0) {
		return {
			...base,
			...counts,
			mode: 'empty',
			reason: 'all-hidden',
			threshold: hideBelow,
			classes: [],
		}
	}

	const sorted = Float64Array.from(shown).sort()
	const shownMin = sorted[0]
	const shownMax = sorted[sorted.length - 1]

	if (spec.kind === 'fixed') {
		const { breaks } = spec
		const bounds = breaks.map((lo, i) => [lo, breaks[i + 1] ?? Number.POSITIVE_INFINITY])
		return {
			...base,
			...counts,
			mode: 'classes',
			kind: 'fixed',
			classes: makeClasses(palette, bounds),
			clippedLow: shownMin < breaks[0],
			clippedHigh: true,
		}
	}

	let qLo = spec.lowerQuantile
	let qHi = spec.upperQuantile
	let lo = quantileSorted(sorted, qLo) ?? shownMin
	let hi = quantileSorted(sorted, qHi) ?? shownMax
	if (!(hi > lo)) {
		qLo = 0
		qHi = 1
		lo = shownMin
		hi = shownMax
	}
	if (!(hi > lo)) {
		return {
			...base,
			...counts,
			mode: 'mask',
			value: lo,
			classes: [{ lo, hi: lo, ...paletteColor(palette, MASK_RAMP_POSITION) }],
		}
	}

	// Equal-count class starts: each class holds about the same share of the
	// cells inside the domain. Starts that coincide (many cells tied on one
	// value) merge, so a tie is one class rather than several empty ones.
	const starts = [lo]
	for (let i = 1; i < VTT_COLOR_STEPS; i++) {
		const start = quantileSorted(sorted, qLo + ((qHi - qLo) * i) / VTT_COLOR_STEPS) ?? hi
		if (start > starts[starts.length - 1]) starts.push(start)
	}
	const bounds = starts.map((start, i) => [start, starts[i + 1] ?? hi])
	return {
		...base,
		...counts,
		mode: 'classes',
		kind: 'robust',
		classes: makeClasses(palette, bounds),
		clippedLow: shownMin < lo,
		clippedHigh: shownMax > hi,
	}
}

/**
 * Class of a cell value, or -1 when the cell is hidden. Values outside the
 * class range fall into the first or last class.
 *
 * @param {VttColorScale} scale
 * @param {number} value
 * @returns {number}
 */
export function classIndex(scale, value) {
	const { classes } = scale
	if (classes.length === 0 || !Number.isFinite(value) || value <= scale.hideBelow) return -1
	// Last class whose lower bound is <= value (binary search; classes ascend).
	let low = 0
	let high = classes.length - 1
	while (low < high) {
		const mid = (low + high + 1) >> 1
		if (classes[mid].lo <= value) low = mid
		else high = mid - 1
	}
	return low
}

/**
 * Extrusion height for a class, rising linearly from VTT_MIN_EXTRUSION_M to
 * VTT_MAX_EXTRUSION_M so column height and colour always agree.
 *
 * @param {VttColorScale} scale
 * @param {number} index - Class index from {@link classIndex}.
 * @returns {number} Metres.
 */
export function classExtrusion(scale, index) {
	const n = scale.classes.length
	if (scale.mode !== 'classes' || n < 2) return VTT_MIN_EXTRUSION_M
	return VTT_MIN_EXTRUSION_M + (index / (n - 1)) * (VTT_MAX_EXTRUSION_M - VTT_MIN_EXTRUSION_M)
}

/**
 * Format a legend value to three significant digits.
 *
 * @param {number} value
 * @returns {string}
 */
export function formatLegendValue(value) {
	return String(Number(value.toPrecision(3)))
}

/**
 * CSS gradient with a hard-edged band per class, for the legend bar.
 *
 * @param {VttColorScale} scale
 * @returns {string|null} `null` when there are no classes.
 */
export function legendGradientCss(scale) {
	const n = scale.classes.length
	if (n === 0) return null
	const pct = (x) => `${Number(((x / n) * 100).toFixed(2))}%`
	const stops = scale.classes.map((c, i) => `${c.color} ${pct(i)} ${pct(i + 1)}`)
	return `linear-gradient(to right, ${stops.join(', ')})`
}

/**
 * Legend tick labels with their position along the bar (0..1).
 * Fixed scales label every class's lower bound; robust scales label both ends,
 * prefixed with ≤ / ≥ where values were clipped into the end class.
 *
 * @param {VttColorScale} scale
 * @returns {Array<{label: string, at: number}>}
 */
export function legendTicks(scale) {
	const { classes } = scale
	const n = classes.length
	if (scale.mode !== 'classes') return []
	if (scale.kind === 'fixed') {
		return classes.map((c, i) => ({
			label: i === n - 1 ? `≥ ${formatLegendValue(c.lo)}` : formatLegendValue(c.lo),
			at: i / n,
		}))
	}
	return [
		{ label: `${scale.clippedLow ? '≤ ' : ''}${formatLegendValue(classes[0].lo)}`, at: 0 },
		{ label: `${scale.clippedHigh ? '≥ ' : ''}${formatLegendValue(classes[n - 1].hi)}`, at: 1 },
	]
}
