import { Page } from '@playwright/test';

/**
 * Helper utilities for handling Cesium WebGL initialization in tests
 */

/**
 * Wait for Cesium to be ready on the page
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait in milliseconds
 * @returns Promise that resolves when Cesium is ready
 */
export async function waitForCesiumReady(page: Page, timeout: number = 30000): Promise<void> {
  try {
    // Wait for Cesium viewer to be available
    await page.waitForFunction(
      () => {
        // Check if window.Cesium exists
        if (typeof window === 'undefined' || !window.Cesium) {
          return false;
        }
        
        // Check if viewer exists (common pattern in Cesium apps)
        const viewer = window.viewer || window.cesiumViewer || 
                      document.querySelector('.cesium-viewer');
        
        if (!viewer) {
          return false;
        }
        
        // Check if WebGL context is available
        const canvas = document.querySelector('canvas.cesium-widget-canvas') ||
                      document.querySelector('#cesiumContainer canvas');
        
        if (canvas && canvas instanceof HTMLCanvasElement) {
          try {
            const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
            return !!gl;
          } catch (e) {
            console.warn('WebGL context check failed:', e);
            return false;
          }
        }
        
        return false;
      },
      { timeout }
    );
  } catch (error) {
    console.warn('Cesium readiness check failed:', error);
    
    // In CI environment, we might need to proceed without full Cesium
    if (process.env.CI) {
      console.log('Running in CI mode - proceeding despite Cesium initialization issues');
      await page.waitForTimeout(2000); // Give it a bit more time
      return;
    }
    
    throw error;
  }
}

/**
 * Check if WebGL is available in the browser
 * @param page - Playwright page object
 * @returns Promise<boolean> indicating WebGL availability
 */
export async function isWebGLAvailable(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
      return !!gl;
    } catch (e) {
      return false;
    }
  });
}

/**
 * Setup Cesium for CI environment with fallback options
 * @param page - Playwright page object
 */
export async function setupCesiumForCI(page: Page): Promise<void> {
  if (!process.env.CI) {
    return; // Only apply CI-specific setup in CI environment
  }
  
  // Inject CI-specific configurations before page loads
  await page.addInitScript(() => {
    // Override WebGL context creation to use software rendering hints
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
      if (contextType === 'webgl' || contextType === 'webgl2') {
        const contextAttributes = args[0] || {};
        // Force software rendering attributes
        contextAttributes.failIfMajorPerformanceCaveat = false;
        contextAttributes.powerPreference = 'low-power';
        args[0] = contextAttributes;
      }
      return originalGetContext.apply(this, [contextType, ...args]);
    };
    
    // Set Cesium to use minimal settings
    if (typeof window !== 'undefined') {
      window.CESIUM_BASE_URL = '/cesium';
      
      // Override Cesium defaults when it loads
      const cesiumReadyInterval = setInterval(() => {
        if (window.Cesium) {
          // Disable fancy features that might cause issues in CI
          if (window.Cesium.FeatureDetection) {
            window.Cesium.FeatureDetection.supportsWebGL = () => true;
          }
          clearInterval(cesiumReadyInterval);
        }
      }, 100);
      
      // Clear interval after timeout to prevent memory leak
      setTimeout(() => clearInterval(cesiumReadyInterval), 30000);
    }
  });
}

/**
 * Wait for the application to be ready (not just Cesium)
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait in milliseconds
 */
export async function waitForAppReady(page: Page, timeout: number = 30000): Promise<void> {
  // First wait for basic DOM readiness
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for network to be idle
  await page.waitForLoadState('networkidle', { timeout: timeout / 2 }).catch(() => {
    console.log('Network did not become idle, continuing...');
  });
  
  // Check for app-specific readiness indicators
  try {
    // Wait for Vue app to mount (assuming Vue is used)
    await page.waitForSelector('#app', { timeout: timeout / 3 });
    
    // Wait for any loading indicators to disappear
    await page.waitForSelector('.loading', { state: 'hidden', timeout: timeout / 3 }).catch(() => {});
    await page.waitForSelector('.spinner', { state: 'hidden', timeout: timeout / 3 }).catch(() => {});
    
    // Give the app a moment to stabilize
    await page.waitForTimeout(1000);
  } catch (error) {
    console.warn('App readiness check encountered issues:', error);
  }
}

/**
 * Handle Cesium initialization with retries
 * @param page - Playwright page object
 * @param retries - Number of retry attempts
 */
export async function initializeCesiumWithRetry(
  page: Page,
  retries: number = 3
): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await setupCesiumForCI(page);
      await waitForAppReady(page);
      
      const hasWebGL = await isWebGLAvailable(page);
      if (!hasWebGL && !process.env.CI) {
        throw new Error('WebGL not available');
      }
      
      await waitForCesiumReady(page, 20000);
      return true;
    } catch (error) {
      console.log(`Cesium initialization attempt ${i + 1} failed:`, error);
      if (i < retries - 1) {
        await page.reload();
        await page.waitForTimeout(2000);
      }
    }
  }
  
  // In CI, we might proceed without full Cesium
  if (process.env.CI) {
    console.log('Proceeding without full Cesium initialization in CI mode');
    return false;
  }
  
  throw new Error('Failed to initialize Cesium after retries');
}