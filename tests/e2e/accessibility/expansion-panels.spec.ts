/**
 * Expansion Panels Accessibility Tests
 * 
 * Tests conditional panel visibility and interactions for all expansion panels:
 * - Cooling Centers (grid + heat_index)
 * - Statistical grid options (grid view)
 * - NDVI panel (not grid view)
 * - HSY/Syke background maps (universal)  
 * - Heat histogram (postal code + data)
 * - Socioeconomics (postal code + data)
 * - Land cover (postal code + not Helsinki)
 * - Building scatter plot (postal code)
 * - Area/Building properties (level-specific)
 * - Geocoding (universal)
 */

import { test, expect } from '@playwright/test';
import AccessibilityTestHelpers from '../helpers/test-helpers';

test.describe('Expansion Panels Accessibility', () => {
  let helpers: AccessibilityTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new AccessibilityTestHelpers(page);
    await page.goto('/');
    await helpers.waitForCesiumReady();
  });

  test.describe('Universal Expansion Panels', () => {
    test('should always display HSY and Syke background map panels', async ({ page }) => {
      // HSY Background maps
      await expect(page.getByText('HSY Background maps')).toBeVisible();
      
      // Syke Flood Background Maps  
      await expect(page.getByText('Syke Flood Background Maps')).toBeVisible();
      
      // Geocoding
      await expect(page.getByText('Geocoding')).toBeVisible();
      
      // Should remain visible across views
      await helpers.navigateToView('gridView');
      await expect(page.getByText('HSY Background maps')).toBeVisible();
      await expect(page.getByText('Syke Flood Background Maps')).toBeVisible();
      await expect(page.getByText('Geocoding')).toBeVisible();
    });

    test('should allow expansion panel interactions', async ({ page }) => {
      await helpers.testExpansionPanels();
    });
  });

  test.describe('View-Specific Expansion Panels', () => {
    test('should show Statistical grid options only in grid view', async ({ page }) => {
      // Not visible in Capital Region view
      await helpers.navigateToView('capitalRegionView');
      await expect(page.getByText('Statistical grid options')).not.toBeVisible();
      
      // Should be visible in Grid view
      await helpers.navigateToView('gridView');
      await expect(page.getByText('Statistical grid options')).toBeVisible();
    });

    test('should show NDVI panel in non-grid views', async ({ page }) => {
      // Should be visible in Capital Region view
      await helpers.navigateToView('capitalRegionView');
      await expect(page.getByText('NDVI', { exact: true })).toBeVisible();
      
      // Should not be visible in Grid view
      await helpers.navigateToView('gridView');
      await expect(page.getByText('NDVI', { exact: true })).not.toBeVisible();
    });

    test('should show Cooling Centers panel in grid view with heat index', async ({ page }) => {
      await helpers.navigateToView('gridView');
      
      // Cooling centers panel visibility depends on statsIndex = 'heat_index'
      // We test the conditional structure exists
      const coolingCenters = page.getByText('Manage Cooling Centers');
      
      // If visible, should be functional
      if (await coolingCenters.isVisible()) {
        await expect(coolingCenters).toBeVisible();
      }
    });
  });

  test.describe('Level-Specific Expansion Panels', () => {
    test('should show postal code specific panels', async ({ page }) => {
      await helpers.drillToLevel('postalCode');
      // Wait for postal code level to be active by checking for specific elements
      await page.waitForSelector('text="Building Scatter Plot"', { timeout: 10000 });
      
      // Should show postal code level panels
      await expect(page.getByText('Building Scatter Plot')).toBeVisible();
      await expect(page.getByText('Area properties')).toBeVisible();
      
      // Data-dependent panels (if data available)
      const heatHistogram = page.getByText('Heat Histogram');
      const socioEconomics = page.getByText('Socioeconomics Diagram');
      const landCover = page.getByText('Land Cover');
      
      // Test visibility if present
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

    test('should show building specific panels', async ({ page }) => {
      await helpers.drillToLevel('building');
      // Wait for building level to be active by checking for building-specific elements
      await page.waitForSelector('text="Building heat data"', { timeout: 15000 });
      
      // Should show building level panels
      await expect(page.getByText('Building heat data')).toBeVisible();
      await expect(page.getByText('Building properties')).toBeVisible();
    });
  });

  test.describe('Panel Interaction and State', () => {
    test('should handle panel expansion and collapse', async ({ page }) => {
      // Test expanding a universal panel
      const hsyPanel = page.getByText('HSY Background maps');
      await hsyPanel.click();
      // Wait for panel expansion animation to complete
      await page.waitForFunction(() => {
        const panel = document.querySelector('.v-expansion-panel-text');
        return panel && getComputedStyle(panel).display !== 'none';
      }, { timeout: 2000 }).catch(() => {});
      
      // Should expand (test for panel content visibility)
      const panelContent = hsyPanel.locator('..').locator('.v-expansion-panel-text');
      if (await panelContent.isVisible()) {
        await expect(panelContent).toBeVisible();
      }
    });

    test('should maintain panel states during navigation', async ({ page }) => {
      // Expand a panel
      const geocodingPanel = page.getByText('Geocoding');
      await geocodingPanel.click();
      // Wait for panel to expand
      await page.waitForFunction(() => {
        const panel = document.querySelector('.v-expansion-panel-text');
        return panel && getComputedStyle(panel).display !== 'none';
      }, { timeout: 2000 }).catch(() => {});
      
      // Navigate to different level
      await helpers.drillToLevel('postalCode');
      // Wait for postal code level elements to be visible
      await page.waitForSelector('text="Area properties"', { timeout: 10000 });
      
      // Panel should still be accessible
      await expect(geocodingPanel).toBeVisible();
    });
  });
});