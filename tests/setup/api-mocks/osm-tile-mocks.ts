/**
 * OpenStreetMap tile route handlers for E2E test mocking.
 *
 * Intercepts direct requests to tile.openstreetmap.org from CesiumJS
 * OpenStreetMapImageryProvider. These are high-volume requests that
 * cause rate limiting (429) and transient failures in CI.
 *
 * @see src/composables/useViewerInitialization.js — configures OSM provider
 */
import type { Page } from '@playwright/test'
import { TRANSPARENT_PNG } from './fixtures'

export async function setupOsmTileMocks(page: Page): Promise<void> {
	await page.route('**/tile.openstreetmap.org/**', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'image/png',
			body: TRANSPARENT_PNG,
		})
	)
}
