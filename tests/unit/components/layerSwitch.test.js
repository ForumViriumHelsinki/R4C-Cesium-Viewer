/**
 * One layer, one control, one name (#1155).
 *
 * Land cover and NDVI can each be switched from the Layers tab (DataLayersControl)
 * and from their Analysis panel (LandcoverPanel, NDVIPanel). Before #1155 land cover
 * was a brown "Land Cover" switch in one place and a green "Landcover as background
 * map" checkbox in the other, and NDVI was "NDVI" on the switch and "NDVI
 * Vegetation" on the Analysis button, with no switch in its panel at all.
 *
 * Both entry points now render the same LayerSwitch, bound to toggleStore, so
 * switching a layer in one place shows in the other, and both carry the name the
 * Analysis registry gives the layer.
 */

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import DataLayersControl from '@/components/controls/DataLayersControl.vue'
import LandcoverPanel from '@/components/LandcoverPanel.vue'
import NDVIPanel from '@/components/NDVIPanel.vue'
import { findAnalysis } from '@/constants/analysisRegistry.js'
import { LAYER_LABELS } from '@/constants/metricLabels.js'
import { AVAILABLE_NDVI_DATES } from '@/constants/ndviDates.js'
import { changeTIFF } from '@/services/tiffImagery.js'
import { useBackgroundMapStore } from '@/stores/backgroundMapStore.js'
import { useToggleStore } from '@/stores/toggleStore.js'

// The services stand in for the map: each one only records the store write the real
// one makes, which is all these tests read.
vi.mock('@/services/landcover', async () => {
	const { useToggleStore } = await import('@/stores/toggleStore.js')
	return {
		setLandcoverEnabled: vi.fn(async (enabled) => {
			const toggleStore = useToggleStore()
			if (enabled && toggleStore.ndvi) toggleStore.setNDVI(false)
			toggleStore.setLandCover(enabled)
		}),
		removeLandcover: vi.fn(),
		createHSYImageryLayer: vi.fn(async () => {}),
	}
})
vi.mock('@/services/tiffImagery.js', () => ({
	changeTIFF: vi.fn(async () => {}),
	removeTIFF: vi.fn(async () => {}),
}))

const vuetify = createVuetify({ components, directives })

/** Every layer that has an Analysis panel, with the registry entry that opens it. */
const LAYERS = [
	{
		layer: 'landCover',
		label: () => LAYER_LABELS.LAND_COVER,
		analysisId: 'landcover',
		panel: LandcoverPanel,
		stubs: { HSYAreaSelect: true, HSYYearSelect: true, PieChart: true },
	},
	{
		layer: 'ndvi',
		label: () => LAYER_LABELS.NDVI,
		analysisId: 'ndvi-analysis',
		panel: NDVIPanel,
		stubs: { NDVIChart: true },
	},
]

describe('a layer is one control with one name', { tags: ['@unit'] }, () => {
	/** @type {import('@vue/test-utils').VueWrapper[]} */
	let mounted

	const track = (wrapper) => {
		mounted.push(wrapper)
		return wrapper
	}

	/** The Layers tab group, with the store's layer state passed in as MapControls does. */
	const mountLayersTab = () => {
		const toggleStore = useToggleStore()
		return track(
			mount(DataLayersControl, {
				props: {
					showTrees: false,
					showVegetation: false,
					showOtherNature: false,
					landCover: toggleStore.landCover,
					ndvi: toggleStore.ndvi,
					helsinkiView: false,
					view: 'capitalRegion',
					postalCode: '00100',
				},
				global: { plugins: [vuetify] },
			})
		)
	}

	/** @param {typeof LAYERS[number]} entry */
	const mountPanel = ({ panel, stubs }) =>
		track(mount(panel, { global: { plugins: [vuetify], stubs } }))

	/**
	 * The switch for `label` in `wrapper`: the input that carries the label as its
	 * accessible name, and the visible text beside it.
	 * @param {import('@vue/test-utils').VueWrapper} wrapper
	 * @param {string} label
	 */
	const switchFor = (wrapper, label) => {
		const items = wrapper
			.findAll('.control-item')
			.filter((item) => item.find('.control-label').exists())
			.filter((item) => item.find('.control-label').text() === label)
		expect(items, `one "${label}" switch`).toHaveLength(1)
		const input = items[0].find('input[type="checkbox"]')
		expect(input.exists(), `"${label}" is a switch with a checkbox input`).toBe(true)
		return { item: items[0], input }
	}

	/** @param {import('@vue/test-utils').DOMWrapper<HTMLInputElement>} input @param {boolean} value */
	const flip = async (input, value) => {
		await input.setValue(value)
		await flushPromises()
	}

	beforeEach(() => {
		setActivePinia(createPinia())
		mounted = []
	})

	afterEach(() => {
		for (const wrapper of mounted) wrapper.unmount()
		vi.clearAllMocks()
	})

	describe.each(LAYERS)('$layer', (entry) => {
		it('the Analysis button, the Layers switch and the panel switch share one name', () => {
			const label = entry.label()
			expect(findAnalysis(entry.analysisId)?.label).toBe(label)

			const layersTab = switchFor(mountLayersTab(), label)
			const panel = switchFor(mountPanel(entry), label)

			for (const { input } of [layersTab, panel]) {
				expect(input.attributes('aria-label')).toBe(label)
			}
			// The same control in both places, not a lookalike.
			expect(panel.item.classes()).toEqual(layersTab.item.classes())
			expect(panel.input.classes()).toEqual(layersTab.input.classes())
		})

		it('switching it on in the panel shows in the Layers tab, and off again', async () => {
			const label = entry.label()
			const layersTab = mountLayersTab()
			const panel = mountPanel(entry)

			await flip(switchFor(panel, label).input, true)
			expect(useToggleStore()[entry.layer]).toBe(true)
			expect(switchFor(layersTab, label).input.element.checked).toBe(true)

			await flip(switchFor(panel, label).input, false)
			expect(useToggleStore()[entry.layer]).toBe(false)
			expect(switchFor(layersTab, label).input.element.checked).toBe(false)
		})

		it('switching it on in the Layers tab shows in the panel, and off again', async () => {
			const label = entry.label()
			const layersTab = mountLayersTab()
			const panel = mountPanel(entry)

			await flip(switchFor(layersTab, label).input, true)
			expect(useToggleStore()[entry.layer]).toBe(true)
			expect(switchFor(panel, label).input.element.checked).toBe(true)

			await flip(switchFor(layersTab, label).input, false)
			expect(useToggleStore()[entry.layer]).toBe(false)
			expect(switchFor(panel, label).input.element.checked).toBe(false)
		})
	})

	it('the NDVI panel date select is enabled once its own switch turns NDVI on', async () => {
		const panel = mountPanel(LAYERS[1])
		const dateSelect = () => panel.findComponent({ name: 'VSelect' })
		expect(dateSelect().props('disabled')).toBe(true)

		await flip(switchFor(panel, LAYER_LABELS.NDVI).input, true)

		expect(dateSelect().props('disabled')).toBe(false)
	})

	// changeTIFF reads backgroundMapStore.ndviDate when it runs, so the date chosen
	// in the panel must reach the store for any switch to load it.
	it('a date chosen in the NDVI panel is the date the next load uses', async () => {
		const datesLoaded = []
		vi.mocked(changeTIFF).mockImplementation(async () => {
			datesLoaded.push(useBackgroundMapStore().ndviDate)
		})
		try {
			const panel = mountPanel(LAYERS[1])
			await flip(switchFor(panel, LAYER_LABELS.NDVI).input, true)
			const otherDate = AVAILABLE_NDVI_DATES.find(
				(date) => date !== useBackgroundMapStore().ndviDate
			)

			panel.findComponent({ name: 'VSelect' }).vm.$emit('update:modelValue', otherDate)
			await flushPromises()

			expect(useBackgroundMapStore().ndviDate).toBe(otherDate)
			expect(datesLoaded.at(-1)).toBe(otherDate)
		} finally {
			vi.mocked(changeTIFF).mockImplementation(async () => {})
		}
	})
})
