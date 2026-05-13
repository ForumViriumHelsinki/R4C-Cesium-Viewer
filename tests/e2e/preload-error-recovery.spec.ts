/**
 * E2E regression test for issue #740: stale dynamic-import chunks after
 * a deploy must trigger a reload rather than a hard crash.
 *
 * Strategy:
 *   1. Load the app once so the global `vite:preloadError` handler installs.
 *   2. Verify the handler is wired up (via the install flag on `window`).
 *   3. Dispatch a synthetic `vite:preloadError` event and assert the page
 *      reloads — the actual recovery contract.
 *
 * Why not stub a chunk URL with `page.route('**\/assets/ControlPanel*.js')`?
 * In dev mode (Vite serves un-hashed module URLs from /src/), the
 * `/assets/*.js` URL pattern doesn't exist. In CI we run against the dev
 * server, so a route-level 404 simulation would never be hit. Dispatching
 * the same event Vite would dispatch on a real 404 is the more reliable
 * contract — and it's what the production recovery path depends on.
 *
 * @see src/utils/preloadErrorHandler.js
 */

import { expect, test } from '../fixtures/test-fixture'

test.describe('Preload error recovery (#740)', () => {
	test(
		'reloads the page when a vite:preloadError event fires',
		{ tag: ['@e2e', '@smoke'] },
		async ({ page }) => {
			await page.goto('/')
			await page.waitForLoadState('domcontentloaded')

			// Confirm the global handler installed at startup. If this fails the
			// test is meaningless — bail with a clear message rather than a
			// flaky reload assertion later.
			const installed = await page.evaluate(
				() =>
					(window as { __r4cPreloadErrorHandlerInstalled?: boolean })
						.__r4cPreloadErrorHandlerInstalled === true
			)
			expect(installed, 'preloadErrorHandler must install on app startup').toBe(true)

			// Mark a sentinel on the window so we can tell whether the reload
			// actually wiped the page context. After reload, the sentinel will
			// be gone because window is fresh.
			await page.evaluate(() => {
				;(window as { __preloadErrorTestSentinel?: boolean }).__preloadErrorTestSentinel = true
			})

			// Set up a promise that resolves when the page reloads. Use the
			// `framenavigated` event on the main frame — it fires for full
			// document reloads.
			const reloadPromise = page.waitForEvent('framenavigated', { timeout: 10_000 })

			// Dispatch the same event Vite emits when a dynamic import 404s.
			await page.evaluate(() => {
				const event = new Event('vite:preloadError') as Event & { payload: Error }
				event.payload = new Error(
					'Failed to fetch dynamically imported module: /assets/ControlPanel.gy_DqM1H.1.45.1.js'
				)
				window.dispatchEvent(event)
			})

			await reloadPromise

			// Verify the sentinel is gone — proves a real document-level reload
			// happened (not just a SPA route change).
			await page.waitForLoadState('domcontentloaded')
			const sentinelStillPresent = await page.evaluate(
				() =>
					(window as { __preloadErrorTestSentinel?: boolean }).__preloadErrorTestSentinel === true
			)
			expect(sentinelStillPresent, 'page should have fully reloaded, wiping the sentinel').toBe(
				false
			)
		}
	)

	test(
		'does not reload twice when a second preloadError fires within the guard window',
		{ tag: ['@e2e'] },
		async ({ page }) => {
			await page.goto('/')
			await page.waitForLoadState('domcontentloaded')

			// Pre-seed sessionStorage with a recent reload timestamp so the
			// guard treats the dispatched event as a second-failure-after-reload
			// scenario. This avoids actually reloading the page mid-test, which
			// would make the assertion flaky.
			await page.evaluate(() => {
				window.sessionStorage.setItem('r4c:preloadErrorReloadAt', String(Date.now()))
			})

			// Hook page reloads — if the guard works, reload must NOT fire.
			let reloadFired = false
			page.on('framenavigated', () => {
				reloadFired = true
			})

			await page.evaluate(() => {
				const event = new Event('vite:preloadError') as Event & { payload: Error }
				event.payload = new Error('Failed to fetch dynamically imported module: /assets/X.js')
				window.dispatchEvent(event)
			})

			// Give the handler time to run (it's synchronous, but allow the
			// microtask queue to drain).
			await page.waitForTimeout(500)

			expect(reloadFired, 'guard should suppress reload within the window').toBe(false)
		}
	)
})
