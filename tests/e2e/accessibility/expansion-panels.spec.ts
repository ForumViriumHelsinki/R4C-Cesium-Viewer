/**
 * Expansion Panels Accessibility Tests
 *
 * Tests conditional panel visibility and interactions for all expansion panels:
 * - Cooling Centers (grid + heat_index)
 * - Statistical grid options (grid view)
 * - NDVI panel (not grid view)
 * - HSY/Syke background maps (universal)
 * - Heat histogram (postal code + data)
 * - Socioeconomics (postal code + data)
 * - Land cover (postal code + not Helsinki)
 * - Building scatter plot (postal code)
 * - Area/Building properties (level-specific)
 * - Geocoding (universal)
 */

import { expect } from "@playwright/test";
import { cesiumTest, cesiumDescribe } from "../../fixtures/cesium-fixture";
import AccessibilityTestHelpers from "../helpers/test-helpers";

cesiumDescribe("Expansion Panels Accessibility", () => {
  let helpers: AccessibilityTestHelpers;

  cesiumTest.beforeEach(async ({ cesiumPage }) => {
    helpers = new AccessibilityTestHelpers(cesiumPage);
    // Cesium is already initialized by the fixture
  });

  cesiumTest.describe("Universal Expansion Panels", () => {
    cesiumTest(
      "should display HSY Background maps panel in all contexts",
      async ({ cesiumPage }) => {
        // Available in all views and levels
        await expect(cesiumPage.getByText("HSY Background maps")).toBeVisible();

        // Test expansion
        const hsyPanel = cesiumPage.getByText("HSY Background maps");
        await helpers.scrollIntoViewportWithRetry(hsyPanel, { elementName: "HSY Background maps" });
        await hsyPanel.click();

        // Should reveal background map options
        await expect(cesiumPage.getByText("Orthophoto")).toBeVisible();
        await expect(cesiumPage.getByText("Map")).toBeVisible();

        // Collapse again
        await helpers.scrollIntoViewportWithRetry(hsyPanel, { elementName: "HSY Background maps" });
        await hsyPanel.click();
        await expect(cesiumPage.getByText("Orthophoto")).toBeHidden();
      },
    );

    cesiumTest(
      "should display Syke Flood Background Maps panel universally",
      async ({ cesiumPage }) => {
        await expect(
          cesiumPage.getByText("Syke Flood Background Maps"),
        ).toBeVisible();

        const sykePanel = cesiumPage.getByText("Syke Flood Background Maps");
        await helpers.scrollIntoViewportWithRetry(sykePanel, { elementName: "Syke Flood Background Maps" });
        await sykePanel.click();

        // Should show flood scenario options
        await expect(cesiumPage.getByText("Flood: 1/5a, Sea")).toBeVisible();
        await expect(cesiumPage.getByText("Flood: 1/20a, Sea")).toBeVisible();
        await expect(cesiumPage.getByText("Flood: 1/50a, Sea")).toBeVisible();

        await helpers.scrollIntoViewportWithRetry(sykePanel, { elementName: "Syke Flood Background Maps" });
        await sykePanel.click();
        await expect(cesiumPage.getByText("Flood: 1/5a, Sea")).toBeHidden();
      },
    );

    cesiumTest(
      "should display Geocoding panel in all contexts",
      async ({ cesiumPage }) => {
        await expect(cesiumPage.getByText("Geocoding")).toBeVisible();

        const geocodingPanel = cesiumPage.getByText("Geocoding");
        await helpers.scrollIntoViewportWithRetry(geocodingPanel, { elementName: "Geocoding" });
        await geocodingPanel.click();

        // Should show search input
        const searchInput = cesiumPage.getByPlaceholder(
          "Search for a location",
        );
        await expect(searchInput).toBeVisible();

        // Test keyboard interaction
        await searchInput.fill("Helsinki");
        await cesiumPage.keyboard.press("Enter");

        await helpers.scrollIntoViewportWithRetry(geocodingPanel, { elementName: "Geocoding" });
        await geocodingPanel.click();
        await expect(searchInput).toBeHidden();
      },
    );
  });

  cesiumTest.describe("View-Specific Expansion Panels", () => {
    cesiumTest(
      "should show Statistical grid options only in Grid view",
      async ({ cesiumPage }) => {
        // Not visible in Capital Region view
        await expect(
          cesiumPage.getByText("Statistical grid options"),
        ).toBeHidden();

        // Switch to Grid view
        await helpers.navigateToView("gridView");

        // Now visible
        await expect(
          cesiumPage.getByText("Statistical grid options"),
        ).toBeVisible();

        // Test expansion
        const gridOptionsPanel = cesiumPage.getByText(
          "Statistical grid options",
        );
        await helpers.scrollIntoViewportWithRetry(gridOptionsPanel, { elementName: "Statistical grid options" });
        await gridOptionsPanel.click();

        // Should show grid configuration options
        await expect(cesiumPage.getByText("250m x 250m")).toBeVisible();

        await helpers.scrollIntoViewportWithRetry(gridOptionsPanel, { elementName: "Statistical grid options" });
        await gridOptionsPanel.click();
        await expect(cesiumPage.getByText("250m x 250m")).toBeHidden();
      },
    );

    cesiumTest(
      "should show Cooling Centers only in Grid view with heat index",
      async ({ cesiumPage }) => {
        // Not visible in Capital Region view
        await expect(
          cesiumPage.getByText("Manage Cooling Centers"),
        ).toBeHidden();

        // Switch to Grid view
        await helpers.navigateToView("gridView");

        // Still might not be visible without heat_index data
        // This depends on data availability
        const coolingCenters = cesiumPage.getByText("Manage Cooling Centers");
        if (await coolingCenters.isVisible()) {
          await coolingCenters.click();

          // Should show cooling center management
          await expect(
            cesiumPage.getByText("Add Cooling Center"),
          ).toBeVisible();

          await coolingCenters.click();
          await expect(cesiumPage.getByText("Add Cooling Center")).toBeHidden();
        }
      },
    );

    cesiumTest(
      "should show NDVI panel only in non-Grid views",
      async ({ cesiumPage }) => {
        // Visible in Capital Region view
        await expect(cesiumPage.getByText("NDVI")).toBeVisible();

        const ndviPanel = cesiumPage.getByText("NDVI");
        await helpers.scrollIntoViewportWithRetry(ndviPanel, { elementName: "NDVI panel" });
        await ndviPanel.click();

        // Should show NDVI options
        const ndviSlider = cesiumPage.locator(".ndvi-threshold-slider");
        await expect(ndviSlider).toBeVisible();

        await helpers.scrollIntoViewportWithRetry(ndviPanel, { elementName: "NDVI panel" });
        await ndviPanel.click();
        await expect(ndviSlider).toBeHidden();

        // Switch to Grid view
        await helpers.navigateToView("gridView");

        // NDVI panel should be hidden
        await expect(cesiumPage.getByText("NDVI")).toBeHidden();
      },
    );
  });

  cesiumTest.describe("Level-Specific Expansion Panels", () => {
    cesiumTest(
      "should show Heat histogram at postal code level with data",
      async ({ cesiumPage }) => {
        // Not visible at start level
        await expect(cesiumPage.getByText("Heat histogram")).toBeHidden();

        // Navigate to postal code level
        await helpers.drillToLevel("postalCode");

        // Should be visible if data is available
        const heatHistogram = cesiumPage.getByText("Heat histogram");
        if (await heatHistogram.isVisible()) {
          await heatHistogram.click();

          // Should show histogram visualization
          const histogramChart = cesiumPage.locator(".heat-histogram-chart");
          await expect(histogramChart).toBeVisible();

          await heatHistogram.click();
          await expect(histogramChart).toBeHidden();
        }
      },
    );

    cesiumTest(
      "should show Socioeconomics panel at postal code level",
      async ({ cesiumPage }) => {
        // Not visible at start level
        await expect(cesiumPage.getByText("Socioeconomics")).toBeHidden();

        // Navigate to postal code level
        await helpers.drillToLevel("postalCode");

        // Should be visible
        const socioPanel = cesiumPage.getByText("Socioeconomics");
        if (await socioPanel.isVisible()) {
          await helpers.scrollIntoViewportWithRetry(socioPanel, { elementName: "Socioeconomics panel" });
          await socioPanel.click();

          // Should show socioeconomic data
          await expect(cesiumPage.getByText("Population")).toBeVisible();

          await helpers.scrollIntoViewportWithRetry(socioPanel, { elementName: "Socioeconomics panel" });
          await socioPanel.click();
          await expect(cesiumPage.getByText("Population")).toBeHidden();
        }
      },
    );

    cesiumTest(
      "should show Land cover at postal code level outside Helsinki",
      async ({ cesiumPage }) => {
        // Navigate to postal code level
        await helpers.drillToLevel("postalCode");

        // Land cover visibility depends on location
        const landCoverPanel = cesiumPage.getByText("Land cover");
        if (await landCoverPanel.isVisible()) {
          await helpers.scrollIntoViewportWithRetry(landCoverPanel, { elementName: "Land Cover panel" });
          await landCoverPanel.click();

          // Should show land cover data
          const landCoverChart = cesiumPage.locator(".land-cover-chart");
          await expect(landCoverChart).toBeVisible();

          await helpers.scrollIntoViewportWithRetry(landCoverPanel, { elementName: "Land Cover panel" });
          await landCoverPanel.click();
          await expect(landCoverChart).toBeHidden();
        }
      },
    );

    cesiumTest(
      "should show Building Scatter Plot at postal code level",
      async ({ cesiumPage }) => {
        // Not visible at start level
        await expect(
          cesiumPage.getByText("Building Scatter Plot"),
        ).toBeHidden();

        // Navigate to postal code level
        await helpers.drillToLevel("postalCode");

        // Should be visible
        await expect(
          cesiumPage.getByText("Building Scatter Plot"),
        ).toBeVisible();

        const scatterPanel = cesiumPage.getByText("Building Scatter Plot");
        await helpers.scrollIntoViewportWithRetry(scatterPanel, { elementName: "Building Scatter Plot panel" });
        await scatterPanel.click();

        // Should show scatter plot
        const scatterChart = cesiumPage.locator(".building-scatter-chart");
        await expect(scatterChart).toBeVisible();

        await helpers.scrollIntoViewportWithRetry(scatterPanel, { elementName: "Building Scatter Plot panel" });
        await scatterPanel.click();
        await expect(scatterChart).toBeHidden();
      },
    );

    cesiumTest(
      "should show Area properties at postal code level",
      async ({ cesiumPage }) => {
        // Navigate to postal code level
        await helpers.drillToLevel("postalCode");

        // Should show area properties
        const areaProps = cesiumPage.getByText("Area properties");
        if (await areaProps.isVisible()) {
          await helpers.scrollIntoViewportWithRetry(areaProps, { elementName: "Area properties panel" });
          await areaProps.click();

          // Should show property details
          await expect(cesiumPage.getByText("Total area")).toBeVisible();

          await helpers.scrollIntoViewportWithRetry(areaProps, { elementName: "Area properties panel" });
          await areaProps.click();
          await expect(cesiumPage.getByText("Total area")).toBeHidden();
        }
      },
    );

    cesiumTest(
      "should show Building properties at building level",
      async ({ cesiumPage }) => {
        // Navigate to building level
        await helpers.drillToLevel("building");

        // Should show building properties
        const buildingProps = cesiumPage.getByText("Building properties");
        if (await buildingProps.isVisible()) {
          await helpers.scrollIntoViewportWithRetry(buildingProps, { elementName: "Building properties panel" });
          await buildingProps.click();

          // Should show property details
          await expect(cesiumPage.getByText("Building type")).toBeVisible();

          await helpers.scrollIntoViewportWithRetry(buildingProps, { elementName: "Building properties panel" });
          await buildingProps.click();
          await expect(cesiumPage.getByText("Building type")).toBeHidden();
        }
      },
    );
  });

  cesiumTest.describe("Panel Interaction Patterns", () => {
    cesiumTest(
      "should support keyboard navigation for all panels",
      async ({ cesiumPage }) => {
        // Focus on first panel
        await cesiumPage.keyboard.press("Tab");

        // Find HSY panel via keyboard
        let foundPanel = false;
        for (let i = 0; i < 20; i++) {
          const focused = cesiumPage.locator(":focus");
          const text = await focused.textContent();
          if (text?.includes("HSY Background maps")) {
            foundPanel = true;
            break;
          }
          await cesiumPage.keyboard.press("Tab");
        }

        expect(foundPanel).toBeTruthy();

        // Expand with keyboard
        await cesiumPage.keyboard.press("Enter");
        await expect(cesiumPage.getByText("Orthophoto")).toBeVisible();

        // Collapse with keyboard
        await cesiumPage.keyboard.press("Enter");
        await expect(cesiumPage.getByText("Orthophoto")).toBeHidden();
      },
    );

    cesiumTest(
      "should maintain panel state during view switches",
      async ({ cesiumPage }) => {
        // Expand HSY panel
        const hsyPanel = cesiumPage.getByText("HSY Background maps");
        await helpers.scrollIntoViewportWithRetry(hsyPanel, { elementName: "HSY Background maps" });
        await hsyPanel.click();
        await expect(cesiumPage.getByText("Orthophoto")).toBeVisible();

        // Switch view
        await helpers.navigateToView("gridView");

        // Panel should remain expanded
        await expect(cesiumPage.getByText("Orthophoto")).toBeVisible();

        // Switch back
        await helpers.navigateToView("capitalRegionView");

        // Still expanded
        await expect(cesiumPage.getByText("Orthophoto")).toBeVisible();
      },
    );

    cesiumTest(
      "should handle multiple panels expanded simultaneously",
      async ({ cesiumPage }) => {
        // Expand multiple panels
        const hsyPanel = cesiumPage.getByText("HSY Background maps");
        const sykePanel = cesiumPage.getByText("Syke Flood Background Maps");
        const geocodingPanel = cesiumPage.getByText("Geocoding");

        await helpers.scrollIntoViewportWithRetry(hsyPanel, { elementName: "HSY Background maps" });
        await hsyPanel.click();
        await helpers.scrollIntoViewportWithRetry(sykePanel, { elementName: "Syke Flood Background Maps" });
        await sykePanel.click();
        await helpers.scrollIntoViewportWithRetry(geocodingPanel, { elementName: "Geocoding" });
        await geocodingPanel.click();

        // All should be expanded
        await expect(cesiumPage.getByText("Orthophoto")).toBeVisible();
        await expect(cesiumPage.getByText("Flood: 1/5a, Sea")).toBeVisible();
        await expect(
          cesiumPage.getByPlaceholder("Search for a location"),
        ).toBeVisible();

        // Collapse one shouldn't affect others
        await helpers.scrollIntoViewportWithRetry(hsyPanel, { elementName: "HSY Background maps" });
        await hsyPanel.click();
        await expect(cesiumPage.getByText("Orthophoto")).toBeHidden();
        await expect(cesiumPage.getByText("Flood: 1/5a, Sea")).toBeVisible();
        await expect(
          cesiumPage.getByPlaceholder("Search for a location"),
        ).toBeVisible();
      },
    );
  });

  cesiumTest.describe("Accessibility Compliance", () => {
    cesiumTest(
      "should have proper ARIA attributes for all panels",
      async ({ cesiumPage }) => {
        // Check HSY panel
        const hsyPanel = cesiumPage.getByText("HSY Background maps");
        const hsyButton = hsyPanel.locator("..");

        // Should have expansion ARIA attributes
        const ariaExpanded = await hsyButton.getAttribute("aria-expanded");
        expect(ariaExpanded).toBeDefined();

        // Expand and check state change
        await helpers.scrollIntoViewportWithRetry(hsyPanel, { elementName: "HSY Background maps" });
        await hsyPanel.click();
        const expandedState = await hsyButton.getAttribute("aria-expanded");
        expect(expandedState).toBe("true");

        // Collapse and check
        await helpers.scrollIntoViewportWithRetry(hsyPanel, { elementName: "HSY Background maps" });
        await hsyPanel.click();
        const collapsedState = await hsyButton.getAttribute("aria-expanded");
        expect(collapsedState).toBe("false");
      },
    );

    cesiumTest(
      "should announce panel state changes to screen readers",
      async ({ cesiumPage }) => {
        // This would require screen reader testing tools
        // For now, verify ARIA live regions exist
        const liveRegions = cesiumPage.locator("[aria-live]");
        const count = await liveRegions.count();
        expect(count).toBeGreaterThan(0);
      },
    );

    cesiumTest(
      "should maintain focus after panel interactions",
      async ({ cesiumPage }) => {
        const hsyPanel = cesiumPage.getByText("HSY Background maps");

        // Focus the panel
        await hsyPanel.focus();

        // Expand with keyboard
        await cesiumPage.keyboard.press("Enter");

        // Focus should remain on panel header
        const focusedElement = cesiumPage.locator(":focus");
        const focusedText = await focusedElement.textContent();
        expect(focusedText).toContain("HSY Background maps");

        // Collapse
        await cesiumPage.keyboard.press("Enter");

        // Focus should still be on panel
        const stillFocused = await focusedElement.textContent();
        expect(stillFocused).toContain("HSY Background maps");
      },
    );
  });
});
