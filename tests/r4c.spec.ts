import { test, expect } from '@playwright/test';

test( 'test', async ( { page } ) => {
  // await page.goto('https://geo.fvh.fi/r4c/M8Na2P0v6z/');
  await page.goto( '/' );
  await expect( page ).toHaveTitle( /R4C Uusimaa Demo/ );
} );
