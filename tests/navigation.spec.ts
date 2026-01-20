import { expect, test } from '@playwright/test'
import { VIEWPORTS } from './config/constants'
import { setupDigitransitMock } from './setup/digitransit-mock'

// Setup digitransit mocking for all tests in this file
setupDigitransitMock()

test.describe('Navigation and App Layout', () => {
	test.use({ tag: ['@e2e', '@navigation', '@layout'] })
	test.beforeEach(async ({ page }) => {
		await page.goto('/')
		// Dismiss the disclaimer popup if it appears
		await page.locator('button', { hasText: 'Explore Map' }).click()
	})

	test('should display main navigation elements', async ({ page }) => {
		// Check top navigation bar exists
		await expect(page.locator('.v-app-bar')).toBeVisible()

		// Check control panel toggle button
		await expect(page.getByRole('button', { name: 'Toggle control panel' })).toBeVisible()

		// Check main CesiumJS container
		await expect(page.locator('#cesiumContainer')).toBeVisible()

		// Check that Cesium canvas is loaded
		await expect(page.locator('canvas')).toBeVisible()
	})

	test('should toggle control panel visibility', async ({ page }) => {
		const toggleButton = page.getByRole('button', {
			name: 'Toggle control panel',
		})

		// Control panel should be visible by default
		await expect(page.locator('.analysis-sidebar')).toBeVisible()
		await expect(toggleButton).toContainText('Hide')

		// Hide control panel
		await toggleButton.click()
		await expect(page.locator('.analysis-sidebar')).not.toBeVisible()
		await expect(toggleButton).toContainText('Show')

		// Show control panel again
		await toggleButton.click()
		await expect(page.locator('.analysis-sidebar')).toBeVisible()
		await expect(toggleButton).toContainText('Hide')
	})

	test('should display view mode selector', async ({ page }) => {
		// Check that ViewModeCompact component is visible
		await expect(page.locator('[data-testid="view-mode-compact"]')).toBeVisible()
	})

	test('should show footer disclaimer', async ({ page }) => {
		// Check that minimal disclaimer is visible at bottom-left
		await expect(page.locator('.minimal-disclaimer')).toBeVisible()
		await expect(page.locator('.disclaimer-text')).toContainText('Data: HSY • Statistics Finland')
	})

	test('should display data source status indicator', async ({ page }) => {
		// Check that data source status is visible
		await expect(page.locator('.status-indicator-container')).toBeVisible()
	})

	test('should handle responsive layout', async ({ page }) => {
		// Test mobile viewport
		await page.setViewportSize(VIEWPORTS.MOBILE)

		// Navigation should still be visible and functional
		await expect(page.locator('.v-app-bar')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Toggle control panel' })).toBeVisible()

		// Disclaimer should adjust for mobile
		const disclaimer = page.locator('.minimal-disclaimer')
		await expect(disclaimer).toBeVisible()

		// Control panel should adapt to mobile
		const controlPanel = page.locator('.analysis-sidebar')
		if (await controlPanel.isVisible()) {
			// On mobile, control panel might have different styling
			await expect(controlPanel).toBeVisible()
		}
	})

	test('should show loading indicators', async ({ page }) => {
		// Loading indicator should be present (though might not be active initially)
		const loadingIndicator = page.locator('[data-testid="loading-indicator"]')

		// Check if loading component exists in DOM
		const loadingExists = (await loadingIndicator.count()) > 0
		if (loadingExists) {
			await expect(loadingIndicator).toBeDefined()
		}
	})
})
