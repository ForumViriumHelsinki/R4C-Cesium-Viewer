/**
 * E2E contract for #951 (Sentry REGIONS4CLIMATE-3Y): the sidebar must not act on
 * clicks before the Cesium viewer exists.
 *
 * The lazy Cesium chunk is held with page.route, which recreates the window in which
 * production users clicked a background map and hit "Cesium accessed before
 * initialization". During the hold the spec clicks Background Maps → Satellite,
 * the Land Cover switch and the search field with real mouse input (page.mouse, so
 * the browser's own hit-testing and `inert` handling apply), then releases the chunk
 * and checks that the same controls work.
 *
 * Runs without a database: it needs only the app shell and the Cesium chunk.
 */

import { expect, test } from '../fixtures/test-fixture'

/** Dev serves /src/services/cesiumSymbols.js; a build emits assets/cesiumSymbols.<hash>.<ver>.js */
const CESIUM_CHUNK = /\/cesiumSymbols[^/]*\.js/

const PRE_INIT_ERROR = /accessed before initialization|Cannot read properties of null/

test.describe('Sidebar before the Cesium viewer exists (#951)', () => {
	// Desktop layout only. On the Pixel 5 project the post-init clicks are intercepted
	// by the LoadingIndicator banner that overlays the temporary drawer.
	test.skip(({ isMobile }) => isMobile, 'desktop sidebar layout only')

	test(
		'ignores clicks while the Cesium chunk loads, then works',
		{ tag: ['@e2e', '@smoke'] },
		async ({ page }) => {
			const errors: string[] = []
			page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
			page.on('console', (message) => {
				if (message.type() === 'error' && PRE_INIT_ERROR.test(message.text())) {
					errors.push(`console: ${message.text()}`)
				}
			})

			let releaseChunk: () => void = () => {}
			const chunkHeld = new Promise<void>((resolve) => {
				releaseChunk = resolve
			})
			let chunkRequested = false
			await page.route(CESIUM_CHUNK, async (route) => {
				chunkRequested = true
				await chunkHeld
				await route.continue()
			})

			await page.goto('/')
			await page.waitForLoadState('domcontentloaded')
			// The disclaimer mounts with the viewer shell, independent of the Cesium chunk, and
			// its scrim would swallow every click. Clicking its button was flaky here ("element
			// is not stable"), so remove it the way tests/fixtures/cesium-fixture.ts does.
			const disclaimer = page.getByRole('dialog', { name: 'R4C Climate Demo' })
			await expect(disclaimer).toBeVisible()
			await page.evaluate(() => {
				for (const dialog of document.querySelectorAll('[role="dialog"]')) {
					if (dialog.textContent?.includes('R4C Climate Demo')) dialog.remove()
				}
				for (const scrim of document.querySelectorAll('.v-overlay__scrim')) scrim.remove()
			})
			await expect(disclaimer).toHaveCount(0)

			const hint = page.locator('.viewer-loading-hint')
			const content = page.locator('.sidebar-content')
			await expect(hint).toBeVisible()
			expect(chunkRequested, 'the Cesium chunk request must be the thing being held').toBe(true)
			// Soft from here to the release, so a regression reports every symptom at once.
			await expect.soft(content).toHaveAttribute('inert', '')

			/** Real mouse input at the element's centre; the browser decides who receives it. */
			const mouseClick = async (target: ReturnType<typeof page.locator>) => {
				// Scroll it into view and wait out the v-window slide, or the click lands off-panel.
				await target.scrollIntoViewIfNeeded()
				await expect(target).toBeInViewport({ ratio: 1 })
				const box = await target.boundingBox()
				expect(box, 'control must be laid out while inert').not.toBeNull()
				if (!box) return
				await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
			}

			const satellite = page.locator('.v-list-item', { hasText: 'Satellite' }).first()
			const landCover = page.locator('.control-item', { hasText: 'Land Cover' }).locator('input')

			await mouseClick(satellite)
			await mouseClick(landCover)
			await page.mouse.move(0, 0) // no hover tooltip left over the tab bar
			await page.getByRole('tab', { name: /Search/ }).click()
			const searchInput = page.locator('.unified-search input')
			await mouseClick(searchInput)
			await page.keyboard.type('Mannerheimintie')
			await page.keyboard.press('Enter')

			// Inert: the controls did not take the input, and nothing threw.
			await expect.soft(searchInput).toHaveValue('')
			await page.getByRole('tab', { name: /Layers/ }).click()
			await expect.soft(landCover).not.toBeChecked()
			await expect.soft(satellite).not.toHaveClass(/\bselected\b/)
			expect(errors, 'errors while the Cesium chunk was held').toEqual([])

			releaseChunk()
			await expect(hint).toBeHidden({ timeout: 60_000 })
			await expect(content).not.toHaveAttribute('inert')

			// Ready: the same controls now respond.
			await landCover.click()
			await expect(landCover).toBeChecked()
			await satellite.click()
			await expect(satellite).toHaveClass(/\bselected\b/)

			expect(errors, 'errors after the viewer was ready').toEqual([])
		}
	)
})
