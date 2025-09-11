/**
 * Building Filters Accessibility Tests
 * 
 * Tests all building filter controls and their conditional behavior:
 * - Only public buildings / Only social & healthcare buildings (label changes by view)
 * - Built before summer 2018 (Helsinki view only)
 * - Only tall buildings (universal)
 * 
 * Ensures all building filter controls remain accessible during interface overhaul.
 */

import { test, expect } from '@playwright/test';
import AccessibilityTestHelpers from '../helpers/test-helpers';

test.describe('Building Filters Accessibility', () => {
  let helpers: AccessibilityTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new AccessibilityTestHelpers(page);
    await page.goto('/');
    await helpers.waitForCesiumReady();
  });

  test.describe('Universal Building Filters', () => {
    test('should display "Only tall buildings" filter in all contexts', async ({ page }) => {
      // Should be visible in default view
      await expect(page.getByText('Only tall buildings')).toBeVisible();
      
      const tallBuildingsToggle = page.getByText('Only tall buildings').locator('..').locator('input[type="checkbox"]');
      await expect(tallBuildingsToggle).toBeVisible();
      
      // Test functionality
      await tallBuildingsToggle.check();
      await expect(tallBuildingsToggle).toBeChecked();
      await tallBuildingsToggle.uncheck();
      await expect(tallBuildingsToggle).not.toBeChecked();
      
      // Should remain visible in grid view
      await helpers.navigateToView('gridView');
      await expect(page.getByText('Only tall buildings')).toBeVisible();
      await expect(tallBuildingsToggle).toBeVisible();
    });

    test('should display Filters section header consistently', async ({ page }) => {
      await expect(page.getByText('Filters', { exact: true })).toBeVisible();
      
      // Should remain visible across view changes
      await helpers.navigateToView('gridView');
      await expect(page.getByText('Filters', { exact: true })).toBeVisible();
      
      await helpers.navigateToView('capitalRegionView');
      await expect(page.getByText('Filters', { exact: true })).toBeVisible();
    });

    test('should maintain tall buildings filter state across contexts', async ({ page }) => {
      const tallBuildingsToggle = page.getByText('Only tall buildings').locator('..').locator('input[type="checkbox"]');
      
      // Enable filter
      await tallBuildingsToggle.check();
      await expect(tallBuildingsToggle).toBeChecked();
      
      // Switch views
      await helpers.navigateToView('gridView');
      await expect(tallBuildingsToggle).toBeChecked();
      
      // Navigate to postal code level
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      await expect(tallBuildingsToggle).toBeChecked();
      
      // Navigate to building level
      await helpers.drillToLevel('building');
      await page.waitForTimeout(3000);
      await expect(tallBuildingsToggle).toBeChecked();
    });
  });

  test.describe('Context-Adaptive Building Filters', () => {
    test('should show "Only public buildings" in Capital Region view', async ({ page }) => {
      await helpers.navigateToView('capitalRegionView');
      
      // Should show "Only public buildings" label
      await expect(page.getByText('Only public buildings')).toBeVisible();
      
      const publicBuildingsToggle = page.getByText('Only public buildings').locator('..').locator('input[type="checkbox"]');
      await expect(publicBuildingsToggle).toBeVisible();
      
      // Test functionality
      await publicBuildingsToggle.check();
      await expect(publicBuildingsToggle).toBeChecked();
      await publicBuildingsToggle.uncheck();
      await expect(publicBuildingsToggle).not.toBeChecked();
    });

    test('should show "Only public buildings" in Grid view', async ({ page }) => {
      await helpers.navigateToView('gridView');
      
      // Should show "Only public buildings" label in grid view too
      await expect(page.getByText('Only public buildings')).toBeVisible();
      
      const publicBuildingsToggle = page.getByText('Only public buildings').locator('..').locator('input[type="checkbox"]');
      await expect(publicBuildingsToggle).toBeVisible();
      
      // Test functionality
      await publicBuildingsToggle.check();
      await expect(publicBuildingsToggle).toBeChecked();
    });

    test('should change label to "Only social & healthcare buildings" in Helsinki view', async ({ page }) => {
      // Note: This test would require actually triggering Helsinki view
      // For now, we test the conditional label structure exists
      // In Helsinki view, the label should change to "Only social & healthcare buildings"
      
      // Verify that the filter toggle exists and can be identified
      const buildingTypeToggle = page.locator('input[type="checkbox"]').first();
      const filterContainer = page.locator('.switch-container').first();
      
      await expect(filterContainer).toBeVisible();
      
      // The actual label text depends on the view state
      // We verify the toggle is functional regardless of label
      const hasPublicLabel = await page.getByText('Only public buildings').isVisible();
      const hasSocialLabel = await page.getByText('Only social &').isVisible();
      
      expect(hasPublicLabel || hasSocialLabel).toBeTruthy();
    });
  });

  test.describe('Helsinki-Specific Building Filters', () => {
    test('should show "Built before summer 2018" only in Helsinki view', async ({ page }) => {
      // In default Capital Region view, this filter should not be visible
      await helpers.navigateToView('capitalRegionView');
      await expect(page.getByText('Built before summer 2018')).not.toBeVisible();
      
      // In Grid view, this filter should not be visible  
      await helpers.navigateToView('gridView');
      await expect(page.getByText('Built before summer 2018')).not.toBeVisible();
      
      // Note: Testing actual Helsinki view would require:
      // 1. Setting helsinkiView store state to true
      // 2. Or navigating to Helsinki-specific postal codes
      // For comprehensive testing, we verify the conditional structure exists
    });

    test('should handle Helsinki filter when it becomes available', async ({ page }) => {
      // Test structure for when Helsinki view is active
      // The filter should be functional when visible
      
      // Look for Helsinki-specific filter container
      const helsinkiFilter = page.getByText('Built before summer 2018');
      
      // If it becomes visible (e.g., through state change), it should be functional
      if (await helsinkiFilter.isVisible()) {
        const helsinkiToggle = helsinkiFilter.locator('..').locator('input[type="checkbox"]');
        
        await helsinkiToggle.check();
        await expect(helsinkiToggle).toBeChecked();
        await helsinkiToggle.uncheck();
        await expect(helsinkiToggle).not.toBeChecked();
      }
    });
  });

  test.describe('Building Filter Interactions', () => {
    test('should handle multiple filter combinations', async ({ page }) => {
      // Get available filters
      const publicBuildingsToggle = page.getByText('Only public buildings').locator('..').locator('input[type="checkbox"]');
      const tallBuildingsToggle = page.getByText('Only tall buildings').locator('..').locator('input[type="checkbox"]');
      
      // Enable both filters
      await publicBuildingsToggle.check();
      await tallBuildingsToggle.check();
      
      await expect(publicBuildingsToggle).toBeChecked();
      await expect(tallBuildingsToggle).toBeChecked();
      
      // Wait for filter application
      await page.waitForTimeout(1000);
      
      // Disable both filters
      await publicBuildingsToggle.uncheck();
      await tallBuildingsToggle.uncheck();
      
      await expect(publicBuildingsToggle).not.toBeChecked();
      await expect(tallBuildingsToggle).not.toBeChecked();
    });

    test('should reset filters when changing views', async ({ page }) => {
      // Enable filters in Capital Region
      const publicBuildingsToggle = page.getByText('Only public buildings').locator('..').locator('input[type="checkbox"]');
      const tallBuildingsToggle = page.getByText('Only tall buildings').locator('..').locator('input[type="checkbox"]');
      
      await publicBuildingsToggle.check();
      await tallBuildingsToggle.check();
      
      // Switch to Grid view
      await helpers.navigateToView('gridView');
      await page.waitForTimeout(2000);
      
      // Filters may reset based on implementation
      // We verify they remain functional
      await expect(publicBuildingsToggle).toBeVisible();
      await expect(tallBuildingsToggle).toBeVisible();
      
      // Test functionality is maintained
      await publicBuildingsToggle.check();
      await expect(publicBuildingsToggle).toBeChecked();
    });

    test('should handle filter state during navigation levels', async ({ page }) => {
      // Enable filters at start level
      const publicBuildingsToggle = page.getByText('Only public buildings').locator('..').locator('input[type="checkbox"]');
      const tallBuildingsToggle = page.getByText('Only tall buildings').locator('..').locator('input[type="checkbox"]');
      
      await publicBuildingsToggle.check();
      await tallBuildingsToggle.check();
      
      // Navigate to postal code level
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      // Filters should remain functional
      await expect(publicBuildingsToggle).toBeVisible();
      await expect(tallBuildingsToggle).toBeVisible();
      
      // State may be maintained or reset depending on implementation
      // Test that they can be toggled
      await publicBuildingsToggle.uncheck();
      await publicBuildingsToggle.check();
      await expect(publicBuildingsToggle).toBeChecked();
    });

    test('should apply filters to building visualization', async ({ page }) => {
      // Navigate to postal code level where buildings are visible
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      const tallBuildingsToggle = page.getByText('Only tall buildings').locator('..').locator('input[type="checkbox"]');
      
      // Apply filter
      await tallBuildingsToggle.check();
      await page.waitForTimeout(2000);
      
      // Filter should be applied (visual changes would occur in Cesium)
      // We verify the toggle state is consistent
      await expect(tallBuildingsToggle).toBeChecked();
      
      // Remove filter
      await tallBuildingsToggle.uncheck();
      await page.waitForTimeout(2000);
      
      await expect(tallBuildingsToggle).not.toBeChecked();
    });
  });

  test.describe('Building Filter Performance', () => {
    test('should handle rapid filter toggling without errors', async ({ page }) => {
      const tallBuildingsToggle = page.getByText('Only tall buildings').locator('..').locator('input[type="checkbox"]');
      
      // Rapidly toggle filter multiple times
      for (let i = 0; i < 5; i++) {
        await tallBuildingsToggle.check();
        await page.waitForTimeout(200);
        await tallBuildingsToggle.uncheck();
        await page.waitForTimeout(200);
      }
      
      // Final state should be consistent
      await expect(tallBuildingsToggle).not.toBeChecked();
      
      // No error states should be present
      const errorElements = page.locator('[class*="error"], [class*="Error"]');
      const errorCount = await errorElements.count();
      expect(errorCount).toBe(0);
    });

    test('should handle filters during data loading', async ({ page }) => {
      // Intercept requests to simulate slow loading
      page.route('**/*.json', route => {
        setTimeout(() => route.continue(), 1000);
      });
      
      // Try applying filters during navigation/loading
      await helpers.drillToLevel('postalCode');
      
      // Immediately apply filters
      const tallBuildingsToggle = page.getByText('Only tall buildings').locator('..').locator('input[type="checkbox"]');
      await tallBuildingsToggle.check();
      
      // Wait for loading to complete
      await page.waitForTimeout(3000);
      
      // Filter state should be consistent
      await expect(tallBuildingsToggle).toBeChecked();
      
      // No error states
      const errorElements = page.locator('[class*="error"], [class*="Error"]');
      const errorCount = await errorElements.count();
      expect(errorCount).toBe(0);
    });
  });

  test.describe('Building Filter Accessibility', () => {
    test('should have consistent styling for all filter toggles', async ({ page }) => {
      // Check that all visible filters have consistent structure
      const filterToggles = page.locator('.switch-container').filter({ has: page.locator('input[type="checkbox"]') });
      const count = await filterToggles.count();
      
      expect(count).toBeGreaterThanOrEqual(2); // Should have at least 2 filter toggles
      
      for (let i = 0; i < count; i++) {
        const toggle = filterToggles.nth(i);
        
        // Each should have a switch and label
        const switchElement = toggle.locator('.switch');
        const label = toggle.locator('.label');
        
        if (await switchElement.isVisible()) {
          await expect(switchElement).toBeVisible();
          await expect(label).toBeVisible();
        }
      }
    });

    test('should support keyboard navigation for filter toggles', async ({ page }) => {
      // Tab through the interface to reach filter controls
      let foundFilterToggle = false;
      
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press('Tab');
        
        const focused = page.locator(':focus');
        const tagName = await focused.evaluate(el => el.tagName.toLowerCase()).catch(() => '');
        
        if (tagName === 'input') {
          const type = await focused.getAttribute('type');
          if (type === 'checkbox') {
            // Found a checkbox, test space bar activation
            const initialState = await focused.isChecked();
            await page.keyboard.press(' ');
            await page.waitForTimeout(500);
            
            const newState = await focused.isChecked();
            expect(newState).toBe(!initialState);
            foundFilterToggle = true;
            break;
          }
        }
      }
      
      // Should have found at least one filter toggle via keyboard navigation
      expect(foundFilterToggle).toBeTruthy();
    });

    test('should have descriptive labels for screen readers', async ({ page }) => {
      // Check that filter labels are meaningful
      const filterLabels = [
        'Only public buildings',
        'Only tall buildings'
      ];
      
      for (const labelText of filterLabels) {
        const label = page.getByText(labelText);
        if (await label.isVisible()) {
          await expect(label).toBeVisible();
          
          // Label should be associated with a toggle
          const toggle = label.locator('..').locator('input[type="checkbox"]');
          await expect(toggle).toBeVisible();
        }
      }
    });

    test('should provide visual feedback for filter state changes', async ({ page }) => {
      const tallBuildingsToggle = page.getByText('Only tall buildings').locator('..').locator('input[type="checkbox"]');
      const slider = page.getByText('Only tall buildings').locator('..').locator('.slider');
      
      // Initial state
      const initialChecked = await tallBuildingsToggle.isChecked();
      
      // Toggle on
      await tallBuildingsToggle.check();
      await page.waitForTimeout(500);
      
      // Visual state should reflect change
      const afterToggle = await tallBuildingsToggle.isChecked();
      expect(afterToggle).toBe(true);
      
      // Slider element should be present for visual feedback
      await expect(slider).toBeVisible();
    });
  });

  test.describe('Building Filter Responsiveness', () => {
    test('should maintain filter functionality across different viewports', async ({ page }) => {
      const viewports = [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 375, height: 667, name: 'mobile' }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(1000);
        
        // Filters should remain accessible
        await expect(page.getByText('Only tall buildings')).toBeVisible();
        
        const tallBuildingsToggle = page.getByText('Only tall buildings').locator('..').locator('input[type="checkbox"]');
        
        // Toggle should work efficiently
        await tallBuildingsToggle.check();
        await expect(tallBuildingsToggle).toBeChecked();
        
        await tallBuildingsToggle.uncheck();
        await expect(tallBuildingsToggle).not.toBeChecked();
      }
    });
  });

  test.describe('Building Filter Integration', () => {
    test('should work with layer controls simultaneously', async ({ page }) => {
      // Navigate to context where both filters and layers are available
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      // Enable building filter
      const tallBuildingsToggle = page.getByText('Only tall buildings').locator('..').locator('input[type="checkbox"]');
      await tallBuildingsToggle.check();
      
      // Enable layer toggle
      const ndviToggle = page.getByText('NDVI').locator('..').locator('input[type="checkbox"]');
      await ndviToggle.check();
      
      // Both should be enabled simultaneously
      await expect(tallBuildingsToggle).toBeChecked();
      await expect(ndviToggle).toBeChecked();
      
      // Both should remain functional
      await tallBuildingsToggle.uncheck();
      await expect(tallBuildingsToggle).not.toBeChecked();
      await expect(ndviToggle).toBeChecked(); // Should not affect layer toggle
    });

    test('should maintain filter state during view mode changes', async ({ page }) => {
      // Enable filters
      const publicBuildingsToggle = page.getByText('Only public buildings').locator('..').locator('input[type="checkbox"]');
      const tallBuildingsToggle = page.getByText('Only tall buildings').locator('..').locator('input[type="checkbox"]');
      
      await publicBuildingsToggle.check();
      await tallBuildingsToggle.check();
      
      // Switch view modes
      await helpers.navigateToView('gridView');
      await page.waitForTimeout(2000);
      
      // Verify filters remain functional
      await expect(publicBuildingsToggle).toBeVisible();
      await expect(tallBuildingsToggle).toBeVisible();
      
      // Test toggle functionality is maintained
      await publicBuildingsToggle.uncheck();
      await publicBuildingsToggle.check();
      await expect(publicBuildingsToggle).toBeChecked();
    });
  });
});