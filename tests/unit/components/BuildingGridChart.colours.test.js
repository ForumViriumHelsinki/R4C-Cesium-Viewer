/**
 * BuildingGridChart draws one series, the selected building's age distribution,
 * so it takes the focus colour every other chart gives the selected building
 * (#1162).
 */

import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

const makeSelection = () => {
	const selection = {}
	for (const name of ['append', 'attr', 'call', 'selectAll', 'data', 'enter', 'on', 'style']) {
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
		this.createTooltip = vi.fn()
		this.addTitle = vi.fn()
	})
	return { default: Plot }
})

// jsdom has no layout; without a real width the chart returns before drawing.
vi.mock('@/composables/useChartSize.js', () => ({
	useChartSize: () => ({ width: { value: 400 }, height: { value: 250 }, cleanup: vi.fn() }),
}))

vi.mock('@/stores/globalStore.js', () => ({
	useGlobalStore: () => ({ buildingAddress: 'Testikatu 1' }),
}))

const AGE_BANDS = ['0_9', '10_19', '20_29', '30_39', '40_49', '50_59', '60_69', '70_79', 'over80']
const gridBuildingProps = Object.fromEntries(
	AGE_BANDS.map((band) => [`pop_d_${band}`, { getValue: () => 0.1 }])
)
vi.mock('@/stores/propsStore.js', () => ({
	usePropsStore: () => ({ gridBuildingProps }),
}))

import BuildingGridChart from '@/components/BuildingGridChart.vue'
import { CHART_SERIES_COLORS } from '@/constants/chartColors.js'
import Plot from '@/services/plot.js'

describe('BuildingGridChart — series colour', { tags: ['@unit'] }, () => {
	let wrapper

	afterEach(() => {
		if (wrapper) wrapper.unmount()
	})

	it("fills the selected building's bars with the focus colour", () => {
		wrapper = mount(BuildingGridChart, { attachTo: document.body })
		const plot = vi.mocked(Plot).mock.instances.at(-1)
		const svg = vi.mocked(plot.createSVGElement).mock.results[0].value

		expect(svg.data.mock.calls[0][0]).toHaveLength(AGE_BANDS.length)
		const fills = svg.attr.mock.calls.filter(([name]) => name === 'fill').map(([, value]) => value)
		expect(fills).toEqual([CHART_SERIES_COLORS.focus])
	})
})
