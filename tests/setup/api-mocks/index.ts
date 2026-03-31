/**
 * Global API mock orchestrator for E2E tests.
 *
 * Registers route handlers for all external APIs before each test,
 * making the full test suite offline-capable by default.
 */
import type { Page } from '@playwright/test'
import { setupDataApiMocks } from './data-api-mocks'
import { setupDigitransitMocks } from './digitransit-mock'
import { setupHealthCheckMocks } from './health-check-mocks'
import { setupOsmTileMocks } from './osm-tile-mocks'
import { setupWmsMocks } from './wms-mocks'

export async function setupAllApiMocks(page: Page): Promise<void> {
	// Enable WMS diagnostic logging in CI to help debug unmocked requests
	const enableWmsLogging = process.env.CI === 'true' || process.env.DEBUG_WMS === 'true'

	await Promise.all([
		setupOsmTileMocks(page),
		setupWmsMocks(page, { enableLogging: enableWmsLogging }),
		setupDataApiMocks(page),
		setupDigitransitMocks(page),
		setupHealthCheckMocks(page),
	])
}
