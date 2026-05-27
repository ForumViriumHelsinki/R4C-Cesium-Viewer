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
import { expect } from '@playwright/test'
import { cesiumTest } from '../fixtures/cesium-fixture'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const FIXTURE_PATH = path.join(__dirname, 'fixtures/vtt-flood/scenario-1-frame-0.json')
const FIXTURE_BODY = fs.readFileSync(FIXTURE_PATH, 'utf-8')

cesiumTest.describe('VTT Flood Simulation', () => {
	cesiumTest.use({ tag: ['@e2e', '@feature-flag', '@vtt-flood'] })

	cesiumTest('button is hidden when the flag is off', async ({ cesiumPage }) => {
		// No flag set — vttFloodSimulation fallbackDefault is false.
		const button = cesiumPage.getByRole('button', { name: /Flood Simulation \(VTT\)/i })
		await expect(button).toHaveCount(0)
	})

	cesiumTest(
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

			// The data source name lands in the viewer's collection.
			const hasLayer = await cesiumPage.evaluate(() => {
				const viewer = (window as any).__viewer || (window as any).viewer
				if (!viewer?.dataSources) return false
				const sources = viewer.dataSources._dataSources || []
				return sources.some((ds: { name?: string }) => ds.name === 'VTT-Flood-Simulation')
			})
			expect(hasLayer).toBe(true)
		}
	)
})
