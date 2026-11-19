/**
 * The cooling-center limit is an inline tonal notice, not a native alert() (#1153).
 */

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CoolingCenter from '@/components/CoolingCenter.vue'
import { COOLING_CENTER_MESSAGES } from '@/constants/errorMessages.js'
import { useGlobalStore } from '@/stores/globalStore.js'
import { useMitigationStore } from '@/stores/mitigationStore'

vi.mock('@/services/cesiumProvider.js', () => ({
	getCesium: () => ({
		CustomDataSource: function CustomDataSource() {
			this.entities = { add: vi.fn() }
		},
		ScreenSpaceEventType: { LEFT_CLICK: 0 },
	}),
}))
vi.mock('@/services/datasource.js', () => ({ default: class {} }))

const gridEntity = (gridId) => ({
	properties: { grid_id: { getValue: () => gridId } },
})

describe('CoolingCenter limit notice', { tags: ['@unit'] }, () => {
	/** @type {import('@vue/test-utils').VueWrapper<any> | null} */
	let wrapper = null

	beforeEach(() => {
		setActivePinia(createPinia())
		useGlobalStore().cesiumViewer = /** @type {any} */ ({
			dataSources: { getByName: () => [], add: vi.fn() },
			screenSpaceEventHandler: { setInputAction: vi.fn(), removeInputAction: vi.fn() },
		})
		vi.stubGlobal('alert', vi.fn())
	})

	afterEach(() => {
		wrapper?.unmount()
		wrapper = null
		vi.unstubAllGlobals()
	})

	it('shows an inline notice when a grid cell already has five cooling centers', async () => {
		const mitigationStore = useMitigationStore()
		for (let i = 0; i < 5; i++) {
			mitigationStore.addCoolingCenter({ grid_id: 'g1', euref_x: 0, euref_y: 0, capacity: 100 })
		}
		wrapper = mount(CoolingCenter, {
			global: { plugins: [createVuetify({ components, directives })] },
		})

		wrapper.vm.addCoolingCenter(gridEntity('g1'))
		await wrapper.vm.$nextTick()

		expect(globalThis.alert).not.toHaveBeenCalled()
		expect(wrapper.find('.v-alert').text()).toContain(COOLING_CENTER_MESSAGES.limitReached)
		expect(mitigationStore.getCoolingCenterCount('g1')).toBe(5)
	})
})

// Runs after the suite above (Vitest runs a file's tests in order): the alert stub
// must not leak to later tests in the same worker.
describe('CoolingCenter limit notice cleanup', { tags: ['@unit'] }, () => {
	it('restores the global alert after the suite', () => {
		expect(vi.isMockFunction(globalThis.alert)).toBe(false)
	})
})
