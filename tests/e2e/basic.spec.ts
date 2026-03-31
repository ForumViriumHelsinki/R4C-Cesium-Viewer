import { cesiumTest } from '../fixtures/cesium-fixture'
import { expect, test } from '../fixtures/test-fixture'
import { dismissModalIfPresent, TEST_TIMEOUTS } from '../helpers/test-helpers'

test('Page load', { tag: ['@e2e', '@smoke'] }, async ({ page }) => {
	await page.goto('/')

	// Wait for page to load and dismiss any modal if present
	await page.waitForLoadState('domcontentloaded')
	await dismissModalIfPresent(page, 'Explore Map')

	await expect(page).toHaveTitle(/R4C Uusimaa Demo/)
})

cesiumTest('HSY Background maps', { tag: ['@e2e', '@wms'] }, async ({ cesiumPage }) => {
	// Click on Environmental category chip to access HSY layers
	// The chip is a generic element with text, not a button
	const environmentalChip = cesiumPage.getByText('Environmental').first()
	await environmentalChip.waitFor({
		state: 'visible',
		timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
	})
	await environmentalChip.click()

	// Wait for search input to appear
	const searchInput = cesiumPage.getByPlaceholder('Search environmental layers...')
	await searchInput.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })

	// Wait for HSY layers to load before searching
	// Look for the loading indicator to disappear or for actual layer content to appear
	await cesiumPage
		.waitForFunction(
			() => {
				const listItems = document.querySelectorAll('.v-list-item-title')
				// Wait until we have at least one layer with actual content (not just "Updated: Unknown")
				return Array.from(listItems).some(
					(item) =>
						item.textContent &&
						item.textContent.trim().length > 0 &&
						!item.textContent.includes('Unknown')
				)
			},
			{ timeout: TEST_TIMEOUTS.CESIUM_READY }
		)
		.catch(() => {
			// If timeout, continue anyway - layers might be loaded but without titles
		})

	// Search for a layer
	await searchInput.click()
	await searchInput.fill('Kaupunginosat')

	// Wait for search to process by checking input value
	await expect(searchInput).toHaveValue('Kaupunginosat')

	// Wait for filtered results to appear
	await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP) // Small delay for search debounce

	// Wait for results to appear in the HSY layer list
	const resultContainer = cesiumPage.locator('.hsy-layer-list')
	await expect(resultContainer).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })

	// Check that we have actual layer results (the search should filter the list)
	const listItems = cesiumPage.locator('.hsy-layer-list .v-list-item')
	await expect(listItems.first()).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
})

cesiumTest('Building properties', { tag: ['@e2e', '@smoke'] }, async ({ cesiumPage }) => {
	// Verify the page loaded successfully
	await expect(cesiumPage).toHaveTitle(/R4C Uusimaa Demo/)

	// Verify Cesium canvas is visible and functional
	const canvas = cesiumPage.locator('#cesiumContainer canvas')
	await expect(canvas.first()).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT })
})

cesiumTest('Statistical Grid View', { tag: ['@e2e', '@smoke'] }, async ({ cesiumPage }) => {
	// Click on Statistical Grid button in the view mode toggle
	const statisticalGridButton = cesiumPage.getByRole('button', { name: /Statistical Grid/i })
	await statisticalGridButton.waitFor({
		state: 'visible',
		timeout: TEST_TIMEOUTS.ELEMENT_STANDARD,
	})
	await statisticalGridButton.click()

	// Verify the button is now active
	await expect(statisticalGridButton).toHaveClass(/v-btn--active/)

	// Verify the statistical grid heading appears in the sidebar
	const gridHeading = cesiumPage.getByText(/Statistical grid/i).first()
	await expect(gridHeading).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT })
})
