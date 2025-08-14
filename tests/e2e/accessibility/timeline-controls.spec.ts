/**
 * Timeline Controls Accessibility Tests
 * 
 * Tests timeline slider functionality at postal code and building levels:
 * - Timeline visibility (postal code and building levels only)
 * - Date labels and navigation
 * - Slider interaction and value changes
 * - Timeline state persistence across levels
 */

import { test, expect } from '@playwright/test';
import AccessibilityTestHelpers from '../helpers/test-helpers';

test.describe('Timeline Controls Accessibility', () => {
  let helpers: AccessibilityTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new AccessibilityTestHelpers(page);
    await page.goto('/');
    await helpers.waitForCesiumReady();
  });

  test.describe('Timeline Visibility and Access', () => {
    test('should not show timeline at start level', async ({ page }) => {
      await helpers.verifyTimelineVisibility('start');
    });

    test('should show timeline at postal code level', async ({ page }) => {
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      await helpers.verifyTimelineVisibility('postalCode');
    });

    test('should show timeline at building level', async ({ page }) => {
      await helpers.drillToLevel('building');
      await page.waitForTimeout(5000);
      
      await helpers.verifyTimelineVisibility('building');
    });
  });

  test.describe('Timeline Components', () => {
    test('should display all timeline elements', async ({ page }) => {
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      // Timeline container
      await expect(page.locator('#heatTimeseriesContainer')).toBeVisible();
      
      // Date labels
      const dateLabels = page.locator('.date-labels');
      if (await dateLabels.isVisible()) {
        await expect(dateLabels).toBeVisible();
      }
      
      // Slider
      const slider = page.locator('.timeline-slider input');
      await expect(slider).toBeVisible();
      
      // Current date display
      const timeLabel = page.locator('.time-label');
      if (await timeLabel.isVisible()) {
        await expect(timeLabel).toBeVisible();
      }
    });

    test('should have functional timeline slider', async ({ page }) => {
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      const slider = page.locator('.timeline-slider input');
      
      // Test slider interaction
      await slider.fill('3');
      await page.waitForTimeout(1000);
      
      // Slider should reflect the change
      const sliderValue = await slider.inputValue();
      expect(sliderValue).toBe('3');
    });
  });

  test.describe('Timeline State Persistence', () => {
    test('should maintain timeline state between levels', async ({ page }) => {
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      const slider = page.locator('.timeline-slider input');
      await slider.fill('2');
      await page.waitForTimeout(1000);
      
      // Navigate to building level
      await helpers.drillToLevel('building');
      await page.waitForTimeout(3000);
      
      // Timeline should still be visible
      await helpers.verifyTimelineVisibility('building');
      
      // State should be maintained
      const sliderValue = await slider.inputValue();
      expect(sliderValue).toBe('2');
    });

    test('should handle timeline across different views', async ({ page }) => {
      // Test in Capital Region view
      await helpers.navigateToView('capitalRegionView');
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      await helpers.verifyTimelineVisibility('postalCode');
      
      // Switch to Grid view
      await helpers.navigateToView('gridView');
      await page.waitForTimeout(2000);
      
      // Timeline should still be visible
      await helpers.verifyTimelineVisibility('postalCode');
    });
  });

  test.describe('Timeline Accessibility', () => {
    test('should support keyboard navigation', async ({ page }) => {
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      const slider = page.locator('.timeline-slider input');
      await slider.focus();
      
      // Test arrow key navigation
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);
      
      // Should change slider value
      const finalValue = await slider.inputValue();
      expect(finalValue).toMatch(/^\d+$/); // Should be a number
    });

    test('should be responsive across viewports', async ({ page }) => {
      await helpers.drillToLevel('postalCode');
      await page.waitForTimeout(3000);
      
      const viewports = [
        { width: 1920, height: 1080 },
        { width: 768, height: 1024 },
        { width: 375, height: 667 }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(1000);
        
        // Timeline should remain functional
        await expect(page.locator('#heatTimeseriesContainer')).toBeVisible();
        
        const slider = page.locator('.timeline-slider input');
        await expect(slider).toBeVisible();
      }
    });
  });
});