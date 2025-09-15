import { test as base, Page } from '@playwright/test';
import { waitForCesiumReady, setupCesiumForCI, waitForAppReady } from '../e2e/helpers/cesium-helper';

/**
 * Cesium Test Fixture
 * 
 * Provides optimized Cesium initialization for tests by:
 * - Pre-initializing Cesium viewer once per test
 * - Configuring optimal settings for CI environment
 * - Handling cleanup automatically
 * - Reducing test initialization overhead
 */

export interface CesiumFixtures {
  cesiumPage: Page;
}

/**
 * Extended test with Cesium fixture
 * 
 * Usage in tests:
 * ```typescript
 * import { cesiumTest } from '../fixtures/cesium-fixture';
 * 
 * cesiumTest('my test', async ({ cesiumPage }) => {
 *   // Cesium is already initialized
 *   await cesiumPage.click('.some-button');
 * });
 * ```
 */
export const cesiumTest = base.extend<CesiumFixtures>({
  cesiumPage: async ({ page }, use) => {
    // Setup Cesium for CI if needed
    await setupCesiumForCI(page);
    
    // Navigate to the application
    await page.goto('/');
    
    // Pre-initialize Cesium with optimized settings
    await page.evaluate(() => {
      // Set performance-optimized defaults before Cesium loads
      if (typeof window !== 'undefined') {
        // Store original settings to restore later
        (window as any).__originalCesiumSettings = {};
        
        // Configure Cesium for test environment
        (window as any).CESIUM_BASE_URL = '/cesium';
        
        // Wait for Cesium to be available and configure it
        const configureCesium = () => {
          if ((window as any).Cesium) {
            const Cesium = (window as any).Cesium;
            
            // Store viewer creation function
            const originalViewer = Cesium.Viewer;
            
            // Override Viewer constructor with test-optimized settings
            Cesium.Viewer = function(container: any, options: any = {}) {
              // Merge with performance-optimized defaults
              const testOptions = {
                ...options,
                // Disable expensive features for tests
                requestRenderMode: true, // Only render on demand
                maximumRenderTimeChange: Infinity, // Disable time-based rendering
                targetFrameRate: 10, // Lower frame rate for tests
                
                // Disable unnecessary widgets
                animation: false,
                baseLayerPicker: false,
                fullscreenButton: false,
                vrButton: false,
                homeButton: false,
                infoBox: false,
                sceneModePicker: false,
                selectionIndicator: false,
                timeline: false,
                navigationHelpButton: false,
                navigationInstructionsInitiallyVisible: false,
                
                // Simplify scene
                scene3DOnly: true,
                shadows: false,
                terrainShadows: Cesium.ShadowMode.DISABLED,
                
                // Optimize rendering
                msaaSamples: 1, // Minimal anti-aliasing
                useBrowserRecommendedResolution: false,
                resolutionScale: 0.5, // Lower resolution for tests
                
                // Disable globe features we don't need for tests
                globe: {
                  ...((options.globe as any) || {}),
                  enableLighting: false,
                  showGroundAtmosphere: false,
                  showWaterEffect: false,
                  depthTestAgainstTerrain: false
                },
                
                // Use simple imagery provider
                imageryProvider: false,
                terrainProvider: new Cesium.EllipsoidTerrainProvider()
              };
              
              // Create viewer with optimized settings
              const viewer = originalViewer.call(this, container, testOptions);
              
              // Store reference for tests
              (window as any).viewer = viewer;
              
              // Disable animations and effects
              if (viewer.scene) {
                viewer.scene.debugShowFramesPerSecond = false;
                viewer.scene.requestRenderMode = true;
                viewer.scene.maximumRenderTimeChange = Infinity;
                
                if (viewer.scene.globe) {
                  viewer.scene.globe.enableLighting = false;
                  viewer.scene.globe.showGroundAtmosphere = false;
                }
                
                if (viewer.scene.skyBox) {
                  viewer.scene.skyBox.show = false;
                }
                
                if (viewer.scene.sun) {
                  viewer.scene.sun.show = false;
                }
                
                if (viewer.scene.moon) {
                  viewer.scene.moon.show = false;
                }
              }
              
              return viewer;
            };
            
            // Copy static properties
            Object.keys(originalViewer).forEach(key => {
              Cesium.Viewer[key] = originalViewer[key];
            });
            
            // Mark as configured
            (window as any).__cesiumConfigured = true;
          }
        };
        
        // Try to configure immediately if Cesium is already loaded
        configureCesium();
        
        // Also set up observer for when Cesium loads
        if (!(window as any).Cesium) {
          const observer = new MutationObserver(() => {
            if ((window as any).Cesium && !(window as any).__cesiumConfigured) {
              configureCesium();
              observer.disconnect();
            }
          });
          
          observer.observe(document, {
            childList: true,
            subtree: true
          });
          
          // Disconnect observer after timeout
          setTimeout(() => observer.disconnect(), 30000);
        }
      }
    });
    
    // Wait for app to be ready
    await waitForAppReady(page, process.env.CI ? 60000 : 30000);
    
    // Wait for Cesium to be ready with extended timeout for CI
    await waitForCesiumReady(page, process.env.CI ? 60000 : 30000);
    
    // Ensure viewer is initialized with our settings
    await page.evaluate(() => {
      // If viewer doesn't exist, try to trigger its creation
      if (!(window as any).viewer) {
        // Look for cesium container
        const container = document.getElementById('cesiumContainer') || 
                         document.querySelector('.cesium-container');
        
        if (container && (window as any).Cesium) {
          (window as any).viewer = new (window as any).Cesium.Viewer(container);
        }
      }
      
      // Force initial render
      if ((window as any).viewer?.scene) {
        (window as any).viewer.scene.requestRender();
      }
    });
    
    // Use the page with pre-initialized Cesium
    await use(page);
    
    // Cleanup
    await page.evaluate(() => {
      // Destroy viewer if it exists
      if ((window as any).viewer) {
        try {
          (window as any).viewer.destroy();
        } catch (e) {
          console.warn('Failed to destroy viewer:', e);
        }
        delete (window as any).viewer;
      }
      
      // Restore original settings
      if ((window as any).__originalCesiumSettings) {
        Object.keys((window as any).__originalCesiumSettings).forEach(key => {
          (window as any)[key] = (window as any).__originalCesiumSettings[key];
        });
      }
    }).catch(() => {
      // Cleanup errors are not critical
    });
  }
});

/**
 * Helper to skip Cesium tests in environments where WebGL is not available
 */
export const cesiumDescribe = (title: string, fn: () => void) => {
  // In CI, always run the tests (even if they might fail)
  if (process.env.CI) {
    cesiumTest.describe(title, fn);
  } else {
    // In local development, check WebGL availability
    cesiumTest.describe(title, () => {
      cesiumTest.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        const hasWebGL = await page.evaluate(() => {
          try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('webgl2'));
          } catch {
            return false;
          }
        });
        
        await context.close();
        
        if (!hasWebGL) {
          cesiumTest.skip();
        }
      });
      
      fn();
    });
  }
};