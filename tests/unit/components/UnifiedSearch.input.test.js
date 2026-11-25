/**
 * @file The search results open for text that arrives without a keyup
 * @tag @unit
 *
 * UnifiedSearch searched on `keyup` only. Text pasted with the mouse, filled in
 * by the browser, or set by Playwright's `fill()` fires `input` but no `keyup`,
 * so the results menu stayed closed unless the field's focus handler happened
 * to open it. The E2E test "finds a postal code area by its number" depended
 * on that timing and failed on every attempt on PR #1220.
 */

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import UnifiedSearch from '@/components/UnifiedSearch.vue'

vi.mock('@/services/camera', () => ({ default: vi.fn() }))
vi.mock('@/services/featurepicker', () => ({ default: vi.fn() }))

describe('UnifiedSearch input', { tags: ['@unit'] }, () => {
	let wrapper

	beforeEach(() => {
		setActivePinia(createPinia())
		// jsdom lacks visualViewport, which Vuetify's menu positioning reads.
		vi.stubGlobal(
			'visualViewport',
			Object.assign(new EventTarget(), { width: 1280, height: 800, scale: 1 })
		)
		wrapper = mount(
			{ render: () => h(components.VApp, null, { default: () => h(UnifiedSearch) }) },
			{ attachTo: document.body, global: { plugins: [createVuetify({ components, directives })] } }
		)
	})

	afterEach(() => {
		wrapper.unmount()
		vi.unstubAllGlobals()
	})

	it('opens the results for text set without a keyup', async () => {
		const menu = wrapper.findComponent(components.VMenu)
		expect(menu.props('modelValue')).toBe(false)

		const input = wrapper.find('.unified-search input')
		input.element.value = '00100'
		await input.trigger('input')
		await flushPromises()

		expect(menu.props('modelValue')).toBe(true)
	})
	it('closes the results when the field is cleared', async () => {
		const menu = wrapper.findComponent(components.VMenu)
		const input = wrapper.find('.unified-search input')
		input.element.value = '00100'
		await input.trigger('input')
		await flushPromises()

		await wrapper.findComponent(components.VTextField).vm.$emit('update:modelValue', null)
		await flushPromises()

		expect(menu.props('modelValue')).toBe(false)
	})
})
