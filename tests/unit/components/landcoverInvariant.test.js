/**
 * The land-cover toggle and the land-cover imagery must agree (#967).
 *
 * Invariant, after every user action: toggleStore.landCover is true exactly when one
 * land-cover layer is on the map, and backgroundMapStore.landcoverLayers tracks exactly
 * that layer. Each scenario drives a real component through the action a user takes.
 *
 * The viewer is a stand-in with Cesium's ImageryLayerCollection membership semantics
 * (identity lookups on a plain array, see @cesium/engine ImageryLayerCollection.js),
 * because a mock whose contains() always answers true cannot see a layer that was
 * never removed.
 */

import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import DataLayersControl from '@/components/controls/DataLayersControl.vue'
import HSYYearSelect from '@/components/HSYYearSelect.vue'
import LandcoverPanel from '@/components/LandcoverPanel.vue'
import MapControls from '@/components/MapControls.vue'
import ViewModeCompact from '@/components/ViewModeCompact.vue'
import { createHSYImageryLayer } from '@/services/landcover.js'
import { useBackgroundMapStore } from '@/stores/backgroundMapStore.js'
import { useGlobalStore } from '@/stores/globalStore.js'
import { useToggleStore } from '@/stores/toggleStore.js'

vi.mock('@/services/cesiumProvider', () => ({
	getCesium: () => ({
		WebMapServiceImageryProvider: class {
			constructor(options) {
				this.layers = options.layers
				this.errorEvent = { addEventListener: () => () => {} }
			}
		},
		GeographicTilingScheme: class {},
	}),
}))
vi.mock('@/services/wms.js', () => ({
	default: class {
		createHelsinkiImageryLayer(name) {
			return { imageryProvider: { layers: name } }
		}
	},
}))
vi.mock('@/services/tiffImagery.js', () => ({
	changeTIFF: vi.fn(async () => {}),
	removeTIFF: vi.fn(async () => {}),
}))
vi.mock('@/services/datasource.js', () => ({
	default: class {
		getDataSourceByName = vi.fn(() => undefined)
		changeDataSourceShowByName = vi.fn(async () => {})
		removeDataSourcesAndEntities = vi.fn(async () => {})
		loadGeoJsonDataSource = vi.fn(async () => {})
	},
}))
vi.mock('@/services/featurepicker', () => ({
	default: class {
		loadPostalCode = vi.fn(async () => {})
	},
}))
vi.mock('@/services/building.js', () => ({
	default: class {
		filterBuildings = vi.fn(async () => {})
		showAllBuildings = vi.fn()
		resetBuildingEntities = vi.fn()
	},
}))
vi.mock('@/services/tree.js', () => ({ default: class {} }))
vi.mock('@/services/vegetation', () => ({ default: class {} }))
vi.mock('@/services/othernature.js', () => ({ default: class {} }))
vi.mock('@/services/backgroundPreloader.js', () => ({ default: { trackLayerUsage: vi.fn() } }))

/** Cesium ImageryLayerCollection membership semantics: identity on a plain array. */
class FakeImageryLayerCollection {
	_layers = []
	get length() {
		return this._layers.length
	}
	add(layer, index) {
		if (index === undefined) this._layers.push(layer)
		else this._layers.splice(index, 0, layer)
	}
	addImageryProvider(imageryProvider, index) {
		const layer = { imageryProvider }
		this.add(layer, index)
		return layer
	}
	indexOf(layer) {
		return this._layers.indexOf(layer)
	}
	contains(layer) {
		return this.indexOf(layer) !== -1
	}
	remove(layer) {
		const index = this.indexOf(layer)
		if (index === -1) return false
		this._layers.splice(index, 1)
		return true
	}
	removeAll() {
		this._layers.length = 0
	}
}

const vuetify = createVuetify({ components, directives })

describe('land-cover toggle and imagery stay in sync', { tags: ['@unit'] }, () => {
	/** @type {FakeImageryLayerCollection} */
	let imageryLayers
	let toggleStore
	let backgroundMapStore
	/** @type {import('@vue/test-utils').VueWrapper[]} */
	let mounted

	/** Land-cover layers on the map (the HSY WMS layer names all contain "maanpeite"). */
	const onMap = () =>
		imageryLayers._layers.filter((l) => String(l.imageryProvider?.layers).includes('maanpeite'))

	const state = () => ({
		toggle: toggleStore.landCover,
		onMap: onMap().length,
		tracked: backgroundMapStore.landcoverLayers.length,
	})

	/** @param {boolean} on */
	const inSync = (on) => ({ toggle: on, onMap: on ? 1 : 0, tracked: on ? 1 : 0 })

	/** Puts the app in the "land cover on" state the way the service does it. */
	const landcoverAlreadyOn = async () => {
		toggleStore.setLandCover(true)
		await createHSYImageryLayer()
		expect(state()).toEqual(inSync(true))
	}

	const track = (wrapper) => {
		mounted.push(wrapper)
		return wrapper
	}

	beforeEach(() => {
		setActivePinia(createPinia())
		imageryLayers = new FakeImageryLayerCollection()
		imageryLayers.add({ imageryProvider: { layers: 'avoindata:Karttasarja_PKS' } })
		useGlobalStore().setCesiumViewer({ imageryLayers })
		toggleStore = useToggleStore()
		backgroundMapStore = useBackgroundMapStore()
		mounted = []
	})

	afterEach(() => {
		for (const wrapper of mounted) wrapper.unmount()
		vi.clearAllMocks()
	})

	describe('LandcoverPanel checkbox', () => {
		const mountPanel = () =>
			track(
				mount(LandcoverPanel, {
					global: {
						plugins: [vuetify],
						stubs: { HSYAreaSelect: true, HSYYearSelect: true, PieChart: true },
					},
				})
			)
		/** @param {import('@vue/test-utils').VueWrapper} wrapper @param {boolean} value */
		const setChecked = async (wrapper, value) => {
			await wrapper.find('input[type="checkbox"]').setValue(value)
			await flushPromises()
		}

		it('on, off and on again', async () => {
			const panel = mountPanel()

			await setChecked(panel, true)
			expect(state()).toEqual(inSync(true))

			await setChecked(panel, false)
			expect(state()).toEqual(inSync(false))

			await setChecked(panel, true)
			expect(state()).toEqual(inSync(true))
		})

		it('switches NDVI off, as the Layers tab switch does', async () => {
			toggleStore.setNDVI(true)
			const panel = mountPanel()

			await setChecked(panel, true)

			expect(toggleStore.ndvi).toBe(false)
			expect(state()).toEqual(inSync(true))
		})
	})

	describe('HSYYearSelect', () => {
		/** @param {number} year */
		const changeYear = async (year) => {
			const select = track(mount(HSYYearSelect, { global: { plugins: [vuetify] } }))
			select.findComponent({ name: 'VSelect' }).vm.$emit('update:modelValue', year)
			await flushPromises()
		}

		it('a year change with land cover off shows no imagery', async () => {
			await changeYear(2018)

			expect(backgroundMapStore.hsyYear).toBe(2018)
			expect(state()).toEqual(inSync(false))
		})

		it('a year change with land cover on swaps the layer for the new year', async () => {
			await landcoverAlreadyOn()

			await changeYear(2018)

			expect(state()).toEqual(inSync(true))
			expect(onMap()[0].imageryProvider.layers).toContain('_2018')
		})
	})

	describe('ViewModeCompact', () => {
		it('switching to Region at the start level turns land cover off', async () => {
			await landcoverAlreadyOn()
			useGlobalStore().setView('grid')
			const modes = track(mount(ViewModeCompact, { global: { plugins: [vuetify] } }))

			await modes.find('[aria-label="Capital Region view"]').trigger('click')
			await flushPromises()

			expect(state()).toEqual(inSync(false))
		})
	})

	describe('MapControls switches', () => {
		const mountControls = () => track(shallowMount(MapControls))
		/** @param {import('@vue/test-utils').VueWrapper} controls @param {string} field @param {boolean} value */
		const flip = async (controls, field, value) => {
			controls.findComponent(DataLayersControl).vm.$emit(`update:${field}`, value)
			await flushPromises()
		}

		it('Land Cover on and off', async () => {
			const controls = mountControls()

			await flip(controls, 'landCover', true)
			expect(state()).toEqual(inSync(true))

			await flip(controls, 'landCover', false)
			expect(state()).toEqual(inSync(false))
		})

		it('NDVI on, then Land Cover on', async () => {
			const controls = mountControls()

			await flip(controls, 'ndvi', true)
			await flip(controls, 'landCover', true)

			expect(toggleStore.ndvi).toBe(false)
			expect(state()).toEqual(inSync(true))
		})

		it('Land Cover on, then NDVI on', async () => {
			const controls = mountControls()

			await flip(controls, 'landCover', true)
			await flip(controls, 'ndvi', true)

			expect(toggleStore.ndvi).toBe(true)
			expect(state()).toEqual(inSync(false))
		})
	})
})
