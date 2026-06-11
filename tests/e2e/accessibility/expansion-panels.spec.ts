/**
 * Sidebar Panels Accessibility Tests
 *
 * Tests conditional panel/section visibility and interactions for the tabbed
 * analysis sidebar (Search / Layers / Analysis / Details):
 * - Universal: Background Maps and Data Layers (Layers tab), Search tab
 * - View-specific (Analysis tab): Grid Options (grid view), Climate Adaptation
 *   (grid + heat_index)
 * - Level-specific (Analysis tab): Building Analysis etc.
 * - Properties (Details tab): Area Properties (postal code), Building
 *   Properties (building)
 * - NDVI toggle (Layers tab, visible in all views)
 */

import { expect } from '@playwright/test'
import { cesiumDescribe, cesiumTest } from '../../fixtures/cesium-fixture'
import GridAwareTestHelpers from '../helpers/grid-aware-helpers'

cesiumDescribe('Sidebar Panels Accessibility', () => {
	cesiumTest.use({ tag: ['@accessibility', '@e2e'] })
	let helpers: GridAwareTestHelpers

	cesiumTest.beforeEach(async ({ cesiumPage }) => {
		helpers = new GridAwareTestHelpers(cesiumPage)
		// Cesium is already initialized by the fixture
	})

	cesiumTest.describe('Universal Sidebar Sections', () => {
		cesiumTest('should display Background Maps section in all contexts', async ({ cesiumPage }) => {
			// Background Maps is a permanent section heading with BackgroundMapBrowser below
			await expect(cesiumPage.getByText('Background Maps')).toBeVisible()
		})

		cesiumTest('should provide search via the Search tab in all contexts', async ({ cesiumPage }) => {
			// The sidebar was refactored into tabs (Search / Layers / Analysis /
			// Details); the old "Search & Navigate" section heading no longer
			// exists. Search lives in the dedicated Search tab (#897).
			const searchTab = cesiumPage.getByRole('tab', { name: 'Search' })
			await expect(searchTab).toBeVisible()
			await searchTab.click()

			// Search input should be visible once the Search tab is active
			const searchInput = cesiumPage.getByRole('textbox', { name: /search/i })
			await expect(searchInput.first()).toBeVisible()
		})

		cesiumTest('should display map layer controls in all contexts', async ({ cesiumPage }) => {
			// The old "Map Controls" heading was removed in the tabbed-sidebar
			// refactor; MapControls renders inside the Layers tab under the
			// "Data Layers" heading (#897).
			await expect(cesiumPage.getByRole('heading', { name: 'Data Layers' })).toBeVisible()
		})
	})

	cesiumTest.describe('View-Specific Panels', () => {
		cesiumTest('should show Grid Options button only in Grid view', async ({ cesiumPage }) => {
			// Grid Options renders in the Analysis tab (tabbed sidebar refactor);
			// the view-mode toggle lives in the Layers tab, so switch back before
			// navigating between views.
			const analysisTab = cesiumPage.getByRole('tab', { name: 'Analysis' })
			const layersTab = cesiumPage.getByRole('tab', { name: 'Layers' })

			// Not visible in Capital Region view
			await analysisTab.click()
			await expect(cesiumPage.getByText('Grid Options')).toBeHidden()

			// Switch to Grid view
			await layersTab.click()
			await helpers.navigateToView('gridView')

			// Now visible as a button in the Analysis tab
			await analysisTab.click()
			await expect(cesiumPage.getByText('Grid Options')).toBeVisible()
		})

		cesiumTest(
			'should show Climate Adaptation only in Grid view with heat index',
			async ({ cesiumPage }) => {
				// Climate Adaptation renders in the Analysis tab (tabbed sidebar refactor)
				const analysisTab = cesiumPage.getByRole('tab', { name: 'Analysis' })
				const layersTab = cesiumPage.getByRole('tab', { name: 'Layers' })

				// Not visible in Capital Region view
				await analysisTab.click()
				await expect(cesiumPage.getByText('Climate Adaptation')).toBeHidden()

				// Switch to Grid view — Climate Adaptation is visible because
				// statsIndex defaults to 'heat_index' and coolingOptimizer flag defaults to true
				await layersTab.click()
				await helpers.navigateToView('gridView')

				// Climate Adaptation should now be visible as an expansion panel
				await analysisTab.click()
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
			// Analysis buttons render in the Analysis tab (tabbed sidebar refactor)
			const analysisTab = cesiumPage.getByRole('tab', { name: 'Analysis' })
			await analysisTab.click()

			// Not visible at start level
			await expect(cesiumPage.getByText('Building Analysis')).toBeHidden()

			// Navigate to postal code level
			await helpers.drillToLevel('postalCode')

			// Building Analysis button should appear at postal code level
			await expect(cesiumPage.getByText('Building Analysis')).toBeVisible()
		})

		cesiumTest('should show Area Properties at postal code level', async ({ cesiumPage }) => {
			// Properties render in the Details tab (tabbed sidebar refactor)
			const detailsTab = cesiumPage.getByRole('tab', { name: 'Details' })
			await detailsTab.click()

			// Properties section not visible at start level
			await expect(cesiumPage.getByText('Area Properties')).toBeHidden()

			// Navigate to postal code level
			await helpers.drillToLevel('postalCode')

			// Area Properties section heading should appear
			const areaProps = cesiumPage.getByText('Area Properties')
			await expect(areaProps).toBeVisible()
		})

		// Building-level navigation uses direct Pinia store manipulation because
		// clicking a 3D building entity is unreliable in mocked/headless environments
		// where WebGL picking cannot be guaranteed.
		cesiumTest('should show Building Properties at building level', async ({ cesiumPage }) => {
			await helpers.drillToLevel('building', undefined, { method: 'store' })

			// Properties render in the Details tab (tabbed sidebar refactor)
			const detailsTab = cesiumPage.getByRole('tab', { name: 'Details' })
			await detailsTab.click()

			const buildingProps = cesiumPage.getByText('Building Properties')
			await expect(buildingProps).toBeVisible()
		})
	})

	cesiumTest.describe('Panel State Across View Switches', () => {
		cesiumTest('should maintain sidebar sections during view switches', async ({ cesiumPage }) => {
			// Verify universal sections visible (Search tab replaces the removed
			// "Search & Navigate" heading — see Universal Sidebar Sections above)
			await expect(cesiumPage.getByText('Background Maps')).toBeVisible()
			await expect(cesiumPage.getByRole('tab', { name: 'Search' })).toBeVisible()

			// Switch view
			await helpers.navigateToView('gridView')

			// Universal sections should remain visible
			await expect(cesiumPage.getByText('Background Maps')).toBeVisible()
			await expect(cesiumPage.getByRole('tab', { name: 'Search' })).toBeVisible()

			// Switch back
			await helpers.navigateToView('capitalRegionView')

			// Still visible
			await expect(cesiumPage.getByText('Background Maps')).toBeVisible()
			await expect(cesiumPage.getByRole('tab', { name: 'Search' })).toBeVisible()
		})
	})

	cesiumTest.describe('Accessibility Compliance', () => {
		cesiumTest('should have proper navigation landmark', async ({ cesiumPage }) => {
			// The sidebar should have role="navigation". The page renders more
			// than one navigation landmark (sidebar + analysis panel), so scope
			// to the first to keep the locator strict-mode safe.
			const sidebar = cesiumPage.locator('[role="navigation"]').first()
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
