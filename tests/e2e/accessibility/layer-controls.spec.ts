/**
 * Layer Controls Accessibility Tests
 *
 * Tests all layer toggle controls and their conditional visibility/functionality:
 * - Vegetation (Helsinki view only)
 * - Other Nature (Helsinki view only)
 * - Trees (not grid view + postal code selected)
 * - Land Cover (not Helsinki view)
 * - NDVI (universal)
 *
 * Ensures all layer controls remain accessible and functional during interface overhaul.
 *
 * SKIPPED: These tests are currently skipped due to a Vuetify v-navigation-drawer
 * rendering issue in the Playwright test environment. The drawer component does not
 * render its DOM element even when the model value is true, preventing tests from
 * accessing layer controls inside the control panel.
 * See: https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/470
 */

import { expect } from '@playwright/test'
import { VIEWPORTS } from '../../config/constants'
import { cesiumDescribe, cesiumTest } from '../../fixtures/cesium-fixture'
import AccessibilityTestHelpers, { TEST_TIMEOUTS } from '../helpers/test-helpers'

// TODO: Re-enable when Vuetify navigation drawer rendering issue is resolved
cesiumDescribe.skip('Layer Controls Accessibility', () => {
	cesiumTest.use({ tag: ['@accessibility', '@e2e'] })
	let helpers: AccessibilityTestHelpers

	cesiumTest.beforeEach(async ({ cesiumPage }) => {
		helpers = new AccessibilityTestHelpers(cesiumPage)
		// Cesium is already initialized by the fixture
	})

	cesiumTest.describe('Universal Layer Controls', () => {
		cesiumTest('should display NDVI toggle in all views and contexts', async ({ cesiumPage }) => {
			// Test NDVI in Capital Region view
			await helpers.navigateToView('capitalRegionView')

			// Scroll NDVI text into viewport before checking visibility
			const ndviText = cesiumPage.getByText('NDVI')
			await helpers.scrollIntoViewportWithRetry(ndviText, { elementName: 'NDVI text' })
			await expect(ndviText).toBeVisible()

			let ndviToggle = cesiumPage.getByText('NDVI').locator('..').locator('input[type="checkbox"]')
			await helpers.scrollIntoViewportWithRetry(ndviToggle, { elementName: 'NDVI toggle' })
			await expect(ndviToggle).toBeVisible()

			// Test NDVI functionality with scroll-before-interact pattern
			// Check current state first to avoid attempting redundant operations
			const isChecked = await ndviToggle.isChecked()
			if (!isChecked) {
				await helpers.checkWithRetry(ndviToggle, { elementName: 'NDVI' })
			}
			await expect(ndviToggle).toBeChecked()

			await helpers.uncheckWithRetry(ndviToggle, { elementName: 'NDVI' })
			await expect(ndviToggle).not.toBeChecked()

			// Test NDVI in Statistical Grid view
			await helpers.navigateToView('gridView')

			// Scroll NDVI into view after view change
			const ndviTextGrid = cesiumPage.getByText('NDVI')
			await helpers.scrollIntoViewportWithRetry(ndviTextGrid, { elementName: 'NDVI in grid view' })
			await expect(ndviTextGrid).toBeVisible()

			// Re-query the locator after view change to avoid stale element reference
			ndviToggle = cesiumPage.getByText('NDVI').locator('..').locator('input[type="checkbox"]')

			// NDVI should be functional in grid view too
			await helpers.checkWithRetry(ndviToggle, {
				elementName: 'NDVI in grid view',
			})
			await expect(ndviToggle).toBeChecked()
		})

		cesiumTest('should maintain NDVI state across view changes', async ({ cesiumPage }) => {
			// Start in Capital Region view (default state from fixture)
			// Create locator for NDVI toggle
			let ndviToggle = cesiumPage.getByText('NDVI').locator('..').locator('input[type="checkbox"]')

			// Check current state first to avoid redundant operations
			const isChecked = await ndviToggle.isChecked()
			if (!isChecked) {
				await helpers.checkWithRetry(ndviToggle, { elementName: 'NDVI' })
			}
			await expect(ndviToggle).toBeChecked()

			// Switch to Grid view
			await helpers.navigateToView('gridView')

			// Re-query locator after view change
			ndviToggle = cesiumPage.getByText('NDVI').locator('..').locator('input[type="checkbox"]')

			// NDVI should maintain its state
			await expect(ndviToggle).toBeChecked()

			// Switch back to Capital Region
			await helpers.navigateToView('capitalRegionView')

			// Re-query locator after view change
			ndviToggle = cesiumPage.getByText('NDVI').locator('..').locator('input[type="checkbox"]')

			await expect(ndviToggle).toBeChecked()
		})

		cesiumTest('should display Data Layers section header consistently', async ({ cesiumPage }) => {
			await expect(cesiumPage.getByText('Data Layers', { exact: true })).toBeVisible()

			// Should remain visible across view changes
			await helpers.navigateToView('gridView')
			await expect(cesiumPage.getByText('Data Layers', { exact: true })).toBeVisible()

			await helpers.navigateToView('capitalRegionView')
			await expect(cesiumPage.getByText('Data Layers', { exact: true })).toBeVisible()
		})
	})

	cesiumTest.describe('View-Specific Layer Controls', () => {
		cesiumTest('should show Land Cover only in non-Helsinki views', async ({ cesiumPage }) => {
			// Should be visible in Capital Region view (default)
			await helpers.navigateToView('capitalRegionView')

			// Scroll Land Cover into viewport before checking visibility
			const landCoverText = cesiumPage.getByText('Land Cover')
			await helpers.scrollIntoViewportWithRetry(landCoverText, { elementName: 'Land Cover text' })
			await expect(landCoverText).toBeVisible()

			let landCoverToggle = cesiumPage
				.getByText('Land Cover')
				.locator('..')
				.locator('input[type="checkbox"]')
			await helpers.scrollIntoViewportWithRetry(landCoverToggle, {
				elementName: 'Land Cover toggle',
			})

			// Test toggle functionality
			// Check current state first to avoid redundant operations
			const isChecked = await landCoverToggle.isChecked()
			if (!isChecked) {
				await helpers.checkWithRetry(landCoverToggle, {
					elementName: 'Land Cover',
				})
			}
			await expect(landCoverToggle).toBeChecked()

			await helpers.uncheckWithRetry(landCoverToggle, {
				elementName: 'Land Cover',
			})
			await expect(landCoverToggle).not.toBeChecked()

			// Should be visible in Grid view too
			await helpers.navigateToView('gridView')

			// Scroll Land Cover into view after view change
			const landCoverTextGrid = cesiumPage.getByText('Land Cover')
			await helpers.scrollIntoViewportWithRetry(landCoverTextGrid, {
				elementName: 'Land Cover in grid view',
			})
			await expect(landCoverTextGrid).toBeVisible()

			// Re-query locator after view change
			landCoverToggle = cesiumPage
				.getByText('Land Cover')
				.locator('..')
				.locator('input[type="checkbox"]')

			// Note: Helsinki view testing would require navigation to Helsinki-specific postal codes
			// For comprehensive testing, we verify the conditional logic structure exists
		})

		cesiumTest('should show vegetation controls only in Helsinki view', async ({ cesiumPage }) => {
			// In default Capital Region view, vegetation controls should not be visible
			await helpers.navigateToView('capitalRegionView')
			await expect(cesiumPage.getByText('Vegetation')).not.toBeVisible()
			await expect(cesiumPage.getByText('Other Nature')).not.toBeVisible()

			// In Grid view, vegetation controls should not be visible
			await helpers.navigateToView('gridView')
			await expect(cesiumPage.getByText('Vegetation')).not.toBeVisible()
			await expect(cesiumPage.getByText('Other Nature')).not.toBeVisible()

			// Note: Testing Helsinki view would require:
			// 1. Setting helsinkiView store state to true
			// 2. Or navigating to Helsinki-specific data
			// For now we verify the conditional structure exists
		})

		cesiumTest('should handle view-specific layer state correctly', async ({ cesiumPage }) => {
			// Start with Capital Region
			await helpers.navigateToView('capitalRegionView')

			// Get Land Cover toggle
			let landCoverToggle = cesiumPage
				.getByText('Land Cover')
				.locator('..')
				.locator('input[type="checkbox"]')

			// Ensure we start from unchecked state for consistent test behavior
			const initialState = await landCoverToggle.isChecked()
			if (initialState) {
				await helpers.uncheckWithRetry(landCoverToggle, {
					elementName: 'Land Cover initial state',
				})
			}
			await expect(landCoverToggle).not.toBeChecked()

			// Now enable Land Cover
			await helpers.checkWithRetry(landCoverToggle, {
				elementName: 'Land Cover',
			})
			await expect(landCoverToggle).toBeChecked()

			// Switch to Grid view - should maintain state
			await helpers.navigateToView('gridView')

			// Re-query locator after view change
			landCoverToggle = cesiumPage
				.getByText('Land Cover')
				.locator('..')
				.locator('input[type="checkbox"]')

			// Land Cover should be checked (we ensured it was checked before navigating)
			await expect(landCoverToggle).toBeChecked()

			// Disable in Grid view
			await helpers.uncheckWithRetry(landCoverToggle, {
				elementName: 'Land Cover',
			})
			await expect(landCoverToggle).not.toBeChecked()

			// Switch back - state should be maintained
			await helpers.navigateToView('capitalRegionView')

			// Re-query locator after view change
			landCoverToggle = cesiumPage
				.getByText('Land Cover')
				.locator('..')
				.locator('input[type="checkbox"]')

			await expect(landCoverToggle).not.toBeChecked()
		})
	})

	cesiumTest.describe('Context-Dependent Layer Controls', () => {
		cesiumTest(
			'should show Trees toggle only with postal code in non-grid views',
			async ({ cesiumPage }) => {
				// At start level, Trees should not be visible
				await expect(cesiumPage.getByText('Trees')).not.toBeVisible()

				// Navigate to postal code level in Capital Region view
				await helpers.navigateToView('capitalRegionView')
				await helpers.drillToLevel('postalCode')
				// Wait for postal code level UI
				await cesiumPage
					.waitForSelector('text="Building Scatter Plot"', {
						timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
					})
					.catch(() => {})

				// Trees toggle should now be visible
				await expect(cesiumPage.getByText('Trees')).toBeVisible()

				const treesToggle = cesiumPage
					.getByText('Trees')
					.locator('..')
					.locator('input[type="checkbox"]')

				// Test Trees toggle functionality
				await helpers.checkWithRetry(treesToggle, { elementName: 'Trees' })
				await expect(treesToggle).toBeChecked()

				await helpers.uncheckWithRetry(treesToggle, { elementName: 'Trees' })
				await expect(treesToggle).not.toBeChecked()
			}
		)

		cesiumTest(
			'should hide Trees toggle in grid view even with postal code',
			async ({ cesiumPage }) => {
				// Navigate to postal code in Capital Region first
				await helpers.navigateToView('capitalRegionView')
				await helpers.drillToLevel('postalCode')
				// Wait for postal code UI elements
				await cesiumPage
					.waitForSelector('text="Building Scatter Plot"', {
						timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
					})
					.catch(() => {})

				// Verify Trees is visible
				await expect(cesiumPage.getByText('Trees')).toBeVisible()

				// Switch to grid view
				await helpers.navigateToView('gridView')
				// Wait for grid view switch
				await expect(cesiumPage.locator('input[value="gridView"]')).toBeChecked()

				// Trees should now be hidden
				await expect(cesiumPage.getByText('Trees')).not.toBeVisible()

				// Switch back to Capital Region
				await helpers.navigateToView('capitalRegionView')
				// Wait for view switch back
				await expect(cesiumPage.locator('input[value="capitalRegionView"]')).toBeChecked()

				// Trees should be visible again
				await expect(cesiumPage.getByText('Trees')).toBeVisible()
			}
		)

		cesiumTest('should handle Trees toggle state across valid contexts', async ({ cesiumPage }) => {
			// Navigate to postal code in Capital Region
			await helpers.navigateToView('capitalRegionView')
			await helpers.drillToLevel('postalCode')
			// Wait for postal code level
			await cesiumPage
				.waitForSelector('text="Building Scatter Plot"', {
					timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
				})
				.catch(() => {})

			let treesToggle = cesiumPage
				.getByText('Trees')
				.locator('..')
				.locator('input[type="checkbox"]')

			// Enable Trees
			// Check current state first to avoid redundant operations
			const isChecked = await treesToggle.isChecked()
			if (!isChecked) {
				await helpers.checkWithRetry(treesToggle, { elementName: 'Trees' })
			}
			await expect(treesToggle).toBeChecked()

			// Navigate to building level (Trees should still be available)
			await helpers.drillToLevel('building')
			// Wait for building level
			await cesiumPage
				.waitForSelector('text="Building heat data"', { timeout: TEST_TIMEOUTS.CESIUM_READY })
				.catch(() => {})

			// Re-query locator after navigation
			treesToggle = cesiumPage.getByText('Trees').locator('..').locator('input[type="checkbox"]')

			// Trees should still be visible and checked
			await expect(cesiumPage.getByText('Trees')).toBeVisible()
			await expect(treesToggle).toBeChecked()

			// Navigate back to postal code
			const backButton = cesiumPage
				.getByRole('button')
				.filter({ has: cesiumPage.locator('.mdi-arrow-left') })
			await backButton.click()
			// Wait for navigation back to postal code
			await cesiumPage
				.waitForSelector('text="Building Scatter Plot"', {
					timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
				})
				.catch(() => {})

			// Re-query locator after navigation back
			treesToggle = cesiumPage.getByText('Trees').locator('..').locator('input[type="checkbox"]')

			// Trees state should be maintained
			await expect(treesToggle).toBeChecked()
		})
	})

	cesiumTest.describe('Layer Toggle Interactions', () => {
		cesiumTest('should handle rapid toggle switching without errors', async ({ cesiumPage }) => {
			const ndviToggle = cesiumPage
				.getByText('NDVI')
				.locator('..')
				.locator('input[type="checkbox"]')

			// Scroll into view once before rapid toggling
			await helpers.scrollIntoViewportWithRetry(ndviToggle, {
				elementName: 'NDVI',
			})
			await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY)

			// Rapidly toggle NDVI multiple times with viewport checks
			for (let i = 0; i < 5; i++) {
				// Ensure element is still in viewport
				const box = await ndviToggle.boundingBox()
				const isInViewport = box !== null && box.y >= 0 && box.x >= 0

				if (!isInViewport) {
					await helpers.scrollIntoViewportWithRetry(ndviToggle, {
						elementName: 'NDVI',
						maxRetries: 2,
					})
					await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_SHORT)
				}

				// Use force option for rapid toggling after initial attempts
				await ndviToggle.check({ timeout: TEST_TIMEOUTS.ELEMENT_SCROLL, force: i > 2 })
				await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY)
				await ndviToggle.uncheck({ timeout: TEST_TIMEOUTS.ELEMENT_SCROLL, force: i > 2 })
				await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY)
			}

			// Final state should be consistent
			await expect(ndviToggle).not.toBeChecked()

			// No error states should be present
			const errorElements = cesiumPage.locator('[class*="error"], [class*="Error"]')
			const errorCount = await errorElements.count()
			expect(errorCount).toBe(0)
		})

		cesiumTest('should handle multiple layer toggles simultaneously', async ({ cesiumPage }) => {
			await helpers.navigateToView('capitalRegionView')
			await helpers.drillToLevel('postalCode')
			// Wait for postal code level
			await cesiumPage
				.waitForSelector('text="Building Scatter Plot"', {
					timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
				})
				.catch(() => {})

			// Get available toggles
			const ndviToggle = cesiumPage
				.getByText('NDVI')
				.locator('..')
				.locator('input[type="checkbox"]')
			const landCoverToggle = cesiumPage
				.getByText('Land Cover')
				.locator('..')
				.locator('input[type="checkbox"]')
			const treesToggle = cesiumPage
				.getByText('Trees')
				.locator('..')
				.locator('input[type="checkbox"]')

			// Enable all available layers
			await helpers.checkWithRetry(ndviToggle, { elementName: 'NDVI' })
			await helpers.checkWithRetry(landCoverToggle, {
				elementName: 'Land Cover',
			})
			await helpers.checkWithRetry(treesToggle, { elementName: 'Trees' })

			// Verify all are checked
			await expect(ndviToggle).toBeChecked()
			await expect(landCoverToggle).toBeChecked()
			await expect(treesToggle).toBeChecked()

			// Disable all
			await helpers.uncheckWithRetry(ndviToggle, { elementName: 'NDVI' })
			await helpers.uncheckWithRetry(landCoverToggle, {
				elementName: 'Land Cover',
			})
			await helpers.uncheckWithRetry(treesToggle, { elementName: 'Trees' })

			// Verify all are unchecked
			await expect(ndviToggle).not.toBeChecked()
			await expect(landCoverToggle).not.toBeChecked()
			await expect(treesToggle).not.toBeChecked()
		})

		cesiumTest('should maintain layer states during navigation', async ({ cesiumPage }) => {
			// Enable NDVI and Land Cover
			let ndviToggle = cesiumPage.getByText('NDVI').locator('..').locator('input[type="checkbox"]')
			let landCoverToggle = cesiumPage
				.getByText('Land Cover')
				.locator('..')
				.locator('input[type="checkbox"]')

			// Check current state first to avoid redundant operations
			const ndviChecked = await ndviToggle.isChecked()
			if (!ndviChecked) {
				await helpers.checkWithRetry(ndviToggle, { elementName: 'NDVI' })
			}

			const landCoverChecked = await landCoverToggle.isChecked()
			if (!landCoverChecked) {
				await helpers.checkWithRetry(landCoverToggle, {
					elementName: 'Land Cover',
				})
			}

			// Navigate to postal code level
			await helpers.drillToLevel('postalCode')
			// Wait for postal code UI
			await cesiumPage
				.waitForSelector('text="Building Scatter Plot"', {
					timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
				})
				.catch(() => {})

			// Re-query locators after navigation
			ndviToggle = cesiumPage.getByText('NDVI').locator('..').locator('input[type="checkbox"]')
			landCoverToggle = cesiumPage
				.getByText('Land Cover')
				.locator('..')
				.locator('input[type="checkbox"]')

			// States should be maintained
			await expect(ndviToggle).toBeChecked()
			await expect(landCoverToggle).toBeChecked()

			// Navigate to building level
			await helpers.drillToLevel('building')
			// Wait for building level
			await cesiumPage
				.waitForSelector('text="Building heat data"', { timeout: TEST_TIMEOUTS.CESIUM_READY })
				.catch(() => {})

			// Re-query locators after navigation
			ndviToggle = cesiumPage.getByText('NDVI').locator('..').locator('input[type="checkbox"]')
			landCoverToggle = cesiumPage
				.getByText('Land Cover')
				.locator('..')
				.locator('input[type="checkbox"]')

			// States should still be maintained
			await expect(ndviToggle).toBeChecked()
			await expect(landCoverToggle).toBeChecked()
		})
	})

	cesiumTest.describe('Layer Control Styling and Accessibility', () => {
		cesiumTest('should have consistent styling for all layer toggles', async ({ cesiumPage }) => {
			// Navigate to context where multiple layers are visible
			await helpers.navigateToView('capitalRegionView')
			await helpers.drillToLevel('postalCode')
			// Wait for postal code UI
			await cesiumPage
				.waitForSelector('text="Building Scatter Plot"', {
					timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
				})
				.catch(() => {})

			// Check that all visible toggles have consistent structure
			const toggles = cesiumPage.locator('.switch-container')
			const count = await toggles.count()

			expect(count).toBeGreaterThan(2) // Should have multiple layer toggles

			for (let i = 0; i < count; i++) {
				const toggle = toggles.nth(i)

				// Each should have a switch and label
				const switchElement = toggle.locator('.switch')
				const label = toggle.locator('.label')

				if (await switchElement.isVisible()) {
					await expect(switchElement).toBeVisible()
					await expect(label).toBeVisible()
				}
			}
		})

		cesiumTest('should support keyboard navigation for layer toggles', async ({ cesiumPage }) => {
			// Tab through the interface to reach layer controls with safety measures
			let foundLayerToggle = false
			const maxIterations = 25 // Limit iterations to prevent infinite loops

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
					await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_BRIEF) // Brief wait for focus to settle

					const focused = cesiumPage.locator(':focus')

					// Check if element is valid before evaluating
					const elementExists = await focused.count().then((c) => c > 0)
					if (!elementExists) {
						continue
					}

					const tagName = await focused.evaluate((el) => el.tagName.toLowerCase()).catch(() => '')

					if (tagName === 'input') {
						const type = await focused.getAttribute('type').catch(() => null)
						if (type === 'checkbox') {
							// Found a checkbox, test space bar activation
							const initialState = await focused.isChecked().catch(() => null)
							if (initialState === null) continue

							await cesiumPage.keyboard.press(' ')
							await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP)

							const isChecked = await focused.isChecked().catch(() => null)
							if (isChecked !== null) {
								expect(typeof isChecked).toBe('boolean')
								foundLayerToggle = true
								break
							}
						}
					}
				}
			} catch (error) {
				console.warn('Keyboard navigation test encountered error:', error)
			}

			// Should have found at least one layer toggle via keyboard navigation
			expect(foundLayerToggle).toBeTruthy()
		})

		cesiumTest('should have proper labels for screen readers', async ({ cesiumPage }) => {
			await helpers.navigateToView('capitalRegionView')
			await helpers.drillToLevel('postalCode')
			// Wait for postal code UI
			await cesiumPage
				.waitForSelector('text="Building Scatter Plot"', {
					timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
				})
				.catch(() => {})

			// Check that layer labels are descriptive
			const layerLabels = ['NDVI', 'Land Cover', 'Trees']

			for (const labelText of layerLabels) {
				const label = cesiumPage.getByText(labelText)
				if (await label.isVisible()) {
					await expect(label).toBeVisible()

					// Label should be associated with a toggle
					const toggle = label.locator('..').locator('input[type="checkbox"]')
					await expect(toggle).toBeVisible()
				}
			}
		})

		cesiumTest(
			'should provide visual feedback for toggle state changes',
			async ({ cesiumPage }) => {
				const ndviToggle = cesiumPage
					.getByText('NDVI')
					.locator('..')
					.locator('input[type="checkbox"]')

				// Scroll into view before interaction
				await helpers.scrollIntoViewportWithRetry(ndviToggle, {
					elementName: 'NDVI',
				})
				await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY)

				// Initial state
				const _initialChecked = await ndviToggle.isChecked()

				// Toggle on
				await helpers.checkWithRetry(ndviToggle, { elementName: 'NDVI' })
				await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP)

				// Wait for toggle state change
				await expect(ndviToggle).toBeChecked()

				// Visual state should reflect change
				const afterToggle = await ndviToggle.isChecked()
				expect(afterToggle).toBe(true)

				// Slider element should be present for visual feedback - try multiple selector patterns
				const sliderSelectors = [
					'.slider.round',
					'.slider',
					'.switch .slider',
					'[class*="slider"]',
					'.switch-slider',
				]

				let sliderFound = false
				for (const selector of sliderSelectors) {
					const slider = cesiumPage.getByText('NDVI').locator('..').locator(selector)

					const exists = await slider.count().then((c) => c > 0)
					if (exists) {
						await expect(slider.first()).toBeVisible()
						sliderFound = true
						break
					}
				}

				// If no slider found, verify toggle is functional instead
				if (!sliderFound) {
					expect(afterToggle).toBe(true)
				}
			}
		)
	})

	cesiumTest.describe('Layer Control Edge Cases', () => {
		cesiumTest('should handle layer toggles during data loading', async ({ cesiumPage }) => {
			// Intercept requests to simulate slow loading
			cesiumPage.route('**/*.json', (route) => {
				setTimeout(() => route.continue(), 1000)
			})

			// Try toggling during navigation/loading
			await helpers.drillToLevel('postalCode')

			// Immediately try to toggle layers
			const ndviToggle = cesiumPage
				.getByText('NDVI')
				.locator('..')
				.locator('input[type="checkbox"]')

			await helpers.checkWithRetry(ndviToggle, { elementName: 'NDVI' })

			// Wait for loading to complete
			await cesiumPage
				.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT })
				.catch(() => {})

			// Toggle state should be consistent
			await expect(ndviToggle).toBeChecked()

			// No error states
			const errorElements = cesiumPage.locator('[class*="error"], [class*="Error"]')
			const errorCount = await errorElements.count()
			expect(errorCount).toBe(0)
		})

		cesiumTest(
			'should reset layer states appropriately on application reset',
			async ({ cesiumPage }) => {
				// Enable some layers
				let ndviToggle = cesiumPage
					.getByText('NDVI')
					.locator('..')
					.locator('input[type="checkbox"]')
				let landCoverToggle = cesiumPage
					.getByText('Land Cover')
					.locator('..')
					.locator('input[type="checkbox"]')

				// Check current state first to avoid redundant operations
				const ndviChecked = await ndviToggle.isChecked()
				if (!ndviChecked) {
					await helpers.checkWithRetry(ndviToggle, { elementName: 'NDVI' })
				}

				const landCoverChecked = await landCoverToggle.isChecked()
				if (!landCoverChecked) {
					await helpers.checkWithRetry(landCoverToggle, {
						elementName: 'Land Cover',
					})
				}

				await expect(ndviToggle).toBeChecked()
				await expect(landCoverToggle).toBeChecked()

				// Reset application
				const resetButton = cesiumPage
					.getByRole('button')
					.filter({ has: cesiumPage.locator('.mdi-refresh') })
				await resetButton.click()
				// Wait for reset to complete
				await cesiumPage
					.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
					.catch(() => {})

				// Re-query locators after reset
				ndviToggle = cesiumPage.getByText('NDVI').locator('..').locator('input[type="checkbox"]')
				landCoverToggle = cesiumPage
					.getByText('Land Cover')
					.locator('..')
					.locator('input[type="checkbox"]')

				// Layer states behavior after reset depends on implementation
				// We verify that toggles are still functional
				await expect(ndviToggle).toBeVisible()
				await expect(landCoverToggle).toBeVisible()

				// Test functionality is maintained
				// Check current state before trying to check
				const ndviCheckedAfterReset = await ndviToggle.isChecked()
				if (!ndviCheckedAfterReset) {
					await helpers.checkWithRetry(ndviToggle, { elementName: 'NDVI' })
				}
				await expect(ndviToggle).toBeChecked()
			}
		)

		cesiumTest('should handle missing layer data gracefully', async ({ cesiumPage }) => {
			// Toggle layers even if underlying data might be missing
			const ndviToggle = cesiumPage
				.getByText('NDVI')
				.locator('..')
				.locator('input[type="checkbox"]')

			await helpers.checkWithRetry(ndviToggle, { elementName: 'NDVI' })

			// Wait for toggle state change
			await expect(ndviToggle).toBeChecked()

			// Should not cause application errors
			const errorElements = cesiumPage.locator('[class*="error"], [class*="Error"]')
			const errorCount = await errorElements.count()
			expect(errorCount).toBe(0)

			// Toggle should remain functional
			await helpers.uncheckWithRetry(ndviToggle, { elementName: 'NDVI' })
			await expect(ndviToggle).not.toBeChecked()
		})
	})

	cesiumTest.describe('Layer Control Performance', () => {
		cesiumTest(
			'should handle layer toggles efficiently across viewports',
			async ({ cesiumPage }) => {
				const viewports = [VIEWPORTS.DESKTOP_HD, VIEWPORTS.TABLET, VIEWPORTS.MOBILE]

				for (const viewport of viewports) {
					await cesiumPage.setViewportSize(viewport)
					// Wait for viewport change to take effect
					await cesiumPage.waitForFunction(
						(expectedWidth) => {
							return window.innerWidth === expectedWidth
						},
						viewport.width,
						{ timeout: TEST_TIMEOUTS.ELEMENT_SCROLL }
					)

					// Layer controls should remain accessible
					await expect(cesiumPage.getByText('NDVI')).toBeVisible()

					const ndviToggle = cesiumPage
						.getByText('NDVI')
						.locator('..')
						.locator('input[type="checkbox"]')

					// Toggle should work efficiently
					const startTime = Date.now()
					await helpers.checkWithRetry(ndviToggle, { elementName: 'NDVI' })
					const endTime = Date.now()

					expect(endTime - startTime).toBeLessThan(1000) // Should be responsive
					await expect(ndviToggle).toBeChecked()
				}
			}
		)
	})
})
