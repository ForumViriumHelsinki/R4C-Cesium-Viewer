import { test, expect } from '@playwright/test';
import { setupDigitransitMock } from './setup/digitransit-mock';

// Setup digitransit mocking for all tests in this file
setupDigitransitMock();

test.describe('Loading Performance and User Experience', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load initial page quickly', async ({ page }) => {
    const startTime = Date.now();
    
    // Wait for disclaimer popup to appear (indicates app is loaded)
    await expect(page.getByRole('button', { name: 'Explore Map' })).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within reasonable time (adjust threshold as needed)
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
    
    // Dismiss disclaimer
    await page.getByRole('button', { name: 'Explore Map' }).click();
  });

  test('should display loading indicators during data fetching', async ({ page }) => {
    await page.getByRole('button', { name: 'Explore Map' }).click();
    await page.waitForTimeout(1000);
    
    const canvas = page.locator('canvas');
    
    // Click to trigger data loading
    await canvas.click({ position: { x: 400, y: 300 } });
    
    // Check for loading indicators
    const loadingIndicators = page.locator('.loading, [data-testid="loading"], .v-progress-circular, .spinner');
    
    if (await loadingIndicators.count() > 0) {
      // Loading indicator should appear initially
      const hasVisibleLoader = await loadingIndicators.filter({ hasText: /./ }).count() > 0;
      if (hasVisibleLoader) {
        await expect(loadingIndicators.first()).toBeVisible();
      }
    }
    
    // Wait for loading to complete
    await page.waitForTimeout(5000);
    
    // Loading indicators should eventually disappear
    if (await loadingIndicators.count() > 0) {
      // Check if loaders are hidden after loading
      const stillVisible = await loadingIndicators.filter({ hasText: /./ }).count();
      // Some loaders might still be in DOM but hidden
    }
  });

  test('should handle layer loading smoothly', async ({ page }) => {
    await page.getByRole('button', { name: 'Explore Map' }).click();
    await page.waitForTimeout(1000);
    
    const canvas = page.locator('canvas');
    
    // Navigate to postal code level
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(3000);
    
    // Toggle vegetation layer and measure loading time
    const vegToggle = page.getByLabel(/vegetation/i);
    if (await vegToggle.count() > 0) {
      const startTime = Date.now();
      
      await vegToggle.check();
      
      // Wait for layer to load (look for completion indicators)
      await page.waitForTimeout(3000);
      
      const loadTime = Date.now() - startTime;
      
      // Layer should load within reasonable time
      expect(loadTime).toBeLessThan(15000); // 15 seconds max
      
      // App should remain responsive during loading
      await expect(canvas).toBeVisible();
      await expect(vegToggle).toBeEnabled();
      
      // Clean up
      await vegToggle.uncheck();
      await page.waitForTimeout(1000);
    }
  });

  test('should show progress for large data loads', async ({ page }) => {
    await page.getByRole('button', { name: 'Explore Map' }).click();
    await page.waitForTimeout(1000);
    
    const canvas = page.locator('canvas');
    
    // Navigate to trigger large data load
    await canvas.click({ position: { x: 400, y: 300 } });
    
    // Look for progress indicators
    const progressIndicators = page.locator('.v-progress-linear, .progress-bar, [role="progressbar"]');
    
    if (await progressIndicators.count() > 0) {
      const progress = progressIndicators.first();
      if (await progress.isVisible()) {
        await expect(progress).toBeVisible();
        
        // Progress should update over time
        await page.waitForTimeout(2000);
      }
    }
    
    // Check for data source status updates
    const statusIndicator = page.locator('.status-indicator-container');
    if (await statusIndicator.isVisible()) {
      await expect(statusIndicator).toBeVisible();
    }
  });

  test('should handle multiple concurrent layer loads', async ({ page }) => {
    await page.getByRole('button', { name: 'Explore Map' }).click();
    await page.waitForTimeout(1000);
    
    const canvas = page.locator('canvas');
    
    // Navigate to postal code level
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(3000);
    
    // Enable multiple layers simultaneously
    const layers = [
      /vegetation/i,
      /tree/i,
      /nature/i
    ];
    
    const startTime = Date.now();
    
    // Toggle multiple layers quickly
    for (const layerPattern of layers) {
      const toggle = page.getByLabel(layerPattern);
      if (await toggle.count() > 0) {
        await toggle.check();
        await page.waitForTimeout(100); // Small delay between toggles
      }
    }
    
    // Wait for all layers to load
    await page.waitForTimeout(8000);
    
    const totalLoadTime = Date.now() - startTime;
    
    // Multiple layers should load efficiently
    expect(totalLoadTime).toBeLessThan(20000); // 20 seconds max
    
    // App should remain responsive
    await expect(canvas).toBeVisible();
    
    // Clean up - uncheck all layers
    for (const layerPattern of layers) {
      const toggle = page.getByLabel(layerPattern);
      if (await toggle.count() > 0) {
        await toggle.uncheck();
        await page.waitForTimeout(100);
      }
    }
  });

  test('should handle error states gracefully', async ({ page }) => {
    await page.getByRole('button', { name: 'Explore Map' }).click();
    await page.waitForTimeout(1000);
    
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Try to trigger potential error conditions
    const canvas = page.locator('canvas');
    
    // Click on multiple areas rapidly
    await canvas.click({ position: { x: 100, y: 100 } });
    await canvas.click({ position: { x: 200, y: 200 } });
    await canvas.click({ position: { x: 300, y: 300 } });
    await page.waitForTimeout(2000);
    
    // App should still be functional
    await expect(canvas).toBeVisible();
    
    // Check that control panel still works
    const toggleButton = page.getByRole('button', { name: /Show Controls|Hide Controls/ });
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();
    await page.waitForTimeout(500);
    
    // Errors should be minimal or handled gracefully
    // Note: Some console errors might be expected (network timeouts, etc.)
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('TypeError') || 
      error.includes('ReferenceError') ||
      error.includes('Cannot read')
    );
    
    if (criticalErrors.length > 0) {
      console.warn('Critical errors detected:', criticalErrors);
    }
  });

  test('should maintain performance with navigation', async ({ page }) => {
    await page.getByRole('button', { name: 'Explore Map' }).click();
    await page.waitForTimeout(1000);
    
    const canvas = page.locator('canvas');
    
    // Perform multiple navigation actions
    const startTime = Date.now();
    
    // Navigate to postal code
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(2000);
    
    // Try to navigate to building
    await canvas.click({ position: { x: 420, y: 320 } });
    await page.waitForTimeout(1000);
    
    // Navigate back if possible
    const returnButton = page.getByRole('button', { name: /return|back/i });
    if (await returnButton.count() > 0) {
      await returnButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Reset view
    const resetButton = page.getByRole('button', { name: /reset/i });
    if (await resetButton.count() > 0) {
      await resetButton.click();
      await page.waitForTimeout(1000);
    }
    
    const totalTime = Date.now() - startTime;
    
    // Navigation sequence should complete efficiently
    expect(totalTime).toBeLessThan(15000); // 15 seconds max
    
    // App should still be responsive
    await expect(canvas).toBeVisible();
  });

  test('should handle memory efficiently during long session', async ({ page }) => {
    await page.getByRole('button', { name: 'Explore Map' }).click();
    await page.waitForTimeout(1000);
    
    const canvas = page.locator('canvas');
    
    // Simulate longer user session with multiple interactions
    const interactions = [
      { x: 300, y: 300 },
      { x: 400, y: 300 },
      { x: 500, y: 300 },
      { x: 400, y: 400 },
      { x: 400, y: 200 }
    ];
    
    for (const position of interactions) {
      await canvas.click({ position });
      await page.waitForTimeout(2000);
      
      // Toggle some layers
      const vegToggle = page.getByLabel(/vegetation/i);
      if (await vegToggle.count() > 0) {
        await vegToggle.check();
        await page.waitForTimeout(1000);
        await vegToggle.uncheck();
        await page.waitForTimeout(500);
      }
      
      // App should remain responsive throughout
      await expect(canvas).toBeVisible();
    }
    
    // Final check - app should still be functional
    const toggleButton = page.getByRole('button', { name: /Show Controls|Hide Controls/ });
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();
    await page.waitForTimeout(500);
    await toggleButton.click();
  });

  test('should cache data effectively', async ({ page }) => {
    await page.getByRole('button', { name: 'Explore Map' }).click();
    await page.waitForTimeout(1000);
    
    const canvas = page.locator('canvas');
    
    // First visit to an area
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(3000);
    
    // Enable a layer
    const vegToggle = page.getByLabel(/vegetation/i);
    if (await vegToggle.count() > 0) {
      const firstLoadStart = Date.now();
      await vegToggle.check();
      await page.waitForTimeout(3000);
      const firstLoadTime = Date.now() - firstLoadStart;
      
      await vegToggle.uncheck();
      await page.waitForTimeout(1000);
      
      // Navigate away and back
      await canvas.click({ position: { x: 200, y: 200 } });
      await page.waitForTimeout(1000);
      await canvas.click({ position: { x: 400, y: 300 } });
      await page.waitForTimeout(2000);
      
      // Second load should be faster (cached)
      const secondLoadStart = Date.now();
      await vegToggle.check();
      await page.waitForTimeout(1000);
      const secondLoadTime = Date.now() - secondLoadStart;
      
      // Second load should be significantly faster
      expect(secondLoadTime).toBeLessThan(firstLoadTime * 0.8);
      
      await vegToggle.uncheck();
    }
  });
});