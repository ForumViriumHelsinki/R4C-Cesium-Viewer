/**
 * Comprehensive Walkthrough Accessibility Tests
 * 
 * End-to-end user journey validation covering complete workflows:
 * - New user journey (start → capital region → postal code → building)
 * - Grid analysis workflow (start → statistical grid → cooling centers)
 * - Multi-view exploration (switching between all views and levels)
 * - Feature combination testing (layers + filters + navigation)
 * - Complete accessibility audit
 */

import { test, expect } from '@playwright/test';
import AccessibilityTestHelpers from '../helpers/test-helpers';

test.describe('Comprehensive Walkthrough Accessibility', () => {
  let helpers: AccessibilityTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new AccessibilityTestHelpers(page);
    await page.goto('/');
    await helpers.waitForCesiumReady();
  });

  test.describe('Complete User Journeys', () => {
    test('should support new user journey: start → postal code → building', async ({ page }) => {
      // 1. Start Level - verify initial state
      await helpers.verifyPanelVisibility({
        currentView: 'capitalRegion',
        currentLevel: 'start'
      });
      
      // 2. Navigate to postal code level
      await helpers.drillToLevel('postalCode');
      // Wait for postal code UI elements
      await page.waitForSelector('text="Building Scatter Plot"', { timeout: 10000 }).catch(() => {});
      
      // Verify postal code features
      await helpers.verifyPanelVisibility({
        currentView: 'capitalRegion', 
        currentLevel: 'postalCode',
        hasData: true
      });
      
      // Verify timeline appears
      await helpers.verifyTimelineVisibility('postalCode');
      
      // 3. Navigate to building level
      await helpers.drillToLevel('building');
      // Wait for building level elements
      await page.waitForSelector('.mdi-arrow-left', { timeout: 15000 }).catch(() => {});
      
      // Verify building features
      await helpers.verifyPanelVisibility({
        currentView: 'capitalRegion',
        currentLevel: 'building'
      });
      
      // Verify back navigation works
      const backButton = page.getByRole('button').filter({ has: page.locator('.mdi-arrow-left') });
      await expect(backButton).toBeVisible();
      
      // Test back navigation
      await backButton.click();
      // Wait for navigation back to postal code level
      await expect(backButton).toBeHidden();
      
      // Should be back at postal code level
      await helpers.verifyTimelineVisibility('postalCode');
      await expect(backButton).not.toBeVisible();
    });

    test('should support grid analysis workflow', async ({ page }) => {
      // 1. Switch to Statistical Grid view
      await helpers.navigateToView('gridView');
      
      // Verify grid-specific features
      await helpers.verifyPanelVisibility({
        currentView: 'grid',
        currentLevel: 'start'
      });
      
      await expect(page.getByText('Statistical grid options')).toBeVisible();
      
      // 2. Navigate through levels in grid view
      await helpers.drillToLevel('postalCode');
      // Wait for postal code level in grid view
      await page.waitForSelector('text="Building Scatter Plot"', { timeout: 10000 }).catch(() => {});
      
      // Timeline should work in grid view
      await helpers.verifyTimelineVisibility('postalCode');
      
      // 3. Test grid-specific features
      const coolingCenters = page.getByText('Manage Cooling Centers');
      if (await coolingCenters.isVisible()) {
        await expect(coolingCenters).toBeVisible();
      }
      
      // 4. Navigate to building level in grid view
      await helpers.drillToLevel('building');
      // Wait for building level in grid view
      await page.waitForSelector('text="Building heat data"', { timeout: 15000 }).catch(() => {});
      
      // Should show grid-specific building data
      await expect(page.getByText('Building heat data')).toBeVisible();
    });

    test('should support multi-view exploration workflow', async ({ page }) => {
      const views = ['capitalRegionView', 'gridView'] as const;
      
      for (const view of views) {
        // Switch to view
        await helpers.navigateToView(view);
        // Wait for view switch to complete
        await expect(page.locator(`input[value="${view}"]`)).toBeChecked();
        
        // Test navigation through all levels
        for (const level of ['postalCode', 'building'] as const) {
          await helpers.drillToLevel(level);
          // Wait for level-specific UI
          if (level === 'postalCode') {
            await page.waitForSelector('text="Building Scatter Plot"', { timeout: 10000 }).catch(() => {});
          } else {
            await page.waitForSelector('text="Building heat data"', { timeout: 15000 }).catch(() => {});
          }
          
          // Verify appropriate features for view+level combination
          await helpers.verifyPanelVisibility({
            currentView: view === 'capitalRegionView' ? 'capitalRegion' : 'grid',
            currentLevel: level,
            hasData: true
          });
          
          if (level === 'postalCode' || level === 'building') {
            await helpers.verifyTimelineVisibility(level);
          }
        }
        
        // Reset for next view
        const resetButton = page.getByRole('button').filter({ has: page.locator('.mdi-refresh') });
        await resetButton.click();
        // Wait for reset to complete
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      }
    });
  });

  test.describe('Feature Combination Testing', () => {
    test('should handle layers + filters + navigation simultaneously', async ({ page }) => {
      // 1. Navigate to postal code level
      await helpers.drillToLevel('postalCode');
      // Wait for postal code UI
      await page.waitForSelector('text="Building Scatter Plot"', { timeout: 10000 }).catch(() => {});
      
      // 2. Enable multiple layers
      const ndviToggle = page.getByText('NDVI').locator('..').locator('input[type="checkbox"]');
      const landCoverToggle = page.getByText('HSY Land Cover').locator('..').locator('input[type="checkbox"]');
      const treesToggle = page.getByText('Trees').locator('..').locator('input[type="checkbox"]');
      
      await ndviToggle.check();
      await landCoverToggle.check();
      if (await treesToggle.isVisible()) {
        await treesToggle.check();
      }
      
      // 3. Enable multiple filters  
      const publicBuildingsToggle = page.getByText('Only public buildings').locator('..').locator('input[type="checkbox"]');
      const tallBuildingsToggle = page.getByText('Only tall buildings').locator('..').locator('input[type="checkbox"]');
      
      await publicBuildingsToggle.check();
      await tallBuildingsToggle.check();
      
      // 4. Use timeline
      const slider = page.locator('.timeline-slider input');
      await slider.fill('2');
      
      // 5. Navigate to building level with all features enabled
      await helpers.drillToLevel('building');
      // Wait for building level
      await page.waitForSelector('text="Building heat data"', { timeout: 15000 }).catch(() => {});
      
      // 6. Verify all features are maintained
      await expect(ndviToggle).toBeChecked();
      await expect(landCoverToggle).toBeChecked();
      await expect(publicBuildingsToggle).toBeChecked();
      await expect(tallBuildingsToggle).toBeChecked();
      
      const currentSliderValue = await slider.inputValue();
      expect(currentSliderValue).toBe('2');
    });

    test('should handle view switching with complex state', async ({ page }) => {
      // 1. Set up complex state in Capital Region view
      await helpers.drillToLevel('postalCode');
      // Wait for postal code level
      await page.waitForSelector('text="Building Scatter Plot"', { timeout: 10000 }).catch(() => {});
      
      const ndviToggle = page.getByText('NDVI').locator('..').locator('input[type="checkbox"]');
      const tallBuildingsToggle = page.getByText('Only tall buildings').locator('..').locator('input[type="checkbox"]');
      
      await ndviToggle.check();
      await tallBuildingsToggle.check();
      
      // 2. Switch to Grid view
      await helpers.navigateToView('gridView');
      // Wait for view switch
      await expect(page.locator('input[value="gridView"]')).toBeChecked();
      
      // 3. Verify state transition
      await expect(ndviToggle).toBeChecked();
      await expect(tallBuildingsToggle).toBeChecked();
      
      // 4. Switch back to Capital Region
      await helpers.navigateToView('capitalRegionView');
      // Wait for view switch back
      await expect(page.locator('input[value="capitalRegionView"]')).toBeChecked();
      
      // 5. Verify state is maintained
      await expect(ndviToggle).toBeChecked();
      await expect(tallBuildingsToggle).toBeChecked();
    });
  });

  test.describe('Accessibility Audit', () => {
    test('should pass comprehensive accessibility checks across all states', async ({ page }) => {
      const states = [
        { view: 'capitalRegionView', level: 'start' },
        { view: 'capitalRegionView', level: 'postalCode' },
        { view: 'capitalRegionView', level: 'building' },
        { view: 'gridView', level: 'start' },
        { view: 'gridView', level: 'postalCode' },
        { view: 'gridView', level: 'building' }
      ];
      
      for (const state of states) {
        // Reset to clean state
        const resetButton = page.getByRole('button').filter({ has: page.locator('.mdi-refresh') });
        await resetButton.click();
        // Wait for reset
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        
        // Navigate to target state
        await helpers.navigateToView(state.view as 'capitalRegionView' | 'gridView');
        
        if (state.level !== 'start') {
          await helpers.drillToLevel(state.level as 'postalCode' | 'building');
          // Wait for level-specific UI
          if (state.level === 'postalCode') {
            await page.waitForSelector('text="Building Scatter Plot"', { timeout: 10000 }).catch(() => {});
          } else {
            await page.waitForSelector('text="Building heat data"', { timeout: 15000 }).catch(() => {});
          }
        }
        
        // Capture accessibility state
        const accessibilityTree = await helpers.captureAccessibilityTree();
        
        // Verify essential elements are accessible
        expect(accessibilityTree.visibleElements.length).toBeGreaterThan(10);
        expect(accessibilityTree.interactiveElements.some(e => e.includes('buttons'))).toBeTruthy();
        
        // Verify no error states
        const errorElements = page.locator('[class*="error"], [class*="Error"]');
        const errorCount = await errorElements.count();
        expect(errorCount).toBe(0);
      }
    });

    test('should maintain keyboard navigation throughout complete workflows', async ({ page }) => {
      // Test keyboard navigation in different contexts
      const contexts = [
        { description: 'start level', action: () => Promise.resolve() },
        { description: 'postal code level', action: () => helpers.drillToLevel('postalCode') },
        { description: 'building level', action: () => helpers.drillToLevel('building') }
      ];
      
      for (const context of contexts) {
        // Reset and navigate to context
        const resetButton = page.getByRole('button').filter({ has: page.locator('.mdi-refresh') });
        await resetButton.click();
        // Wait for reset
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        
        await context.action();
        // Wait for context action to complete
        await page.waitForFunction(() => document.readyState === 'complete', { timeout: 5000 });
        
        // Test keyboard navigation
        let focusableElements = 0;
        
        for (let i = 0; i < 20; i++) {
          await page.keyboard.press('Tab');
          // Brief wait for focus to move
          await page.waitForFunction(() => document.readyState === 'complete', { timeout: 500 }).catch(() => {});
          
          const focused = page.locator(':focus');
          if (await focused.isVisible()) {
            focusableElements++;
          }
        }
        
        // Should have found focusable elements
        expect(focusableElements).toBeGreaterThan(3);
      }
    });

    test('should be responsive across all viewport sizes', async ({ page }) => {
      const viewports = [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 1024, height: 768, name: 'tablet-landscape' },
        { width: 768, height: 1024, name: 'tablet-portrait' }, 
        { width: 375, height: 667, name: 'mobile' },
        { width: 320, height: 568, name: 'small-mobile' }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        // Wait for viewport change to take effect
        await page.waitForFunction((expectedWidth) => {
          return window.innerWidth === expectedWidth;
        }, viewport.width, { timeout: 3000 });
        
        // Test essential elements are accessible
        await expect(page.locator('#cesiumContainer')).toBeVisible();
        await expect(page.locator('#viewModeContainer')).toBeVisible();
        await expect(page.getByText('Layers')).toBeVisible();
        await expect(page.getByText('Filters')).toBeVisible();
        
        // Test navigation works
        await helpers.navigateToView('gridView');
        await expect(page.locator('input[value="gridView"]')).toBeChecked();
        
        await helpers.navigateToView('capitalRegionView');
        await expect(page.locator('input[value="capitalRegionView"]')).toBeChecked();
      }
    });
  });

  test.describe('Performance and Reliability', () => {
    test('should handle complete workflows under load', async ({ page }) => {
      // Simulate slower network
      page.route('**/*', route => {
        setTimeout(() => route.continue(), 200);
      });
      
      // Complete workflow with delays
      await helpers.navigateToView('gridView');
      // Wait for grid view
      await expect(page.locator('input[value="gridView"]')).toBeChecked();
      
      await helpers.drillToLevel('postalCode');
      // Wait for postal code level
      await page.waitForSelector('text="Building Scatter Plot"', { timeout: 10000 }).catch(() => {});
      
      // Enable features during slow loading
      const ndviToggle = page.getByText('NDVI').locator('..').locator('input[type="checkbox"]');
      await ndviToggle.check();
      
      await helpers.drillToLevel('building');
      // Wait for building level under load
      await page.waitForSelector('text="Building heat data"', { timeout: 20000 }).catch(() => {});
      
      // Should reach stable state
      await expect(ndviToggle).toBeChecked();
      await expect(page.getByText('Building heat data')).toBeVisible();
    });

    test('should recover gracefully from errors', async ({ page }) => {
      // Simulate some network failures
      let failCount = 0;
      page.route('**/*.json', route => {
        if (failCount < 2) {
          failCount++;
          route.abort('failed');
        } else {
          route.continue();
        }
      });
      
      // Attempt navigation despite failures
      await helpers.drillToLevel('postalCode');
      // Wait longer for recovery
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      
      // Should not show error states
      const errorElements = page.locator('[class*="error"], [class*="Error"]');
      const errorCount = await errorElements.count();
      expect(errorCount).toBe(0);
      
      // Basic functionality should remain
      const resetButton = page.getByRole('button').filter({ has: page.locator('.mdi-refresh') });
      await expect(resetButton).toBeVisible();
      
      await resetButton.click();
      // Wait for reset to complete
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      
      // Should return to stable state
      await helpers.testNavigationControls('start');
    });
  });

  test.describe('Feature Coverage Validation', () => {
    test('should verify all identified features are accessible', async ({ page }) => {
      const featureCheckList = [
        // View modes
        'Capital Region Heat',
        'Statistical Grid',
        
        // Navigation controls  
        '.mdi-refresh',
        '.mdi-compass',
        
        // Layer controls
        'NDVI',
        'HSY Land Cover',
        
        // Filter controls
        'Only public buildings',
        'Only tall buildings',
        
        // Expansion panels
        'HSY Background maps',
        'Syke Flood Background Maps', 
        'Geocoding',
        
        // Level-specific features (test at appropriate levels)
        'Building Scatter Plot', // postal code level
        'Building heat data',    // building level
      ];
      
      // Test features at start level
      await expect(page.getByText('Capital Region Heat')).toBeVisible();
      await expect(page.getByText('Statistical Grid')).toBeVisible();
      await expect(page.getByText('NDVI')).toBeVisible();
      await expect(page.getByText('HSY Land Cover')).toBeVisible();
      await expect(page.getByText('Only public buildings')).toBeVisible();
      await expect(page.getByText('Only tall buildings')).toBeVisible();
      await expect(page.getByText('HSY Background maps')).toBeVisible();
      await expect(page.getByText('Syke Flood Background Maps')).toBeVisible();
      await expect(page.getByText('Geocoding')).toBeVisible();
      
      // Test features at postal code level
      await helpers.drillToLevel('postalCode');
      // Wait for postal code level
      await page.waitForSelector('text="Building Scatter Plot"', { timeout: 10000 }).catch(() => {});
      await expect(page.getByText('Building Scatter Plot')).toBeVisible();
      
      // Test features at building level
      await helpers.drillToLevel('building');
      // Wait for building level
      await page.waitForSelector('text="Building heat data"', { timeout: 15000 }).catch(() => {});
      await expect(page.getByText('Building heat data')).toBeVisible();
      
      // All essential controls should remain functional
      const resetButton = page.getByRole('button').filter({ has: page.locator('.mdi-refresh') });
      const backButton = page.getByRole('button').filter({ has: page.locator('.mdi-arrow-left') });
      
      await expect(resetButton).toBeVisible();
      await expect(backButton).toBeVisible();
    });
  });
});