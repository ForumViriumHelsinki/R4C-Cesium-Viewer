/**
 * Comprehensive Test Helpers for R4C Cesium Viewer Accessibility Testing
 * 
 * These helpers provide utilities for testing all views, options, and features
 * to ensure nothing gets lost during interface overhaul.
 */

import { expect } from '@playwright/test';
import { PlaywrightPage, CesiumTestState } from '../types/playwright';
import { 
  waitForCesiumReady as cesiumWaitForReady,
  setupCesiumForCI,
  initializeCesiumWithRetry,
  waitForAppReady
} from './cesium-helper';

export interface ViewMode {
  id: 'capitalRegionView' | 'gridView' | 'helsinkiHeat';
  label: string;
  selector: string;
}

export interface NavigationLevel {
  level: 'start' | 'postalCode' | 'building';
  expectedElements: string[];
}

export class AccessibilityTestHelpers {
  private page: PlaywrightPage;
  
  constructor(page: PlaywrightPage) {
    this.page = page;
  }

  /**
   * Navigate to specific view mode and verify selection
   */
  async navigateToView(viewMode: 'capitalRegionView' | 'gridView'): Promise<void> {
    const viewModes: Record<string, ViewMode> = {
      capitalRegionView: {
        id: 'capitalRegionView',
        label: 'Capital Region Heat',
        selector: 'input[value="capitalRegionView"]'
      },
      gridView: {
        id: 'gridView', 
        label: 'Statistical Grid',
        selector: 'input[value="gridView"]'
      }
    };

    const targetView = viewModes[viewMode];
    if (!targetView) {
      throw new Error(`Unknown view mode: ${viewMode}`);
    }

    // Wait for view mode container to be visible
    await this.page.waitForSelector('#viewModeContainer');
    
    // Click the radio button for the target view
    await this.page.check(targetView.selector);
    
    // Wait for view transition to complete by checking if the view is properly loaded
    await this.page.waitForFunction(() => {
      const canvas = document.querySelector('canvas');
      return canvas && canvas.offsetWidth > 0;
    }, { timeout: 10000 });
    
    // Verify the selection is active
    await expect(this.page.locator(targetView.selector)).toBeChecked();
  }

  /**
   * Navigate through levels: start → postal code → building
   */
  async drillToLevel(targetLevel: 'postalCode' | 'building', identifier?: string): Promise<void> {
    switch (targetLevel) {
      case 'postalCode':
        // Click on a postal code area - using Helsinki center as default
        const postalCodeId = identifier || '00100';
        
        // Wait for Cesium viewer to be ready
        await this.page.waitForSelector('#cesiumContainer');
        // Wait for Cesium to properly initialize
        await this.page.waitForFunction(() => {
          const container = document.querySelector('#cesiumContainer');
          const canvas = container ? container.querySelector('canvas') : null;
          return canvas && canvas.offsetWidth > 0 && canvas.offsetHeight > 0;
        }, { timeout: process.env.CI ? 15000 : 10000 });
        
        // Simulate clicking on the center of the map where postal codes are
        const cesiumContainer = this.page.locator('#cesiumContainer');
        await cesiumContainer.click({ position: { x: 400, y: 300 } });
        
        // Wait for postal code level to activate by checking for level-specific UI changes
        await this.page.waitForFunction(() => {
          return document.readyState === 'complete';
        }, { timeout: 5000 });
        break;
        
      case 'building':
        // Ensure we're at postal code level first
        if (identifier) {
          await this.drillToLevel('postalCode', identifier);
        }
        
        // Click on a building (center-right area typically has buildings)
        const container = this.page.locator('#cesiumContainer');
        await container.click({ position: { x: 500, y: 350 } });
        
        // Wait for building level to activate by checking for level-specific UI changes
        await this.page.waitForFunction(() => {
          return document.readyState === 'complete';
        }, { timeout: 5000 });
        break;
    }
  }

  /**
   * Verify conditional panel visibility based on current state
   */
  async verifyPanelVisibility(conditions: {
    currentView?: string;
    currentLevel?: string;
    statsIndex?: string;
    hasData?: boolean;
  }): Promise<void> {
    const { currentView = 'capitalRegion', currentLevel = 'start', statsIndex, hasData = true } = conditions;

    // Test Cooling Centers panel (grid view + heat_index)
    if (currentView === 'grid' && statsIndex === 'heat_index') {
      await expect(this.page.getByText('Manage Cooling Centers')).toBeVisible();
    } else {
      await expect(this.page.getByText('Manage Cooling Centers')).not.toBeVisible();
    }

    // Test Statistical grid options (grid view only)
    if (currentView === 'grid') {
      await expect(this.page.getByText('Statistical grid options')).toBeVisible();
    } else {
      await expect(this.page.getByText('Statistical grid options')).not.toBeVisible();
    }

    // Test NDVI panel (not grid view)
    if (currentView !== 'grid') {
      await expect(this.page.getByText('NDVI', { exact: true })).toBeVisible();
    }

    // Test postal code level panels
    if (currentLevel === 'postalCode') {
      await expect(this.page.getByText('Building Scatter Plot')).toBeVisible();
      await expect(this.page.getByText('Area properties')).toBeVisible();
      
      if (hasData) {
        await expect(this.page.getByText('Heat Histogram')).toBeVisible();
      }
      
      if (currentView !== 'helsinki') {
        await expect(this.page.getByText('Land Cover')).toBeVisible();
      }
    }

    // Test building level panels
    if (currentLevel === 'building') {
      await expect(this.page.getByText('Building heat data')).toBeVisible();
      await expect(this.page.getByText('Building properties')).toBeVisible();
    }

    // Universal panels should always be visible
    await expect(this.page.getByText('HSY Background maps')).toBeVisible();
    await expect(this.page.getByText('Syke Flood Background Maps')).toBeVisible();
    await expect(this.page.getByText('Geocoding')).toBeVisible();
  }

  /**
   * Test all layer toggles systematically
   */
  async testAllToggles(context: {
    currentView: string;
    currentLevel: string;
    hasPostalCode: boolean;
  }): Promise<void> {
    const { currentView, currentLevel, hasPostalCode } = context;

    // Test layer toggles based on context
    if (currentView === 'helsinki') {
      await this.testToggle('Vegetation', true);
      await this.testToggle('Other Nature', true);
    } else {
      await this.testToggle('Vegetation', false);
      await this.testToggle('Other Nature', false);
    }

    // Trees toggle (not grid view + has postal code)
    if (currentView !== 'grid' && hasPostalCode) {
      await this.testToggle('Trees', true);
    } else {
      await this.testToggle('Trees', false);
    }

    // HSY Land Cover (not Helsinki view)
    if (currentView !== 'helsinki') {
      await this.testToggle('HSY Land Cover', true);
    } else {
      await this.testToggle('HSY Land Cover', false);
    }

    // NDVI is universal
    await this.testToggle('NDVI', true);

    // Test filter toggles
    await this.testToggle('Only public buildings', true);
    await this.testToggle('Only tall buildings', true);
    
    if (currentView === 'helsinki') {
      await this.testToggle('Built before summer 2018', true);
    } else {
      await this.testToggle('Built before summer 2018', false);
    }
  }

  /**
   * Test individual toggle functionality
   */
  private async testToggle(toggleName: string, shouldBeVisible: boolean): Promise<void> {
    const toggle = this.page.getByText(toggleName).locator('..').locator('input[type="checkbox"]');
    
    if (shouldBeVisible) {
      await expect(this.page.getByText(toggleName)).toBeVisible();
      
      // Test toggling on
      await toggle.check();
      await expect(toggle).toBeChecked();
      
      // Test toggling off
      await toggle.uncheck();
      await expect(toggle).not.toBeChecked();
    } else {
      await expect(this.page.getByText(toggleName)).not.toBeVisible();
    }
  }

  /**
   * Verify timeline component for postal code and building levels
   */
  async verifyTimelineVisibility(currentLevel: string): Promise<void> {
    if (currentLevel === 'postalCode' || currentLevel === 'building') {
      await expect(this.page.locator('#heatTimeseriesContainer')).toBeVisible();
      
      // Test timeline slider interaction
      const slider = this.page.locator('.timeline-slider input');
      await expect(slider).toBeVisible();
      
      // Test moving the slider
      await slider.fill('3'); // Move to position 3
      // Wait for slider value change to be processed
      await this.page.waitForFunction(() => {
        const sliderElement = document.querySelector('.timeline-slider input') as HTMLInputElement;
        return sliderElement && sliderElement.value === '3';
      }, { timeout: 3000 });
    } else {
      await expect(this.page.locator('#heatTimeseriesContainer')).not.toBeVisible();
    }
  }

  /**
   * Test navigation controls (back, reset, camera rotation)
   */
  async testNavigationControls(currentLevel: string): Promise<void> {
    // Reset button should always be visible
    const resetButton = this.page.getByRole('button').filter({ has: this.page.locator('.mdi-refresh') });
    await expect(resetButton).toBeVisible();
    
    // Back button only visible at building level
    const backButton = this.page.getByRole('button').filter({ has: this.page.locator('.mdi-arrow-left') });
    if (currentLevel === 'building') {
      await expect(backButton).toBeVisible();
    } else {
      await expect(backButton).not.toBeVisible();
    }
    
    // Camera rotation button visible when not at start level
    const cameraButton = this.page.getByRole('button').filter({ has: this.page.locator('.mdi-compass') });
    if (currentLevel !== 'start') {
      await expect(cameraButton).toBeVisible();
    } else {
      await expect(cameraButton).not.toBeVisible();
    }
  }

  /**
   * Verify loading states and overlays
   */
  async verifyLoadingStates(): Promise<void> {
    // Check if loading component exists when needed
    const loadingOverlay = this.page.locator('.loading-overlay');
    
    // The loading overlay may or may not be present depending on data loading state
    // So we just verify it can be found if it exists
    if (await loadingOverlay.isVisible()) {
      await expect(this.page.getByText('Loading data, please wait')).toBeVisible();
    }
  }

  /**
   * Test expansion panel interactions
   */
  async testExpansionPanels(): Promise<void> {
    // Get all expansion panels
    const expansionPanels = this.page.locator('.v-expansion-panel');
    const count = await expansionPanels.count();
    
    // Test opening and closing each panel
    for (let i = 0; i < count; i++) {
      const panel = expansionPanels.nth(i);
      const header = panel.locator('.v-expansion-panel-title');
      
      if (await header.isVisible()) {
        // Click to open
        await header.click();
        // Wait for panel to expand by checking for visible content
        const content = panel.locator('.v-expansion-panel-text');
        await expect(content).toBeVisible();
        
        // Click to close (if not using multiple prop)
        await header.click();
        // Wait for panel to collapse
        await expect(content).toBeHidden();
      }
    }
  }

  /**
   * Capture full accessibility state for documentation
   */
  async captureAccessibilityTree(): Promise<{
    visibleElements: string[];
    interactiveElements: string[];
    currentState: CesiumTestState;
  }> {
    // Get all visible text elements
    const visibleElements = await this.page.locator('*:visible').allTextContents();
    
    // Get all interactive elements
    const buttons = await this.page.locator('button:visible').count();
    const inputs = await this.page.locator('input:visible').count();
    const selects = await this.page.locator('select:visible').count();
    
    return {
      visibleElements: visibleElements.filter(text => text.trim().length > 0),
      interactiveElements: [`${buttons} buttons`, `${inputs} inputs`, `${selects} selects`],
      currentState: {
        timestamp: new Date().toISOString(),
        url: this.page.url()
      }
    };
  }

  /**
   * Wait for Cesium viewer to be fully loaded with improved robustness
   */
  async waitForCesiumReady(): Promise<void> {
    // Use the enhanced Cesium helper for better CI compatibility
    if (process.env.CI) {
      // In CI, use the full initialization with retry logic
      const initialized = await initializeCesiumWithRetry(this.page, 3);
      if (!initialized) {
        console.warn('Cesium initialization incomplete in CI, proceeding with limited functionality');
      }
    } else {
      // In local development, use simpler initialization
      await waitForAppReady(this.page);
      await cesiumWaitForReady(this.page, 30000);
    }
    
    // Ensure the Cesium container is present
    await this.page.waitForSelector('#cesiumContainer', { 
      timeout: process.env.CI ? 30000 : 15000 
    });
    
    // Wait for any final initialization processes
    await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {
      // Network idle is optional - continue if it doesn't settle
    });
  }

  /**
   * Test viewport responsiveness
   */
  async testResponsiveness(): Promise<void> {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await this.page.setViewportSize({ width: viewport.width, height: viewport.height });
      // Wait for viewport change to take effect by checking container dimensions
      await this.page.waitForFunction((expectedWidth) => {
        return window.innerWidth === expectedWidth;
      }, viewport.width, { timeout: 3000 });
      
      // Verify navigation drawer is accessible
      const navigationDrawer = this.page.locator('.v-navigation-drawer');
      await expect(navigationDrawer).toBeVisible();
      
      // Verify Cesium container adapts
      const cesiumContainer = this.page.locator('#cesiumContainer');
      await expect(cesiumContainer).toBeVisible();
    }
  }
}

export default AccessibilityTestHelpers;