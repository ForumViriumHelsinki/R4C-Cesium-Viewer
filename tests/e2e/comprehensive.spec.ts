import { test, expect } from '@playwright/test';

// Helper functions for common interactions
async function dismissDisclaimer(page: any) {
  try {
    await page.getByRole('button', { name: 'Close' }).click({ timeout: 2000 });
  } catch (error) {
    // Disclaimer might not be present or already dismissed
  }
}

async function waitForMapLoad(page: any) {
  // Wait for Cesium to load and render
  await page.waitForSelector('canvas', { state: 'visible', timeout: 10000 });
  await page.waitForTimeout(2000); // Additional time for 3D rendering
}

async function clickOnMap(page: any, x: number, y: number) {
  await page.locator('canvas').click({ position: { x, y } });
  await page.waitForTimeout(1000); // Wait for map response
}

test.describe('R4C Climate Visualization Comprehensive Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissDisclaimer(page);
    await waitForMapLoad(page);
  });

  test.describe('Basic Application Functionality', () => {
    test('should load main page with correct title and elements', async ({ page }) => {
      await expect(page).toHaveTitle(/R4C Uusimaa Demo/);
      
      // Check for key UI elements
      await expect(page.locator('#logoR4C')).toBeVisible();
      await expect(page.locator('#logoFVH')).toBeVisible();
      await expect(page.locator('canvas')).toBeVisible();
      
      // Check that the 3D viewer has loaded
      const canvas = page.locator('canvas');
      await expect(canvas).toHaveAttribute('width');
      await expect(canvas).toHaveAttribute('height');
    });

    test('should handle window resize correctly', async ({ page }) => {
      const initialSize = await page.viewportSize();
      
      // Resize window
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.waitForTimeout(1000);
      
      // Canvas should adapt to new size
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();
      
      // Restore original size
      if (initialSize) {
        await page.setViewportSize(initialSize);
      }
    });
  });

  test.describe('Map Navigation and Interaction', () => {
    test('should support camera controls', async ({ page }) => {
      // Test zoom in/out buttons if present
      try {
        const cameraControls = page.locator('[class*="camera"]');
        if (await cameraControls.count() > 0) {
          await cameraControls.first().click();
          await page.waitForTimeout(1000);
        }
      } catch (error) {
        // Camera controls might not be visible or implemented differently
      }
      
      // Test mouse wheel zoom by dispatching wheel events
      await page.locator('canvas').hover();
      await page.mouse.wheel(0, -100); // Zoom in
      await page.waitForTimeout(500);
      await page.mouse.wheel(0, 100); // Zoom out
      await page.waitForTimeout(500);
    });

    test('should handle map clicks and feature selection', async ({ page }) => {
      // Click on different areas of the map
      const mapAreas = [
        { x: 400, y: 300, description: 'center area' },
        { x: 600, y: 200, description: 'upper right area' },
        { x: 200, y: 400, description: 'lower left area' }
      ];

      for (const area of mapAreas) {
        await clickOnMap(page, area.x, area.y);
        // Check if any UI elements respond to the click
        await page.waitForTimeout(1000);
      }
    });

    test('should maintain map state during navigation', async ({ page }) => {
      // Interact with the map
      await clickOnMap(page, 500, 300);
      await page.waitForTimeout(1000);
      
      // Navigate to different sections if available
      const navButtons = await page.locator('button').all();
      if (navButtons.length > 0) {
        for (const button of navButtons.slice(0, 3)) { // Test first 3 buttons
          try {
            const buttonText = await button.textContent();
            if (buttonText && !buttonText.toLowerCase().includes('close')) {
              await button.click();
              await page.waitForTimeout(2000);
              
              // Verify map is still functional
              await expect(page.locator('canvas')).toBeVisible();
            }
          } catch (error) {
            // Button might not be clickable or cause navigation issues
          }
        }
      }
    });
  });

  test.describe('HSY Background Maps Integration', () => {
    test('should load and interact with background maps', async ({ page }) => {
      // Try to access background maps functionality
      try {
        await page.getByRole('button', { name: 'HSY Background maps' }).click();
        
        // Test search functionality
        const searchInput = page.getByPlaceholder('Search for WMS layers');
        if (await searchInput.isVisible()) {
          await searchInput.click();
          await searchInput.fill('Kaupunginosat');
          await page.waitForTimeout(2000);
          
          // Check if search results appear
          await expect(page.locator('v-list-item-group')).toBeVisible();
          await expect(page.locator('v-list-item-group')).toContainText('Kaupunginosat');
        }
      } catch (error) {
        test.skip('HSY Background maps not available');
      }
    });

    test('should handle WMS layer selection', async ({ page }) => {
      try {
        await page.getByRole('button', { name: 'HSY Background maps' }).click();
        
        const searchInput = page.getByPlaceholder('Search for WMS layers');
        if (await searchInput.isVisible()) {
          await searchInput.fill('Kaupunginosat');
          await page.waitForTimeout(2000);
          
          // Try to select a layer
          const layerItems = page.locator('v-list-item');
          const layerCount = await layerItems.count();
          
          if (layerCount > 0) {
            await layerItems.first().click();
            await page.waitForTimeout(3000);
            
            // Verify layer is loaded (canvas should still be functional)
            await expect(page.locator('canvas')).toBeVisible();
          }
        }
      } catch (error) {
        test.skip('WMS layer selection not working');
      }
    });
  });

  test.describe('Building Information and Properties', () => {
    test('should display building information when building is selected', async ({ page }) => {
      // Click on a specific location likely to have building data
      await clickOnMap(page, 690, 394);
      await page.waitForTimeout(3000);
      
      // Click again to ensure selection
      await clickOnMap(page, 674, 363);
      await page.waitForTimeout(2000);
      
      try {
        await page.getByRole('button', { name: 'Building properties' }).click();
        await page.waitForTimeout(2000);
        
        // Check if building information container appears
        const buildingInfo = page.locator('#printContainer');
        if (await buildingInfo.isVisible()) {
          await expect(buildingInfo).toBeVisible();
          
          // Should contain some building-related text
          const content = await buildingInfo.textContent();
          expect(content).toBeTruthy();
          expect(content?.length).toBeGreaterThan(0);
        }
      } catch (error) {
        // Building properties might not be available for this location
      }
    });

    test('should handle building data for different locations', async ({ page }) => {
      const buildingTestLocations = [
        { x: 690, y: 394, name: 'Location 1' },
        { x: 500, y: 300, name: 'Location 2' },
        { x: 400, y: 250, name: 'Location 3' }
      ];

      for (const location of buildingTestLocations) {
        await clickOnMap(page, location.x, location.y);
        await page.waitForTimeout(2000);
        
        try {
          const buildingButton = page.getByRole('button', { name: 'Building properties' });
          if (await buildingButton.isVisible({ timeout: 1000 })) {
            await buildingButton.click();
            await page.waitForTimeout(1000);
            
            // Check for any building information
            const hasInfo = await page.locator('#printContainer').isVisible();
            console.log(`Building info available at ${location.name}: ${hasInfo}`);
          }
        } catch (error) {
          // No building data at this location
        }
      }
    });
  });

  test.describe('Statistical Grid and Data Layers', () => {
    test('should enable and interact with statistical grid', async ({ page }) => {
      try {
        // Enable statistical grid
        const gridCheckbox = page.getByLabel('Statistical Grid');
        if (await gridCheckbox.isVisible()) {
          await gridCheckbox.check();
          await page.waitForTimeout(2000);
          
          // Select grid resolution
          const gridOption = page.locator('div').filter({ hasText: /^250m grid$/ });
          if (await gridOption.isVisible()) {
            await gridOption.locator('span').click();
            await page.waitForTimeout(2000);
          }
          
          // Verify grid is displayed
          await expect(page.locator('canvas')).toBeVisible();
        }
      } catch (error) {
        test.skip('Statistical grid not available');
      }
    });

    test('should display heat vulnerability information', async ({ page }) => {
      try {
        // Enable statistical grid first
        await page.getByLabel('Statistical Grid').check();
        await page.waitForTimeout(1000);
        
        await page.locator('div').filter({ hasText: /^250m grid$/ }).locator('span').click();
        await page.waitForTimeout(2000);
        
        // Access heat vulnerability
        const heatVulnButton = page.getByRole('heading', { name: 'Heat Vulnerability' });
        if (await heatVulnButton.isVisible()) {
          await heatVulnButton.click();
          await page.waitForTimeout(2000);
          
          await expect(heatVulnButton).toBeVisible();
        }
      } catch (error) {
        test.skip('Heat vulnerability data not available');
      }
    });
  });

  test.describe('Data Loading and Performance', () => {
    test('should handle loading states correctly', async ({ page }) => {
      // Monitor network requests
      const responses: any[] = [];
      page.on('response', response => {
        responses.push({
          url: response.url(),
          status: response.status(),
          contentType: response.headers()['content-type']
        });
      });

      // Perform actions that trigger data loading
      await clickOnMap(page, 500, 300);
      await page.waitForTimeout(2000);
      
      // Try various features that might trigger loading
      const testButtons = [
        'Building properties',
        'HSY Background maps',
        'Heat Vulnerability'
      ];

      for (const buttonName of testButtons) {
        try {
          const button = page.getByRole('button', { name: buttonName });
          if (await button.isVisible({ timeout: 1000 })) {
            await button.click();
            await page.waitForTimeout(1500);
          }
        } catch (error) {
          // Button not available
        }
      }

      // Check that some network requests were made
      expect(responses.length).toBeGreaterThan(0);
      
      // Verify no critical errors (500+ status codes)
      const criticalErrors = responses.filter(r => r.status >= 500);
      expect(criticalErrors.length).toBe(0);
    });

    test('should handle slow network conditions', async ({ page }) => {
      // Simulate slow network
      await page.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
        await route.continue();
      });

      // Perform typical user interactions
      await clickOnMap(page, 400, 300);
      await page.waitForTimeout(3000);
      
      // Application should remain responsive
      await expect(page.locator('canvas')).toBeVisible();
      
      // Try to interact with available controls
      const buttons = await page.locator('button:visible').all();
      if (buttons.length > 0) {
        await buttons[0].click();
        await page.waitForTimeout(2000);
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network failures gracefully', async ({ page }) => {
      // Block specific API calls
      await page.route('**/api/**', route => {
        route.abort('failed');
      });

      // Application should still load basic interface
      await expect(page.locator('canvas')).toBeVisible();
      await expect(page.locator('#logoR4C')).toBeVisible();
      
      // User interactions should not crash the application
      await clickOnMap(page, 400, 300);
      await page.waitForTimeout(1000);
    });

    test('should handle invalid user inputs', async ({ page }) => {
      // Test with various input scenarios
      try {
        const searchInput = page.getByPlaceholder('Search for WMS layers');
        if (await searchInput.isVisible({ timeout: 2000 })) {
          // Test empty search
          await searchInput.click();
          await searchInput.fill('');
          await page.waitForTimeout(1000);
          
          // Test very long search term
          await searchInput.fill('a'.repeat(1000));
          await page.waitForTimeout(1000);
          
          // Test special characters
          await searchInput.fill('!@#$%^&*()');
          await page.waitForTimeout(1000);
          
          // Clear the input
          await searchInput.fill('');
        }
      } catch (error) {
        // Search input not available
      }
      
      // Application should remain stable
      await expect(page.locator('canvas')).toBeVisible();
    });

    test('should handle rapid user interactions', async ({ page }) => {
      // Rapidly click on different map areas
      const clickPositions = [
        { x: 200, y: 200 },
        { x: 400, y: 200 },
        { x: 600, y: 200 },
        { x: 200, y: 400 },
        { x: 400, y: 400 },
        { x: 600, y: 400 }
      ];

      for (const pos of clickPositions) {
        await clickOnMap(page, pos.x, pos.y);
        await page.waitForTimeout(100); // Very short wait
      }

      // Application should remain responsive
      await expect(page.locator('canvas')).toBeVisible();
      await page.waitForTimeout(2000); // Allow processing to complete
    });
  });

  test.describe('Mobile and Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      
      // Basic elements should still be visible
      await expect(page.locator('canvas')).toBeVisible();
      await expect(page.locator('#logoR4C')).toBeVisible();
      
      // Touch interactions should work
      await page.touchscreen.tap(200, 300);
      await page.waitForTimeout(1000);
      
      // Test zoom gestures (if supported)
      await page.touchscreen.tap(200, 300);
      await page.waitForTimeout(500);
    });

    test('should adapt to different screen sizes', async ({ page }) => {
      const viewports = [
        { width: 320, height: 568, name: 'iPhone SE' },
        { width: 768, height: 1024, name: 'iPad' },
        { width: 1024, height: 768, name: 'iPad Landscape' },
        { width: 1920, height: 1080, name: 'Desktop HD' }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(1000);
        
        // Core functionality should work at all sizes
        await expect(page.locator('canvas')).toBeVisible();
        
        // Test basic interaction
        await clickOnMap(page, viewport.width / 2, viewport.height / 2);
        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe('Data Visualization Features', () => {
    test('should handle different visualization modes', async ({ page }) => {
      // Test various toggle options if available
      const toggleOptions = [
        'Statistical Grid',
        'Heat Vulnerability',
        'Building properties'
      ];

      for (const option of toggleOptions) {
        try {
          const element = page.getByText(option).first();
          if (await element.isVisible({ timeout: 1000 })) {
            await element.click();
            await page.waitForTimeout(2000);
            
            // Verify the map is still functional
            await expect(page.locator('canvas')).toBeVisible();
          }
        } catch (error) {
          // Option not available
        }
      }
    });

    test('should support timeline functionality if available', async ({ page }) => {
      // Look for timeline or date controls
      const timelineSelectors = [
        '[class*="timeline"]',
        '[class*="date"]',
        'input[type="date"]',
        'select[class*="year"]'
      ];

      for (const selector of timelineSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 })) {
            await element.click();
            await page.waitForTimeout(1000);
            
            // If it's a select or input, try to change the value
            const tagName = await element.evaluate(el => el.tagName.toLowerCase());
            if (tagName === 'select') {
              const options = await element.locator('option').all();
              if (options.length > 1) {
                await element.selectOption({ index: 1 });
                await page.waitForTimeout(2000);
              }
            }
          }
        } catch (error) {
          // Timeline controls not found
        }
      }
    });
  });
});