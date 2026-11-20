/**
 * BuildingHeatChart draws the selected building in the focus colour and the
 * postal-code average in the baseline colour, the same roles every other chart
 * uses (#1162).
 */

import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A chainable stand-in for the d3 selection: every call returns the same object,
// so the test can read what the chart bound and styled.
const makeSelection = () => {
	const selection = {}
	for (const name of ['append', 'attr', 'call', 'selectAll', 'data', 'enter', 'style', 'text']) {
		selection[name] = vi.fn(() => selection)
	}
	return selection
}

vi.mock('@/services/plot.js', () => {
	const Plot = vi.fn(function () {
		this.initializePlotContainer = vi.fn()
		this.createSVGElement = vi.fn(() => makeSelection())
		this.createScaleBand = vi.fn(() => Object.assign(vi.fn(), { bandwidth: () => 10 }))
		this.createScaleLinear = vi.fn(() => vi.fn(() => 0))
		this.setupAxes = vi.fn()
		this.addTitle = vi.fn()
	})
	return { default: Plot }
})

// jsdom has no layout; without a real width the chart returns before drawing and
// the assertions below would have nothing to read.
vi.mock('@/composables/useChartSize.js', () => ({
	useChartSize: () => ({ width: { value: 400 }, height: { value: 250 }, cleanup: vi.fn() }),
}))

vi.mock('@/stores/globalStore.js', () => ({
	useGlobalStore: () => ({
		buildingAddress: 'Testikatu 1',
		postalcode: '00100',
		averageHeatExposure: 0.4,
	}),
}))

vi.mock('@/stores/propsStore.js', () => ({
	usePropsStore: () => ({ buildingHeatExposure: 0.6 }),
}))

import BuildingHeatChart from '@/components/BuildingHeatChart.vue'
import { CHART_SERIES_COLORS } from '@/constants/chartColors.js'
import Plot from '@/services/plot.js'

describe('BuildingHeatChart — series colours', { tags: ['@unit'] }, () => {
	let wrapper

	afterEach(() => {
		if (wrapper) wrapper.unmount()
	})

	it('fills the building bar with the focus colour and the postal code with the baseline', () => {
		wrapper = mount(BuildingHeatChart, { attachTo: document.body })
		const plot = vi.mocked(Plot).mock.instances.at(-1)
		const svg = vi.mocked(plot.createSVGElement).mock.results[0].value
		const bars = svg.data.mock.calls[0][0]
		const fill = svg.style.mock.calls.find(([name]) => name === 'fill')[1]

		expect(bars.map((d) => d.name)).toEqual(['Testikatu 1', '00100'])
		expect(fill(bars[0])).toBe(CHART_SERIES_COLORS.focus)
		expect(fill(bars[1])).toBe(CHART_SERIES_COLORS.baseline)
	})
})
