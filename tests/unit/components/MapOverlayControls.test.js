/**
 * The floating map controls (compass, zoom, feature flags) are fixed to the right
 * edge of the viewport. With the right-hand analysis drawer open they drew on top
 * of its charts, so they move left of the drawer while it is open (PR #1135).
 */

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import MapOverlayControls from '@/components/MapOverlayControls.vue'
import { LAYOUT } from '@/constants/layout.js'
import { useToggleStore } from '@/stores/toggleStore.js'

const DESKTOP_WIDTH = 1280
const MOBILE_WIDTH = 390

/**
 * Mounts the controls with Vuetify's display measured at the given width.
 * @param {number} width - window.innerWidth seen by useDisplay
 */
const mountAt = (width) => {
	vi.stubGlobal('innerWidth', width)
	const vuetify = createVuetify({ components, directives })
	return mount(MapOverlayControls, {
		global: { plugins: [vuetify], stubs: { FeatureFlagsPanel: true } },
	})
}

/** @param {import('@vue/test-utils').VueWrapper} wrapper */
const rightOffset = (wrapper) =>
	/** @type {HTMLElement} */ (wrapper.find('.map-overlay-controls').element).style.right

describe('MapOverlayControls position', { tags: ['@unit'] }, () => {
	beforeEach(() => {
		setActivePinia(createPinia())
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('keeps the stylesheet position while the analysis drawer is closed', () => {
		const wrapper = mountAt(DESKTOP_WIDTH)
		expect(rightOffset(wrapper)).toBe('')
	})

	it('moves left of the open analysis drawer on desktop', async () => {
		const wrapper = mountAt(DESKTOP_WIDTH)
		useToggleStore().setAnalysisPanelOpen(true)
		await wrapper.vm.$nextTick()

		expect(rightOffset(wrapper)).toBe(`${LAYOUT.ANALYSIS_PANEL_WIDTH + 16}px`)

		useToggleStore().setAnalysisPanelOpen(false)
		await wrapper.vm.$nextTick()
		expect(rightOffset(wrapper)).toBe('')
	})

	it('does not move on mobile, where the drawer is full width', async () => {
		const wrapper = mountAt(MOBILE_WIDTH)
		useToggleStore().setAnalysisPanelOpen(true)
		await wrapper.vm.$nextTick()

		expect(rightOffset(wrapper)).toBe('')
	})
})
