/**
 * Equal-count class breaks over a robust (quantile-bounded) domain. Pure.
 *
 * Used by derive-class-breaks.mjs, which pools the values of sampled frames
 * per scenario and writes the result to src/constants/vttFloodClassBreaks.ts,
 * and by tests/unit/utils/vttFloodColorScale.test.js. The app reads only the
 * generated breaks.
 */

import { quantileSorted } from 'd3-array'

/**
 * @typedef {Object} VttClassBreaks
 * @property {readonly number[]} breaks - Strictly increasing class lower bounds.
 * @property {number} upper - Upper end of the last class; `>= breaks.at(-1)`.
 *   Equal to `breaks[0]` (and `breaks` has one entry) when every value in the
 *   domain is the same.
 */

/**
 * Split the domain between two quantiles of `sorted` into up to `steps`
 * classes holding about the same number of values each. Class starts that
 * coincide (many values tied on one) merge, so a tie is one class rather than
 * several empty ones. When the quantiles coincide the domain widens to
 * min..max.
 *
 * @param {ArrayLike<number>} sorted - Ascending, finite, non-empty.
 * @param {number} lowerQuantile - 0..1.
 * @param {number} upperQuantile - 0..1, above `lowerQuantile`.
 * @param {number} steps - Maximum number of classes.
 * @returns {VttClassBreaks}
 */
export function equalCountBreaks(sorted, lowerQuantile, upperQuantile, steps) {
	if (sorted.length === 0) throw new Error('equalCountBreaks needs at least one value')
	const min = sorted[0]
	const max = sorted[sorted.length - 1]
	let qLo = lowerQuantile
	let qHi = upperQuantile
	let lo = quantileSorted(sorted, qLo) ?? min
	let hi = quantileSorted(sorted, qHi) ?? max
	if (!(hi > lo)) {
		qLo = 0
		qHi = 1
		lo = min
		hi = max
	}
	if (!(hi > lo)) return { breaks: [lo], upper: lo }

	const breaks = [lo]
	for (let i = 1; i < steps; i++) {
		const start = quantileSorted(sorted, qLo + ((qHi - qLo) * i) / steps) ?? hi
		if (start > breaks[breaks.length - 1]) breaks.push(start)
	}
	return { breaks, upper: hi }
}
