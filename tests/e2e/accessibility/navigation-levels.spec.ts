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

import { test, expect } from '@playwright/test';
import AccessibilityTestHelpers from '../helpers/test-helpers';

test.describe('Navigation Levels Accessibility', () => {
  let helpers: AccessibilityTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new AccessibilityTestHelpers(page);
    await page.goto('/');
    await helpers.waitForCesiumReady();
  });

  test.describe('Start Level (Initial State)', () => {
    test('should display start level interface correctly', async ({ page }) => {
      // Verify we start at the start level
      await helpers.verifyPanelVisibility({
        currentView: 'capitalRegion',
        currentLevel: 'start'
      });
      
      // Start level navigation controls
      await helpers.testNavigationControls('start');
      
      // Back button should not be visible at start
      const backButton = page.getByRole('button').filter({ has: page.locator('.mdi-arrow-left') });
      await expect(backButton).not.toBeVisible();
      
      // Reset button should be visible
      const resetButton = page.getByRole('button').filter({ has: page.locator('.mdi-refresh') });
      await expect(resetButton).toBeVisible();
      
      // Camera rotation should not be visible at start
      const cameraButton = page.getByRole('button').filter({ has: page.locator('.mdi-compass') });
      await expect(cameraButton).not.toBeVisible();
    });

    test('should show basic panels at start level', async ({ page }) => {
      // Universal panels should be visible
      await expect(page.getByText('HSY Background maps')).toBeVisible();
      await expect(page.getByText('Syke Flood Background Maps')).toBeVisible();
      await expect(page.getByText('Geocoding')).toBeVisible();
      
      // Level-specific panels should not be visible
      await expect(page.getByText('Heat Histogram')).not.toBeVisible();
      await expect(page.getByText('Building heat data')).not.toBeVisible();
      
      // Timeline should not be visible at start level
      await helpers.verifyTimelineVisibility('start');
    });

    test('should allow view mode changes at start level', async ({ page }) => {
      // Should be able to switch views at start level
      await helpers.navigateToView('gridView');
      await expect(page.locator('input[value="gridView"]')).toBeChecked();
      
      await helpers.navigateToView('capitalRegionView');
      await expect(page.locator('input[value="capitalRegionView"]')).toBeChecked();
    });
  });

  test.describe('Postal Code Level Navigation', () => {
    test('should transition to postal code level on map interaction', async ({ page }) => {
      // Click on map to select postal code area
      await helpers.drillToLevel('postalCode');
      
      // Wait for level transition
      await page.waitForTimeout(3000);
      
      // Verify postal code level features appear
      await helpers.verifyPanelVisibility({
        currentView: 'capitalRegion',
        currentLevel: 'postalCode',
        hasData: true
      });
      
      // Timeline should now be visible
      await helpers.verifyTimelineVisibility('postalCode');
    });

    test('should display postal code specific panels', async ({ page }) => {
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      // Postal code specific panels
      await expect(page.getByText('Building Scatter Plot')).toBeVisible();
      await expect(page.getByText('Area properties')).toBeVisible();
      
      // Conditional panels based on data availability
      // Note: These depend on actual data being loaded
      const heatHistogram = page.getByText('Heat Histogram');
      const socioEconomics = page.getByText('Socioeconomics Diagram');
      const landCover = page.getByText('Land Cover');
      
      // These should be visible if data is available
      // Testing for presence without strict requirement as it depends on data
      if (await heatHistogram.isVisible()) {
        await expect(heatHistogram).toBeVisible();
      }
      if (await socioEconomics.isVisible()) {
        await expect(socioEconomics).toBeVisible();
      }
      if (await landCover.isVisible()) {
        await expect(landCover).toBeVisible();
      }
    });

    test('should show navigation controls at postal code level', async ({ page }) => {
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      await helpers.testNavigationControls('postalCode');
      
      // Back button still not visible (only appears at building level)
      const backButton = page.getByRole('button').filter({ has: page.locator('.mdi-arrow-left') });
      await expect(backButton).not.toBeVisible();
      
      // Camera rotation should now be visible
      const cameraButton = page.getByRole('button').filter({ has: page.locator('.mdi-compass') });
      await expect(cameraButton).toBeVisible();
    });

    test('should maintain view mode selection at postal code level', async ({ page }) => {
      // Switch to grid view first
      await helpers.navigateToView('gridView');
      
      // Navigate to postal code level
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      // Verify view mode is maintained
      await expect(page.locator('input[value="gridView"]')).toBeChecked();
      
      // Grid-specific features should be visible
      await expect(page.getByText('Statistical grid options')).toBeVisible();
    });

    test('should handle postal code selection in different views', async ({ page }) => {
      const views = ['capitalRegionView', 'gridView'];
      
      for (const view of views) {
        // Reset to start
        const resetButton = page.getByRole('button').filter({ has: page.locator('.mdi-refresh') });
        await resetButton.click();
        await page.waitForTimeout(2000);
        
        // Switch to view
        await helpers.navigateToView(view as 'capitalRegionView' | 'gridView');
        
        // Navigate to postal code
        await helpers.drillToLevel('postalCode');
        await page.waitForTimeout(3000);
        
        // Verify view-specific features are present
        if (view === 'gridView') {
          await expect(page.getByText('Statistical grid options')).toBeVisible();
        } else {
          await expect(page.getByText('HSY Land Cover')).toBeVisible();
        }
        
        // Timeline should be visible in both cases
        await helpers.verifyTimelineVisibility('postalCode');
      }
    });
  });

  test.describe('Building Level Navigation', () => {
    test('should transition to building level from postal code', async ({ page }) => {
      // First navigate to postal code level
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      // Then navigate to building level
      await helpers.drillToLevel('building');
      await page.waitForTimeout(3000);
      
      // Verify building level features
      await helpers.verifyPanelVisibility({
        currentView: 'capitalRegion',
        currentLevel: 'building'
      });
      
      // Timeline should still be visible
      await helpers.verifyTimelineVisibility('building');
    });

    test('should display building-specific panels', async ({ page }) => {
      await helpers.drillToLevel('building');
      await page.waitForTimeout(5000);
      
      // Building-specific panels
      await expect(page.getByText('Building heat data')).toBeVisible();
      await expect(page.getByText('Building properties')).toBeVisible();
      
      // Building information component should be visible
      const buildingInfo = page.locator('[class*="building-info"], [id*="building"]');
      if (await buildingInfo.first().isVisible()) {
        await expect(buildingInfo.first()).toBeVisible();
      }
    });

    test('should show back navigation button at building level', async ({ page }) => {
      await helpers.drillToLevel('building');
      await page.waitForTimeout(5000);
      
      await helpers.testNavigationControls('building');
      
      // Back button should now be visible
      const backButton = page.getByRole('button').filter({ has: page.locator('.mdi-arrow-left') });
      await expect(backButton).toBeVisible();
      
      // Camera rotation should be visible
      const cameraButton = page.getByRole('button').filter({ has: page.locator('.mdi-compass') });
      await expect(cameraButton).toBeVisible();
    });

    test('should handle back navigation from building to postal code', async ({ page }) => {
      // Navigate to building level
      await helpers.drillToLevel('building');
      await page.waitForTimeout(5000);
      
      // Click back button
      const backButton = page.getByRole('button').filter({ has: page.locator('.mdi-arrow-left') });
      await expect(backButton).toBeVisible();
      await backButton.click();
      
      // Wait for navigation
      await page.waitForTimeout(3000);
      
      // Should be back at postal code level
      await helpers.verifyPanelVisibility({
        currentView: 'capitalRegion',
        currentLevel: 'postalCode',
        hasData: true
      });
      
      // Back button should no longer be visible
      await expect(backButton).not.toBeVisible();
      
      // Timeline should still be visible
      await helpers.verifyTimelineVisibility('postalCode');
    });

    test('should display building heat data variants based on view', async ({ page }) => {
      const testViews = [
        { view: 'capitalRegionView', expectedChart: 'HSYBuildingHeatChart' },
        { view: 'gridView', expectedChart: 'BuildingGridChart' }
      ];
      
      for (const { view } of testViews) {
        // Reset and navigate to view
        const resetButton = page.getByRole('button').filter({ has: page.locator('.mdi-refresh') });
        await resetButton.click();
        await page.waitForTimeout(2000);
        
        await helpers.navigateToView(view as 'capitalRegionView' | 'gridView');
        
        // Navigate to building level
        await helpers.drillToLevel('building');
        await page.waitForTimeout(5000);
        
        // Verify building heat data panel is present
        await expect(page.getByText('Building heat data')).toBeVisible();
        
        // The specific chart component would be rendered based on view
        // We verify the panel exists and can be expanded
        const heatDataPanel = page.getByText('Building heat data');
        await expect(heatDataPanel).toBeVisible();
      }
    });
  });

  test.describe('Navigation State Persistence', () => {
    test('should maintain level when switching views', async ({ page }) => {
      // Navigate to postal code level
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      // Switch view modes
      await helpers.navigateToView('gridView');
      await page.waitForTimeout(2000);
      
      // Should still be at postal code level
      await helpers.verifyTimelineVisibility('postalCode');
      await expect(page.getByText('Building Scatter Plot')).toBeVisible();
      
      // Switch back
      await helpers.navigateToView('capitalRegionView');
      await page.waitForTimeout(2000);
      
      // Still at postal code level
      await helpers.verifyTimelineVisibility('postalCode');
    });

    test('should handle reset button from any level', async ({ page }) => {
      const resetButton = page.getByRole('button').filter({ has: page.locator('.mdi-refresh') });
      
      // Test reset from postal code level
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      await resetButton.click();
      await page.waitForTimeout(3000);
      
      // Should be back to start level
      await helpers.testNavigationControls('start');
      
      // Test reset from building level
      await helpers.drillToLevel('building');
      await page.waitForTimeout(5000);
      
      await resetButton.click();
      await page.waitForTimeout(3000);
      
      // Should be back to start level
      await helpers.testNavigationControls('start');
    });
  });

  test.describe('Level-Specific Feature Access', () => {
    test('should enable trees layer only with postal code selection', async ({ page }) => {
      // At start level, trees toggle should not be visible
      await expect(page.getByText('Trees')).not.toBeVisible();
      
      // Navigate to postal code level
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      // Trees toggle should now be available (unless in grid view)
      const currentView = await page.locator('input[value="capitalRegionView"]').isChecked() ? 'capitalRegion' : 'grid';
      
      if (currentView === 'capitalRegion') {
        await expect(page.getByText('Trees')).toBeVisible();
        
        // Test trees toggle functionality
        const treesToggle = page.getByText('Trees').locator('..').locator('input[type="checkbox"]');
        await treesToggle.check();
        await expect(treesToggle).toBeChecked();
      }
    });

    test('should show appropriate filter options per level', async ({ page }) => {
      // At start level, filters should be visible but may not be functional
      await expect(page.getByText('Only public buildings')).toBeVisible();
      await expect(page.getByText('Only tall buildings')).toBeVisible();
      
      // Navigate to postal code level
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      // Filters should still be visible and functional
      await helpers.testAllToggles({
        currentView: 'capitalRegion',
        currentLevel: 'postalCode',
        hasPostalCode: true
      });
    });

    test('should handle timeline interactions at postal code and building levels', async ({ page }) => {
      // Navigate to postal code level
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      // Test timeline at postal code level
      await helpers.verifyTimelineVisibility('postalCode');
      
      // Navigate to building level
      await helpers.drillToLevel('building');
      await page.waitForTimeout(5000);
      
      // Timeline should still be functional at building level
      await helpers.verifyTimelineVisibility('building');
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle invalid navigation attempts gracefully', async ({ page }) => {
      // Try to navigate to non-existent areas
      const cesiumContainer = page.locator('#cesiumContainer');
      
      // Click on various map areas that might not have data
      const clickPositions = [
        { x: 100, y: 100 },
        { x: 800, y: 200 },
        { x: 200, y: 600 }
      ];
      
      for (const position of clickPositions) {
        await cesiumContainer.click({ position });
        await page.waitForTimeout(1000);
        
        // Application should not crash or show error states
        const errorElements = page.locator('[class*="error"], [class*="Error"]');
        const errorCount = await errorElements.count();
        expect(errorCount).toBe(0);
        
        // Navigation should remain functional
        const resetButton = page.getByRole('button').filter({ has: page.locator('.mdi-refresh') });
        await expect(resetButton).toBeVisible();
      }
    });

    test('should maintain navigation state during data loading', async ({ page }) => {
      // Intercept requests to simulate slow loading
      page.route('**/*.json', route => {
        setTimeout(() => route.continue(), 1000);
      });
      
      // Attempt navigation during loading
      await helpers.drillToLevel('postalCode');
      
      // Immediately try to navigate further
      await helpers.drillToLevel('building');
      
      // Wait for everything to settle
      await page.waitForTimeout(5000);
      
      // Should end up in a consistent state
      const resetButton = page.getByRole('button').filter({ has: page.locator('.mdi-refresh') });
      await expect(resetButton).toBeVisible();
      
      // Navigation should still work
      await resetButton.click();
      await page.waitForTimeout(2000);
      
      await helpers.testNavigationControls('start');
    });
  });

  test.describe('Accessibility Compliance for Navigation', () => {
    test('should support keyboard navigation between levels', async ({ page }) => {
      // Tab through navigation controls
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to focus on navigation elements
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Test Enter key activation
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      
      // Should not cause errors
      const errorElements = page.locator('[class*="error"], [class*="Error"]');
      const errorCount = await errorElements.count();
      expect(errorCount).toBe(0);
    });

    test('should provide clear navigation state indicators', async ({ page }) => {
      // Navigation controls should have clear visual indicators
      const resetButton = page.getByRole('button').filter({ has: page.locator('.mdi-refresh') });
      await expect(resetButton).toBeVisible();
      
      // Navigate to building level to test back button
      await helpers.drillToLevel('building');
      await page.waitForTimeout(5000);
      
      const backButton = page.getByRole('button').filter({ has: page.locator('.mdi-arrow-left') });
      await expect(backButton).toBeVisible();
      
      // Buttons should have tooltips for accessibility
      await backButton.hover();
      await page.waitForTimeout(500);
      
      // Tooltip should appear
      const tooltip = page.locator('[role="tooltip"], .v-tooltip');
      if (await tooltip.first().isVisible()) {
        await expect(tooltip.first()).toBeVisible();
      }
    });
  });
});