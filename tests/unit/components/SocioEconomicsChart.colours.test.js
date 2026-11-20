/**
 * SocioEconomicsChart draws the current area in the focus colour and the chosen
 * comparison area in the baseline colour, the roles the building charts give the
 * selected building and its postal-code average, and its legend names each
 * (#1162). Before, the current area was lightblue and the comparison orange.
 */

import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const makeSelection = () => {
	const selection = {}
	for (const name of [
		'append',
		'attr',
		'call',
		'selectAll',
		'data',
		'enter',
		'on',
		'style',
		'text',
	]) {
		selection[name] = vi.fn(() => selection)
	}
	return selection
}

vi.mock('@/services/plot.js', () => {
	const Plot = vi.fn(function () {
		this.initializePlotContainerForGrid = vi.fn()
		this.createSVGElement = vi.fn(() => makeSelection())
		this.createScaleBand = vi.fn(() => Object.assign(vi.fn(), { bandwidth: () => 10 }))
		this.createScaleLinear = vi.fn(() => vi.fn(() => 0))
		this.createTooltip = vi.fn()
		this.handleMouseover = vi.fn()
		this.handleMouseout = vi.fn()
		this.addTitleWithLink = vi.fn()
		this.addLegend = vi.fn()
	})
	return { default: Plot }
})

// jsdom has no layout; without a real width the chart returns before drawing.
vi.mock('@/composables/useChartSize.js', () => ({
	useChartSize: () => ({ width: { value: 400 }, height: { value: 250 }, cleanup: vi.fn() }),
}))

vi.mock('@/services/eventEmitter.js', () => ({
	eventBus: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}))

vi.mock('@/stores/globalStore.js', () => ({
	useGlobalStore: () => ({
		postalcode: '00100',
		view: 'helsinki',
		nameOfZone: 'Current Area',
		averageHeatExposure: 0.5,
	}),
}))

vi.mock('@/stores/toggleStore.js', () => ({
	useToggleStore: () => ({ capitalRegionCold: false, helsinkiView: true }),
}))

vi.mock('@/stores/propsStore.js', () => ({
	usePropsStore: () => ({ socioEconomics: 'Compare Area' }),
}))

const heatExposureGetDataById = vi.fn()
vi.mock('@/stores/heatExposureStore.js', () => ({
	useHeatExposureStore: () => ({ getDataById: heatExposureGetDataById }),
}))

const areaFixture = {
	nimi: 'Current Area',
	he_0_2: 10,
	he_3_6: 10,
	he_7_12: 10,
	he_65_69: 5,
	he_70_74: 5,
	he_80_84: 5,
	he_85_: 5,
	he_vakiy: 100,
	pt_tyott: 5,
	ra_as_kpa: 50,
	ko_perus: 10,
	ko_ika18y: 80,
	hr_ktu: 30000,
	te_vuok_as: 10,
	te_taly: 50,
}
const statsFixture = { ra_as_kpa: { min: 0, max: 100 }, hr_ktu: { min: 0, max: 60000 } }

vi.mock('@/stores/socioEconomicsStore.js', () => ({
	useSocioEconomicsStore: () => ({
		getDataByPostcode: () => areaFixture,
		getDataByNimi: () => ({ ...areaFixture, nimi: 'Compare Area', postinumeroalue: '00200' }),
		helsinkiStatistics: statsFixture,
		regionStatistics: statsFixture,
	}),
}))

import SocioEconomicsChart from '@/components/SocioEconomicsChart.vue'
import { CHART_SERIES_COLORS } from '@/constants/chartColors.js'
import Plot from '@/services/plot.js'

describe('SocioEconomicsChart — series colours', { tags: ['@unit'] }, () => {
	let wrapper

	beforeEach(() => {
		heatExposureGetDataById.mockReturnValue({ properties: { hki_avgheatexposure: 0.3 } })
	})

	afterEach(() => {
		if (wrapper) wrapper.unmount()
	})

	const mountChart = () => {
		wrapper = mount(SocioEconomicsChart, { attachTo: document.body })
		const plot = vi.mocked(Plot).mock.instances.at(-1)
		const svg = vi.mocked(plot.createSVGElement).mock.results[0].value
		const fills = svg.attr.mock.calls.filter(([name]) => name === 'fill').map(([, value]) => value)
		// Each series registers one mouseover handler; its tooltip names the area.
		const areas = svg.on.mock.calls
			.filter(([event]) => event === 'mouseover')
			.map(([, handler]) => {
				handler({}, { value: 1, description: '' })
				const format = vi.mocked(plot.handleMouseover).mock.calls.at(-1)[4]
				return format({ value: 1 }).match(/^Area: ([^<]+)/)[1]
			})
		return { plot, fills, areas }
	}

	it('fills the current area with the focus colour and the comparison with the baseline', () => {
		const { fills, areas } = mountChart()

		expect(areas).toEqual(['Current Area', 'Compare Area'])
		expect(fills).toEqual([CHART_SERIES_COLORS.focus, CHART_SERIES_COLORS.baseline])
	})

	it('names the current and the comparison area in the legend, in their colours', () => {
		const { plot } = mountChart()

		expect(plot.addLegend).toHaveBeenCalledTimes(1)
		expect(plot.addLegend.mock.calls[0][1]).toEqual([
			{ name: 'Current Area', color: CHART_SERIES_COLORS.focus },
			{ name: 'Compare Area', color: CHART_SERIES_COLORS.baseline },
		])
	})

	it('keeps the focus colour and lists only the current area when there is no comparison', () => {
		heatExposureGetDataById.mockReturnValue(undefined)
		const { plot, fills, areas } = mountChart()

		expect(areas).toEqual(['Current Area'])
		expect(fills).toEqual([CHART_SERIES_COLORS.focus])
		expect(plot.addLegend.mock.calls[0][1]).toEqual([
			{ name: 'Current Area', color: CHART_SERIES_COLORS.focus },
		])
	})
})
