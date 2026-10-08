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
 * Classes never depend on the frame being drawn, so a value keeps its colour
 * and the legend keeps its labels while the user scrubs frames:
 *  - `fixed` dimensions use physical breaks from constants/vttFlood.ts.
 *  - `scenario` dimensions use the breaks derived per data source and scenario
 *    in constants/vttFloodClassBreaks.ts: equal-count classes over the pooled
 *    values of sampled frames. Equal-width classes put 67–84% of shown
 *    transpiration cells in the top class on real frames, because most cells
 *    sit in a narrow cluster near the maximum.
 *
 * Scale modes:
 *  - `empty`: nothing to draw. `reason` is `no-data`, `no-variation` (every
 *    cell has the same value, e.g. frame 0; scenario scales only) or
 *    `all-hidden` (no cell passes the dimension's `hideBelow`).
 *  - `mask`: every shown value in the scenario's sampled frames was the same; one class.
 *  - `classes`: the dimension's fixed or scenario breaks.
 */

import {
	VTT_MAX_EXTRUSION_M,
	VTT_MIN_EXTRUSION_M,
	VTT_PALETTE_T_RANGES,
} from '../constants/vttFlood'
import { VTT_CLASS_BREAKS } from '../constants/vttFloodClassBreaks'
import { interpolateBlues, interpolateYlGn } from './d3'

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
 * @property {'fixed'|'scenario'} [kind] - `classes` only.
 * @property {VttColorClass[]} classes - Empty when `mode` is `empty`.
 * @property {number} hideBelow - Values at or below this are hidden.
 * @property {boolean} clippedLow - Values below the first class were folded into it.
 * @property {boolean} clippedHigh - Values above the last class were folded into it.
 * @property {number} totalCount
 * @property {number} shownCount
 * @property {number} hiddenCount
 */

/**
 * Where a frame came from, which selects its scenario breaks. Frames from
 * services/vttFlood.js fetchSimulationFrame carry both fields.
 *
 * @typedef {Object} VttFrameSource
 * @property {string} [scenarioId]
 * @property {boolean} [synthetic] - Generated locally (the `vttFloodSyntheticData` flag).
 */

const INTERPOLATORS = {
	YlGn: interpolateYlGn,
	Blues: interpolateBlues,
}

/** Position on the palette ramp (0..1 within the palette's VTT_PALETTE_T_RANGES) used for a mask. */
const MASK_RAMP_POSITION = 0.75

/** Most label intervals on a scenario legend; more ticks overlap in the panel. */
const LEGEND_MAX_INTERVALS = 4

const RGB_PATTERN = /^rgb\((\d+), (\d+), (\d+)\)$/

/**
 * @param {string} palette
 * @param {number} position - 0..1 within the palette's VTT_PALETTE_T_RANGES entry.
 * @returns {{color: string, rgb: [number, number, number]}}
 */
function paletteColor(palette, position) {
	const interpolate = INTERPOLATORS[palette]
	if (!interpolate) throw new Error(`Unknown VTT palette "${palette}"`)
	const [t0, t1] = VTT_PALETTE_T_RANGES[palette]
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
 * The derived breaks of one dimension for a frame's data source and scenario.
 *
 * @param {VttFrameSource | undefined} source
 * @param {string} key - Dimension key.
 * @returns {import('../constants/vttFloodClassBreaks').VttClassBreaks}
 * @throws {Error} When no breaks were derived for it: scenarios are an
 *   allow-list, so a missing entry means the generated module is stale.
 */
function scenarioClassBreaks(source, key) {
	const set = source?.synthetic ? 'synthetic' : 'vtt'
	const entry = VTT_CLASS_BREAKS[set][String(source?.scenarioId)]?.[key]
	if (!entry) {
		throw new Error(
			`No ${set} colour classes for scenario "${source?.scenarioId}" dimension "${key}". Run bun scripts/vtt-flood/derive-class-breaks.mjs.`
		)
	}
	return entry
}

/**
 * Build the colour scale for one dimension of one frame.
 *
 * @param {import('../constants/vttFlood').VttDimension} dimension
 * @param {ArrayLike<number>} values - One value per cell; non-finite values are hidden.
 * @param {VttFrameSource} [source] - Required for `scenario` dimensions.
 * @returns {VttColorScale}
 */
export function buildColorScale(dimension, values, source) {
	const { hideBelow, palette, scale: spec } = dimension
	const totalCount = values.length
	const base = { hideBelow, clippedLow: false, clippedHigh: false, totalCount }

	let min = Number.POSITIVE_INFINITY
	let max = Number.NEGATIVE_INFINITY
	let shownMin = Number.POSITIVE_INFINITY
	let shownMax = Number.NEGATIVE_INFINITY
	let shownCount = 0
	for (let i = 0; i < values.length; i++) {
		const v = values[i]
		if (!Number.isFinite(v)) continue
		if (v < min) min = v
		if (v > max) max = v
		if (v > hideBelow) {
			shownCount++
			if (v < shownMin) shownMin = v
			if (v > shownMax) shownMax = v
		}
	}
	const counts = { shownCount, hiddenCount: totalCount - shownCount }

	if (min > max) return { ...base, ...counts, mode: 'empty', reason: 'no-data', classes: [] }
	// A uniform frame (frame 0, or canopy temperature, constant in every frame)
	// has nothing to tell apart. Fixed physical classes still apply (a uniform
	// 40 cm flood is drawn), so only scenario scales stop here.
	if (min === max && spec.kind === 'scenario') {
		return { ...base, ...counts, mode: 'empty', reason: 'no-variation', value: min, classes: [] }
	}
	if (shownCount === 0) {
		return {
			...base,
			...counts,
			mode: 'empty',
			reason: 'all-hidden',
			threshold: hideBelow,
			classes: [],
		}
	}

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

	const { breaks, upper } = scenarioClassBreaks(source, dimension.key)
	if (breaks.length === 1 && upper === breaks[0]) {
		return {
			...base,
			...counts,
			mode: 'mask',
			value: upper,
			classes: [{ lo: upper, hi: upper, ...paletteColor(palette, MASK_RAMP_POSITION) }],
		}
	}
	const bounds = breaks.map((lo, i) => [lo, breaks[i + 1] ?? upper])
	return {
		...base,
		...counts,
		mode: 'classes',
		kind: 'scenario',
		classes: makeClasses(palette, bounds),
		clippedLow: shownMin < breaks[0],
		clippedHigh: shownMax > upper,
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
 * Legend tick labels with their position along the bar (0..1). They depend
 * only on the classes, so they stay put while scrubbing frames.
 * Fixed scales label every class's lower bound, the last one open-ended.
 * Scenario scales label class boundaries at most {@link LEGEND_MAX_INTERVALS}
 * intervals apart. Their end labels carry no ≤ / ≥: at the panel's 301 px bar
 * the prefix left a 1 px gap to the next label, so the panel caption says
 * instead that values beyond the ends fall into the end classes.
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
	const stride = Math.ceil(n / LEGEND_MAX_INTERVALS)
	const positions = []
	for (let j = 0; j <= n - stride; j += stride) positions.push(j)
	// The upper end, unless the last class holds a single value: its tick
	// would repeat the label before it.
	if (classes[n - 1].hi > classes[n - 1].lo || positions.at(-1) !== n - 1) positions.push(n)
	return positions.map((j) => {
		const value = j === n ? classes[n - 1].hi : classes[j].lo
		return { label: formatLegendValue(value), at: j / n }
	})
}
