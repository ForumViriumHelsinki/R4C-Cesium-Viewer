/**
 * Sidebar layout regressions (PR #1135). Layout cannot be checked under jsdom,
 * so these run in a real browser. None needs postal-code data, so they also
 * run in mock mode.
 *
 * Tags: @e2e @sidebar
 */

import { expect, type Page } from '@playwright/test'
import { cesiumTest } from '../fixtures/cesium-fixture'

/** Short enough that the start-level Layers tab overflows the sidebar. */
const VIEWPORT = { width: 1280, height: 720 }
/** SIDEBAR_RAIL_WIDTH and SIDEBAR_EXPANDED_WIDTH in src/constants/layout.js */
const RAIL_WIDTH = 56
const EXPANDED_WIDTH = 360

const sidebar = (page: Page) => page.locator('.control-panel')
const tab = (page: Page, name: string) => page.locator('.sidebar-tabs .v-tab', { hasText: name })

const top = (page: Page, selector: string) =>
	page.locator(selector).evaluate((el) => Math.round(el.getBoundingClientRect().top))

cesiumTest.describe('Sidebar layout', { tag: ['@e2e', '@sidebar'] }, () => {
	cesiumTest.beforeEach(async ({ cesiumPage }) => {
		await cesiumPage.setViewportSize(VIEWPORT)
	})

	cesiumTest('scrolling a long tab keeps the tab bar in view', async ({ cesiumPage }) => {
		await tab(cesiumPage, 'Layers').click()

		// Not vacuous: the tab must be taller than the sidebar for scrolling to matter.
		const { contentHeight, sidebarHeight } = await cesiumPage.evaluate(() => ({
			contentHeight: document.querySelector('.v-window-item--active .tab-content')!.scrollHeight,
			sidebarHeight: document.querySelector('.control-panel')!.clientHeight,
		}))
		expect(contentHeight, 'Layers tab is taller than the sidebar').toBeGreaterThan(sidebarHeight)

		const tabsTopBefore = await top(cesiumPage, '.sidebar-tabs')
		// Scroll every scroll container in the sidebar to the end. Before the fix the
		// drawer's own wrapper scrolled, taking the tab bar with it.
		await cesiumPage.evaluate(() => {
			for (const el of document.querySelectorAll<HTMLElement>('.control-panel, .control-panel *')) {
				if (el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight
			}
		})

		expect(await top(cesiumPage, '.sidebar-tabs')).toBe(tabsTopBefore)
		await expect(cesiumPage.locator('.sidebar-tabs')).toBeInViewport()
		// The end of the tab is reachable, not clipped by a fixed-height container.
		const lastSection = cesiumPage.locator('.v-window-item--active .tab-content > *').last()
		await expect(lastSection).toBeInViewport()
	})

	cesiumTest('a long area name stays inside the sidebar', async ({ cesiumPage }) => {
		await cesiumPage.evaluate(() => {
			const store = (window as any).globalStore
			store.setPostalCode('00100')
			store.setNameOfZone('Helsinki Keskusta - Etu-Töölö - Kamppi - Ruoholahti')
		})
		await tab(cesiumPage, 'Search').click()

		const button = sidebar(cesiumPage).getByRole('button', { name: /^Focus on / })
		await expect(button).toBeVisible()
		// Measure the label, not the <button>: before the fix the button box fit and its
		// content (422 px) spilled past both edges. Polled because v-window slides the
		// tab in, so a single read can land mid-transition with everything offscreen.
		const label = button.locator('.v-btn__content')
		await expect
			.poll(async () => {
				const [b, s] = await Promise.all([label.boundingBox(), sidebar(cesiumPage).boundingBox()])
				return Boolean(b && s && b.x >= s.x && b.x + b.width <= s.x + s.width)
			})
			.toBe(true)
		await expect(button).toHaveAttribute('title', /Kamppi - Ruoholahti \(00100\)/)
	})

	cesiumTest('expanding from the rail shows no scroll arrows', async ({ cesiumPage }) => {
		await tab(cesiumPage, 'Layers').click()
		const width = async () => Math.round((await sidebar(cesiumPage).boundingBox())?.width ?? -1)
		// Wait for each width to settle. Expanding before the collapse reaches the rail
		// starts from nearly full width, and then the bug does not show.
		for (let i = 0; i < 3; i++) {
			await cesiumPage.getByRole('button', { name: 'Collapse sidebar' }).click()
			await expect.poll(width).toBe(RAIL_WIDTH)
			await cesiumPage.getByRole('button', { name: 'Expand sidebar' }).click()
			await expect.poll(width).toBe(EXPANDED_WIDTH)
		}
		await expect(tab(cesiumPage, 'Layers')).toBeVisible()

		// Slide groups: the tab bar and the background-map chips.
		await expect(sidebar(cesiumPage).locator('.v-slide-group').first()).toBeVisible()
		await expect(sidebar(cesiumPage).locator('.v-slide-group--is-overflowing')).toHaveCount(0)
	})
})
