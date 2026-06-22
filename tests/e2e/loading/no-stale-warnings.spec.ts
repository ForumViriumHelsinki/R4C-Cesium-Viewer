/**
 * US-09 AC1 regression spec (#816, refs #680).
 *
 * Before #816 the loadingStore ran a periodic `clearStaleLoading` timer as a
 * safety net for stuck loading indicators. On a cold load, viewport building
 * tiles queue behind CONCURRENT_TILE_LOADS and the gateway rate limit, so they
 * legitimately stay in-flight; the timer then logged a flood of
 * "[loadingStore] Clearing stale loading state for viewport_buildings_*"
 * warnings (the #680 symptom).
 *
 * #816 replaced the timer with deterministic per-tile AbortSignal tracking
 * (unifiedLoader.activeRequests owns each layer's whole lifecycle; the viewport
 * loader aborts abandoned tiles), so the stale-cleanup path is unreachable and
 * the warning must never appear. This spec fails loudly if the timer — or any
 * other periodic stale sweep — is reintroduced.
 *
 * @tag @e2e
 */

import { expect, test } from '../../fixtures/test-fixture'
import { dismissModalIfPresent, TEST_TIMEOUTS } from '../../helpers/test-helpers'
import { setupCesiumForCI, waitForAppReady } from '../helpers/cesium-helper'

// Substring emitted by loadingStore.clearStaleLoading() when it clears a layer.
const STALE_WARNING_NEEDLE = 'Clearing stale loading state'

test(
	'cold load emits no stale-loading cleanup warnings',
	{ tag: ['@e2e'] },
	async ({ page }) => {
		const staleWarnings: string[] = []

		// Attach the listener BEFORE navigation so the cold-load window is covered.
		page.on('console', (msg) => {
			const text = msg.text()
			if (text.includes(STALE_WARNING_NEEDLE)) {
				staleWarnings.push(text)
			}
		})

		await setupCesiumForCI(page)
		await page.goto('/')
		await page.waitForLoadState('domcontentloaded')
		await dismissModalIfPresent(page, 'Explore Map')
		await waitForAppReady(page, TEST_TIMEOUTS.CESIUM_READY).catch(() => {
			// App-ready is best-effort here; the assertion is about the absence of
			// warnings during the load window, not about a specific ready state.
		})

		// Idle past the window where the removed timer would have fired. In E2E
		// mode the old timer used a 3s interval with a 5s staleness threshold, so
		// ~8s comfortably spans at least one would-be sweep of any tile still
		// in-flight from the cold load.
		await page.waitForTimeout(8000)

		expect(
			staleWarnings,
			`Expected zero stale-loading cleanup warnings, got:\n${staleWarnings.join('\n')}`
		).toEqual([])
	}
)
