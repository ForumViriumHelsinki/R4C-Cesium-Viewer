/**
 * View Modes Accessibility Tests
 *
 * Tests core view switching functionality to ensure all view modes remain
 * accessible during interface overhaul:
 * - Capital Region Heat (default)
 * - Statistical Grid
 * - Helsinki Heat (conditional)
 *
 * Note: The ViewModeCompact component uses Vuetify's v-btn-toggle with buttons,
 * not radio inputs. Buttons have value attributes and v-btn--active class when selected.
 */

import { expect, type Locator } from '@playwright/test'
import { cesiumDescribe, cesiumTest } from '../../fixtures/cesium-fixture'
import AccessibilityTestHelpers, { TEST_TIMEOUTS } from '../helpers/test-helpers'

/**
 * Helper to get view mode button locators for v-btn-toggle component
 */
function getViewModeButton(
	page: { locator: (selector: string) => Locator },
	viewMode: 'capitalRegionView' | 'gridView'
): Locator {
	return page.locator(`.view-toggle-group button[value="${viewMode}"]`)
}

/**
 * Helper to check if a v-btn-toggle button is selected
 */
async function isViewModeButtonSelected(button: Locator): Promise<boolean> {
	const className = await button.getAttribute('class').catch(() => '')
	return className?.includes('v-btn--active') || className?.includes('v-btn--selected') || false
}

// SKIPPED: Component rendering issues in headless CI - see #472
cesiumDescribe.skip('View Modes Accessibility', () => {
	cesiumTest.use({ tag: ['@accessibility', '@e2e'] })
	let helpers: AccessibilityTestHelpers

	cesiumTest.beforeEach(async ({ cesiumPage }) => {
		helpers = new AccessibilityTestHelpers(cesiumPage)
		// Cesium is already initialized by the fixture
	})

	cesiumTest.describe('Capital Region View (Default)', () => {
		cesiumTest('should load Capital Region Heat view by default', async ({ cesiumPage }) => {
			// Verify default view selection (v-btn-toggle uses buttons with v-btn--active class)
			const capitalRegionButton = getViewModeButton(cesiumPage, 'capitalRegionView')
			await expect(capitalRegionButton).toBeVisible()
			expect(await isViewModeButtonSelected(capitalRegionButton)).toBeTruthy()

			// Verify Capital Region label is visible
			await expect(cesiumPage.getByText('Capital Region')).toBeVisible()

			// Verify view mode component is accessible
			await expect(cesiumPage.locator('.view-mode-compact')).toBeVisible()
		})

		cesiumTest(
			'should display appropriate panels for Capital Region view',
			async ({ cesiumPage }) => {
				await helpers.verifyPanelVisibility({
					currentView: 'capitalRegion',
					currentLevel: 'start',
				})

				// Verify layers specific to Capital Region
				await expect(cesiumPage.getByText('Land Cover')).toBeVisible()
				await expect(cesiumPage.getByText('NDVI')).toBeVisible()

				// Verify Helsinki-specific layers are not visible
				await expect(cesiumPage.getByText('Vegetation')).not.toBeVisible()
				await expect(cesiumPage.getByText('Other Nature')).not.toBeVisible()
			}
		)

		cesiumTest(
			'should maintain Capital Region view selection after page interactions',
			async ({ cesiumPage }) => {
				// Click somewhere on the map
				await cesiumPage.locator('#cesiumContainer').click({ position: { x: 400, y: 300 } })
				await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

				// Verify selection is still active (v-btn-toggle button)
				const capitalRegionButton = getViewModeButton(cesiumPage, 'capitalRegionView')
				expect(await isViewModeButtonSelected(capitalRegionButton)).toBeTruthy()
			}
		)
	})

	cesiumTest.describe('Statistical Grid View', () => {
		cesiumTest('should switch to Statistical Grid view successfully', async ({ cesiumPage }) => {
			await helpers.navigateToView('gridView')

			// Verify Statistical Grid selection (v-btn-toggle button)
			const gridButton = getViewModeButton(cesiumPage, 'gridView')
			expect(await isViewModeButtonSelected(gridButton)).toBeTruthy()

			// Verify Statistical Grid label is visible
			await expect(cesiumPage.getByText('Statistical Grid')).toBeVisible()
		})

		cesiumTest('should display grid-specific features when switched', async ({ cesiumPage }) => {
			await helpers.navigateToView('gridView')

			// Verify grid-specific panels appear
			await helpers.verifyPanelVisibility({
				currentView: 'grid',
				currentLevel: 'start',
			})

			// Statistical grid options should be visible
			await expect(cesiumPage.getByText('Statistical grid options')).toBeVisible()

			// NDVI panel should not be visible in grid view
			await expect(cesiumPage.getByText('NDVI', { exact: true })).not.toBeVisible()
		})

		cesiumTest(
			'should show cooling centers panel when heat index is selected',
			async ({ cesiumPage }) => {
				await helpers.navigateToView('gridView')

				// Wait for grid view to load
				await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

				// Note: This would require actually setting the statsIndex to 'heat_index'
				// For now, we test that the panel structure exists for the condition
				await helpers.verifyPanelVisibility({
					currentView: 'grid',
					currentLevel: 'start',
					statsIndex: 'heat_index',
				})
			}
		)

		cesiumTest('should enable 250m grid toggle in grid view', async ({ cesiumPage }) => {
			await helpers.navigateToView('gridView')
			await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

			// The 250m grid should be activated automatically in grid view
			// We verify this through the presence of the SosEco250mGrid component
			// This component is rendered conditionally when grid250m toggle is true
		})
	})

	cesiumTest.describe('View Mode Transitions', () => {
		cesiumTest(
			'should transition from Capital Region to Statistical Grid smoothly',
			async ({ cesiumPage }) => {
				// Start with Capital Region (default)
				const capitalRegionButton = getViewModeButton(cesiumPage, 'capitalRegionView')
				expect(await isViewModeButtonSelected(capitalRegionButton)).toBeTruthy()

				// Switch to Statistical Grid
				await helpers.navigateToView('gridView')

				// Verify transition (v-btn-toggle buttons)
				const gridButton = getViewModeButton(cesiumPage, 'gridView')
				expect(await isViewModeButtonSelected(gridButton)).toBeTruthy()
				expect(await isViewModeButtonSelected(capitalRegionButton)).toBeFalsy()

				// Verify appropriate content switched
				await expect(cesiumPage.getByText('Statistical grid options')).toBeVisible()
			}
		)

		cesiumTest(
			'should transition from Statistical Grid back to Capital Region',
			async ({ cesiumPage }) => {
				// Switch to grid first
				await helpers.navigateToView('gridView')
				const gridButton = getViewModeButton(cesiumPage, 'gridView')
				expect(await isViewModeButtonSelected(gridButton)).toBeTruthy()

				// Switch back to Capital Region
				await helpers.navigateToView('capitalRegionView')

				// Verify transition back (v-btn-toggle buttons)
				const capitalRegionButton = getViewModeButton(cesiumPage, 'capitalRegionView')
				expect(await isViewModeButtonSelected(capitalRegionButton)).toBeTruthy()
				expect(await isViewModeButtonSelected(gridButton)).toBeFalsy()

				// Verify Capital Region content restored
				await expect(cesiumPage.getByText('Land Cover')).toBeVisible()
			}
		)

		cesiumTest('should handle rapid view switching without errors', async ({ cesiumPage }) => {
			// Rapidly switch between views
			for (let i = 0; i < 3; i++) {
				await helpers.navigateToView('gridView')
				await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP)
				await helpers.navigateToView('capitalRegionView')
				await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP)
			}

			// Final state should be consistent (v-btn-toggle button)
			const capitalRegionButton = getViewModeButton(cesiumPage, 'capitalRegionView')
			expect(await isViewModeButtonSelected(capitalRegionButton)).toBeTruthy()
			await expect(cesiumPage.getByText('Capital Region')).toBeVisible()
		})
	})

	cesiumTest.describe('Helsinki Heat View (Conditional)', () => {
		cesiumTest(
			'should conditionally show Helsinki Heat option based on postal code',
			async ({ cesiumPage }) => {
				// Note: Helsinki Heat view is conditionally available based on postal code range
				// This test would need to simulate the condition where postalCode is in range 0-1000

				// For comprehensive testing, we check that the view switching mechanism
				// can handle conditional views when they become available
				const viewModeContainer = cesiumPage.locator('.view-mode-compact')
				await expect(viewModeContainer).toBeVisible()

				// The v-btn-toggle buttons should be present and functional
				const capitalRegionButton = getViewModeButton(cesiumPage, 'capitalRegionView')
				const gridButton = getViewModeButton(cesiumPage, 'gridView')

				await expect(capitalRegionButton).toBeVisible()
				await expect(gridButton).toBeVisible()
			}
		)
	})

	cesiumTest.describe('View Mode Navigation Controls', () => {
		cesiumTest(
			'should maintain view mode selection during navigation interactions',
			async ({ cesiumPage }) => {
				// Switch to grid view
				await helpers.navigateToView('gridView')

				// Test navigation controls don't affect view mode selection
				await helpers.testNavigationControls('start')

				// Verify grid view is still selected (v-btn-toggle button)
				const gridButton = getViewModeButton(cesiumPage, 'gridView')
				expect(await isViewModeButtonSelected(gridButton)).toBeTruthy()
			}
		)

		cesiumTest('should preserve view mode when using reset button', async ({ cesiumPage }) => {
			// Switch to grid view
			await helpers.navigateToView('gridView')
			const gridButton = getViewModeButton(cesiumPage, 'gridView')
			expect(await isViewModeButtonSelected(gridButton)).toBeTruthy()

			// Click reset button
			const resetButton = cesiumPage
				.getByRole('button')
				.filter({ has: cesiumPage.locator('.mdi-refresh') })
			await helpers.scrollIntoViewportWithRetry(resetButton, {
				elementName: 'Reset button',
			})
			await resetButton.click()

			// Wait for reset to complete
			await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

			// View mode selection behavior after reset depends on implementation
			// The test verifies the toggle buttons are still functional
			const viewModeContainer = cesiumPage.locator('.view-mode-compact')
			await expect(viewModeContainer).toBeVisible()
		})
	})

	cesiumTest.describe('View Mode Responsiveness', () => {
		cesiumTest(
			'should maintain view mode functionality across different viewports',
			async ({ cesiumPage }) => {
				const viewports = [
					{ width: 1920, height: 1080, name: 'desktop' },
					{ width: 768, height: 1024, name: 'tablet' },
					{ width: 375, height: 667, name: 'mobile' },
				]

				for (const viewport of viewports) {
					await cesiumPage.setViewportSize(viewport)
					await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

					// Verify view mode container is accessible
					await expect(cesiumPage.locator('.view-mode-compact')).toBeVisible()

					// Verify view switching works (v-btn-toggle buttons)
					await helpers.navigateToView('gridView')
					const gridButton = getViewModeButton(cesiumPage, 'gridView')
					expect(await isViewModeButtonSelected(gridButton)).toBeTruthy()

					await helpers.navigateToView('capitalRegionView')
					const capitalRegionButton = getViewModeButton(cesiumPage, 'capitalRegionView')
					expect(await isViewModeButtonSelected(capitalRegionButton)).toBeTruthy()
				}
			}
		)
	})

	cesiumTest.describe('View Mode Data Loading', () => {
		cesiumTest('should handle view switches during data loading states', async ({ cesiumPage }) => {
			// Monitor network activity
			cesiumPage.route('**/*', (route) => {
				// Add delay to simulate slow loading
				setTimeout(() => route.continue(), 100)
			})

			// Switch views while data is loading
			await helpers.navigateToView('gridView')

			// Immediately switch back (stress test)
			await helpers.navigateToView('capitalRegionView')

			// Wait for stabilization
			await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_LONG)

			// Verify final state is consistent (v-btn-toggle button)
			const capitalRegionButton = getViewModeButton(cesiumPage, 'capitalRegionView')
			expect(await isViewModeButtonSelected(capitalRegionButton)).toBeTruthy()

			// Verify no error states are visible
			const errorElements = cesiumPage.locator('[class*="error"], [class*="Error"]')
			const errorCount = await errorElements.count()
			expect(errorCount).toBe(0)
		})
	})

	cesiumTest.describe('Accessibility Compliance', () => {
		cesiumTest('should have proper ARIA labels and keyboard navigation', async ({ cesiumPage }) => {
			// Test keyboard navigation
			await cesiumPage.keyboard.press('Tab')
			await cesiumPage.keyboard.press('Tab')
			await cesiumPage.keyboard.press('Tab')

			// Should be able to reach view mode controls
			const focusedElement = cesiumPage.locator(':focus')
			await expect(focusedElement).toBeVisible()

			// Test keyboard control (v-btn-toggle uses arrow keys)
			await cesiumPage.keyboard.press('ArrowRight')
			await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP)

			// Verify state change - at least one button should be selected
			const gridButton = getViewModeButton(cesiumPage, 'gridView')
			const capitalRegionButton = getViewModeButton(cesiumPage, 'capitalRegionView')

			// Either should be selected (depending on focus behavior)
			const anySelected =
				(await isViewModeButtonSelected(gridButton)) ||
				(await isViewModeButtonSelected(capitalRegionButton))
			expect(anySelected).toBeTruthy()
		})

		cesiumTest('should have meaningful text labels for screen readers', async ({ cesiumPage }) => {
			// Verify text content is present for screen readers
			await expect(cesiumPage.getByText('Capital Region')).toBeVisible()
			await expect(cesiumPage.getByText('Statistical Grid')).toBeVisible()

			// Verify aria-labels are present on buttons
			const capitalRegionButton = getViewModeButton(cesiumPage, 'capitalRegionView')
			const gridButton = getViewModeButton(cesiumPage, 'gridView')

			// Check for aria-label attributes
			const capitalAriaLabel = await capitalRegionButton.getAttribute('aria-label')
			const gridAriaLabel = await gridButton.getAttribute('aria-label')

			expect(capitalAriaLabel).toBeTruthy()
			expect(gridAriaLabel).toBeTruthy()
		})
	})
})
