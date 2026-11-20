/**
 * Plot.addLegend draws one swatch and one label per series, the shared legend the
 * selected-vs-reference charts use to say which colour is which (#1162).
 */

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { CHART_SERIES_COLORS } from '@/constants/chartColors.js'
import Plot from '@/services/plot.js'
import * as d3 from '@/utils/d3'

describe('Plot.addLegend', { tags: ['@unit'] }, () => {
	let container

	beforeEach(() => {
		setActivePinia(createPinia())
		document.body.innerHTML = ''
		container = document.createElement('div')
		document.body.appendChild(container)
	})

	it('draws a swatch in each series colour next to its name, stacked in order', () => {
		const plot = new Plot()
		const svg = d3.select(container).append('svg').append('g')

		plot.addLegend(
			svg,
			[
				{ name: 'Testikatu 1', color: CHART_SERIES_COLORS.focus },
				{ name: 'Average of 00100', color: CHART_SERIES_COLORS.baseline },
			],
			30,
			-40,
			16
		)

		const legend = container.querySelector('g.chart-legend')
		expect(legend.getAttribute('transform')).toBe('translate(30, -40)')
		const swatches = [...legend.querySelectorAll('rect.legend-item')]
		const labels = [...legend.querySelectorAll('text.legend-text')]
		expect(swatches.map((r) => r.getAttribute('fill'))).toEqual([
			CHART_SERIES_COLORS.focus,
			CHART_SERIES_COLORS.baseline,
		])
		expect(swatches.map((r) => r.getAttribute('y'))).toEqual(['0', '16'])
		expect(labels.map((t) => t.textContent)).toEqual(['Testikatu 1', 'Average of 00100'])
		// The legend sits outside the white plot area, on the panel surface, so its
		// text follows the theme's text colour instead of SVG's default black.
		expect(labels.map((t) => t.getAttribute('fill'))).toEqual(['currentColor', 'currentColor'])
	})
})
