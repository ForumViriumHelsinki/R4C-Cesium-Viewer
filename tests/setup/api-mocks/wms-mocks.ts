/**
 * WMS route handlers for E2E test mocking.
 *
 * Intercepts all WMS-related requests and returns minimal valid responses
 * so tests run offline without depending on kartta.hsy.fi, kartta.hel.fi,
 * or paikkatiedot.ymparisto.fi.
 */
import type { Page } from '@playwright/test'
import {
	EMPTY_FEATURE_COLLECTION,
	HSY_LAYER_GROUPS,
	TRANSPARENT_PNG,
	WMS_CAPABILITIES_XML,
} from './fixtures'

export async function setupWmsMocks(page: Page): Promise<void> {
	await Promise.all([
		// WMS proxy tiles (landcover.js, floodwms.js)
		page.route('**/wms/proxy*', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'image/png',
				body: TRANSPARENT_PNG,
			})
		),

		// WMS GetCapabilities (HSYWMS.vue)
		page.route('**/wms/layers*', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/xml',
				body: WMS_CAPABILITIES_XML,
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

		// Helsinki WMS tiles (wms.js)
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
		page.route('**/kartta.hel.fi/**', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(EMPTY_FEATURE_COLLECTION),
			})
		),

		// SYKE flood WMS
		page.route('**/paikkatiedot.ymparisto.fi/**', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'image/png',
				body: TRANSPARENT_PNG,
			})
		),
	])
}
