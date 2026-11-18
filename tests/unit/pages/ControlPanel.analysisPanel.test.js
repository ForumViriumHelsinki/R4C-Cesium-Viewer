/**
 * Opening a drawer-placed analysis from the sidebar (PR #1135).
 *
 * On mobile both the sidebar and the analysis drawer are temporary overlays, and
 * the sidebar is stacked above the drawer. Unless the sidebar closes, the analysis
 * opens hidden behind it, with only its close button showing.
 */

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ControlPanel from '@/pages/ControlPanel.vue'
import { useFeatureFlagStore } from '@/stores/featureFlagStore'
import { useGlobalStore } from '@/stores/globalStore.js'
import { useToggleStore } from '@/stores/toggleStore.js'

const MOBILE_WIDTH = 390
// Above LAYOUT.ANALYSIS_PANEL_COLLAPSE_SIDEBAR_BELOW, so the sidebar stays expanded.
const WIDE_DESKTOP_WIDTH = 1600
// The drawer analysis clicked below; its flag is switched on explicitly.
const DRAWER_ANALYSIS = { label: 'NDVI Vegetation', flag: 'ndviAnalysis' }

/** @type {import('@vue/test-utils').VueWrapper | null} */
let wrapper = null

/**
 * Mounts the sidebar at the postal-code level with a viewer present (tab content
 * is inert without one, #951) and Vuetify's display measured at `width`.
 * @param {number} width - window.innerWidth seen by useDisplay
 */
const mountAt = async (width) => {
	vi.stubGlobal('innerWidth', width)
	const vuetify = createVuetify({ components, directives })
	const globalStore = useGlobalStore()
	globalStore.setLevel('postalCode')
	globalStore.setCesiumViewer(/** @type {any} */ ({ imageryLayers: {}, scene: {}, camera: {} }))
	useFeatureFlagStore().setFlag(DRAWER_ANALYSIS.flag, true)
	const toggleStore = useToggleStore()
	toggleStore.openTab('analysis')

	wrapper = mount(
		{ render: () => h(components.VApp, null, { default: () => h(ControlPanel) }) },
		{ attachTo: document.body, global: { plugins: [vuetify] } }
	)
	await flushPromises()
	return toggleStore
}

/** Clicks the sidebar's button for the drawer analysis. */
const openDrawerAnalysis = async () => {
	const button = [...document.body.querySelectorAll('.sidebar-content button')].find(
		(el) => el.textContent?.trim() === DRAWER_ANALYSIS.label
	)
	// Not vacuous: the button must exist for the click to test anything.
	expect(button, `${DRAWER_ANALYSIS.label} button`).toBeDefined()
	const target = /** @type {HTMLElement} */ (button)
	target.click()
	await flushPromises()
}

describe('ControlPanel opening a drawer analysis', { tags: ['@unit'] }, () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		globalThis.fetch = vi.fn(() => new Promise(() => {}))
		vi.stubGlobal(
			'visualViewport',
			Object.assign(new EventTarget(), { width: 1280, height: 800, scale: 1 })
		)
	})

	afterEach(() => {
		wrapper?.unmount()
		wrapper = null
		vi.unstubAllGlobals()
		document.body.innerHTML = ''
	})

	it('closes the sidebar on mobile so the drawer is not hidden behind it', async () => {
		const toggleStore = await mountAt(MOBILE_WIDTH)
		// The mobile sidebar must be open for the user to reach the button.
		toggleStore.setSidebarMode('expanded')
		await flushPromises()

		await openDrawerAnalysis()

		expect(toggleStore.analysisPanelOpen).toBe(true)
		expect(toggleStore.sidebarMode).toBe('hidden')
	})

	it('leaves the sidebar expanded on a wide desktop', async () => {
		const toggleStore = await mountAt(WIDE_DESKTOP_WIDTH)

		await openDrawerAnalysis()

		expect(toggleStore.analysisPanelOpen).toBe(true)
		expect(toggleStore.sidebarMode).toBe('expanded')
	})
})
