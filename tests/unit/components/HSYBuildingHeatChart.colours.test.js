/**
 * HSYBuildingHeatChart draws the selected building in the focus colour and the
 * postal-code average in the baseline colour, and its legend names each (#1162).
 */

import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'

const makeSelection = () => {
	const selection = {}
	for (const name of ['append', 'attr', 'call', 'selectAll', 'data', 'enter', 'on', 'style']) {
		selection[name] = vi.fn(() => selection)
	}
	// d3's join(enter, update, exit): run the enter branch, where the fill is set.
	selection.join = vi.fn((enter) => {
		enter(selection)
		return selection
	})
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
		this.addLegend = vi.fn()
	})
	return { default: Plot }
})

// jsdom has no layout; without a real width the chart returns before drawing.
vi.mock('@/composables/useChartSize.js', () => ({
	useChartSize: () => ({ width: { value: 400 }, height: { value: 250 }, cleanup: vi.fn() }),
}))

vi.mock('@/services/coldarea.js', () => ({
	default: vi.fn(function () {
		this.loadColdAreas = vi.fn(() => Promise.resolve())
	}),
}))

vi.mock('@/services/datasource.js', () => ({
	default: vi.fn(function () {
		this.changeDataSourceShowByName = vi.fn(() => Promise.resolve())
	}),
}))

vi.mock('@/stores/globalStore.js', () => ({
	useGlobalStore: () => ({
		buildingAddress: 'Testikatu 1',
		postalcode: '00100',
		level: 'building',
		view: 'capitalRegion',
	}),
}))

vi.mock('@/stores/propsStore.js', () => ({
	usePropsStore: () => ({
		// Below the cold-area threshold, so the chart does not load cold areas.
		buildingHeatExposure: 20,
		buildingHeatTimeseries: [{ date: '2021-07-01', avg_temp_c: 30 }],
		postalcodeHeatTimeseries: [[{ date: '2021-07-01', avg_temp_c: 28 }]],
	}),
}))

// storeToRefs keeps only ref or reactive members, so the switch's field is a ref.
vi.mock('@/stores/toggleStore.js', () => {
	const store = reactive({
		hideColdAreas: ref(false),
		capitalRegionCold: false,
		setHideColdAreas: () => {},
	})
	return { useToggleStore: () => store }
})

import HSYBuildingHeatChart from '@/components/HSYBuildingHeatChart.vue'
import { CHART_SERIES_COLORS } from '@/constants/chartColors.js'
import Plot from '@/services/plot.js'

describe('HSYBuildingHeatChart — series colours', { tags: ['@unit'] }, () => {
	let wrapper

	afterEach(() => {
		if (wrapper) wrapper.unmount()
	})

	const mountChart = () => {
		wrapper = mount(HSYBuildingHeatChart, {
			attachTo: document.body,
			global: { stubs: { Timeline: true, 'v-switch': true } },
		})
		const plot = vi.mocked(Plot).mock.instances.at(-1)
		const svg = vi.mocked(plot.createSVGElement).mock.results[0].value
		return { plot, svg }
	}

	it('fills building bars with the focus colour and postal-code bars with the baseline', () => {
		const { svg } = mountChart()
		const bars = svg.data.mock.calls[0][0]
		const fill = svg.attr.mock.calls.find(([name]) => name === 'fill')[1]

		expect(bars.map((d) => d.type)).toEqual(['building', 'postalcode'])
		expect(fill(bars[0])).toBe(CHART_SERIES_COLORS.focus)
		expect(fill(bars[1])).toBe(CHART_SERIES_COLORS.baseline)
	})

	it('names the building and the postal-code average in the legend, in their colours', () => {
		const { plot, svg } = mountChart()

		expect(plot.addLegend).toHaveBeenCalledTimes(1)
		const [legendSvg, items] = plot.addLegend.mock.calls[0]
		expect(legendSvg).toBe(svg)
		expect(items).toEqual([
			{ name: 'Testikatu 1', color: CHART_SERIES_COLORS.focus },
			{ name: 'Average of 00100', color: CHART_SERIES_COLORS.baseline },
		])
	})
})
