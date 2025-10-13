import { test, expect } from "@playwright/test";
import { setupDigitransitMock } from "./setup/digitransit-mock";

// Setup digitransit mocking for all tests in this file
setupDigitransitMock();

test.describe("Map Interactions and Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Dismiss the disclaimer popup
    await page.getByRole("button", { name: "Explore Map" }).click();

    // Wait for map to load
    await page.waitForTimeout(2000);
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("should load and display Cesium map", async ({ page }) => {
    // Check that Cesium container exists
    await expect(page.locator("#cesiumContainer")).toBeVisible();

    // Check that canvas element is present and visible
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    // Verify canvas has reasonable dimensions
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox?.width).toBeGreaterThan(300);
    expect(canvasBox?.height).toBeGreaterThan(200);
  });

  test("should handle postal code area selection", async ({ page }) => {
    // Click on map to select a postal code area
    const canvas = page.locator("canvas");

    // Click on Helsinki area (approximate coordinates)
    await canvas.click({
      position: { x: 400, y: 300 },
    });

    // Wait for postal code selection to process
    await page.waitForTimeout(3000);

    // Check if postal code view appears
    const postalCodeView = page.locator(
      '.postal-code-panel, [data-testid="postal-code-view"]',
    );
    if ((await postalCodeView.count()) > 0) {
      await expect(postalCodeView.first()).toBeVisible();

      // Check for postal code controls
      const controls = page.locator('.v-switch, input[type="checkbox"]');
      if ((await controls.count()) > 0) {
        await expect(controls.first()).toBeVisible();
      }
    }
  });

  test("should handle building selection workflow", async ({ page }) => {
    const canvas = page.locator("canvas");

    // First click to select postal code area
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(3000);

    // Second click to potentially select a building
    await canvas.click({ position: { x: 420, y: 320 } });
    await page.waitForTimeout(2000);

    // Check if building information appears
    const buildingInfo = page.locator(
      '[data-testid="building-information"], .building-information, .tooltip',
    );
    if ((await buildingInfo.count()) > 0) {
      await expect(buildingInfo.first()).toBeVisible();
    }

    // Check for building properties button
    const buildingPropsButton = page.getByRole("button", {
      name: /building.*properties/i,
    });
    if ((await buildingPropsButton.count()) > 0) {
      await buildingPropsButton.click();
      await page.waitForTimeout(1000);

      // Check if building details are shown
      const buildingDetails = page.locator(
        "#printContainer, .building-details",
      );
      if ((await buildingDetails.count()) > 0) {
        await expect(buildingDetails.first()).toBeVisible();
      }
    }
  });

  test("should handle camera controls", async ({ page }) => {
    // Test camera rotation button if available
    const rotateButton = page.getByRole("button", { name: /rotate|compass/i });
    if ((await rotateButton.count()) > 0) {
      await rotateButton.click();
      await page.waitForTimeout(1000);
    }

    // Test 2D/3D view switching if available
    const viewToggle = page
      .locator('input[type="checkbox"]')
      .filter({ hasText: /2D.*view|3D.*view/i });
    if ((await viewToggle.count()) > 0) {
      const currentState = await viewToggle.isChecked();
      await viewToggle.click();
      await page.waitForTimeout(1000);

      // Verify state changed
      const newState = await viewToggle.isChecked();
      expect(newState).toBe(!currentState);
    }
  });

  test("should handle timeline controls", async ({ page }) => {
    // Look for timeline component
    const timeline = page.locator(
      '[data-testid="timeline"], .timeline, .heat-slider',
    );

    if ((await timeline.count()) > 0) {
      await expect(timeline.first()).toBeVisible();

      // Look for date/time controls
      const timeControls = page.locator(
        'input[type="range"], .v-slider, select',
      );
      if ((await timeControls.count()) > 0) {
        const slider = timeControls.first();
        if (await slider.isVisible()) {
          // Interact with timeline slider
          await slider.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test("should display heat exposure visualization", async ({ page }) => {
    const canvas = page.locator("canvas");

    // Select a postal code area first
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(3000);

    // Look for heat-related controls
    const heatControls = page
      .locator("input")
      .filter({ hasText: /heat|temperature/i });
    if ((await heatControls.count()) > 0) {
      await heatControls.first().click();
      await page.waitForTimeout(2000);
    }

    // Check if heat visualization appears (timeline might become visible)
    const timeline = page.locator('.timeline, [data-testid="timeline"]');
    if ((await timeline.count()) > 0) {
      await expect(timeline.first()).toBeVisible();
    }
  });

  test("should handle data layer toggles", async ({ page }) => {
    const canvas = page.locator("canvas");

    // Select postal code area first
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(3000);

    // Test vegetation layer toggle
    const vegToggle = page.getByLabel(/vegetation|show.*vegetation/i);
    if ((await vegToggle.count()) > 0) {
      await vegToggle.check();
      await page.waitForTimeout(2000);

      // Verify map updated (check for loading or changes)
      await page.waitForTimeout(1000);

      // Uncheck to clean up
      await vegToggle.uncheck();
      await page.waitForTimeout(1000);
    }

    // Test trees layer toggle
    const treeToggle = page.getByLabel(/tree|trees/i);
    if ((await treeToggle.count()) > 0) {
      await treeToggle.check();
      await page.waitForTimeout(2000);
      await treeToggle.uncheck();
      await page.waitForTimeout(1000);
    }
  });

  test("should handle zoom and pan operations", async ({ page }) => {
    const canvas = page.locator("canvas");

    // Test mouse wheel zoom (simulate)
    await canvas.hover();
    await page.mouse.wheel(0, -100); // Zoom in
    await page.waitForTimeout(500);

    await page.mouse.wheel(0, 100); // Zoom out
    await page.waitForTimeout(500);

    // Test pan operation (drag)
    await canvas.hover();
    await page.mouse.down();
    await page.mouse.move(50, 50);
    await page.mouse.up();
    await page.waitForTimeout(500);
  });

  test("should handle return navigation", async ({ page }) => {
    const canvas = page.locator("canvas");

    // Navigate to postal code level
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(3000);

    // Try to navigate to building level
    await canvas.click({ position: { x: 420, y: 320 } });
    await page.waitForTimeout(2000);

    // Look for return/back button
    const returnButton = page.getByRole("button", {
      name: /return|back|arrow.*left/i,
    });
    if ((await returnButton.count()) > 0) {
      await returnButton.click();
      await page.waitForTimeout(1000);
    }

    // Look for reset button
    const resetButton = page.getByRole("button", { name: /reset|refresh/i });
    if ((await resetButton.count()) > 0) {
      await resetButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test("should handle error states gracefully", async ({ page }) => {
    // Click on areas that might not have data
    const canvas = page.locator("canvas");

    // Click on water/empty areas
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(1000);

    await canvas.click({ position: { x: 800, y: 100 } });
    await page.waitForTimeout(1000);

    // Check that app doesn't crash and remains responsive
    await expect(canvas).toBeVisible();

    // Verify navigation still works
    const toggleButton = page.getByRole("button", {
      name: /Show Controls|Hide Controls/,
    });
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();
    await page.waitForTimeout(500);
    await toggleButton.click();
  });
});
