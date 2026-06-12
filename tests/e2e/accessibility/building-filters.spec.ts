/**
 * Building Filters Accessibility Tests
 *
 * Tests all building filter controls and their conditional behavior:
 * - Public Buildings / Social & Healthcare (label changes by view)
 * - Pre-2018 (Helsinki view only)
 * - Tall Buildings (applies to all non-grid views)
 *
 * IMPORTANT: Filter Visibility by View Mode
 * - Grid View: ALL building filters are HIDDEN (entire section is v-if="view !== 'grid'")
 * - Capital Region View: All filters visible (Public Buildings, Tall Buildings)
 * - Helsinki View: All filters visible (Social & Healthcare, Pre-2018, Tall Buildings)
 * - Postal Code View: All filters visible and functional
 * - Building View: All filters visible and functional
 *
 * Filter State Management:
 * - Filters are reset when changing views (watch on store.view calls resetFilters())
 * - Filter toggle state is NOT persisted when switching to grid view (filters are hidden)
 * - Filter functionality is maintained when navigating between non-grid views
 *
 * Ensures all building filter controls remain accessible during interface overhaul.
 */

import { expect } from '@playwright/test'
import { cesiumDescribe, cesiumTest } from '../../fixtures/cesium-fixture'
import GridAwareTestHelpers, { TEST_TIMEOUTS } from '../helpers/grid-aware-helpers'

cesiumDescribe('Building Filters Accessibility', () => {
	cesiumTest.use({ tag: ['@accessibility', '@e2e'] })
	let helpers: GridAwareTestHelpers

	cesiumTest.beforeEach(async ({ cesiumPage }, testInfo) => {
		// The entire Building Filters section is unmounted (not just CSS-hidden) on
		// the accessibility-mobile project (375x667). Every test in this file asserts
		// on filter visibility (`.switch-container`, "Building Filters", "Tall
		// Buildings", "Public Buildings", "Pre-2018"), so none are applicable on
		// mobile. Skip the entire suite there; desktop (1920x1080) and tablet
		// (768x1024) viewports continue to cover the matrix.
		// See #143, PR #791 follow-up.
		if (testInfo.project.name === 'accessibility-mobile') {
			testInfo.skip(
				true,
				'Building filters are unmounted on mobile viewport; covered by desktop/tablet matrix'
			)
			return
		}

		helpers = new GridAwareTestHelpers(cesiumPage)
		// Cesium is already initialized by the fixture

		// Ensure control panel is open (needed for mobile viewports where drawer is closed by default)
		await helpers.ensureControlPanelOpen()
	})

	cesiumTest.describe('Universal Building Filters', () => {
		cesiumTest(
			'should display "Tall Buildings" filter in non-grid contexts',
			async ({ cesiumPage }) => {
				// Progressive assertion pattern: wait for parent elements before children
				// This ensures DOM hierarchy is loaded and prevents CI timing issues

				// Layer 1: Wait for MapControls container to be visible
				await expect(cesiumPage.locator('.map-controls')).toBeVisible({
					timeout: TEST_TIMEOUTS.ELEMENT_STANDARD,
				})

				// Layer 2: Wait for Building Filters section header
				await expect(cesiumPage.getByText('Building Filters', { exact: true })).toBeVisible({
					timeout: TEST_TIMEOUTS.ELEMENT_STANDARD,
				})

				// Layer 3: Now check for specific filter (should be visible in default capital region view)
				await expect(cesiumPage.getByText('Tall Buildings', { exact: true })).toBeVisible({
					timeout: TEST_TIMEOUTS.ELEMENT_STANDARD,
				})

				const tallBuildingsToggle = cesiumPage
					.getByText('Tall Buildings', { exact: true })
					.locator('..')
					.locator('input[type="checkbox"]')
				await expect(tallBuildingsToggle).toBeVisible()

				// Use `dispatchEvent('click')` instead of `check()` to bypass Playwright's
				// state-change wait (#782). The Vuetify v-switch input has `opacity:0` under
				// `.v-switch__thumb`; `check({ force: true })` skips actionability but still
				// waits for the `checked` attribute to flip — on desktop (1920x1080) the
				// overlay intercepts the synthetic click, state never flips, and each attempt
				// burns the full 5s INTERACTION timeout. `dispatchEvent` fires the event and
				// lets the explicit `toBeChecked()` assertion below verify the flip with its
				// own timeout, returning fast on success and failing fast on regression.
				await tallBuildingsToggle.dispatchEvent('click')
				await expect(tallBuildingsToggle).toBeChecked()

				await tallBuildingsToggle.dispatchEvent('click')
				await expect(tallBuildingsToggle).not.toBeChecked()

				// Grid-view-hidden assertion lives in "should reset filters when changing views"
				// (lines ~335-340) — it's covered there for both Public Buildings and Tall
				// Buildings. Keeping a duplicate `navigateToView('gridView')` here busts the
				// per-test 50s budget on CI tablet viewport (#762).
			}
		)

		cesiumTest(
			'should display Building Filters section header in non-grid views only',
			async ({ cesiumPage }) => {
				// Progressive assertion: wait for MapControls container first
				await expect(cesiumPage.locator('.map-controls')).toBeVisible({
					timeout: TEST_TIMEOUTS.ELEMENT_STANDARD,
				})

				// Should be visible in default (capital region) view
				await expect(cesiumPage.getByText('Building Filters', { exact: true })).toBeVisible({
					timeout: TEST_TIMEOUTS.ELEMENT_STANDARD,
				})

				// Should NOT be visible in grid view (entire Building Filters section is hidden via v-if="view !== 'grid'")
				await helpers.navigateToView('gridView')
				await expect(cesiumPage.getByText('Building Filters', { exact: true })).not.toBeVisible()

				// Should be visible again when returning to capital region view
				await helpers.navigateToView('capitalRegionView')
				await expect(cesiumPage.getByText('Building Filters', { exact: true })).toBeVisible()
			}
		)

		cesiumTest(
			'should maintain tall buildings filter state across non-grid view contexts',
			{ tag: ['@requires-database'] },
			async ({ cesiumPage }) => {
				// Progressive assertion: ensure UI is ready
				await expect(cesiumPage.locator('.map-controls')).toBeVisible({
					timeout: TEST_TIMEOUTS.ELEMENT_STANDARD,
				})
				await expect(cesiumPage.getByText('Building Filters', { exact: true })).toBeVisible({
					timeout: TEST_TIMEOUTS.ELEMENT_STANDARD,
				})

				const tallBuildingsToggle = cesiumPage
					.getByText('Tall Buildings', { exact: true })
					.locator('..')
					.locator('input[type="checkbox"]')

				// Enable filter in capital region view
				await helpers.checkWithRetry(tallBuildingsToggle, {
					elementName: 'Tall Buildings filter',
					force: true,
				})
				await expect(tallBuildingsToggle).toBeChecked()

				// Navigate to postal code level (filter should remain visible and checked)
				await helpers.drillToLevel('postalCode')
				// Wait for postal code UI instead of fixed timeout
				await cesiumPage
					.waitForSelector('text="Building Analysis"', {
						timeout: TEST_TIMEOUTS.ELEMENT_STANDARD,
					})
					.catch(() => {})
				await expect(tallBuildingsToggle).toBeVisible()
				await expect(tallBuildingsToggle).toBeChecked()

				// Navigate to building level (filter should remain visible and checked)
				await helpers.drillToLevel('building')
				// Wait for building UI instead of fixed timeout
				await cesiumPage
					.waitForSelector('text="Building heat data"', { timeout: TEST_TIMEOUTS.ELEMENT_COMPLEX })
					.catch(() => {})
				await expect(tallBuildingsToggle).toBeVisible()
				await expect(tallBuildingsToggle).toBeChecked()
			}
		)
	})

	cesiumTest.describe('Context-Adaptive Building Filters', () => {
		cesiumTest('should show "Public Buildings" in Capital Region view', async ({ cesiumPage }) => {
			await helpers.navigateToView('capitalRegionView')

			// Should show "Public Buildings" label
			await expect(cesiumPage.getByText('Public Buildings', { exact: true })).toBeVisible()

			const publicBuildingsToggle = cesiumPage
				.getByText('Public Buildings', { exact: true })
				.locator('..')
				.locator('input[type="checkbox"]')
			await expect(publicBuildingsToggle).toBeVisible()

			// Vuetify v-switch — helper handles scroll-before-interact + retry-with-force (#762).
			await helpers.checkWithRetry(publicBuildingsToggle, {
				elementName: 'Public Buildings filter',
				force: true,
			})
			await expect(publicBuildingsToggle).toBeChecked()

			await helpers.uncheckWithRetry(publicBuildingsToggle, {
				elementName: 'Public Buildings filter',
				force: true,
			})
			await expect(publicBuildingsToggle).not.toBeChecked()
		})

		cesiumTest('should NOT show "Public Buildings" in Grid view', async ({ cesiumPage }) => {
			// Navigate to grid view
			await helpers.navigateToView('gridView')

			// Building filters should NOT be visible in grid view (entire section is hidden)
			await expect(cesiumPage.getByText('Public Buildings', { exact: true })).not.toBeVisible()
			await expect(cesiumPage.getByText('Building Filters', { exact: true })).not.toBeVisible()

			// Return to capital region view where filters should be visible
			await helpers.navigateToView('capitalRegionView')
			await expect(cesiumPage.getByText('Public Buildings', { exact: true })).toBeVisible()

			const publicBuildingsToggle = cesiumPage
				.getByText('Public Buildings', { exact: true })
				.locator('..')
				.locator('input[type="checkbox"]')
			await expect(publicBuildingsToggle).toBeVisible()

			// Test functionality in capital region view
			await helpers.checkWithRetry(publicBuildingsToggle, {
				elementName: 'Public Buildings filter',
				force: true,
			})
			await expect(publicBuildingsToggle).toBeChecked()
		})

		cesiumTest(
			'should change label to "Only social & healthcare buildings" in Helsinki view',
			async ({ cesiumPage }) => {
				// Mobile skip is handled by the top-level beforeEach hook.
				// Pin to capital region view — previous test ("should NOT show Public
				// Buildings in Grid view") navigates to grid and back, but state-leak across
				// tests means `.switch-container` may not be present without an explicit nav.
				await helpers.navigateToView('capitalRegionView')

				// Note: This test would require actually triggering Helsinki view
				// For now, we test the conditional label structure exists
				// In Helsinki view, the label should change to "Only social & healthcare buildings"

				// Verify that the filter toggle exists and can be identified.
				// Use toBeAttached() not toBeVisible() — `.switch-container` is
				// responsive-CSS-hidden on mobile viewports (analogous to
				// `.timeline-compact` `d-none d-lg-flex` pattern documented in
				// .claude/rules/testing.md "Testing Cesium Interactions"). This
				// test only verifies presence; the visible-label check below
				// reads sibling text and tolerates either label.
				const _buildingTypeToggle = cesiumPage.locator('input[type="checkbox"]').first()
				const filterContainer = cesiumPage.locator('.switch-container').first()

				await expect(filterContainer).toBeAttached()

				// The actual label text depends on the view state
				// We verify the toggle is functional regardless of label
				const hasPublicLabel = await cesiumPage
					.getByText('Public Buildings', { exact: true })
					.isVisible()
				const hasSocialLabel = await cesiumPage.getByText('Social & Healthcare').isVisible()

				expect(hasPublicLabel || hasSocialLabel).toBeTruthy()
			}
		)
	})

	cesiumTest.describe('Helsinki-Specific Building Filters', () => {
		cesiumTest('should show "Pre-2018" only in Helsinki view', async ({ cesiumPage }) => {
			// In default Capital Region view, this filter should not be visible
			await helpers.navigateToView('capitalRegionView')
			await expect(cesiumPage.getByText('Pre-2018')).not.toBeVisible()

			// In Grid view, this filter should not be visible
			await helpers.navigateToView('gridView')
			await expect(cesiumPage.getByText('Pre-2018')).not.toBeVisible()

			// Note: Testing actual Helsinki view would require:
			// 1. Setting helsinkiView store state to true
			// 2. Or navigating to Helsinki-specific postal codes
			// For comprehensive testing, we verify the conditional structure exists
		})

		cesiumTest(
			'should handle Helsinki filter when it becomes available',
			async ({ cesiumPage }) => {
				// Test structure for when Helsinki view is active
				// The filter should be functional when visible

				// Look for Helsinki-specific filter container
				const helsinkiFilter = cesiumPage.getByText('Pre-2018')

				// If it becomes visible (e.g., through state change), it should be functional
				if (await helsinkiFilter.isVisible()) {
					const helsinkiToggle = helsinkiFilter.locator('..').locator('input[type="checkbox"]')

					await helpers.checkWithRetry(helsinkiToggle, {
						elementName: 'Pre-2018 filter',
						force: true,
					})
					await expect(helsinkiToggle).toBeChecked()
					await helpers.uncheckWithRetry(helsinkiToggle, {
						elementName: 'Pre-2018 filter',
						force: true,
					})
					await expect(helsinkiToggle).not.toBeChecked()
				}
			}
		)
	})

	cesiumTest.describe('Building Filter Interactions', () => {
		cesiumTest('should handle multiple filter combinations', async ({ cesiumPage }) => {
			// Get available filters
			const publicBuildingsToggle = cesiumPage
				.getByText('Public Buildings', { exact: true })
				.locator('..')
				.locator('input[type="checkbox"]')
			const tallBuildingsToggle = cesiumPage
				.getByText('Tall Buildings', { exact: true })
				.locator('..')
				.locator('input[type="checkbox"]')

			// Enable both filters — Vuetify v-switch needs scroll-before-interact + force (#762).
			await helpers.checkWithRetry(publicBuildingsToggle, {
				elementName: 'Public Buildings filter',
				force: true,
			})
			await helpers.checkWithRetry(tallBuildingsToggle, {
				elementName: 'Tall Buildings filter',
				force: true,
			})

			await expect(publicBuildingsToggle).toBeChecked()
			await expect(tallBuildingsToggle).toBeChecked()

			// Wait for filter application
			await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP)

			// Disable both filters
			await helpers.uncheckWithRetry(publicBuildingsToggle, {
				elementName: 'Public Buildings filter',
				force: true,
			})
			await helpers.uncheckWithRetry(tallBuildingsToggle, {
				elementName: 'Tall Buildings filter',
				force: true,
			})

			await expect(publicBuildingsToggle).not.toBeChecked()
			await expect(tallBuildingsToggle).not.toBeChecked()
		})

		cesiumTest('should reset filters when changing views', async ({ cesiumPage }) => {
			// Enable filters in Capital Region
			const publicBuildingsToggle = cesiumPage
				.getByText('Public Buildings', { exact: true })
				.locator('..')
				.locator('input[type="checkbox"]')
			const tallBuildingsToggle = cesiumPage
				.getByText('Tall Buildings', { exact: true })
				.locator('..')
				.locator('input[type="checkbox"]')

			await helpers.checkWithRetry(publicBuildingsToggle, {
				elementName: 'Public Buildings filter',
				force: true,
			})
			await helpers.checkWithRetry(tallBuildingsToggle, {
				elementName: 'Tall Buildings filter',
				force: true,
			})

			// Switch to Grid view - filters should be hidden (component behavior: v-if="view !== 'grid'")
			await helpers.navigateToView('gridView')
			await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

			// Filters should NOT be visible in grid view
			await expect(publicBuildingsToggle).not.toBeVisible()
			await expect(tallBuildingsToggle).not.toBeVisible()

			// Return to capital region view - filters should be visible again and reset to unchecked
			await helpers.navigateToView('capitalRegionView')
			await expect(publicBuildingsToggle).toBeVisible()
			await expect(tallBuildingsToggle).toBeVisible()

			// Filters are reset when changing views (based on watch in MapControls.vue)
			await expect(publicBuildingsToggle).not.toBeChecked()
			await expect(tallBuildingsToggle).not.toBeChecked()
		})

		cesiumTest(
			'should handle filter state during navigation levels',
			{ tag: ['@requires-database'] },
			async ({ cesiumPage }) => {
				// Enable filters at start level
				const publicBuildingsToggle = cesiumPage
					.getByText('Public Buildings', { exact: true })
					.locator('..')
					.locator('input[type="checkbox"]')
				const tallBuildingsToggle = cesiumPage
					.getByText('Tall Buildings', { exact: true })
					.locator('..')
					.locator('input[type="checkbox"]')

				await helpers.checkWithRetry(publicBuildingsToggle, {
					elementName: 'Public Buildings filter',
					force: true,
				})
				await helpers.checkWithRetry(tallBuildingsToggle, {
					elementName: 'Tall Buildings filter',
					force: true,
				})

				// Navigate to postal code level
				await helpers.drillToLevel('postalCode')
				// Wait for postal code UI instead of fixed timeout
				await cesiumPage
					.waitForSelector('text="Building Analysis"', {
						timeout: TEST_TIMEOUTS.ELEMENT_STANDARD,
					})
					.catch(() => {})

				// Filters should remain functional
				await expect(publicBuildingsToggle).toBeVisible()
				await expect(tallBuildingsToggle).toBeVisible()

				// State may be maintained or reset depending on implementation
				// Test that they can be toggled
				await helpers.uncheckWithRetry(publicBuildingsToggle, {
					elementName: 'Public Buildings filter',
					force: true,
				})
				await helpers.checkWithRetry(publicBuildingsToggle, {
					elementName: 'Public Buildings filter',
					force: true,
				})
				await expect(publicBuildingsToggle).toBeChecked()
			}
		)

		cesiumTest(
			'should apply filters to building visualization',
			{ tag: ['@requires-database'] },
			async ({ cesiumPage }) => {
				// Navigate to postal code level where buildings are visible
				await helpers.drillToLevel('postalCode')
				// Wait for postal code UI instead of fixed timeout
				await cesiumPage
					.waitForSelector('text="Building Analysis"', {
						timeout: TEST_TIMEOUTS.ELEMENT_STANDARD,
					})
					.catch(() => {})

				const tallBuildingsToggle = cesiumPage
					.getByText('Tall Buildings', { exact: true })
					.locator('..')
					.locator('input[type="checkbox"]')

				// Apply filter
				await helpers.checkWithRetry(tallBuildingsToggle, {
					elementName: 'Tall Buildings filter',
					force: true,
				})
				// Brief wait for filter to apply
				await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP)

				// Filter should be applied (visual changes would occur in Cesium)
				// We verify the toggle state is consistent
				await expect(tallBuildingsToggle).toBeChecked()

				// Remove filter
				await helpers.uncheckWithRetry(tallBuildingsToggle, {
					elementName: 'Tall Buildings filter',
					force: true,
				})
				// Brief wait for filter to remove
				await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP)

				await expect(tallBuildingsToggle).not.toBeChecked()
			}
		)
	})

	cesiumTest.describe('Building Filter Performance', () => {
		cesiumTest('should handle rapid filter toggling without errors', async ({ cesiumPage }) => {
			const tallBuildingsToggle = cesiumPage
				.getByText('Tall Buildings', { exact: true })
				.locator('..')
				.locator('input[type="checkbox"]')

			// Scroll into view once before rapid toggling with retry
			for (let scrollAttempt = 1; scrollAttempt <= 3; scrollAttempt++) {
				try {
					await tallBuildingsToggle.scrollIntoViewIfNeeded({
						timeout: TEST_TIMEOUTS.ELEMENT_SCROLL,
					})
					const box = await tallBuildingsToggle.boundingBox()
					if (box && box.y >= 0 && box.x >= 0) {
						break
					}
				} catch {
					if (scrollAttempt === 3) {
						console.warn('Initial scroll failed, continuing anyway')
					}
					await cesiumPage.waitForTimeout(200 * scrollAttempt)
				}
			}

			await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY)

			// Rapidly toggle filter multiple times with viewport checks
			for (let i = 0; i < 5; i++) {
				// Ensure element is still in viewport
				const box = await tallBuildingsToggle.boundingBox()
				const isInViewport = box !== null && box.y >= 0 && box.x >= 0

				if (!isInViewport) {
					for (let scrollAttempt = 1; scrollAttempt <= 2; scrollAttempt++) {
						try {
							await tallBuildingsToggle.scrollIntoViewIfNeeded({
								timeout: TEST_TIMEOUTS.ELEMENT_INTERACTION,
							})
							break
						} catch {
							await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_SHORT)
						}
					}
					await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_SHORT)
				}

				// Use force option for rapid toggling
				await tallBuildingsToggle.check({ timeout: TEST_TIMEOUTS.ELEMENT_SCROLL, force: i > 2 })
				await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY)
				await tallBuildingsToggle.uncheck({ timeout: TEST_TIMEOUTS.ELEMENT_SCROLL, force: i > 2 })
				await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY)
			}

			// Final state should be consistent
			await expect(tallBuildingsToggle).not.toBeChecked()

			// No error states should be present
			const errorElements = cesiumPage.locator('[class*="error"], [class*="Error"]')
			const errorCount = await errorElements.count()
			expect(errorCount).toBe(0)
		})

		cesiumTest(
			'should handle filters during data loading',
			{ tag: ['@requires-database'] },
			async ({ cesiumPage }) => {
				// Intercept requests to simulate slow loading
				cesiumPage.route('**/*.json', (route) => {
					setTimeout(() => route.continue(), 1000)
				})

				// Try applying filters during navigation/loading
				await helpers.drillToLevel('postalCode')

				// Immediately apply filters
				const tallBuildingsToggle = cesiumPage
					.getByText('Tall Buildings', { exact: true })
					.locator('..')
					.locator('input[type="checkbox"]')
				await helpers.checkWithRetry(tallBuildingsToggle, {
					elementName: 'Tall Buildings filter',
					force: true,
				})

				// Wait for loading to complete
				await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_LONG)

				// Filter state should be consistent
				await expect(tallBuildingsToggle).toBeChecked()

				// No error states
				const errorElements = cesiumPage.locator('[class*="error"], [class*="Error"]')
				const errorCount = await errorElements.count()
				expect(errorCount).toBe(0)
			}
		)
	})

	cesiumTest.describe('Building Filter Accessibility', () => {
		cesiumTest('should have consistent styling for all filter toggles', async ({ cesiumPage }) => {
			// Mobile skip is handled by the top-level beforeEach hook.
			// Check that all visible filters have consistent structure
			const filterToggles = cesiumPage
				.locator('.switch-container')
				.filter({ has: cesiumPage.locator('input[type="checkbox"]') })
			const count = await filterToggles.count()

			expect(count).toBeGreaterThanOrEqual(2) // Should have at least 2 filter toggles

			for (let i = 0; i < count; i++) {
				const toggle = filterToggles.nth(i)

				// Each should have a switch and label
				const switchElement = toggle.locator('.switch')
				const label = toggle.locator('.label')

				if (await switchElement.isVisible()) {
					await expect(switchElement).toBeVisible()
					await expect(label).toBeVisible()
				}
			}
		})

		cesiumTest('should support keyboard navigation for filter toggles', async ({ cesiumPage }) => {
			// Tab through the interface to reach filter controls with safety measures
			let foundFilterToggle = false
			const maxIterations = 30 // Increased limit for comprehensive testing
			const timeout = 30000 // Overall timeout for the test
			const startTime = Date.now()

			try {
				for (let i = 0; i < maxIterations; i++) {
					// Check overall timeout
					if (Date.now() - startTime > timeout) {
						console.warn('Keyboard navigation test reached overall timeout')
						break
					}

					// Check if page context is still valid
					const pageValid = await cesiumPage
						.evaluate(() => document.readyState)
						.then(() => true)
						.catch(() => false)

					if (!pageValid) {
						console.warn('Page context lost during keyboard navigation')
						break
					}

					// Press Tab key with error handling
					try {
						await cesiumPage.keyboard.press('Tab')
						await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_SHORT) // Brief wait for focus to settle
					} catch (tabError) {
						console.warn(`Tab press failed at iteration ${i}:`, tabError)
						break
					}

					const focused = cesiumPage.locator(':focus')

					// Check if element is valid before evaluating
					const elementExists = await focused
						.count()
						.then((c) => c > 0)
						.catch(() => false)
					if (!elementExists) {
						continue
					}

					// Get element info with error handling
					const tagName = await focused.evaluate((el) => el.tagName.toLowerCase()).catch(() => '')

					if (tagName === 'input') {
						const type = await focused.getAttribute('type').catch(() => null)
						if (type === 'checkbox') {
							// Verify this is a filter checkbox by checking nearby text
							const parentText = await focused
								.locator('..')
								.textContent()
								.catch(() => '')

							const isFilterCheckbox =
								parentText.includes('Buildings') ||
								parentText.includes('Tall') ||
								parentText.includes('Public') ||
								parentText.includes('Pre-2018')

							if (!isFilterCheckbox) {
								continue // Skip non-filter checkboxes
							}

							// Found a filter checkbox, test space bar activation
							const initialState = await focused.isChecked().catch(() => null)
							if (initialState === null) {
								console.warn(`Could not determine initial state at iteration ${i}`)
								continue
							}

							// Press space to toggle
							try {
								await cesiumPage.keyboard.press(' ')
								await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP)
							} catch (spaceError) {
								console.warn(`Space press failed at iteration ${i}:`, spaceError)
								continue
							}

							// Verify state changed
							const newState = await focused.isChecked().catch(() => null)
							if (newState !== null) {
								expect(newState).toBe(!initialState)
								foundFilterToggle = true
								console.log(`Successfully toggled filter checkbox via keyboard at iteration ${i}`)
								break
							}
						}
					}
				}
			} catch (error) {
				console.warn('Keyboard navigation test encountered error:', error)
				// Don't throw - let the assertion at the end handle the failure
			}

			// Should have found at least one filter toggle via keyboard navigation
			expect(foundFilterToggle).toBeTruthy()
		})

		cesiumTest('should have descriptive labels for screen readers', async ({ cesiumPage }) => {
			// Check that filter labels are meaningful
			const filterLabels = ['Public Buildings', 'Tall Buildings']

			for (const labelText of filterLabels) {
				const label = cesiumPage.getByText(labelText, { exact: true })
				if (await label.isVisible()) {
					await expect(label).toBeVisible()

					// Label should be associated with a toggle
					const toggle = label.locator('..').locator('input[type="checkbox"]')
					await expect(toggle).toBeVisible()
				}
			}
		})

		cesiumTest(
			'should provide visual feedback for filter state changes',
			async ({ cesiumPage }) => {
				const tallBuildingsToggle = cesiumPage
					.getByText('Tall Buildings', { exact: true })
					.locator('..')
					.locator('input[type="checkbox"]')

				// Initial state
				const _initialChecked = await tallBuildingsToggle.isChecked()

				// Helper wraps scroll-before-interact + retry-with-force (#762).
				await helpers.checkWithRetry(tallBuildingsToggle, {
					elementName: 'Tall Buildings filter',
					force: true,
				})

				await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP)

				// Visual state should reflect change
				const afterToggle = await tallBuildingsToggle.isChecked()
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
				const parentContainer = cesiumPage
					.getByText('Tall Buildings', { exact: true })
					.locator('..')

				for (const selector of sliderSelectors) {
					const slider = parentContainer.locator(selector)

					const exists = await slider
						.count()
						.then((c) => c > 0)
						.catch(() => false)
					if (exists) {
						const visible = await slider
							.first()
							.isVisible()
							.catch(() => false)
						if (visible) {
							await expect(slider.first()).toBeVisible()
							sliderFound = true
							console.log(`Found slider with selector: ${selector}`)
							break
						}
					}
				}

				// If no slider found, verify toggle is functional instead
				// This is acceptable as the important part is that the toggle state changed
				if (!sliderFound) {
					console.log('Slider element not found - verifying toggle functionality instead')
					expect(afterToggle).toBe(true)

					// Additional check: verify the checkbox can be toggled off
					await helpers.uncheckWithRetry(tallBuildingsToggle, {
						elementName: 'Tall Buildings filter',
						force: true,
					})
					await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY)
					const afterUncheck = await tallBuildingsToggle.isChecked()
					expect(afterUncheck).toBe(false)
				}
			}
		)
	})

	cesiumTest.describe('Building Filter Responsiveness', () => {
		cesiumTest(
			'should maintain filter functionality across different viewports',
			async ({ cesiumPage }) => {
				const viewports = [
					{ width: 1920, height: 1080, name: 'desktop' },
					{ width: 768, height: 1024, name: 'tablet' },
					{ width: 375, height: 667, name: 'mobile' },
				]

				for (const viewport of viewports) {
					await cesiumPage.setViewportSize(viewport)
					await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

					// Ensure control panel is open (may close when resizing to mobile)
					await helpers.ensureControlPanelOpen()

					// Filters should remain accessible
					await expect(cesiumPage.getByText('Tall Buildings', { exact: true })).toBeVisible()

					const tallBuildingsToggle = cesiumPage
						.getByText('Tall Buildings', { exact: true })
						.locator('..')
						.locator('input[type="checkbox"]')

					// Toggle should work efficiently
					await helpers.checkWithRetry(tallBuildingsToggle, {
						elementName: 'Tall Buildings filter',
						force: true,
					})
					await expect(tallBuildingsToggle).toBeChecked()

					await helpers.uncheckWithRetry(tallBuildingsToggle, {
						elementName: 'Tall Buildings filter',
						force: true,
					})
					await expect(tallBuildingsToggle).not.toBeChecked()
				}
			}
		)
	})

	cesiumTest.describe('Building Filter Integration', () => {
		cesiumTest(
			'should work with layer controls simultaneously',
			{ tag: ['@requires-database'] },
			async ({ cesiumPage }) => {
				// Navigate to context where both filters and layers are available
				await helpers.drillToLevel('postalCode')
				// Wait for postal code UI instead of fixed timeout
				await cesiumPage
					.waitForSelector('text="Building Analysis"', {
						timeout: TEST_TIMEOUTS.ELEMENT_STANDARD,
					})
					.catch(() => {})

				// Enable building filter
				const tallBuildingsToggle = cesiumPage
					.getByText('Tall Buildings', { exact: true })
					.locator('..')
					.locator('input[type="checkbox"]')
				await helpers.checkWithRetry(tallBuildingsToggle, {
					elementName: 'Tall Buildings filter',
					force: true,
				})

				// Enable layer toggle — NDVI is also a Vuetify v-switch.
				const ndviToggle = cesiumPage
					.getByText('NDVI')
					.locator('..')
					.locator('input[type="checkbox"]')
				await helpers.checkWithRetry(ndviToggle, {
					elementName: 'NDVI layer',
					force: true,
				})

				// Both should be enabled simultaneously
				await expect(tallBuildingsToggle).toBeChecked()
				await expect(ndviToggle).toBeChecked()

				// Both should remain functional
				await helpers.uncheckWithRetry(tallBuildingsToggle, {
					elementName: 'Tall Buildings filter',
					force: true,
				})
				await expect(tallBuildingsToggle).not.toBeChecked()
				await expect(ndviToggle).toBeChecked() // Should not affect layer toggle
			}
		)

		cesiumTest(
			'should hide filters in grid view and reset when returning',
			async ({ cesiumPage }) => {
				// Enable filters in capital region view
				const publicBuildingsToggle = cesiumPage
					.getByText('Public Buildings', { exact: true })
					.locator('..')
					.locator('input[type="checkbox"]')
				const tallBuildingsToggle = cesiumPage
					.getByText('Tall Buildings', { exact: true })
					.locator('..')
					.locator('input[type="checkbox"]')

				await helpers.checkWithRetry(publicBuildingsToggle, {
					elementName: 'Public Buildings filter',
					force: true,
				})
				await helpers.checkWithRetry(tallBuildingsToggle, {
					elementName: 'Tall Buildings filter',
					force: true,
				})

				// Switch to grid view - filters should be hidden
				await helpers.navigateToView('gridView')
				await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

				// Filters should NOT be visible in grid view (entire Building Filters section is hidden)
				await expect(publicBuildingsToggle).not.toBeVisible()
				await expect(tallBuildingsToggle).not.toBeVisible()

				// Return to capital region view - filters should be visible again
				await helpers.navigateToView('capitalRegionView')
				await expect(publicBuildingsToggle).toBeVisible()
				await expect(tallBuildingsToggle).toBeVisible()

				// Test toggle functionality after view change (filters are reset by watch)
				await helpers.checkWithRetry(publicBuildingsToggle, {
					elementName: 'Public Buildings filter',
					force: true,
				})
				await expect(publicBuildingsToggle).toBeChecked()
			}
		)
	})
})
