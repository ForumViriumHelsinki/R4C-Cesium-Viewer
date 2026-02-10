/**
 * Data API route handlers for E2E test mocking.
 *
 * Intercepts non-WMS external API requests (PyGeoAPI, Paavo/Statistics Finland,
 * terrain, NDVI, sensors, feature flags) so tests run offline.
 */
import type { Page } from '@playwright/test'
import { EMPTY_FEATURE_COLLECTION, EMPTY_SENSOR_DATA, PAAVO_DATA } from './fixtures'

export async function setupDataApiMocks(page: Page): Promise<void> {
	await Promise.all([
		// PyGeoAPI — all collection endpoints
		page.route('**/pygeoapi/**', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(EMPTY_FEATURE_COLLECTION),
			})
		),

		// Paavo / Statistics Finland postal code data
		page.route('**/paavo*', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(PAAVO_DATA),
			})
		),

		// Terrain proxy — not critical for tests, abort to save time
		page.route('**/terrain-proxy/**', (route) => route.abort()),

		// NDVI — not critical for tests
		page.route('**/ndvi_public/**', (route) => route.abort()),

		// R4C sensor endpoint
		page.route('**/bri3.fvh.io/**', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(EMPTY_SENSOR_DATA),
			})
		),

		// Feature flag service
		page.route('**/feature-flags/**', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({}),
			})
		),
	])
}
