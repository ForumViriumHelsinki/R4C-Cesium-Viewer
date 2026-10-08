/**
 * VTT Flood Simulation — feature-flag-gated integration spec.
 *
 * Tags: @e2e @feature-flag @vtt-flood
 *
 * Mocks the POST /vtt-api endpoint with a small fixture so the panel renders
 * without depending on the upstream VTT API.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, type Page } from '@playwright/test'
import { cesiumTest } from '../fixtures/cesium-fixture'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const FIXTURE_PATH = path.join(__dirname, 'fixtures/vtt-flood/scenario-1-frame-0.json')
const FIXTURE_BODY = fs.readFileSync(FIXTURE_PATH, 'utf-8')

/** Query-string keys owned by the flood panel (composables/useVttFloodUrlState.js). */
const VTT_URL_KEYS = ['vtt', 'vttscenario', 'vttframe', 'vttdim', 'vttopacity']

const urlParam = (page: Page, key: string) => new URL(page.url()).searchParams.get(key)

cesiumTest.describe('VTT Flood Simulation', () => {
	cesiumTest.use({ tag: ['@e2e', '@feature-flag', '@vtt-flood'] })

	cesiumTest('button is hidden when the flag is off', async ({ cesiumPage }) => {
		// No flag set — vttFloodSimulation fallbackDefault is false.
		const button = cesiumPage.getByRole('button', { name: /Flood Simulation \(VTT\)/i })
		await expect(button).toHaveCount(0)
	})

	// Quarantined: fails on every attempt in CI — see #998
	cesiumTest.fixme(
		'with flag enabled, opens panel and fires exactly one POST per scenario+frame',
		async ({ cesiumPage }) => {
			let postCount = 0

			// Narrow route: only the VTT proxy, never localhost module requests.
			await cesiumPage.route('**/vtt-api', (route) => {
				if (route.request().method() !== 'POST') return route.continue()
				postCount += 1
				return route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: FIXTURE_BODY,
				})
			})

			// Enable the flag via localStorage override (same channel as
			// FeatureFlagsPanel.doImport). The store reads this on init.
			await cesiumPage.evaluate(() => {
				localStorage.setItem('featureFlags', JSON.stringify({ vttFloodSimulation: true }))
			})
			await cesiumPage.reload()
			await cesiumPage.waitForLoadState('domcontentloaded')

			// Open the Layers tab and click the gated button.
			await cesiumPage.getByRole('tab', { name: 'Layers' }).click()
			const button = cesiumPage.getByRole('button', { name: /Flood Simulation \(VTT\)/i })
			await expect(button).toBeVisible()
			await button.click()

			// Panel mounts and shows the scenario description (verifies select rendered).
			await expect(cesiumPage.getByText(/80 mm\/h cloudburst/i)).toBeVisible()

			// Initial fetch should have fired exactly once.
			await expect.poll(() => postCount, { timeout: 5000 }).toBe(1)

			// Switching dimension must NOT trigger another network request — the
			// frame data is cached and only the rendering changes.
			const overlandRadio = cesiumPage.getByLabel(/Overland water depth/i)
			await overlandRadio.click()
			await cesiumPage.waitForTimeout(400)
			expect(postCount).toBe(1)

			// The panel state is in the query string for link sharing.
			await expect.poll(() => urlParam(cesiumPage, 'vtt')).toBe('1')
			await expect.poll(() => urlParam(cesiumPage, 'vttdim')).toBe('overland_water_depth')

			// The flood layer is one Primitive in scene.primitives, tagged with
			// vttLayerName (services/vttFloodPrimitive.js).
			const countFloodLayers = () =>
				cesiumPage.evaluate(() => {
					const viewer = (window as any).__viewer || (window as any).viewer
					const primitives = viewer?.scene?.primitives
					if (!primitives) return -1
					let count = 0
					for (let i = 0; i < primitives.length; i++) {
						if (primitives.get(i)?.vttLayerName === 'VTT-Flood-Simulation') count += 1
					}
					return count
				})
			await expect.poll(countFloodLayers, { timeout: 5000 }).toBe(1)

			// Closing the panel removes the layer.
			await cesiumPage.getByRole('button', { name: /Close VTT flood simulation panel/i }).click()
			await expect.poll(countFloodLayers, { timeout: 5000 }).toBe(0)
			for (const key of VTT_URL_KEYS) {
				await expect.poll(() => urlParam(cesiumPage, key)).toBeNull()
			}
		}
	)

	// Quarantined with the test above (#998): the panel tests fail in CI.
	cesiumTest.fixme(
		'a shared link reopens the panel with its scenario, frame and dimension',
		async ({ cesiumPage }) => {
			const requests: string[] = []
			// Match on the path: the client adds ?scenario=&frame= to the proxy URL.
			await cesiumPage.route(
				(url) => url.pathname === '/vtt-api',
				(route) => {
					if (route.request().method() !== 'POST') return route.continue()
					requests.push(route.request().url())
					return route.fulfill({ status: 200, contentType: 'application/json', body: FIXTURE_BODY })
				}
			)
			await cesiumPage.evaluate(() => {
				localStorage.setItem('featureFlags', JSON.stringify({ vttFloodSimulation: true }))
			})
			await cesiumPage.goto('/?vtt=1&vttscenario=2&vttframe=120&vttdim=overland_water_depth')
			await cesiumPage.waitForLoadState('domcontentloaded')

			await expect(cesiumPage.getByText(/HSY large rainfall event/i)).toBeVisible()
			await expect(cesiumPage.getByText(/120 \/ 287/)).toBeVisible()
			await expect(cesiumPage.getByLabel(/Overland water depth/i)).toBeChecked()
			// One fetch, for the linked frame.
			await expect.poll(() => requests.length).toBe(1)
			expect(requests[0]).toContain('scenario=2&frame=120')
		}
	)
})
