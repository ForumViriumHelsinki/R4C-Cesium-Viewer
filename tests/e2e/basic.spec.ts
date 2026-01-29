import { expect, test } from '@playwright/test'
import { dismissModalIfPresent, TEST_TIMEOUTS, waitForCesiumReady } from '../helpers/test-helpers'

test('Page load', { tag: ['@e2e', '@smoke'] }, async ({ page }) => {
	await page.goto('/')

	// Wait for page to load and dismiss any modal if present
	await page.waitForLoadState('domcontentloaded')
	await dismissModalIfPresent(page, 'Explore Map')

	await expect(page).toHaveTitle(/R4C Uusimaa Demo/)
})

test('HSY Background maps', { tag: ['@e2e', '@wms'] }, async ({ page }) => {
	await page.goto('/')

	// Wait for page to load and dismiss any modal if present
	await page.waitForLoadState('domcontentloaded')
	await dismissModalIfPresent(page, 'Explore Map')

	// Wait for page to be fully loaded
	await page.waitForSelector('#app', {
		state: 'visible',
		timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
	})

	// Click on Environmental category chip to access HSY layers
	// The chip is a generic element with text, not a button
	const environmentalChip = page.getByText('Environmental').first()
	await environmentalChip.waitFor({
		state: 'visible',
		timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
	})
	await environmentalChip.click()

	// Wait for search input to appear
	const searchInput = page.getByPlaceholder('Search environmental layers...')
	await searchInput.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })

	// Wait for HSY layers to load before searching
	// Look for the loading indicator to disappear or for actual layer content to appear
	await page
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
	await page.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP) // Small delay for search debounce

	// Wait for results to appear in the HSY layer list
	const resultContainer = page.locator('.hsy-layer-list')
	await expect(resultContainer).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })

	// Check that we have actual layer results (the search should filter the list)
	const listItems = page.locator('.hsy-layer-list .v-list-item')
	await expect(listItems.first()).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
})

test('Building properties', { tag: ['@e2e', '@smoke'] }, async ({ page }) => {
	await page.goto('/')

	// Wait for page to load and dismiss any modal if present
	await page.waitForLoadState('domcontentloaded')
	await dismissModalIfPresent(page, 'Explore Map')

	// Verify the page loaded successfully
	await expect(page).toHaveTitle(/R4C Uusimaa Demo/)

	// Wait for Cesium to initialize with extended timeout
	await waitForCesiumReady(page)

	// Verify canvas is visible and functional
	const canvas = page.locator('canvas')
	await expect(canvas).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT })
})

test('Statistical Grid View', { tag: ['@e2e', '@smoke'] }, async ({ page }) => {
	await page.goto('/')

	// Wait for page to load and dismiss any modal if present
	await page.waitForLoadState('domcontentloaded')
	await dismissModalIfPresent(page, 'Explore Map')

	// Wait for app to be ready
	await page.waitForSelector('#app', {
		state: 'visible',
		timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
	})

	// Click on Statistical Grid button in the view mode toggle
	const statisticalGridButton = page.getByRole('button', { name: /Statistical Grid/i })
	await statisticalGridButton.waitFor({
		state: 'visible',
		timeout: TEST_TIMEOUTS.ELEMENT_STANDARD,
	})
	await statisticalGridButton.click()

	// Verify the button is now active (has v-btn--active class)
	await expect(statisticalGridButton).toHaveClass(/v-btn--active/)

	// Wait for grid view to load
	await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

	// Open the Grid Options panel by clicking the Grid Options button
	const gridOptionsButton = page.getByRole('button', { name: /Grid Options/i })
	await gridOptionsButton.waitFor({
		state: 'visible',
		timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
	})
	await gridOptionsButton.click()

	// Verify that the statistical grid options panel appears
	const gridOptionsHeading = page.getByRole('heading', { name: /Statistical grid options/i })
	await expect(gridOptionsHeading).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT })
})
