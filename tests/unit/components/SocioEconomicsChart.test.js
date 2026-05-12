/**
 * Regression tests for SocioEconomicsChart resilience:
 * - #728 (Sentry REGIONS4CLIMATE-2C): heatExposureStore.getDataById returning
 *   undefined must not crash the chart.
 * - #733: socioEconomicsStore.getDataByNimi returning undefined (no compare
 *   area selected, or stale propsStore.socioEconomics reference) must not crash.
 *
 * @see {@link file://./src/components/SocioEconomicsChart.vue}
 */

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Stub the plot service — its d3 internals don't matter for this regression,
// only that calling them does not propagate the unguarded toFixed() throw.
vi.mock('@/services/plot.js', () => {
	const Plot = vi.fn(function () {
		this.initializePlotContainerForGrid = vi.fn()
		this.createSVGElement = vi.fn(() => ({
			append: vi.fn().mockReturnThis(),
			attr: vi.fn().mockReturnThis(),
			call: vi.fn().mockReturnThis(),
			selectAll: vi.fn().mockReturnThis(),
			data: vi.fn().mockReturnThis(),
			enter: vi.fn().mockReturnThis(),
			exit: vi.fn().mockReturnThis(),
			remove: vi.fn().mockReturnThis(),
			on: vi.fn().mockReturnThis(),
			style: vi.fn().mockReturnThis(),
			text: vi.fn().mockReturnThis(),
		}))
		this.createScaleBand = vi.fn(() => ({ bandwidth: () => 10 }))
		this.createScaleLinear = vi.fn(() => vi.fn())
		this.createTooltip = vi.fn()
		this.handleMouseover = vi.fn()
		this.handleMouseout = vi.fn()
		this.addTitleWithLink = vi.fn()
	})
	return { default: Plot }
})

// Stub eventBus — the component subscribes on mount; we don't need the real one.
vi.mock('@/services/eventEmitter.js', () => ({
	eventBus: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}))

// Stub stores with the exact shape the component reads. Keeping them inline
// (instead of using the real Pinia definitions) avoids depending on cross-store
// initialization that isn't relevant to this regression.
vi.mock('@/stores/globalStore.js', () => ({
	useGlobalStore: () => ({
		postalcode: '00100',
		view: 'helsinki',
		nameOfZone: 'Test Zone',
		navbarWidth: 400,
		averageHeatExposure: 0.5,
	}),
}))

vi.mock('@/stores/toggleStore.js', () => ({
	useToggleStore: () => ({
		capitalRegionCold: false,
		helsinkiView: true,
	}),
}))

vi.mock('@/stores/propsStore.js', () => ({
	usePropsStore: () => ({
		socioEconomics: 'Test Nimi',
	}),
}))

const heatExposureGetDataById = vi.fn(() => undefined)
vi.mock('@/stores/heatExposureStore.js', () => ({
	useHeatExposureStore: () => ({
		getDataById: heatExposureGetDataById,
	}),
}))

const sosDataFixture = {
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

const compareDataFixture = {
	...sosDataFixture,
	nimi: 'Compare Nimi',
	postinumeroalue: '00200',
}

const statsFixture = {
	ra_as_kpa: { min: 0, max: 100 },
	hr_ktu: { min: 0, max: 60000 },
}

const socioEconomicsGetDataByNimi = vi.fn(() => compareDataFixture)
vi.mock('@/stores/socioEconomicsStore.js', () => ({
	useSocioEconomicsStore: () => ({
		getDataByPostcode: vi.fn(() => sosDataFixture),
		getDataByNimi: socioEconomicsGetDataByNimi,
		helsinkiStatistics: statsFixture,
		regionStatistics: statsFixture,
	}),
}))

import SocioEconomicsChart from '@/components/SocioEconomicsChart.vue'

describe('SocioEconomicsChart — undefined data guards', { tags: ['@unit'] }, () => {
	let wrapper

	beforeEach(() => {
		setActivePinia(createPinia())
		heatExposureGetDataById.mockClear()
		socioEconomicsGetDataByNimi.mockReset()
		socioEconomicsGetDataByNimi.mockReturnValue(compareDataFixture)
	})

	afterEach(() => {
		if (wrapper) wrapper.unmount()
	})

	it('does not throw when heatExposureStore.getDataById returns undefined', () => {
		// Pre-regression: heatExposureStore.getDataById returning undefined
		// caused helsinkiOrCapitalHeatExposure to do undefined.properties.X
		// and crash (Sentry REGIONS4CLIMATE-2C, #728).
		heatExposureGetDataById.mockReturnValue(undefined)

		expect(() => {
			wrapper = mount(SocioEconomicsChart, {
				attachTo: document.body,
			})
		}).not.toThrow()
	})

	it('does not throw when the heat-exposure entry exists but has no properties', () => {
		// Sibling regression: an entry that exists but lacks `.properties`
		// (e.g. a stub or in-flight record) must also be handled.
		heatExposureGetDataById.mockReturnValue({})

		expect(() => {
			wrapper = mount(SocioEconomicsChart, {
				attachTo: document.body,
			})
		}).not.toThrow()
	})

	it('does not throw when socioEconomicsStore.getDataByNimi returns undefined (#733)', () => {
		// Pre-regression: getDataByNimi returning undefined (no comparison area
		// selected yet, or stale propsStore.socioEconomics referencing a removed
		// nimi) caused `compareData.postinumeroalue` to throw before reaching
		// the heat-exposure guard.
		socioEconomicsGetDataByNimi.mockReturnValue(undefined)

		expect(() => {
			wrapper = mount(SocioEconomicsChart, {
				attachTo: document.body,
			})
		}).not.toThrow()
	})
})
