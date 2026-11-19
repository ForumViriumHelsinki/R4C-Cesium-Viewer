/**
 * The socioeconomics chart's x-axis labels wrap word by word to the bar width, and
 * the labels that carry age bands ("Children and elderly (0-12, 65+) %", #1154)
 * wrap to five or six lines in a narrow drawer. The bottom margin holds about
 * three, and the SVG clipped the rest. Measured in Chromium against the mock API
 * (2026-11-19): at 768 and 375 px nine label lines fell below the SVG, five at
 * 1280 px; with the old, shorter labels it was three at each width. The chart now
 * grows its viewBox to the x axis's bounding box, and the same measurement finds
 * no line below the SVG at any of the three widths.
 *
 * Uses the real Plot service and d3; jsdom has no layout, so the text and
 * bounding-box measurements are stubbed with the sizes a browser reports.
 */

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
		nameOfZone: 'Test Zone',
		averageHeatExposure: 0.5,
	}),
}))

vi.mock('@/stores/toggleStore.js', () => ({
	useToggleStore: () => ({ capitalRegionCold: false, helsinkiView: true }),
}))

vi.mock('@/stores/propsStore.js', () => ({
	usePropsStore: () => ({ socioEconomics: 'Test Nimi' }),
}))

vi.mock('@/stores/heatExposureStore.js', () => ({
	useHeatExposureStore: () => ({ getDataById: vi.fn(() => undefined) }),
}))

const sosData = {
	nimi: 'Test Nimi',
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
const stats = { ra_as_kpa: { min: 0, max: 100 }, hr_ktu: { min: 0, max: 60000 } }

vi.mock('@/stores/socioEconomicsStore.js', () => ({
	useSocioEconomicsStore: () => ({
		getDataByPostcode: vi.fn(() => sosData),
		getDataByNimi: vi.fn(() => undefined),
		helsinkiStatistics: stats,
		regionStatistics: stats,
	}),
}))

import SocioEconomicsChart from '@/components/SocioEconomicsChart.vue'

/** The x axis as a browser measures it once its labels wrap to six lines. */
const X_AXIS_BOX = { x: -20, y: 0, width: 380, height: 90 }

describe('SocioEconomicsChart — wrapped axis labels', { tags: ['@unit'] }, () => {
	let wrapper

	beforeEach(() => {
		setActivePinia(createPinia())
		// Every word is wider than a bar band, so each label wraps one word per line.
		SVGElement.prototype.getComputedTextLength = () => 1000
		SVGElement.prototype.getBBox = function () {
			return this.matches('g[transform^="translate(0,"]')
				? X_AXIS_BOX
				: { x: 0, y: 0, width: 0, height: 0 }
		}
	})

	afterEach(() => {
		wrapper?.unmount()
		delete SVGElement.prototype.getComputedTextLength
		delete SVGElement.prototype.getBBox
	})

	it('grows the viewBox so the last label line is inside the SVG', () => {
		wrapper = mount(SocioEconomicsChart, { attachTo: document.body })
		const svg = wrapper.element.querySelector('svg')
		const [, , , viewBoxHeight] = svg.getAttribute('viewBox').split(' ').map(Number)
		const plot = svg.querySelector('g')
		const top = Number(plot.getAttribute('transform').match(/translate\(\s*[\d.]+,\s*([\d.]+)/)[1])
		const xAxis = svg.querySelector('g g[transform^="translate(0,"]')
		const axisY = Number(xAxis.getAttribute('transform').match(/translate\(0,\s*([\d.]+)/)[1])

		// The labels did wrap: the longest one is a tspan per word.
		const lines = [...xAxis.querySelectorAll('.tick text')].map(
			(text) => text.querySelectorAll('tspan').length
		)
		expect(Math.max(...lines)).toBeGreaterThanOrEqual(6)

		const labelsBottom = top + axisY + X_AXIS_BOX.y + X_AXIS_BOX.height
		expect(viewBoxHeight).toBeGreaterThanOrEqual(labelsBottom)
	})
})
