/**
 * Chart containers must be scoped to the component instance (#987).
 *
 * The d3 charts used to find their container with a document-global id
 * (`d3.select('#heatHistogramContainer')`, `getElementById(...)`). With two
 * instances on the page, both draw into whichever element comes first in the
 * document and the second container stays empty. A multi-card analysis
 * workspace needs two charts on screen at once, so every chart now draws into
 * its own template ref.
 *
 * Three checks:
 * 1. A static sweep over every `.vue` file in src/: a component must not
 *    select an element of its own template by that element's id.
 * 2. For each live chart, mount two instances and assert each draws exactly
 *    one chart SVG into its own container, before and after a redraw.
 * 3. The Plot helpers act on the element they are given.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

// jsdom has no layout, so a real measurement is 0 and every chart would skip
// drawing: the two-instance checks would then pass without drawing anything.
// onResize is captured so a test can force every mounted chart to redraw.
const resize = vi.hoisted(() => ({ callbacks: /** @type {Array<() => void>} */ ([]) }))
vi.mock('@/composables/useChartSize.js', () => ({
	useChartSize: (_containerRef, { onResize }) => {
		resize.callbacks.push(onResize)
		return { width: { value: 400 }, height: { value: 250 }, cleanup: vi.fn() }
	},
}))

const entities = vi.hoisted(() => ({ list: /** @type {any[]} */ ([]) }))
vi.mock('@/services/cesiumEntityManager.js', () => ({
	cesiumEntityManager: { getAllBuildingEntities: () => entities.list },
}))

vi.mock('@/services/building.js', () => ({
	default: vi.fn(function () {
		this.highlightBuildingInViewer = vi.fn()
		this.highlightBuildingsInViewer = vi.fn()
	}),
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

import BuildingGridChart from '@/components/BuildingGridChart.vue'
import BuildingHeatChart from '@/components/BuildingHeatChart.vue'
import HeatHistogram from '@/components/HeatHistogram.vue'
import HSYBuildingHeatChart from '@/components/HSYBuildingHeatChart.vue'
import HSYScatterplot from '@/components/HSYScatterplot.vue'
import PieChart from '@/components/PieChart.vue'
import Scatterplot from '@/components/Scatterplot.vue'
import SocioEconomicsChart from '@/components/SocioEconomicsChart.vue'
import { eventBus } from '@/services/eventEmitter.js'
import Plot from '@/services/plot.js'
import { useBackgroundMapStore } from '@/stores/backgroundMapStore.js'
import { useGlobalStore } from '@/stores/globalStore.js'
import { useHeatExposureStore } from '@/stores/heatExposureStore.js'
import { usePropsStore } from '@/stores/propsStore.js'
import { useSocioEconomicsStore } from '@/stores/socioEconomicsStore.js'
import { useToggleStore } from '@/stores/toggleStore.js'

// ---------------------------------------------------------------------------
// 1. Static sweep
// ---------------------------------------------------------------------------

const SRC = resolve(__dirname, '../../../src')

/**
 * Charts that still select by id but are not mounted anywhere. The
 * dead-analysis-removal PR (#979, #980, #981) deletes them, so they are not
 * converted here. An entry whose file no longer exists is skipped.
 */
const ALLOWLIST = {
	'components/VulnerabilityChart.vue': 'unmounted; deleted by the #979 removal',
	'components/SurveyScatterPlot.vue': 'unmounted; deleted by the #980 removal',
	'components/BuildingTreeChart.vue': 'unmounted; deleted by the #981 removal',
	'components/NearbyTreeArea.vue': 'unmounted; deleted by the #981 removal',
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Returns the static template ids that the same file's script selects by
 * string: `'#id'` (d3.select, querySelector, CSS-style selector) or the bare
 * `'id'` literal (getElementById, or an id passed to a helper that looks it up).
 *
 * @param {string} sfc - Single-file component source
 * @returns {string[]}
 */
const selfSelectedIds = (sfc) => {
	const scripts = [...sfc.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1])
	const script = scripts.join('\n')
	const template = sfc
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
		.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '')
	// Static `id="..."` only: excludes `:id`, `v-bind:id`, `data-id`.
	const ids = [...template.matchAll(/(?<![\w:-])id="([^"{}]+)"/g)].map((m) => m[1])
	return [...new Set(ids)].filter((id) => {
		const e = escapeRegExp(id)
		const selector = new RegExp(`['"\`]#${e}(?![\\w-])`)
		const bare = new RegExp(`(['"\`])${e}\\1`)
		return selector.test(script) || bare.test(script)
	})
}

const vueFiles = (dir) =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name)
		if (entry.isDirectory()) return vueFiles(path)
		return entry.name.endsWith('.vue') ? [path] : []
	})

describe('chart containers are not selected by document-global id', { tags: ['@unit'] }, () => {
	it('the scanner flags a self-selected id and ignores a ref (control)', () => {
		const bad = `<template><div id="box" /></template>
			<script>d3.select('#box').append('svg'); document.getElementById("box")</script>`
		const viaHelper = `<template><div id="box" /></template>
			<script>const boxId = 'box'; plot.initializePlotContainer(boxId)</script>`
		const good = `<template><div id="box" ref="boxRef" /></template>
			<script>d3.select(boxRef.value).append('svg')</script>
			<style>#box { width: 100% }</style>`
		expect(selfSelectedIds(bad)).toEqual(['box'])
		expect(selfSelectedIds(viaHelper)).toEqual(['box'])
		expect(selfSelectedIds(good)).toEqual([])
	})

	it('no component selects its own template element by id', () => {
		const violations = vueFiles(SRC).flatMap((file) => {
			const rel = relative(SRC, file)
			if (rel in ALLOWLIST) return []
			return selfSelectedIds(readFileSync(file, 'utf8')).map((id) => `${rel}: #${id}`)
		})
		expect(violations).toEqual([])
	})

	it('every allowlisted file that still exists still needs its entry', () => {
		const stale = Object.keys(ALLOWLIST).filter((rel) => {
			const file = join(SRC, rel)
			return existsSync(file) && selfSelectedIds(readFileSync(file, 'utf8')).length === 0
		})
		expect(stale).toEqual([])
	})
})

// ---------------------------------------------------------------------------
// 2. Two instances draw into their own containers
// ---------------------------------------------------------------------------

// Plot.createSVGElement tags every chart SVG with this attribute; Vuetify icon
// SVGs do not carry it.
const CHART_SVG = 'svg[preserveAspectRatio="xMinYMin meet"]'

// Plain stubs: the default stub copies props onto a DOM element, and
// VSelect's `prefix` prop collides with the read-only Element.prefix.
const STUB = { template: '<div />' }
const STUBS = { VSelect: STUB, VSwitch: STUB, Timeline: STUB }

/** @type {import('@vue/test-utils').VueWrapper[]} */
let wrappers = []

const mountTwice = async (Component) => {
	wrappers = [0, 1].map(() =>
		mount(Component, { attachTo: document.body, global: { stubs: STUBS } })
	)
	await nextTick()
	await nextTick()
	return wrappers
}

const chartSvgCounts = (ws) => ws.map((w) => w.element.querySelectorAll(CHART_SVG).length)

/**
 * Each instance holds exactly one chart, and a redraw (as on resize) replaces
 * it in the same container rather than stacking a second one.
 */
const expectOwnContainers = async (ws) => {
	expect(chartSvgCounts(ws), 'first draw').toEqual([1, 1])
	for (const redraw of resize.callbacks) redraw()
	await nextTick()
	expect(chartSvgCounts(ws), 'after every instance redraws').toEqual([1, 1])
}

const prop = (value) => ({ _value: value })

// jsdom does no text layout; SocioEconomicsChart wraps axis labels with it.
if (!('getComputedTextLength' in SVGElement.prototype)) {
	Object.defineProperty(SVGElement.prototype, 'getComputedTextLength', { value: () => 0 })
}

describe('two chart instances draw into their own containers', { tags: ['@unit'] }, () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		entities.list = []
		resize.callbacks = []
	})

	afterEach(() => {
		for (const w of wrappers) w.unmount()
		wrappers = []
		document.body.innerHTML = ''
	})

	it('BuildingHeatChart', async () => {
		const global = useGlobalStore()
		global.buildingAddress = 'Testikatu 1'
		global.postalcode = '00100'
		global.averageHeatExposure = 0.4
		usePropsStore().buildingHeatExposure = 0.6

		await expectOwnContainers(await mountTwice(BuildingHeatChart))
	})

	it('BuildingGridChart', async () => {
		useGlobalStore().buildingAddress = 'Testikatu 1'
		const keys = ['0_9', '10_19', '20_29', '30_39', '40_49', '50_59', '60_69', '70_79', 'over80']
		usePropsStore().gridBuildingProps = Object.fromEntries(
			keys.map((k, i) => [`_pop_d_${k}`, prop(0.05 + i / 100)])
		)

		await expectOwnContainers(await mountTwice(BuildingGridChart))
	})

	it('HSYBuildingHeatChart', async () => {
		const global = useGlobalStore()
		global.level = 'building'
		global.view = 'capitalRegion'
		global.buildingAddress = 'Testikatu 1'
		global.postalcode = '00100'
		const props = usePropsStore()
		props.buildingHeatExposure = 20
		props.buildingHeatTimeseries = [
			{ date: '2022-06-28', avg_temp_c: 30 },
			{ date: '2023-06-23', avg_temp_c: 28 },
		]
		props.postalcodeHeatTimeseries = [
			[
				{ date: '2022-06-28', avg_temp_c: 27 },
				{ date: '2023-06-23', avg_temp_c: 26 },
			],
		]

		await expectOwnContainers(await mountTwice(HSYBuildingHeatChart))
	})

	it('HeatHistogram', async () => {
		const global = useGlobalStore()
		global.level = 'postalCode'
		global.view = 'helsinki'
		global.nameOfZone = 'Kamppi'
		usePropsStore().heatHistogramData = [25.1, 26.3, 27.8, 28.2, 30.5]

		await expectOwnContainers(await mountTwice(HeatHistogram))
	})

	it('HSYScatterplot', async () => {
		const date = useGlobalStore().heatDataDate
		const props = usePropsStore()
		const building = (id, area, temp) => ({
			_properties: {
				[props.categoricalSelect.value]: prop('brick'),
				[props.numericalSelect.value]: prop(area),
				_area_m2: prop(area),
				_heat_timeseries: prop([{ date, avg_temp_c: temp }]),
				_kiitun: prop(id),
			},
		})
		entities.list = [building('a', 300, 28), building('b', 400, 30)]

		await expectOwnContainers(await mountTwice(HSYScatterplot))
	})

	it('Scatterplot', async () => {
		useToggleStore().helsinkiView = true
		const building = (id, height, heat) => ({
			_properties: {
				avgheatexposuretobuilding: prop(heat),
				c_julkisivu: prop('brick'),
				measured_height: prop(height),
				_area_m2: prop(300),
				_id: prop(id),
			},
		})
		entities.list = [building('a', 10, 0.4), building('b', 20, 0.6)]

		await expectOwnContainers(await mountTwice(Scatterplot))
	})

	it('SocioEconomicsChart', async () => {
		const global = useGlobalStore()
		global.postalcode = '00100'
		global.view = 'helsinki'
		global.nameOfZone = 'Kamppi'
		global.averageHeatExposure = 0.5
		const row = (postinumeroalue, nimi) => ({
			postinumeroalue,
			nimi,
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
		})
		const socio = useSocioEconomicsStore()
		socio.data = [row('00100', 'Kamppi'), row('00200', 'Lauttasaari')]
		const stats = { ra_as_kpa: { min: 0, max: 100 }, hr_ktu: { min: 0, max: 60000 } }
		socio.helsinkiStatistics = stats
		socio.regionStatistics = stats
		usePropsStore().socioEconomics = 'Lauttasaari'
		useHeatExposureStore().data = [
			{ id: '00200', properties: { avgheatexposure: 0.3, hki_avgheatexposure: 0.3 } },
		]

		await expectOwnContainers(await mountTwice(SocioEconomicsChart))
	})

	it('PieChart', async () => {
		useGlobalStore().nameOfZone = 'Kamppi'
		const background = useBackgroundMapStore()
		background.hsySelectArea = 'Askisto'
		const year = background.hsyYear
		const zone = (nimi) => ({
			_properties: {
				_nimi: prop(nimi),
				[`tree20_m2_${year}`]: prop(10),
				[`water_m2_${year}`]: prop(20),
				[`building_m2_${year}`]: prop(30),
			},
		})
		usePropsStore().postalCodeData = {
			_entityCollection: { _entities: { _array: [zone('Kamppi'), zone('Askisto')] } },
		}

		const ws = await mountTwice(PieChart)
		// The first draw waits for the area select to emit this event.
		eventBus.emit('recreate piechart')
		await nextTick()

		await expectOwnContainers(ws)
	})
})

// ---------------------------------------------------------------------------
// 3. Plot works on the container element it is given
// ---------------------------------------------------------------------------

describe('Plot container helpers take an element', { tags: ['@unit'] }, () => {
	beforeEach(() => setActivePinia(createPinia()))
	afterEach(() => {
		document.body.innerHTML = ''
	})

	it('clears and reveals the element passed in', () => {
		const container = document.createElement('div')
		container.innerHTML = '<svg></svg>'
		container.style.visibility = 'hidden'

		new Plot().initializePlotContainerForGrid(container)

		expect(container.childElementCount).toBe(0)
		expect(container.style.visibility).toBe('visible')
	})

	it('shows the tooltip for the element passed in', () => {
		const plot = new Plot()
		const container = document.createElement('div')
		document.body.appendChild(container)
		const tooltip = plot.createTooltip(container)
		const event = /** @type {MouseEvent} */ ({ pageX: 200, pageY: 300 })

		plot.handleMouseover(tooltip, container, event, 7, (d) => `value ${d}`)

		expect(container.querySelector('.tooltip')?.textContent).toBe('value 7')
		expect(tooltip.style('opacity')).toBe('0.9')
	})
})
