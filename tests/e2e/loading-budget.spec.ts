/**
 * Load-time budgets that hold on any renderer: Cesium stays out of the entry
 * bundle (#279), and the start view's Helsinki WMS base map stays below the
 * tile-request count the 512 px tiles brought it to (#339, #340). Moved from
 * tests/loading-performance.spec.ts, which test:e2e never ran (#1147).
 *
 * Both use the plain `test` fixture: in CI `cesiumTest` swaps in a mock Cesium,
 * which loads neither the real chunk nor any imagery.
 *
 * Tags: @e2e @performance
 */

import type { Page, Response } from '@playwright/test'
import { BUNDLE_SIZE_BUDGETS } from '../config/constants'
import { expect, test } from '../fixtures/test-fixture'
import { dismissModalIfPresent, TEST_TIMEOUTS } from '../helpers/test-helpers'

const KIB = BUNDLE_SIZE_BUDGETS.BYTES_PER_KIB
/** Base-map tiles the start view requested before #340 (~600), and the ceiling after it. */
const MAX_START_VIEW_WMS_REQUESTS = 200

/** Response size from content-length, or from the body when the dev server omits it. */
async function responseSize(response: Response): Promise<number> {
	const contentLength = response.headers()['content-length']
	if (contentLength) return Number.parseInt(contentLength, 10)
	const body = await response.body().catch(() => null)
	return body?.byteLength ?? 0
}

/** Opens the app and waits until the Cesium viewer exists, which needs the Cesium chunk. */
async function openViewer(page: Page): Promise<void> {
	await page.goto('/')
	await dismissModalIfPresent(page, 'Explore Map')
	await page.waitForFunction(() => Boolean((window as any).__viewer), undefined, {
		timeout: TEST_TIMEOUTS.CESIUM_READY_CI,
	})
}

test.describe('Load-time budgets', { tag: ['@e2e', '@performance'] }, () => {
	test('Cesium loads as its own chunk, outside the entry bundle', async ({ page }, testInfo) => {
		const responses: Response[] = []
		page.on('response', (response) => {
			if (new URL(response.url()).pathname.endsWith('.js')) responses.push(response)
		})

		await openViewer(page)
		const measure = (list: Response[]) =>
			Promise.all(
				list.map(async (r) => ({ url: new URL(r.url()).pathname, size: await responseSize(r) }))
			)
		// /cesium-package/ holds Cesium's static worker scripts. They load whether or
		// not the Cesium library is split out, so they are neither the Cesium chunk
		// nor part of the app's own scripts, and are left out of both.
		const path = (r: Response) => new URL(r.url()).pathname.toLowerCase()
		const scripts = responses.filter((r) => !path(r).startsWith('/cesium-package/'))
		const isCesium = (r: Response) => path(r).includes('cesium')
		const cesium = await measure(scripts.filter(isCesium))
		const otherResponses = scripts.filter((r) => !isCesium(r))

		expect(cesium.length, 'a Cesium module loaded').toBeGreaterThan(0)
		expect(otherResponses.length, 'non-Cesium scripts loaded').toBeGreaterThan(0)

		// The size budgets describe a production build. The dev server serves
		// unbundled, untree-shaken modules (@mdi/js alone is ~6.7 MiB there), so
		// they apply only when the app is served from a build, as in CI.
		const devServer = otherResponses.some((r) =>
			/^\/(node_modules\/\.vite|src)\//.test(new URL(r.url()).pathname)
		)
		if (devServer) {
			testInfo.annotations.push({
				type: 'skipped-assertion',
				description: 'bundle size budgets apply to a build, not the Vite dev server',
			})
			return
		}

		const other = await measure(otherResponses)
		const largest = other.reduce((a, b) => (b.size > a.size ? b : a))
		const total = other.reduce((sum, { size }) => sum + size, 0)
		console.log(
			`[bundle] largest non-Cesium script ${largest.url} ${(largest.size / KIB).toFixed(0)} KiB; ` +
				`${other.length} scripts, ${(total / KIB).toFixed(0)} KiB in all`
		)
		expect(largest.size, `largest non-Cesium script (${largest.url})`).toBeLessThan(
			BUNDLE_SIZE_BUDGETS.MAX_MAIN_BUNDLE
		)
		expect(total, 'all non-Cesium scripts').toBeLessThan(BUNDLE_SIZE_BUDGETS.MAX_TOTAL_MAIN_BUNDLE)

		// Cesium is a separate, lazily loaded chunk, and the entry module that
		// index.html loads is not it.
		expect(
			cesium.some(({ size }) => size > BUNDLE_SIZE_BUDGETS.MIN_CESIUM_CHUNK),
			`a Cesium chunk over ${BUNDLE_SIZE_BUDGETS.MIN_CESIUM_CHUNK / KIB} KiB: ${JSON.stringify(cesium)}`
		).toBe(true)
		const entry = await page.evaluate(
			() => document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src ?? ''
		)
		expect(entry, 'entry module').not.toBe('')
		expect(new URL(entry).pathname.toLowerCase(), 'entry module').not.toContain('cesium')
	})

	test('the start view requests a bounded number of Helsinki WMS tiles', async ({ page }) => {
		const wmsRequests: string[] = []
		page.on('request', (request) => {
			if (new URL(request.url()).pathname === '/helsinki-wms') wmsRequests.push(request.url())
		})

		await openViewer(page)
		// The base map is fully requested once the globe reports all tiles loaded.
		await expect
			.poll(
				() => page.evaluate(() => Boolean((window as any).__viewer?.scene?.globe?.tilesLoaded)),
				{
					timeout: TEST_TIMEOUTS.CESIUM_READY_CI,
				}
			)
			.toBe(true)

		console.log(`[wms] start view requested ${wmsRequests.length} Helsinki WMS tiles`)
		// Not vacuous: the start view's base map is a Helsinki WMS layer
		// (useViewerInitialization.js), so a count of zero means the filter missed.
		expect(wmsRequests.length, 'Helsinki WMS requests seen at all').toBeGreaterThan(0)
		expect(wmsRequests.length).toBeLessThan(MAX_START_VIEW_WMS_REQUESTS)
	})
})
