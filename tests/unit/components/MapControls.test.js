/**
 * MapControls must reflect toggleStore, including writes it did not make itself (#967).
 *
 * App.vue smartReset() and useSidebarNavigation goHome() call toggleStore.setShowTrees(false).
 * MapControls stays mounted (VWindowItem keeps booted tabs under v-show), so a switch
 * backed by a `ref(toggleStore.x)` snapshot kept showing the old value while the loaders,
 * which read the store, did the opposite.
 */

import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import BuildingFiltersControl from '@/components/controls/BuildingFiltersControl.vue'
import DataLayersControl from '@/components/controls/DataLayersControl.vue'
import MapControls from '@/components/MapControls.vue'
import { useToggleStore } from '@/stores/toggleStore.js'

vi.mock('@/services/building.js', () => ({
	default: class {
		filterBuildings = vi.fn(async () => {})
		showAllBuildings = vi.fn()
		resetBuildingEntities = vi.fn()
	},
}))
vi.mock('@/services/datasource.js', () => ({
	default: class {
		getDataSourceByName = vi.fn(() => undefined)
		changeDataSourceShowByName = vi.fn(async () => {})
	},
}))
vi.mock('@/services/othernature.js', () => ({
	default: class {
		loadOtherNature = vi.fn(async () => {})
	},
}))
vi.mock('@/services/tree.js', () => ({ default: class {} }))
vi.mock('@/services/vegetation', () => ({ default: class {} }))
vi.mock('@/services/wms.js', () => ({
	default: class {
		createHelsinkiImageryLayer = vi.fn(() => ({}))
	},
}))
vi.mock('@/services/backgroundPreloader.js', () => ({ default: { trackLayerUsage: vi.fn() } }))
vi.mock('@/services/tiffImagery.js', () => ({
	changeTIFF: vi.fn(async () => {}),
	removeTIFF: vi.fn(async () => {}),
}))
vi.mock('@/services/landcover', () => ({
	createHSYImageryLayer: vi.fn(async () => {}),
	removeLandcover: vi.fn(),
	setLandcoverEnabled: vi.fn(async () => {}),
}))

/** [store field, setter, child component that renders it] */
const MIRRORED = [
	['showTrees', 'setShowTrees', DataLayersControl],
	['showVegetation', 'setShowVegetation', DataLayersControl],
	['showOtherNature', 'setShowOtherNature', DataLayersControl],
	['landCover', 'setLandCover', DataLayersControl],
	['ndvi', 'setNDVI', DataLayersControl],
	['hideNonSote', 'setHideNonSote', BuildingFiltersControl],
	['hideNewBuildings', 'setHideNewBuildings', BuildingFiltersControl],
	['hideLow', 'setHideLow', BuildingFiltersControl],
]

describe('MapControls follows toggleStore', { tags: ['@unit'] }, () => {
	/** @type {import('@vue/test-utils').VueWrapper | null} */
	let wrapper = null

	beforeEach(() => {
		setActivePinia(createPinia())
	})

	afterEach(() => {
		wrapper?.unmount()
		wrapper = null
	})

	it.each(
		MIRRORED
	)('%s: an external store write reaches the switch', async (field, setter, child) => {
		const toggleStore = useToggleStore()
		wrapper = shallowMount(MapControls)
		const control = () => wrapper.findComponent(child)

		expect(control().props(field)).toBe(toggleStore[field])

		// Write from outside the component, both ways, as smartReset/goHome do.
		toggleStore[setter](true)
		await nextTick()
		expect(control().props(field)).toBe(true)

		toggleStore[setter](false)
		await nextTick()
		expect(control().props(field)).toBe(false)
	})

	it.each(
		MIRRORED
	)('%s: a switch change is written to the store', async (field, _setter, child) => {
		const toggleStore = useToggleStore()
		wrapper = shallowMount(MapControls)

		wrapper.findComponent(child).vm.$emit(`update:${field}`, true)
		await nextTick()

		expect(toggleStore[field]).toBe(true)
	})
})
