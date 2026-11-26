/**
 * Cooling Centers panel flow: what placing does, a labelled capacity, a list of
 * placed centers with per-item removal, and a confirmed "Clear all".
 */

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CoolingCenter from '@/components/CoolingCenter.vue'
import { useGlobalStore } from '@/stores/globalStore.js'
import { useMitigationStore } from '@/stores/mitigationStore'

const entities = { add: vi.fn(), removeById: vi.fn() }

vi.mock('@/services/cesiumProvider.js', () => ({
	getCesium: () => ({
		CustomDataSource: function CustomDataSource() {
			this.entities = entities
		},
		ScreenSpaceEventType: { LEFT_CLICK: 0 },
		defined: (v) => v !== undefined && v !== null,
		Cartographic: { fromCartesian: () => ({ longitude: 0, latitude: 0 }) },
		Math: { toDegrees: (v) => v },
		Cartesian3: Object.assign(
			function Cartesian3(x, y, z) {
				Object.assign(this, { x, y, z })
			},
			{ fromDegrees: (lon, lat) => ({ lon, lat }) }
		),
		Cartesian2: function Cartesian2() {},
		Color: { BLUE: { withAlpha: () => ({}) }, BLACK: {} },
		VerticalOrigin: { BOTTOM: 1 },
	}),
}))
vi.mock('@/services/datasource.js', () => ({
	default: class {
		removeDataSourcesByNamePrefix() {
			return Promise.resolve()
		}
	},
}))
vi.mock('@turf/turf', () => ({
	polygon: (coords) => ({ coords }),
	centroid: () => ({ geometry: { coordinates: [24.9, 60.2] } }),
}))

const gridEntity = (gridId) => ({
	properties: {
		grid_id: { getValue: () => gridId },
		euref_x: { getValue: () => 1 },
		euref_y: { getValue: () => 2 },
	},
	polygon: { hierarchy: { getValue: () => ({ positions: [{}, {}, {}] }) } },
})

describe('CoolingCenter panel', { tags: ['@unit'] }, () => {
	/** @type {import('@vue/test-utils').VueWrapper<any> | null} */
	let wrapper = null
	/** @type {any} */
	let viewer

	const mountPanel = () => {
		wrapper = mount(CoolingCenter, {
			attachTo: document.body,
			global: { plugins: [createVuetify({ components, directives })] },
		})
		return wrapper
	}
	const button = (w, name) => {
		const found = w.findAll('button').find((b) => b.text().trim() === name)
		if (!found) throw new Error(`no button "${name}" in: ${w.text()}`)
		return found
	}

	beforeEach(() => {
		setActivePinia(createPinia())
		entities.add.mockClear()
		entities.removeById.mockClear()
		viewer = {
			canvas: { style: { cursor: '' } },
			scene: { pick: vi.fn(), requestRender: vi.fn() },
			dataSources: { getByName: () => [], add: vi.fn(), remove: vi.fn() },
			screenSpaceEventHandler: { setInputAction: vi.fn(), removeInputAction: vi.fn() },
		}
		useGlobalStore().cesiumViewer = viewer
	})

	afterEach(() => {
		wrapper?.unmount()
		wrapper = null
	})

	it('says how to place a center on the map', () => {
		const text = mountPanel().text()
		expect(text).toMatch(/click .*grid cell/i)
		expect(text).toContain('Place on map')
	})

	it('labels capacity with a unit and shows the range', () => {
		const w = mountPanel()
		expect(w.find('#cooling-capacity-label').text()).toBe('Capacity')
		expect(w.find('.cooling-capacity-value').text()).toBe('1,000 people')
		const range = w.find('.cooling-capacity-range').text()
		expect(range).toContain('100')
		expect(range).toContain('1,000')
		expect(w.find('.v-slider [role="slider"]').attributes('aria-labelledby')).toBe(
			'cooling-capacity-label'
		)
	})

	it('enters placement mode with a hint and a crosshair, and Escape leaves it', async () => {
		const w = mountPanel()
		await button(w, 'Place on map').trigger('click')

		expect(w.find('.cooling-placement-hint').text()).toMatch(/click a grid cell/i)
		expect(viewer.canvas.style.cursor).toBe('crosshair')
		expect(button(w, 'Done').exists()).toBe(true)

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
		await w.vm.$nextTick()

		expect(w.find('.cooling-placement-hint').exists()).toBe(false)
		expect(viewer.canvas.style.cursor).toBe('')
	})

	it('lists a center placed by clicking a grid cell and stays in placement mode', async () => {
		const w = mountPanel()
		await button(w, 'Place on map').trigger('click')
		viewer.scene.pick.mockReturnValue({ id: gridEntity('g1') })

		w.vm.handleMapClick({ position: { x: 1, y: 1 } })
		await w.vm.$nextTick()

		const items = w.findAll('.cooling-center-item')
		expect(items).toHaveLength(1)
		expect(items[0].text()).toContain('Cell g1')
		expect(items[0].text()).toContain('1,000 people')
		expect(entities.add).toHaveBeenCalledWith(expect.objectContaining({ id: 'cooling_g1_1' }))
		expect(w.find('.cooling-placement-hint').exists()).toBe(true)
	})

	it('shows an empty state before any center is placed', () => {
		expect(mountPanel().find('.cooling-center-empty').text()).toMatch(/no cooling centers/i)
	})

	it('removes a single center from the store and the map', async () => {
		const store = useMitigationStore()
		const keep = store.addCoolingCenter({
			grid_id: 'g2',
			euref_x: 0,
			euref_y: 0,
			capacity: 500,
			entityId: 'cooling_g2_1',
		})
		store.addCoolingCenter({
			grid_id: 'g1',
			euref_x: 0,
			euref_y: 0,
			capacity: 100,
			entityId: 'cooling_g1_1',
		})
		const w = mountPanel()

		await w.find('[aria-label="Remove cooling center in cell g1"]').trigger('click')

		expect(store.coolingCenters).toEqual([keep])
		expect(entities.removeById).toHaveBeenCalledWith('cooling_g1_1')
		expect(w.findAll('.cooling-center-item')).toHaveLength(1)
	})

	it('asks before clearing all centers', async () => {
		const store = useMitigationStore()
		store.addCoolingCenter({ grid_id: 'g1', euref_x: 0, euref_y: 0, capacity: 100 })
		store.addCoolingCenter({ grid_id: 'g2', euref_x: 0, euref_y: 0, capacity: 100 })
		const w = mountPanel()

		await button(w, 'Clear all').trigger('click')
		expect(store.coolingCenters).toHaveLength(2)
		expect(w.text()).toContain('Remove all 2 cooling centers?')

		await button(w, 'Remove all').trigger('click')
		await new Promise((r) => setTimeout(r))
		expect(store.coolingCenters).toHaveLength(0)
	})

	it('disables Clear all when nothing is placed', () => {
		expect(button(mountPanel(), 'Clear all').attributes('disabled')).toBeDefined()
	})
})
