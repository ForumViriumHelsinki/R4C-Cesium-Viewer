/**
 * Global API mock orchestrator for E2E tests.
 *
 * Registers route handlers for all external APIs before each test,
 * making the full test suite offline-capable by default.
 */
import type { Page } from '@playwright/test'
import { setupDataApiMocks } from './data-api-mocks'
import { setupDigitransitMocks } from './digitransit-mock'
import { setupWmsMocks } from './wms-mocks'

export async function setupAllApiMocks(page: Page): Promise<void> {
	await Promise.all([setupWmsMocks(page), setupDataApiMocks(page), setupDigitransitMocks(page)])
}
