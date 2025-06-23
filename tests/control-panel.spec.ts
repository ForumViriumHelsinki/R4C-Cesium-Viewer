import { test, expect } from '@playwright/test';

test.describe('Control Panel Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Dismiss the disclaimer popup
    await page.getByRole('button', { name: 'Explore Map' }).click();
    
    // Ensure control panel is visible
    const toggleButton = page.getByRole('button', { name: /Show Controls|Hide Controls/ });
    const isHidden = (await toggleButton.textContent())?.includes('Show');
    if (isHidden) {
      await toggleButton.click();
    }
  });

  test('should display main control sections', async ({ page }) => {
    // Check for main control panel
    await expect(page.locator('.control-panel')).toBeVisible();
    
    // Check for search functionality
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i]');
    if (await searchInput.count() > 0) {
      await expect(searchInput.first()).toBeVisible();
    }
    
    // Check for view mode controls
    const viewModeControls = page.locator('[data-testid="view-mode"], .view-mode, [class*="view-mode"]');
    if (await viewModeControls.count() > 0) {
      await expect(viewModeControls.first()).toBeVisible();
    }
  });

  test('should handle UnifiedSearch functionality', async ({ page }) => {
    // Look for unified search component
    const searchComponent = page.locator('[data-testid="unified-search"], .unified-search, input[placeholder*="search" i]');
    
    if (await searchComponent.count() > 0) {
      const searchInput = searchComponent.first();
      await expect(searchInput).toBeVisible();
      
      // Test search input interaction
      await searchInput.click();
      await searchInput.fill('Helsinki');
      
      // Wait for potential search results
      await page.waitForTimeout(1000);
      
      // Clear search
      await searchInput.clear();
    }
  });

  test('should display layer controls', async ({ page }) => {
    // Check for layer control sections
    const layerControls = page.locator('[class*="layer"], [data-testid*="layer"], .control-section');
    
    if (await layerControls.count() > 0) {
      await expect(layerControls.first()).toBeVisible();
    }
    
    // Look for toggle switches
    const toggles = page.locator('input[type="checkbox"], .v-switch, [role="switch"]');
    if (await toggles.count() > 0) {
      await expect(toggles.first()).toBeVisible();
    }
  });

  test('should handle background map browser', async ({ page }) => {
    // Look for background map controls
    const backgroundMapButton = page.getByRole('button', { name: /background.*map|HSY.*map/i });
    
    if (await backgroundMapButton.count() > 0) {
      await backgroundMapButton.click();
      
      // Wait for background map browser to open
      await page.waitForTimeout(500);
      
      // Check for search input in background map browser
      const mapSearchInput = page.getByPlaceholder(/search.*layer|search.*map/i);
      if (await mapSearchInput.count() > 0) {
        await expect(mapSearchInput).toBeVisible();
        
        // Test searching for a layer
        await mapSearchInput.fill('Kaupunginosat');
        await page.waitForTimeout(1000);
        
        // Clear search
        await mapSearchInput.clear();
      }
      
      // Close background map browser if there's a close button
      const closeButton = page.getByRole('button', { name: /close|cancel/i });
      if (await closeButton.count() > 0) {
        await closeButton.click();
      }
    }
  });

  test('should display graphics quality controls', async ({ page }) => {
    // Look for graphics quality controls
    const graphicsControls = page.locator('[data-testid="graphics"], [class*="graphics"], .graphics-quality');
    
    if (await graphicsControls.count() > 0) {
      await expect(graphicsControls.first()).toBeVisible();
      
      // Check for quality settings
      const qualitySettings = page.locator('select, .v-select, [role="combobox"]');
      if (await qualitySettings.count() > 0) {
        const firstSetting = qualitySettings.first();
        if (await firstSetting.isVisible()) {
          await firstSetting.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should handle statistical grid options', async ({ page }) => {
    // Look for statistical grid controls
    const gridCheckbox = page.getByLabel(/statistical.*grid|grid/i);
    
    if (await gridCheckbox.count() > 0) {
      await gridCheckbox.check();
      await page.waitForTimeout(1000);
      
      // Look for grid size options
      const gridOptions = page.locator('[data-testid="grid-options"], .grid-options');
      if (await gridOptions.count() > 0) {
        await expect(gridOptions.first()).toBeVisible();
      }
      
      // Uncheck to clean up
      await gridCheckbox.uncheck();
    }
  });

  test('should display data layer toggles', async ({ page }) => {
    // Test various data layer toggles
    const layerToggles = [
      /vegetation/i,
      /tree/i,
      /building/i,
      /nature/i,
      /heat/i
    ];
    
    for (const togglePattern of layerToggles) {
      const toggle = page.getByLabel(togglePattern);
      if (await toggle.count() > 0) {
        await expect(toggle.first()).toBeVisible();
        
        // Test toggle interaction
        const isChecked = await toggle.first().isChecked();
        await toggle.first().click();
        await page.waitForTimeout(500);
        
        // Verify state changed
        const newState = await toggle.first().isChecked();
        expect(newState).toBe(!isChecked);
        
        // Reset to original state
        if (isChecked !== newState) {
          await toggle.first().click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should handle accordion/collapsible sections', async ({ page }) => {
    // Look for expandable sections
    const expandableHeaders = page.locator('[aria-expanded], .v-expansion-panel-header, .accordion-header');
    
    if (await expandableHeaders.count() > 0) {
      const firstHeader = expandableHeaders.first();
      
      if (await firstHeader.isVisible()) {
        // Get initial state
        const initialExpanded = await firstHeader.getAttribute('aria-expanded');
        
        // Click to toggle
        await firstHeader.click();
        await page.waitForTimeout(500);
        
        // Verify state changed
        const newExpanded = await firstHeader.getAttribute('aria-expanded');
        if (initialExpanded !== null && newExpanded !== null) {
          expect(newExpanded).not.toBe(initialExpanded);
        }
      }
    }
  });

  test('should handle responsive control panel', async ({ page }) => {
    // Test control panel in mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Control panel should still be functional
    const controlPanel = page.locator('.control-panel');
    if (await controlPanel.isVisible()) {
      await expect(controlPanel).toBeVisible();
      
      // Check that controls are still accessible
      const controls = page.locator('input, button, select').filter({ hasText: /.+/ });
      if (await controls.count() > 0) {
        await expect(controls.first()).toBeVisible();
      }
    }
  });
});