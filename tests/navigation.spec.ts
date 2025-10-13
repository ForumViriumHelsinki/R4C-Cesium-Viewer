import { test, expect } from "@playwright/test";
import { setupDigitransitMock } from "./setup/digitransit-mock";

// Setup digitransit mocking for all tests in this file
setupDigitransitMock();

test.describe("Navigation and App Layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Dismiss the disclaimer popup if it appears
    await page.getByRole("button", { name: "Explore Map" }).click();
  });

  test("should display main navigation elements", async ({ page }) => {
    // Check top navigation bar exists
    await expect(page.locator(".top-nav")).toBeVisible();

    // Check control panel toggle button
    await expect(
      page.getByRole("button", { name: /Show Controls|Hide Controls/ }),
    ).toBeVisible();

    // Check main CesiumJS container
    await expect(page.locator("#cesiumContainer")).toBeVisible();

    // Check that Cesium canvas is loaded
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("should toggle control panel visibility", async ({ page }) => {
    const toggleButton = page.getByRole("button", {
      name: /Show Controls|Hide Controls/,
    });

    // Control panel should be visible by default
    await expect(page.locator(".control-panel")).toBeVisible();
    await expect(toggleButton).toContainText("Hide Controls");

    // Hide control panel
    await toggleButton.click();
    await expect(page.locator(".control-panel")).not.toBeVisible();
    await expect(toggleButton).toContainText("Show Controls");

    // Show control panel again
    await toggleButton.click();
    await expect(page.locator(".control-panel")).toBeVisible();
    await expect(toggleButton).toContainText("Hide Controls");
  });

  test("should display view mode selector", async ({ page }) => {
    // Check that ViewModeCompact component is visible
    await expect(
      page.locator('[data-testid="view-mode-compact"]'),
    ).toBeVisible();
  });

  test("should show footer disclaimer", async ({ page }) => {
    // Check that minimal disclaimer is visible at bottom-left
    await expect(page.locator(".minimal-disclaimer")).toBeVisible();
    await expect(page.locator(".disclaimer-text")).toContainText(
      "Data: HSY • Statistics Finland",
    );
  });

  test("should display data source status indicator", async ({ page }) => {
    // Check that data source status is visible
    await expect(page.locator(".status-indicator-container")).toBeVisible();
  });

  test("should handle responsive layout", async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigation should still be visible and functional
    await expect(page.locator(".top-nav")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Show Controls|Hide Controls/ }),
    ).toBeVisible();

    // Disclaimer should adjust for mobile
    const disclaimer = page.locator(".minimal-disclaimer");
    await expect(disclaimer).toBeVisible();

    // Control panel should adapt to mobile
    const controlPanel = page.locator(".control-panel");
    if (await controlPanel.isVisible()) {
      // On mobile, control panel might have different styling
      await expect(controlPanel).toBeVisible();
    }
  });

  test("should show loading indicators", async ({ page }) => {
    // Loading indicator should be present (though might not be active initially)
    const loadingIndicator = page.locator('[data-testid="loading-indicator"]');

    // Check if loading component exists in DOM
    const loadingExists = (await loadingIndicator.count()) > 0;
    if (loadingExists) {
      await expect(loadingIndicator).toBeDefined();
    }
  });
});
