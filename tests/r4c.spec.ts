import { test, expect } from '@playwright/test';

test( 'Page load', async ( { page } ) => {
	await page.goto( '/' );
	await expect( page ).toHaveTitle( /R4C Uusimaa Demo/ );
} );

test( 'HSY Background maps', async ( { page } ) => {
	await page.goto( '/' );
  await page.getByRole('button', { name: 'Close' }).click();
	await page.getByRole( 'button', { name: 'HSY Background maps' } ).click();
	await page.getByPlaceholder( ' Search for WMS layers' ).click();
	await page.getByPlaceholder( ' Search for WMS layers' ).fill( 'Kaupunginosat' );
	await expect( page.locator( 'v-list-item-group' ) ).toContainText( 'Kaupunginosat pääkaupunkiseutu 2022' );
} );

test('Building properties', async ({ page }) => {
	await page.goto( '/' );
  await page.getByRole('button', { name: 'Close' }).click();
  await page.locator('canvas').click({
    position: {
      x: 659,
      y: 383
    }
  });
  await page.locator('canvas').click({
    position: {
      x: 671,
      y: 363
    }
  });
  await page.getByRole('button', { name: 'Building properties' }).click();
  await expect(page.locator('#printContainer')).toContainText('Talousrakennus');
  await expect(page.locator('canvas')).toBeVisible();
});
