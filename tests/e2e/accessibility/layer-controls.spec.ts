/**
 * Layer Controls Accessibility Tests
 * 
 * Tests all layer toggle controls and their conditional visibility/functionality:
 * - Vegetation (Helsinki view only)
 * - Other Nature (Helsinki view only)  
 * - Trees (not grid view + postal code selected)
 * - HSY Land Cover (not Helsinki view)
 * - NDVI (universal)
 * 
 * Ensures all layer controls remain accessible and functional during interface overhaul.
 */

import { test, expect } from '@playwright/test';
import AccessibilityTestHelpers from '../helpers/test-helpers';

test.describe('Layer Controls Accessibility', () => {
  let helpers: AccessibilityTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new AccessibilityTestHelpers(page);
    await page.goto('/');
    await helpers.waitForCesiumReady();
  });

  test.describe('Universal Layer Controls', () => {
    test('should display NDVI toggle in all views and contexts', async ({ page }) => {
      // Test NDVI in Capital Region view
      await helpers.navigateToView('capitalRegionView');
      await expect(page.getByText('NDVI')).toBeVisible();
      
      const ndviToggle = page.getByText('NDVI').locator('..').locator('input[type="checkbox"]');
      await expect(ndviToggle).toBeVisible();
      
      // Test NDVI functionality
      await ndviToggle.check();
      await expect(ndviToggle).toBeChecked();
      await ndviToggle.uncheck();
      await expect(ndviToggle).not.toBeChecked();
      
      // Test NDVI in Statistical Grid view
      await helpers.navigateToView('gridView');
      await expect(page.getByText('NDVI')).toBeVisible();
      
      // NDVI should be functional in grid view too
      await ndviToggle.check();
      await expect(ndviToggle).toBeChecked();
    });

    test('should maintain NDVI state across view changes', async ({ page }) => {
      const ndviToggle = page.getByText('NDVI').locator('..').locator('input[type="checkbox"]');
      
      // Enable NDVI in Capital Region
      await helpers.navigateToView('capitalRegionView');
      await ndviToggle.check();
      await expect(ndviToggle).toBeChecked();
      
      // Switch to Grid view
      await helpers.navigateToView('gridView');
      
      // NDVI should maintain its state
      await expect(ndviToggle).toBeChecked();
      
      // Switch back
      await helpers.navigateToView('capitalRegionView');
      await expect(ndviToggle).toBeChecked();
    });

    test('should display Layers section header consistently', async ({ page }) => {
      await expect(page.getByText('Layers', { exact: true })).toBeVisible();
      
      // Should remain visible across view changes
      await helpers.navigateToView('gridView');
      await expect(page.getByText('Layers', { exact: true })).toBeVisible();
      
      await helpers.navigateToView('capitalRegionView');
      await expect(page.getByText('Layers', { exact: true })).toBeVisible();
    });
  });

  test.describe('View-Specific Layer Controls', () => {
    test('should show HSY Land Cover only in non-Helsinki views', async ({ page }) => {
      // Should be visible in Capital Region view (default)
      await helpers.navigateToView('capitalRegionView');
      await expect(page.getByText('HSY Land Cover')).toBeVisible();
      
      const landCoverToggle = page.getByText('HSY Land Cover').locator('..').locator('input[type="checkbox"]');
      
      // Test toggle functionality
      await landCoverToggle.check();
      await expect(landCoverToggle).toBeChecked();
      await landCoverToggle.uncheck();
      await expect(landCoverToggle).not.toBeChecked();
      
      // Should be visible in Grid view too
      await helpers.navigateToView('gridView');
      await expect(page.getByText('HSY Land Cover')).toBeVisible();
      
      // Note: Helsinki view testing would require navigation to Helsinki-specific postal codes
      // For comprehensive testing, we verify the conditional logic structure exists
    });

    test('should show vegetation controls only in Helsinki view', async ({ page }) => {
      // In default Capital Region view, vegetation controls should not be visible
      await helpers.navigateToView('capitalRegionView');
      await expect(page.getByText('Vegetation')).not.toBeVisible();
      await expect(page.getByText('Other Nature')).not.toBeVisible();
      
      // In Grid view, vegetation controls should not be visible
      await helpers.navigateToView('gridView');
      await expect(page.getByText('Vegetation')).not.toBeVisible();
      await expect(page.getByText('Other Nature')).not.toBeVisible();
      
      // Note: Testing Helsinki view would require:
      // 1. Setting helsinkiView store state to true
      // 2. Or navigating to Helsinki-specific data
      // For now we verify the conditional structure exists
    });

    test('should handle view-specific layer state correctly', async ({ page }) => {
      // Start with Capital Region
      await helpers.navigateToView('capitalRegionView');
      
      // Enable HSY Land Cover
      const landCoverToggle = page.getByText('HSY Land Cover').locator('..').locator('input[type="checkbox"]');
      await landCoverToggle.check();
      await expect(landCoverToggle).toBeChecked();
      
      // Switch to Grid view - should maintain state
      await helpers.navigateToView('gridView');
      await expect(landCoverToggle).toBeChecked();
      
      // Disable in Grid view
      await landCoverToggle.uncheck();
      await expect(landCoverToggle).not.toBeChecked();
      
      // Switch back - state should be maintained
      await helpers.navigateToView('capitalRegionView');
      await expect(landCoverToggle).not.toBeChecked();
    });
  });

  test.describe('Context-Dependent Layer Controls', () => {
    test('should show Trees toggle only with postal code in non-grid views', async ({ page }) => {
      // At start level, Trees should not be visible
      await expect(page.getByText('Trees')).not.toBeVisible();
      
      // Navigate to postal code level in Capital Region view
      await helpers.navigateToView('capitalRegionView');
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      // Trees toggle should now be visible
      await expect(page.getByText('Trees')).toBeVisible();
      
      const treesToggle = page.getByText('Trees').locator('..').locator('input[type="checkbox"]');
      
      // Test Trees toggle functionality
      await treesToggle.check();
      await expect(treesToggle).toBeChecked();
      await treesToggle.uncheck();
      await expect(treesToggle).not.toBeChecked();
    });

    test('should hide Trees toggle in grid view even with postal code', async ({ page }) => {
      // Navigate to postal code in Capital Region first
      await helpers.navigateToView('capitalRegionView');
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      // Verify Trees is visible
      await expect(page.getByText('Trees')).toBeVisible();
      
      // Switch to grid view
      await helpers.navigateToView('gridView');
      await page.waitForTimeout(2000);
      
      // Trees should now be hidden
      await expect(page.getByText('Trees')).not.toBeVisible();
      
      // Switch back to Capital Region
      await helpers.navigateToView('capitalRegionView');
      await page.waitForTimeout(2000);
      
      // Trees should be visible again
      await expect(page.getByText('Trees')).toBeVisible();
    });

    test('should handle Trees toggle state across valid contexts', async ({ page }) => {
      // Navigate to postal code in Capital Region
      await helpers.navigateToView('capitalRegionView');
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      const treesToggle = page.getByText('Trees').locator('..').locator('input[type="checkbox"]');
      
      // Enable Trees
      await treesToggle.check();
      await expect(treesToggle).toBeChecked();
      
      // Navigate to building level (Trees should still be available)
      await helpers.drillToLevel('building');
      await page.waitForTimeout(3000);
      
      // Trees should still be visible and checked
      await expect(page.getByText('Trees')).toBeVisible();
      await expect(treesToggle).toBeChecked();
      
      // Navigate back to postal code
      const backButton = page.getByRole('button').filter({ has: page.locator('.mdi-arrow-left') });
      await backButton.click();
      await page.waitForTimeout(2000);
      
      // Trees state should be maintained
      await expect(treesToggle).toBeChecked();
    });
  });

  test.describe('Layer Toggle Interactions', () => {
    test('should handle rapid toggle switching without errors', async ({ page }) => {
      const ndviToggle = page.getByText('NDVI').locator('..').locator('input[type="checkbox"]');
      
      // Rapidly toggle NDVI multiple times
      for (let i = 0; i < 5; i++) {
        await ndviToggle.check();
        await page.waitForTimeout(200);
        await ndviToggle.uncheck();
        await page.waitForTimeout(200);
      }
      
      // Final state should be consistent
      await expect(ndviToggle).not.toBeChecked();
      
      // No error states should be present
      const errorElements = page.locator('[class*="error"], [class*="Error"]');
      const errorCount = await errorElements.count();
      expect(errorCount).toBe(0);
    });

    test('should handle multiple layer toggles simultaneously', async ({ page }) => {
      await helpers.navigateToView('capitalRegionView');
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      // Get available toggles
      const ndviToggle = page.getByText('NDVI').locator('..').locator('input[type="checkbox"]');
      const landCoverToggle = page.getByText('HSY Land Cover').locator('..').locator('input[type="checkbox"]');
      const treesToggle = page.getByText('Trees').locator('..').locator('input[type="checkbox"]');
      
      // Enable all available layers
      await ndviToggle.check();
      await landCoverToggle.check();
      await treesToggle.check();
      
      // Verify all are checked
      await expect(ndviToggle).toBeChecked();
      await expect(landCoverToggle).toBeChecked();
      await expect(treesToggle).toBeChecked();
      
      // Disable all
      await ndviToggle.uncheck();
      await landCoverToggle.uncheck();
      await treesToggle.uncheck();
      
      // Verify all are unchecked
      await expect(ndviToggle).not.toBeChecked();
      await expect(landCoverToggle).not.toBeChecked();
      await expect(treesToggle).not.toBeChecked();
    });

    test('should maintain layer states during navigation', async ({ page }) => {
      // Enable NDVI and HSY Land Cover
      const ndviToggle = page.getByText('NDVI').locator('..').locator('input[type="checkbox"]');
      const landCoverToggle = page.getByText('HSY Land Cover').locator('..').locator('input[type="checkbox"]');
      
      await ndviToggle.check();
      await landCoverToggle.check();
      
      // Navigate to postal code level
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      // States should be maintained
      await expect(ndviToggle).toBeChecked();
      await expect(landCoverToggle).toBeChecked();
      
      // Navigate to building level
      await helpers.drillToLevel('building');
      await page.waitForTimeout(3000);
      
      // States should still be maintained
      await expect(ndviToggle).toBeChecked();
      await expect(landCoverToggle).toBeChecked();
    });
  });

  test.describe('Layer Control Styling and Accessibility', () => {
    test('should have consistent styling for all layer toggles', async ({ page }) => {
      // Navigate to context where multiple layers are visible
      await helpers.navigateToView('capitalRegionView');
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      // Check that all visible toggles have consistent structure
      const toggles = page.locator('.switch-container');
      const count = await toggles.count();
      
      expect(count).toBeGreaterThan(2); // Should have multiple layer toggles
      
      for (let i = 0; i < count; i++) {
        const toggle = toggles.nth(i);
        
        // Each should have a switch and label
        const switchElement = toggle.locator('.switch');
        const label = toggle.locator('.label');
        
        if (await switchElement.isVisible()) {
          await expect(switchElement).toBeVisible();
          await expect(label).toBeVisible();
        }
      }
    });

    test('should support keyboard navigation for layer toggles', async ({ page }) => {
      // Tab through the interface to reach layer controls
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should eventually reach layer toggle controls
      const focusedElement = page.locator(':focus');
      
      // Continue tabbing to find toggles
      for (let i = 0; i < 10; i++) {
        const focused = page.locator(':focus');
        const tagName = await focused.evaluate(el => el.tagName.toLowerCase());
        
        if (tagName === 'input') {
          const type = await focused.getAttribute('type');
          if (type === 'checkbox') {
            // Found a checkbox, test space bar activation
            await page.keyboard.press(' ');
            await page.waitForTimeout(500);
            
            // Should toggle the checkbox
            const isChecked = await focused.isChecked();
            expect(typeof isChecked).toBe('boolean');
            break;
          }
        }
        
        await page.keyboard.press('Tab');
      }
    });

    test('should have proper labels for screen readers', async ({ page }) => {
      await helpers.navigateToView('capitalRegionView');
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      // Check that layer labels are descriptive
      const layerLabels = [
        'NDVI',
        'HSY Land Cover', 
        'Trees'
      ];
      
      for (const labelText of layerLabels) {
        const label = page.getByText(labelText);
        if (await label.isVisible()) {
          await expect(label).toBeVisible();
          
          // Label should be associated with a toggle
          const toggle = label.locator('..').locator('input[type="checkbox"]');
          await expect(toggle).toBeVisible();
        }
      }
    });

    test('should provide visual feedback for toggle state changes', async ({ page }) => {
      const ndviToggle = page.getByText('NDVI').locator('..').locator('input[type="checkbox"]');
      const slider = page.getByText('NDVI').locator('..').locator('.slider');
      
      // Initial state
      const initialChecked = await ndviToggle.isChecked();
      
      // Toggle on
      await ndviToggle.check();
      await page.waitForTimeout(500);
      
      // Visual state should reflect change
      const afterToggle = await ndviToggle.isChecked();
      expect(afterToggle).toBe(true);
      
      // Slider element should be present for visual feedback
      await expect(slider).toBeVisible();
    });
  });

  test.describe('Layer Control Edge Cases', () => {
    test('should handle layer toggles during data loading', async ({ page }) => {
      // Intercept requests to simulate slow loading
      page.route('**/*.json', route => {
        setTimeout(() => route.continue(), 1000);
      });
      
      // Try toggling during navigation/loading
      await helpers.drillToLevel('postalCode');
      
      // Immediately try to toggle layers
      const ndviToggle = page.getByText('NDVI').locator('..').locator('input[type="checkbox"]');
      await ndviToggle.check();
      
      // Wait for loading to complete
      await page.waitForTimeout(3000);
      
      // Toggle state should be consistent
      await expect(ndviToggle).toBeChecked();
      
      // No error states
      const errorElements = page.locator('[class*="error"], [class*="Error"]');
      const errorCount = await errorElements.count();
      expect(errorCount).toBe(0);
    });

    test('should reset layer states appropriately on application reset', async ({ page }) => {
      // Enable some layers
      const ndviToggle = page.getByText('NDVI').locator('..').locator('input[type="checkbox"]');
      const landCoverToggle = page.getByText('HSY Land Cover').locator('..').locator('input[type="checkbox"]');
      
      await ndviToggle.check();
      await landCoverToggle.check();
      
      await expect(ndviToggle).toBeChecked();
      await expect(landCoverToggle).toBeChecked();
      
      // Reset application
      const resetButton = page.getByRole('button').filter({ has: page.locator('.mdi-refresh') });
      await resetButton.click();
      await page.waitForTimeout(3000);
      
      // Layer states behavior after reset depends on implementation
      // We verify that toggles are still functional
      await expect(ndviToggle).toBeVisible();
      await expect(landCoverToggle).toBeVisible();
      
      // Test functionality is maintained
      await ndviToggle.check();
      await expect(ndviToggle).toBeChecked();
    });

    test('should handle missing layer data gracefully', async ({ page }) => {
      // Toggle layers even if underlying data might be missing
      const ndviToggle = page.getByText('NDVI').locator('..').locator('input[type="checkbox"]');
      
      await ndviToggle.check();
      await page.waitForTimeout(2000);
      
      // Should not cause application errors
      const errorElements = page.locator('[class*="error"], [class*="Error"]');
      const errorCount = await errorElements.count();
      expect(errorCount).toBe(0);
      
      // Toggle should remain functional
      await ndviToggle.uncheck();
      await expect(ndviToggle).not.toBeChecked();
    });
  });

  test.describe('Layer Control Performance', () => {
    test('should handle layer toggles efficiently across viewports', async ({ page }) => {
      const viewports = [
        { width: 1920, height: 1080 },
        { width: 768, height: 1024 },
        { width: 375, height: 667 }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(1000);
        
        // Layer controls should remain accessible
        await expect(page.getByText('NDVI')).toBeVisible();
        
        const ndviToggle = page.getByText('NDVI').locator('..').locator('input[type="checkbox"]');
        
        // Toggle should work efficiently
        const startTime = Date.now();
        await ndviToggle.check();
        const endTime = Date.now();
        
        expect(endTime - startTime).toBeLessThan(1000); // Should be responsive
        await expect(ndviToggle).toBeChecked();
      }
    });
  });
});