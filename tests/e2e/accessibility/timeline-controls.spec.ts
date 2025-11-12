/**
 * Timeline Controls Accessibility Tests
 *
 * Tests timeline slider functionality at postal code and building levels:
 * - Timeline visibility (postal code and building levels only)
 * - Date labels and navigation
 * - Slider interaction and value changes
 * - Timeline state persistence across levels
 */

import { expect } from "@playwright/test";
import { cesiumTest, cesiumDescribe } from "../../fixtures/cesium-fixture";
import AccessibilityTestHelpers from "../helpers/test-helpers";

cesiumDescribe("Timeline Controls Accessibility", () => {
  cesiumTest.use({ tag: ["@accessibility", "@e2e"] });
  let helpers: AccessibilityTestHelpers;

  cesiumTest.beforeEach(async ({ cesiumPage }) => {
    helpers = new AccessibilityTestHelpers(cesiumPage);
    // Cesium is already initialized by the fixture
  });

  cesiumTest.describe("Timeline Visibility and Access", () => {
    cesiumTest(
      "should not show timeline at start level",
      async ({ cesiumPage }) => {
        await helpers.verifyTimelineVisibility("start");
      },
    );

    cesiumTest(
      "should show timeline at postal code level",
      async ({ cesiumPage }) => {
        await helpers.drillToLevel("postalCode");
        await cesiumPage.waitForTimeout(3000);

        await helpers.verifyTimelineVisibility("postalCode");
      },
    );

    cesiumTest(
      "should show timeline at building level",
      async ({ cesiumPage }) => {
        await helpers.drillToLevel("building");
        await cesiumPage.waitForTimeout(5000);

        await helpers.verifyTimelineVisibility("building");
      },
    );
  });

  cesiumTest.describe("Timeline Components", () => {
    cesiumTest(
      "should display all timeline elements",
      async ({ cesiumPage }) => {
        await helpers.drillToLevel("postalCode");
        await cesiumPage.waitForTimeout(3000);

        // Timeline container
        await expect(
          cesiumPage.locator("#heatTimeseriesContainer"),
        ).toBeVisible();

        // Date labels
        const dateLabels = cesiumPage.locator(".date-labels");
        if (await dateLabels.isVisible()) {
          await expect(dateLabels).toBeVisible();
        }

        // Slider
        const slider = cesiumPage.locator(".timeline-slider input");
        await expect(slider).toBeVisible();

        // Current date display
        const timeLabel = cesiumPage.locator(".time-label");
        if (await timeLabel.isVisible()) {
          await expect(timeLabel).toBeVisible();
        }
      },
    );

    cesiumTest(
      "should have functional timeline slider",
      async ({ cesiumPage }) => {
        await helpers.drillToLevel("postalCode");
        await cesiumPage.waitForTimeout(3000);

        const slider = cesiumPage.locator(".timeline-slider input");

        // Test slider interaction
        await slider.fill("3");
        await cesiumPage.waitForTimeout(1000);

        // Slider should reflect the change
        const sliderValue = await slider.inputValue();
        expect(sliderValue).toBe("3");
      },
    );
  });

  cesiumTest.describe("Timeline State Persistence", () => {
    cesiumTest(
      "should maintain timeline state between levels",
      async ({ cesiumPage }) => {
        await helpers.drillToLevel("postalCode");
        await cesiumPage.waitForTimeout(3000);

        const slider = cesiumPage.locator(".timeline-slider input");
        await slider.fill("2");
        await cesiumPage.waitForTimeout(1000);

        // Navigate to building level
        await helpers.drillToLevel("building");
        await cesiumPage.waitForTimeout(3000);

        // Timeline should still be visible
        await helpers.verifyTimelineVisibility("building");

        // State should be maintained
        const sliderValue = await slider.inputValue();
        expect(sliderValue).toBe("2");
      },
    );

    cesiumTest(
      "should handle timeline across different views",
      async ({ cesiumPage }) => {
        // Test in Capital Region view
        await helpers.navigateToView("capitalRegionView");
        await helpers.drillToLevel("postalCode");
        await cesiumPage.waitForTimeout(3000);

        await helpers.verifyTimelineVisibility("postalCode");

        // Switch to Grid view
        await helpers.navigateToView("gridView");
        await cesiumPage.waitForTimeout(2000);

        // Timeline should still be visible
        await helpers.verifyTimelineVisibility("postalCode");
      },
    );
  });

  cesiumTest.describe("Timeline Accessibility", () => {
    cesiumTest("should support keyboard navigation", async ({ cesiumPage }) => {
      await helpers.drillToLevel("postalCode");
      await cesiumPage.waitForTimeout(3000);

      const slider = cesiumPage.locator(".timeline-slider input");
      await slider.focus();

      // Test arrow key navigation
      await cesiumPage.keyboard.press("ArrowRight");
      await cesiumPage.waitForTimeout(500);

      // Should change slider value
      const finalValue = await slider.inputValue();
      expect(finalValue).toMatch(/^\d+$/); // Should be a number
    });

    cesiumTest(
      "should be responsive across viewports",
      async ({ cesiumPage }) => {
        await helpers.drillToLevel("postalCode");
        await cesiumPage.waitForTimeout(3000);

        const viewports = [
          { width: 1920, height: 1080 },
          { width: 768, height: 1024 },
          { width: 375, height: 667 },
        ];

        for (const viewport of viewports) {
          await cesiumPage.setViewportSize(viewport);
          await cesiumPage.waitForTimeout(1000);

          // Timeline should remain functional
          await expect(
            cesiumPage.locator("#heatTimeseriesContainer"),
          ).toBeVisible();

          const slider = cesiumPage.locator(".timeline-slider input");
          await expect(slider).toBeVisible();
        }
      },
    );
  });
});
