import { expect, test } from '@playwright/test'
import {
	clickOnMap,
	dismissModalIfPresent,
	TEST_TIMEOUTS,
	waitForCesiumReady,
	waitForMapViewTransition,
} from './helpers/test-helpers'
import { setupDigitransitMock } from './setup/digitransit-mock'

// Setup digitransit mocking for all tests in this file
setupDigitransitMock()

test('Page load', { tag: ['@e2e', '@smoke'] }, async ({ page }) => {
	await page.goto('/')
	await expect(page).toHaveTitle(/R4C Uusimaa Demo/)
})

test('HSY Background maps', { tag: ['@e2e', '@wms'] }, async ({ page }) => {
	await page.goto('/')
	await dismissModalIfPresent(page, 'Explore Map')

	const hsyButton = page.getByRole('button', { name: 'HSY Background maps' })
	await hsyButton.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT })
	await hsyButton.click()

	const searchInput = page.getByPlaceholder(' Search for WMS layers')
	await searchInput.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
	await searchInput.click()
	await searchInput.fill('Kaupunginosat')

	// Fix selector - add missing dot for class
	await expect(page.locator('.v-list-item-group')).toContainText(
		'Kaupunginosat pääkaupunkiseutu 2022',
		{ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD }
	)
})

test('Building properties', async ({ page }) => {
	await page.goto('/')
	await dismissModalIfPresent(page, 'Explore Map')
	await waitForCesiumReady(page)

	// Click on postal code area
	await clickOnMap(page, 690, 394)
	await waitForMapViewTransition(page)

	// Click on building
	await clickOnMap(page, 674, 363)
	await waitForMapViewTransition(page)

	// Wait for building properties button using state-based wait
	const buildingButton = page.getByRole('button', { name: 'Building properties' })
	await buildingButton.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT })
	await buildingButton.click()

	// Verify building information appears
	const printContainer = page.locator('#printContainer')
	await printContainer.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
	await expect(printContainer).toContainText('Talousrakennus')
	await expect(page.locator('canvas')).toBeVisible()
})

test('Heat Vulnerability', async ({ page }) => {
	await page.goto('/')
	await dismissModalIfPresent(page, 'Explore Map')

	// Enable Statistical Grid
	const gridCheckbox = page.getByLabel('Statistical Grid')
	await gridCheckbox.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
	await gridCheckbox.check()
	await expect(gridCheckbox).toBeChecked()

	// Select 250m grid option
	const gridOption = page
		.locator('div')
		.filter({ hasText: /^250m grid$/ })
		.locator('span')
	await gridOption.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
	await gridOption.click()

	// Wait for grid to be enabled
	await page.waitForFunction(
		() => {
			const store = (window as any).useToggleStore?.()
			return store?.statisticalGridEnabled === true
		},
		{ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD }
	)

	// Click Heat Vulnerability heading
	const heatVulnHeading = page.getByRole('heading', { name: 'Heat Vulnerability' })
	await heatVulnHeading.waitFor({
		state: 'visible',
		timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
	})
	await heatVulnHeading.click()
	await expect(heatVulnHeading).toBeVisible()
})
