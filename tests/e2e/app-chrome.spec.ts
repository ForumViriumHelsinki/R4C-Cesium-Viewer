/**
 * App chrome outside the sidebar panels: the data attribution, the data source
 * status badge and the postal-code search. Moved from the top-level specs that
 * test:e2e never ran (#1147), rewritten to the current UI.
 *
 * Tags: @e2e @ui
 */

import { expect, test } from '../fixtures/test-fixture'
import { dismissModalIfPresent, TEST_TIMEOUTS } from '../helpers/test-helpers'

test.describe('App chrome', { tag: ['@e2e', '@ui'] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/')
		await dismissModalIfPresent(page, 'Explore Map')
	})

	test('shows the data attribution', async ({ page }) => {
		await expect(page.locator('.minimal-disclaimer')).toBeVisible()
		await expect(page.locator('.disclaimer-text')).toHaveText('Data: HSY • Statistics Finland')
	})

	test('shows the data source status badge', async ({ page }) => {
		const badge = page.getByRole('button', { name: 'Data source status' })
		await expect(badge).toBeVisible()
		await expect(badge).toHaveText(/\d+\/\d+/)
	})

	test('finds a postal code area by its number', async ({ page }) => {
		// The sidebar is inert until the viewer exists (#951); typing into it
		// earlier goes nowhere.
		await page.locator('.viewer-loading-hint').waitFor({
			state: 'detached',
			timeout: TEST_TIMEOUTS.CESIUM_READY_CI,
		})
		await page.getByRole('tab', { name: /Search/ }).click()

		const input = page.locator('.unified-search input')
		await input.click()
		await input.fill('00100')
		await expect(input).toHaveValue('00100')

		// Postal-code results come from the PostCodes data source the viewer loads
		// from /assets/data/hsy_po.json, so allow for that load.
		const result = page.locator('.results-card .result-item', { hasText: '00100' })
		await expect(result.first()).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT })
	})
})
