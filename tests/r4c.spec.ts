import { test, expect } from '@playwright/test';
import { setupDigitransitMock } from './setup/digitransit-mock';
import {
	dismissModalIfPresent,
	clickOnMap,
	waitForMapViewTransition,
	waitForCesiumReady,
} from './helpers/test-helpers';

// Setup digitransit mocking for all tests in this file
setupDigitransitMock();

test('Page load', { tag: ['@e2e', '@smoke'] }, async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveTitle(/R4C Uusimaa Demo/);
});

test('HSY Background maps', { tag: ['@e2e', '@wms'] }, async ({ page }) => {
	await page.goto('/');
	await dismissModalIfPresent(page, 'Close');

	const hsyButton = page.getByRole('button', { name: 'HSY Background maps' });
	await hsyButton.waitFor({ state: 'visible', timeout: 10000 });
	await hsyButton.click();

	const searchInput = page.getByPlaceholder(' Search for WMS layers');
	await searchInput.waitFor({ state: 'visible', timeout: 5000 });
	await searchInput.click();
	await searchInput.fill('Kaupunginosat');

	// Fix selector - add missing dot for class
	await expect(page.locator('.v-list-item-group')).toContainText(
		'Kaupunginosat pääkaupunkiseutu 2022',
		{ timeout: 5000 }
	);
});

test('Building properties', async ({ page }) => {
	await page.goto('/');
	await dismissModalIfPresent(page, 'Close');
	await waitForCesiumReady(page);

	// Click on postal code area
	await clickOnMap(page, 690, 394);
	await waitForMapViewTransition(page);

	// Click on building
	await clickOnMap(page, 674, 363);
	await waitForMapViewTransition(page);

	// Wait for building properties button using state-based wait
	const buildingButton = page.getByRole('button', { name: 'Building properties' });
	await buildingButton.waitFor({ state: 'visible', timeout: 10000 });
	await buildingButton.click();

	// Verify building information appears
	const printContainer = page.locator('#printContainer');
	await printContainer.waitFor({ state: 'visible', timeout: 5000 });
	await expect(printContainer).toContainText('Talousrakennus');
	await expect(page.locator('canvas')).toBeVisible();
});

test('Heat Vulnerability', async ({ page }) => {
	await page.goto('/');
	await dismissModalIfPresent(page, 'Close');

	// Enable Statistical Grid
	const gridCheckbox = page.getByLabel('Statistical Grid');
	await gridCheckbox.waitFor({ state: 'visible', timeout: 5000 });
	await gridCheckbox.check();
	await expect(gridCheckbox).toBeChecked();

	// Select 250m grid option
	const gridOption = page
		.locator('div')
		.filter({ hasText: /^250m grid$/ })
		.locator('span');
	await gridOption.waitFor({ state: 'visible', timeout: 5000 });
	await gridOption.click();

	// Wait for grid to be enabled
	await page.waitForFunction(
		() => {
			const store = (window as any).useToggleStore?.();
			return store?.statisticalGridEnabled === true;
		},
		{ timeout: 5000 }
	);

	// Click Heat Vulnerability heading
	const heatVulnHeading = page.getByRole('heading', { name: 'Heat Vulnerability' });
	await heatVulnHeading.waitFor({ state: 'visible', timeout: 10000 });
	await heatVulnHeading.click();
	await expect(heatVulnHeading).toBeVisible();
});
