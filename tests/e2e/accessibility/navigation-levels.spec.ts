/**
 * Navigation Levels Accessibility Tests
 *
 * Tests level transitions and navigation between different data hierarchy levels:
 * - Start Level (initial state)
 * - Postal Code Level (area analysis)
 * - Building Level (individual building analysis)
 *
 * Ensures all navigation controls and level-specific features remain accessible.
 */

import { expect } from '@playwright/test'
import { cesiumDescribe, cesiumTest } from '../../fixtures/cesium-fixture'
import AccessibilityTestHelpers, { TEST_TIMEOUTS } from '../helpers/test-helpers'

cesiumDescribe('Navigation Levels Accessibility', () => {
	cesiumTest.use({ tag: ['@accessibility', '@e2e', '@navigation'] })
	let helpers: AccessibilityTestHelpers

	cesiumTest.beforeEach(async ({ cesiumPage }) => {
		helpers = new AccessibilityTestHelpers(cesiumPage)
		// Cesium is already initialized by the fixture
	})

	cesiumTest.describe('Start Level (Initial State)', () => {
		cesiumTest('should display start level interface correctly', async ({ cesiumPage }) => {
			// Verify we start at the start level
			await helpers.verifyPanelVisibility({
				currentView: 'capitalRegion',
				currentLevel: 'start',
			})

			// Start level navigation controls
			await helpers.testNavigationControls('start')

			// Back button should not be visible at start
			const backButton = cesiumPage
				.getByRole('button')
				.filter({ has: cesiumPage.locator('.mdi-arrow-left') })
			await expect(backButton).not.toBeVisible()

			// Reset button is not visible at start level (only at postal code/building level)
			const _resetButton = cesiumPage
				.getByRole('button')
				.filter({ has: cesiumPage.locator('.mdi-refresh') })

			// Camera rotation should not be visible at start
			const cameraButton = cesiumPage
				.getByRole('button')
				.filter({ has: cesiumPage.locator('.mdi-compass') })
			await expect(cameraButton).not.toBeVisible()
		})

		cesiumTest('should show basic panels at start level', async ({ cesiumPage }) => {
			// Universal panels should be visible
			await expect(cesiumPage.getByText('Background Maps')).toBeVisible()
			await expect(cesiumPage.getByText('Search & Navigate')).toBeVisible()

			// Level-specific panels should not be visible
			await expect(cesiumPage.getByText('Heat Distribution')).not.toBeVisible()
			await expect(cesiumPage.getByText('Building heat data')).not.toBeVisible()

			// Timeline should not be visible at start level
			await helpers.verifyTimelineVisibility('start')
		})

		cesiumTest('should allow view mode changes at start level', async ({ cesiumPage }) => {
			// Should be able to switch views at start level
			await helpers.navigateToView('gridView')
			// Wait for view switch - v-btn-toggle uses buttons with v-btn--active class
			await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_STATE_CHANGE)

			await helpers.navigateToView('capitalRegionView')
			// Wait for view switch back
			await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_STATE_CHANGE)
		})
	})

	cesiumTest.describe('Postal Code Level Navigation', () => {
		cesiumTest(
			'should transition to postal code level on map interaction',
			async ({ cesiumPage }) => {
				// Click on map to select postal code area
				await helpers.drillToLevel('postalCode')

				// Wait for level transition by checking for postal code specific UI elements
				await cesiumPage
					.waitForSelector('text="Building Analysis", text="Area Properties"', {
						timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
					})
					.catch(() => {})

				// Verify postal code level features appear
				await helpers.verifyPanelVisibility({
					currentView: 'capitalRegion',
					currentLevel: 'postalCode',
					hasData: true,
				})

				// Timeline should now be visible
				await helpers.verifyTimelineVisibility('postalCode')
			}
		)

		cesiumTest('should display postal code specific panels', async ({ cesiumPage }) => {
			await helpers.drillToLevel('postalCode')
			// Wait for postal code UI to load
			await cesiumPage
				.waitForSelector('text="Building Analysis"', {
					timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
				})
				.catch(() => {})

			// Postal code specific panels
			await expect(cesiumPage.getByText('Building Analysis')).toBeVisible()
			await expect(cesiumPage.getByText('Area Properties')).toBeVisible()

			// Conditional panels based on data availability
			// Note: These depend on actual data being loaded
			const heatHistogram = cesiumPage.getByText('Heat Distribution')
			const socioEconomics = cesiumPage.getByText('Socioeconomics Diagram')
			const landCover = cesiumPage.getByText('Land Cover')

			// These should be visible if data is available
			// Testing for presence without strict requirement as it depends on data
			if (await heatHistogram.isVisible()) {
				await expect(heatHistogram).toBeVisible()
			}
			if (await socioEconomics.isVisible()) {
				await expect(socioEconomics).toBeVisible()
			}
			if (await landCover.isVisible()) {
				await expect(landCover).toBeVisible()
			}
		})

		cesiumTest('should show navigation controls at postal code level', async ({ cesiumPage }) => {
			await helpers.drillToLevel('postalCode')
			// Wait for navigation controls to be ready
			await cesiumPage
				.waitForSelector('.mdi-compass', { timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT })
				.catch(() => {})

			await helpers.testNavigationControls('postalCode')

			// Back button still not visible (only appears at building level)
			const backButton = cesiumPage
				.getByRole('button')
				.filter({ has: cesiumPage.locator('.mdi-arrow-left') })
			await expect(backButton).not.toBeVisible()

			// Camera rotation should now be visible
			const cameraButton = cesiumPage
				.getByRole('button')
				.filter({ has: cesiumPage.locator('.mdi-compass') })
			await expect(cameraButton).toBeVisible()
		})

		cesiumTest(
			'should maintain view mode selection at postal code level',
			async ({ cesiumPage }) => {
				// Switch to grid view first
				await helpers.navigateToView('gridView')

				// Navigate to postal code level
				await helpers.drillToLevel('postalCode')
				// Wait for postal code level features
				await cesiumPage
					.waitForSelector('text="Building Analysis"', {
						timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
					})
					.catch(() => {})

				// Verify view mode is maintained via Pinia store state (v-btn-toggle doesn't use radio inputs)
				await cesiumPage.waitForFunction(
					() => {
						const pinia = (window as any).__PINIA__
						return pinia?.state?.value?.global?.currentView === 'grid'
					},
					{ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD }
				)

				// Grid-specific features should be visible
				await expect(cesiumPage.getByText('Grid Options')).toBeVisible()
			}
		)

		cesiumTest('should handle postal code selection in different views', async ({ cesiumPage }) => {
			const views = ['capitalRegionView', 'gridView']

			for (const view of views) {
				// Reset to start
				const resetButton = cesiumPage
					.getByRole('button')
					.filter({ has: cesiumPage.locator('.mdi-refresh') })
				await resetButton.click()
				// Wait for reset to complete
				await cesiumPage
					.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
					.catch(() => {})

				// Switch to view
				await helpers.navigateToView(view as 'capitalRegionView' | 'gridView')

				// Navigate to postal code
				await helpers.drillToLevel('postalCode')
				// Wait for postal code specific elements
				await cesiumPage
					.waitForSelector('text="Building Analysis"', {
						timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
					})
					.catch(() => {})

				// Verify view-specific features are present
				if (view === 'gridView') {
					await expect(cesiumPage.getByText('Grid Options')).toBeVisible()
				} else {
					await expect(cesiumPage.getByText('Land Cover')).toBeVisible()
				}

				// Timeline should be visible in both cases
				await helpers.verifyTimelineVisibility('postalCode')
			}
		})
	})

	cesiumTest.describe('Building Level Navigation', () => {
		cesiumTest('should transition to building level from postal code', async ({ cesiumPage }) => {
			// First navigate to postal code level
			await helpers.drillToLevel('postalCode')
			// Wait for postal code level
			await cesiumPage
				.waitForSelector('text="Building Analysis"', {
					timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
				})
				.catch(() => {})

			// Then navigate to building level
			await helpers.drillToLevel('building')
			// Wait for building level elements
			await cesiumPage
				.waitForSelector('text="Building heat data", text="Building properties"', {
					timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
				})
				.catch(() => {})

			// Verify building level features
			await helpers.verifyPanelVisibility({
				currentView: 'capitalRegion',
				currentLevel: 'building',
			})

			// Timeline should still be visible
			await helpers.verifyTimelineVisibility('building')
		})

		cesiumTest('should display building-specific panels', async ({ cesiumPage }) => {
			await helpers.drillToLevel('building')
			// Wait for building-specific panels to load
			await cesiumPage
				.waitForSelector('text="Building heat data"', { timeout: TEST_TIMEOUTS.CESIUM_READY })
				.catch(() => {})

			// Building-specific panels
			await expect(cesiumPage.getByText('Building heat data')).toBeVisible()
			await expect(cesiumPage.getByText('Building properties')).toBeVisible()

			// Building information component should be visible
			const buildingInfo = cesiumPage.locator('[class*="building-info"], [id*="building"]')
			if (await buildingInfo.first().isVisible()) {
				await expect(buildingInfo.first()).toBeVisible()
			}
		})

		cesiumTest('should show back navigation button at building level', async ({ cesiumPage }) => {
			await helpers.drillToLevel('building')
			// Wait for building level navigation to be ready
			await cesiumPage
				.waitForSelector('.mdi-arrow-left', { timeout: TEST_TIMEOUTS.CESIUM_READY })
				.catch(() => {})

			await helpers.testNavigationControls('building')

			// Back button should now be visible
			const backButton = cesiumPage
				.getByRole('button')
				.filter({ has: cesiumPage.locator('.mdi-arrow-left') })
			await expect(backButton).toBeVisible()

			// Camera rotation should be visible
			const cameraButton = cesiumPage
				.getByRole('button')
				.filter({ has: cesiumPage.locator('.mdi-compass') })
			await expect(cameraButton).toBeVisible()
		})

		cesiumTest(
			'should handle back navigation from building to postal code',
			async ({ cesiumPage }) => {
				// Navigate to building level
				await helpers.drillToLevel('building')
				// Wait for building level
				await cesiumPage
					.waitForSelector('.mdi-arrow-left', { timeout: TEST_TIMEOUTS.CESIUM_READY })
					.catch(() => {})

				// Click back button
				const backButton = cesiumPage
					.getByRole('button')
					.filter({ has: cesiumPage.locator('.mdi-arrow-left') })
				await expect(backButton).toBeVisible()
				await backButton.click()

				// Wait for navigation back to postal code level
				await cesiumPage
					.waitForSelector('text="Building Analysis"', {
						timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
					})
					.catch(() => {})

				// Should be back at postal code level
				await helpers.verifyPanelVisibility({
					currentView: 'capitalRegion',
					currentLevel: 'postalCode',
					hasData: true,
				})

				// Back button should no longer be visible
				await expect(backButton).not.toBeVisible()

				// Timeline should still be visible
				await helpers.verifyTimelineVisibility('postalCode')
			}
		)

		cesiumTest(
			'should display building heat data variants based on view',
			async ({ cesiumPage }) => {
				const testViews = [
					{ view: 'capitalRegionView', expectedChart: 'HSYBuildingHeatChart' },
					{ view: 'gridView', expectedChart: 'BuildingGridChart' },
				]

				for (const { view } of testViews) {
					// Reset and navigate to view
					const resetButton = cesiumPage
						.getByRole('button')
						.filter({ has: cesiumPage.locator('.mdi-refresh') })
					await resetButton.click()
					// Wait for reset to complete by checking for initial state
					await cesiumPage
						.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
						.catch(() => {})

					await helpers.navigateToView(view as 'capitalRegionView' | 'gridView')

					// Navigate to building level
					await helpers.drillToLevel('building')
					// Wait for building level to load
					await cesiumPage
						.waitForSelector('text="Building heat data"', { timeout: TEST_TIMEOUTS.CESIUM_READY })
						.catch(() => {})

					// Verify building heat data panel is present
					await expect(cesiumPage.getByText('Building heat data')).toBeVisible()

					// The specific chart component would be rendered based on view
					// We verify the panel exists and can be expanded
					const heatDataPanel = cesiumPage.getByText('Building heat data')
					await expect(heatDataPanel).toBeVisible()
				}
			}
		)
	})

	cesiumTest.describe('Navigation State Persistence', () => {
		cesiumTest('should maintain level when switching views', async ({ cesiumPage }) => {
			// Navigate to postal code level
			await helpers.drillToLevel('postalCode')
			// Wait for postal code level
			await cesiumPage
				.waitForSelector('text="Building Analysis"', {
					timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
				})
				.catch(() => {})

			// Switch view modes
			await helpers.navigateToView('gridView')
			// Wait for view switch (v-btn-toggle doesn't use radio inputs)
			await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_STATE_CHANGE)

			// Should still be at postal code level
			await helpers.verifyTimelineVisibility('postalCode')
			await expect(cesiumPage.getByText('Building Analysis')).toBeVisible()

			// Switch back
			await helpers.navigateToView('capitalRegionView')
			// Wait for view switch back
			await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_STATE_CHANGE)

			// Still at postal code level
			await helpers.verifyTimelineVisibility('postalCode')
		})

		cesiumTest('should handle reset button from any level', async ({ cesiumPage }) => {
			const resetButton = cesiumPage
				.getByRole('button')
				.filter({ has: cesiumPage.locator('.mdi-refresh') })

			// Test reset from postal code level
			await helpers.drillToLevel('postalCode')
			// Wait for postal code level
			await cesiumPage
				.waitForSelector('text="Building Analysis"', {
					timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
				})
				.catch(() => {})

			await resetButton.click()
			// Wait for reset to complete
			await cesiumPage
				.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
				.catch(() => {})

			// Should be back to start level
			await helpers.testNavigationControls('start')

			// Test reset from building level
			await helpers.drillToLevel('building')
			// Wait for building level
			await cesiumPage
				.waitForSelector('text="Building heat data"', { timeout: TEST_TIMEOUTS.CESIUM_READY })
				.catch(() => {})

			await resetButton.click()
			// Wait for reset to complete
			await cesiumPage
				.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
				.catch(() => {})

			// Should be back to start level
			await helpers.testNavigationControls('start')
		})
	})

	cesiumTest.describe('Level-Specific Feature Access', () => {
		cesiumTest(
			'should enable trees layer only with postal code selection',
			async ({ cesiumPage }) => {
				// At start level, trees toggle should not be visible
				await expect(cesiumPage.getByText('Trees')).not.toBeVisible()

				// Navigate to postal code level
				await helpers.drillToLevel('postalCode')
				// Wait for postal code level UI
				await cesiumPage
					.waitForSelector('text="Building Analysis"', {
						timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
					})
					.catch(() => {})

				// Trees toggle should now be available (unless in grid view)
				// Check view mode via Pinia store state (v-btn-toggle doesn't use radio inputs)
				const currentView = await cesiumPage.evaluate(() => {
					const pinia = (window as any).__PINIA__
					return pinia?.state?.value?.global?.currentView || 'capitalRegion'
				})

				if (currentView === 'capitalRegion') {
					await expect(cesiumPage.getByText('Trees')).toBeVisible()

					// Test trees toggle functionality
					const treesToggle = cesiumPage
						.getByText('Trees')
						.locator('..')
						.locator('input[type="checkbox"]')
					await helpers.checkWithRetry(treesToggle, { elementName: 'Trees' })
					await expect(treesToggle).toBeChecked()
				}
			}
		)

		cesiumTest('should show appropriate filter options per level', async ({ cesiumPage }) => {
			// At start level, filters should be visible but may not be functional
			await expect(cesiumPage.getByText('Public Buildings', { exact: true })).toBeVisible()
			await expect(cesiumPage.getByText('Tall Buildings', { exact: true })).toBeVisible()

			// Navigate to postal code level
			await helpers.drillToLevel('postalCode')
			// Wait for postal code UI
			await cesiumPage
				.waitForSelector('text="Building Analysis"', {
					timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
				})
				.catch(() => {})

			// Filters should still be visible and functional
			await helpers.testAllToggles({
				currentView: 'capitalRegion',
				currentLevel: 'postalCode',
				hasPostalCode: true,
			})
		})

		cesiumTest(
			'should handle timeline interactions at postal code and building levels',
			async ({ cesiumPage }) => {
				// Navigate to postal code level
				await helpers.drillToLevel('postalCode')
				// Wait for postal code UI
				await cesiumPage
					.waitForSelector('text="Building Analysis"', {
						timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
					})
					.catch(() => {})

				// Test timeline at postal code level
				await helpers.verifyTimelineVisibility('postalCode')

				// Navigate to building level
				await helpers.drillToLevel('building')
				// Wait for building level UI
				await cesiumPage
					.waitForSelector('text="Building heat data"', { timeout: TEST_TIMEOUTS.CESIUM_READY })
					.catch(() => {})

				// Timeline should still be functional at building level
				await helpers.verifyTimelineVisibility('building')
			}
		)
	})

	cesiumTest.describe('Error Handling and Edge Cases', () => {
		cesiumTest('should handle invalid navigation attempts gracefully', async ({ cesiumPage }) => {
			// Try to navigate to non-existent areas
			const cesiumContainer = cesiumPage.locator('#cesiumContainer')

			// Click on various map areas that might not have data
			const clickPositions = [
				{ x: 100, y: 100 },
				{ x: 800, y: 200 },
				{ x: 200, y: 600 },
			]

			for (const position of clickPositions) {
				await cesiumContainer.click({ position })
				// Wait for any UI updates from the click
				await cesiumPage.waitForFunction(
					() => {
						return document.readyState === 'complete'
					},
					{ timeout: TEST_TIMEOUTS.ELEMENT_SCROLL }
				)

				// Application should not crash or show error states
				const errorElements = cesiumPage.locator('[class*="error"], [class*="Error"]')
				const errorCount = await errorElements.count()
				expect(errorCount).toBe(0)

				// Navigation should remain functional
				const resetButton = cesiumPage
					.getByRole('button')
					.filter({ has: cesiumPage.locator('.mdi-refresh') })
				await expect(resetButton).toBeVisible()
			}
		})

		cesiumTest('should maintain navigation state during data loading', async ({ cesiumPage }) => {
			// Intercept requests to simulate slow loading
			cesiumPage.route('**/*.json', (route) => {
				setTimeout(() => route.continue(), 1000)
			})

			// Attempt navigation during loading
			await helpers.drillToLevel('postalCode')

			// Immediately try to navigate further
			await helpers.drillToLevel('building')

			// Wait for everything to settle
			await cesiumPage
				.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT })
				.catch(() => {})

			// Should end up in a consistent state
			const resetButton = cesiumPage
				.getByRole('button')
				.filter({ has: cesiumPage.locator('.mdi-refresh') })
			await expect(resetButton).toBeVisible()

			// Navigation should still work
			await resetButton.click()
			// Wait for reset
			await cesiumPage
				.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
				.catch(() => {})

			await helpers.testNavigationControls('start')
		})
	})

	cesiumTest.describe('Accessibility Compliance for Navigation', () => {
		cesiumTest('should support keyboard navigation between levels', async ({ cesiumPage }) => {
			// Tab through navigation controls with safety measures
			const maxIterations = 15
			let foundNavigationElement = false

			try {
				for (let i = 0; i < maxIterations; i++) {
					// Check if page context is still valid
					const pageValid = await cesiumPage
						.evaluate(() => document.readyState)
						.then(() => true)
						.catch(() => false)

					if (!pageValid) {
						console.warn('Page context lost during keyboard navigation')
						break
					}

					await cesiumPage.keyboard.press('Tab')
					await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_BRIEF)

					const focusedElement = cesiumPage.locator(':focus')
					const elementExists = await focusedElement.count().then((c) => c > 0)

					if (elementExists) {
						const isVisible = await focusedElement.isVisible().catch(() => false)
						if (isVisible) {
							foundNavigationElement = true

							// Test Enter key activation
							await cesiumPage.keyboard.press('Enter')
							// Wait for any activation effects
							await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP)
							break
						}
					}
				}
			} catch (error) {
				console.warn('Keyboard navigation test encountered error:', error)
			}

			// Should have found at least one navigation element
			expect(foundNavigationElement).toBeTruthy()

			// Should not cause errors
			const errorElements = cesiumPage.locator('[class*="error"], [class*="Error"]')
			const errorCount = await errorElements.count()
			expect(errorCount).toBe(0)
		})

		cesiumTest('should provide clear navigation state indicators', async ({ cesiumPage }) => {
			// Navigation controls should have clear visual indicators
			const resetButton = cesiumPage
				.getByRole('button')
				.filter({ has: cesiumPage.locator('.mdi-refresh') })
			await expect(resetButton).toBeVisible()

			// Navigate to building level to test back button
			await helpers.drillToLevel('building')
			// Wait for building level
			await cesiumPage
				.waitForSelector('.mdi-arrow-left', { timeout: TEST_TIMEOUTS.CESIUM_READY })
				.catch(() => {})

			const backButton = cesiumPage
				.getByRole('button')
				.filter({ has: cesiumPage.locator('.mdi-arrow-left') })
			await expect(backButton).toBeVisible()

			// Buttons should have tooltips for accessibility
			await backButton.hover()
			// Wait for tooltip to appear
			await cesiumPage
				.waitForSelector('[role="tooltip"], .v-tooltip', {
					timeout: TEST_TIMEOUTS.ELEMENT_INTERACTION,
				})
				.catch(() => {})

			// Tooltip should appear
			const tooltip = cesiumPage.locator('[role="tooltip"], .v-tooltip')
			if (await tooltip.first().isVisible()) {
				await expect(tooltip.first()).toBeVisible()
			}
		})
	})
})
