/**
 * WMS route handlers for E2E test mocking.
 *
 * Intercepts all WMS-related requests and returns minimal valid responses
 * so tests run offline without depending on kartta.hsy.fi, kartta.hel.fi,
 * or paikkatiedot.ymparisto.fi.
 *
 * Route order matters: More specific patterns before generic fallbacks.
 * All routes are registered via Promise.all() to prevent race conditions
 * where tiles load before mocks are ready.
 */
import type { Page } from '@playwright/test'
import {
	EMPTY_FEATURE_COLLECTION,
	HSY_LAYER_GROUPS,
	TRANSPARENT_PNG,
	WMS_CAPABILITIES_XML,
} from './fixtures'

/**
 * Sets up WMS mocks with comprehensive coverage for all tile request patterns.
 * Implements a fallback handler to catch any unmocked WMS/tile requests.
 *
 * @param page - Playwright page instance
 * @param options - Configuration options
 * @param options.enableLogging - Enable diagnostic logging for unmocked requests
 */
export async function setupWmsMocks(
	page: Page,
	options: { enableLogging?: boolean } = {}
): Promise<void> {
	const { enableLogging = false } = options

	// Register all routes in parallel to prevent race conditions
	await Promise.all([
		// WMS GetCapabilities (HSYWMS.vue) - must come before proxy
		page.route('**/wms/layers*', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/xml',
				body: WMS_CAPABILITIES_XML,
			})
		),

		// WMS proxy tiles (landcover.js, floodwms.js)
		page.route('**/wms/proxy*', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'image/png',
				body: TRANSPARENT_PNG,
			})
		),

		// HSY layer groups (BackgroundMapBrowser.vue)
		page.route('**/hsy-action*', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(HSY_LAYER_GROUPS),
			})
		),

		// Helsinki WMS tiles (wms.js) - primary tile endpoint
		page.route('**/helsinki-wms*', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'image/png',
				body: TRANSPARENT_PNG,
			})
		),

		// Direct Cesium ImageryProvider requests to HSY
		page.route('**/kartta.hsy.fi/**', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'image/png',
				body: TRANSPARENT_PNG,
			})
		),

		// Direct WFS requests to Helsinki
		page.route('**/kartta.hel.fi/**', (route) => {
			const url = route.request().url()
			// WMS tile requests (image/png)
			if (url.includes('REQUEST=GetMap') || url.includes('FORMAT=image/png')) {
				return route.fulfill({
					status: 200,
					contentType: 'image/png',
					body: TRANSPARENT_PNG,
				})
			}
			// WFS feature requests (GeoJSON)
			return route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(EMPTY_FEATURE_COLLECTION),
			})
		}),

		// SYKE flood WMS
		page.route('**/paikkatiedot.ymparisto.fi/**', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'image/png',
				body: TRANSPARENT_PNG,
			})
		),

		// Fallback: Catch any unmocked tile/imagery requests
		// This prevents test failures from unmocked patterns
		page.route('**/*', (route) => {
			const url = route.request().url()
			const isTileRequest =
				url.includes('tile') ||
				url.includes('wms') ||
				url.includes('imagery') ||
				url.includes('GetMap') ||
				url.includes('FORMAT=image/png')

			if (isTileRequest) {
				if (enableLogging) {
					console.warn(`[WMS Mock] Fallback handler caught: ${url.substring(0, 100)}...`)
				}
				return route.fulfill({
					status: 200,
					contentType: 'image/png',
					body: TRANSPARENT_PNG,
				})
			}

			// Let non-tile requests pass through to other mocks
			return route.continue()
		}),
	])
}
