import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import PrintBox from '@/components/PrintBox.vue'
import { useGlobalStore } from '@/stores/globalStore.js'

vi.mock('@/services/cesiumProvider.js', () => ({
	getCesium: vi.fn(() => ({
		Color: (r, g, b, a) => ({ r, g, b, a }),
	})),
}))

vi.mock('@/services/eventEmitter.js', () => ({
	eventBus: {
		on: vi.fn(),
		off: vi.fn(),
		emit: vi.fn(),
	},
}))

describe('PrintBox Component', () => {
	let wrapper
	let store

	beforeEach(() => {
		setActivePinia(createPinia())
		store = useGlobalStore()
		vi.clearAllMocks()
	})

	afterEach(() => {
		if (wrapper) {
			wrapper.unmount()
		}
		vi.clearAllMocks()
	})

	describe('entityPrint with null pickedEntity', () => {
		it('should not crash when pickedEntity is null', async () => {
			// RED phase: This should fail without the null check fix
			store.pickedEntity = null

			expect(() => {
				wrapper = mount(PrintBox)
			}).not.toThrow()

			await nextTick()
			expect(wrapper.vm).toBeDefined()
		})

		it('should render component even when pickedEntity is null', async () => {
			store.pickedEntity = null
			wrapper = mount(PrintBox)
			await nextTick()

			expect(wrapper.find('#printContainer').exists()).toBe(true)
		})
	})

	describe('entityPrint with valid data', () => {
		it('should not crash when entity lacks _polygon property', async () => {
			const invalidEntity = {
				properties: { posno: '00100' },
			}
			store.pickedEntity = invalidEntity

			expect(() => {
				wrapper = mount(PrintBox)
			}).not.toThrow()

			await nextTick()
			expect(wrapper.vm).toBeDefined()
		})

		it('should not crash when entity lacks properties', async () => {
			const invalidEntity = {
				_polygon: true,
			}
			store.pickedEntity = invalidEntity

			expect(() => {
				wrapper = mount(PrintBox)
			}).not.toThrow()

			await nextTick()
			expect(wrapper.vm).toBeDefined()
		})

		it('should not crash when entity is undefined', async () => {
			store.pickedEntity = undefined

			expect(() => {
				wrapper = mount(PrintBox)
			}).not.toThrow()

			await nextTick()
			expect(wrapper.vm).toBeDefined()
		})
	})

	describe('printContainer rendering', () => {
		it('should render printContainer element', async () => {
			store.pickedEntity = null
			wrapper = mount(PrintBox)
			await nextTick()

			expect(wrapper.find('#printContainer').exists()).toBe(true)
		})

		it('should have initial placeholder text', async () => {
			store.pickedEntity = null
			wrapper = mount(PrintBox)
			await nextTick()

			const container = wrapper.find('#printContainer')
			expect(container.text()).toContain('Please click on areas to retrieve more information')
		})
	})
})
