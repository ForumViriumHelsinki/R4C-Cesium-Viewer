/**
 * Sidebar Panels Accessibility Tests
 *
 * Tests conditional panel/section visibility and interactions for the analysis sidebar:
 * - Universal sections: Background Maps, Search & Navigate, Map Controls
 * - View-specific: Grid Options (grid view), Climate Adaptation (grid + heat_index)
 * - Level-specific analysis tools: Heat Distribution, Building Analysis, Land Cover, etc.
 * - Properties section: Area Properties (postal code), Building Properties (building)
 * - NDVI toggle (visible in all views)
 */

import { expect } from '@playwright/test'
import { cesiumDescribe, cesiumTest } from '../../fixtures/cesium-fixture'
import AccessibilityTestHelpers from '../helpers/test-helpers'

cesiumDescribe('Sidebar Panels Accessibility', () => {
	cesiumTest.use({ tag: ['@accessibility', '@e2e'] })
	let helpers: AccessibilityTestHelpers

	cesiumTest.beforeEach(async ({ cesiumPage }) => {
		helpers = new AccessibilityTestHelpers(cesiumPage)
		// Cesium is already initialized by the fixture
	})

	cesiumTest.describe('Universal Sidebar Sections', () => {
		cesiumTest('should display Background Maps section in all contexts', async ({ cesiumPage }) => {
			// Background Maps is a permanent section heading with BackgroundMapBrowser below
			await expect(cesiumPage.getByText('Background Maps')).toBeVisible()
		})

		cesiumTest(
			'should display Search & Navigate section in all contexts',
			async ({ cesiumPage }) => {
				// Search & Navigate is a permanent section with UnifiedSearch below
				await expect(cesiumPage.getByText('Search & Navigate')).toBeVisible()

				// Search input should be visible directly (no expansion needed)
				const searchInput = cesiumPage.getByRole('textbox', { name: /search/i })
				await expect(searchInput.first()).toBeVisible()
			}
		)

		cesiumTest('should display Map Controls section in all contexts', async ({ cesiumPage }) => {
			await expect(cesiumPage.getByText('Map Controls')).toBeVisible()
		})
	})

	cesiumTest.describe('View-Specific Panels', () => {
		cesiumTest('should show Grid Options button only in Grid view', async ({ cesiumPage }) => {
			// Not visible in Capital Region view
			await expect(cesiumPage.getByText('Grid Options')).toBeHidden()

			// Switch to Grid view
			await helpers.navigateToView('gridView')

			// Now visible as a button
			await expect(cesiumPage.getByText('Grid Options')).toBeVisible()
		})

		cesiumTest(
			'should show Climate Adaptation only in Grid view with heat index',
			async ({ cesiumPage }) => {
				// Not visible in Capital Region view
				await expect(cesiumPage.getByText('Climate Adaptation')).toBeHidden()

				// Switch to Grid view — Climate Adaptation is visible because
				// statsIndex defaults to 'heat_index' and coolingOptimizer flag defaults to true
				await helpers.navigateToView('gridView')

				// Climate Adaptation should now be visible as an expansion panel
				await expect(cesiumPage.getByText('Climate Adaptation')).toBeVisible()
			}
		)

		cesiumTest('should show NDVI toggle in all views', async ({ cesiumPage }) => {
			// NDVI toggle visible in Capital Region view
			await expect(cesiumPage.getByText('NDVI', { exact: true })).toBeVisible()

			// Switch to Grid view — NDVI toggle should still be visible
			await helpers.navigateToView('gridView')
			await expect(cesiumPage.getByText('NDVI', { exact: true })).toBeVisible()
		})
	})

	cesiumTest.describe('Level-Specific Analysis Tools', () => {
		cesiumTest('should show analysis tool buttons at postal code level', async ({ cesiumPage }) => {
			// Not visible at start level
			await expect(cesiumPage.getByText('Building Analysis')).toBeHidden()

			// Navigate to postal code level
			await helpers.drillToLevel('postalCode')

			// Building Analysis button should appear at postal code level
			await expect(cesiumPage.getByText('Building Analysis')).toBeVisible()
		})

		cesiumTest('should show Area Properties at postal code level', async ({ cesiumPage }) => {
			// Properties section not visible at start level
			await expect(cesiumPage.getByText('Area Properties')).toBeHidden()

			// Navigate to postal code level
			await helpers.drillToLevel('postalCode')

			// Area Properties section heading should appear
			const areaProps = cesiumPage.getByText('Area Properties')
			await expect(areaProps).toBeVisible()
		})

		// Building-level navigation requires clicking a 3D building entity in the Cesium viewer,
		// which is not available in mocked environments. See navigation-levels.spec.ts for tests
		// that cover this scenario with longer timeouts.
		cesiumTest.skip('should show Building Properties at building level', async ({ cesiumPage }) => {
			await helpers.drillToLevel('building')
			const buildingProps = cesiumPage.getByText('Building Properties')
			await expect(buildingProps).toBeVisible()
		})
	})

	cesiumTest.describe('Panel State Across View Switches', () => {
		cesiumTest('should maintain sidebar sections during view switches', async ({ cesiumPage }) => {
			// Verify universal sections visible
			await expect(cesiumPage.getByText('Background Maps')).toBeVisible()
			await expect(cesiumPage.getByText('Search & Navigate')).toBeVisible()

			// Switch view
			await helpers.navigateToView('gridView')

			// Universal sections should remain visible
			await expect(cesiumPage.getByText('Background Maps')).toBeVisible()
			await expect(cesiumPage.getByText('Search & Navigate')).toBeVisible()

			// Switch back
			await helpers.navigateToView('capitalRegionView')

			// Still visible
			await expect(cesiumPage.getByText('Background Maps')).toBeVisible()
			await expect(cesiumPage.getByText('Search & Navigate')).toBeVisible()
		})
	})

	cesiumTest.describe('Accessibility Compliance', () => {
		cesiumTest('should have proper navigation landmark', async ({ cesiumPage }) => {
			// The sidebar should have role="navigation"
			const sidebar = cesiumPage.locator('[role="navigation"]')
			await expect(sidebar).toBeVisible()

			// Should have an aria-label
			const ariaLabel = await sidebar.getAttribute('aria-label')
			expect(ariaLabel).toBeTruthy()
		})

		cesiumTest('should announce panel state changes to screen readers', async ({ cesiumPage }) => {
			// Verify ARIA live regions exist
			const liveRegions = cesiumPage.locator('[aria-live]')
			const count = await liveRegions.count()
			expect(count).toBeGreaterThan(0)
		})
	})
})
