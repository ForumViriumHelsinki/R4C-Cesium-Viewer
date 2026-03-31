/**
 * Health check endpoint route handlers for E2E test mocking.
 *
 * Intercepts /status/* health check requests used by DataSourceStatus,
 * DataSourceStatusCompact, and DataSourceStatusBadge components.
 * Without mocking, these hit real backends and can cause test flakiness
 * when external services are slow or unavailable.
 *
 * @see src/components/DataSourceStatus.vue — defines health check endpoints
 */
import type { Page } from '@playwright/test'

const HEALTHY_RESPONSE = { status: 'ok', timestamp: Date.now() }

export async function setupHealthCheckMocks(page: Page): Promise<void> {
	await page.route('**/status/*', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(HEALTHY_RESPONSE),
		})
	)
}
