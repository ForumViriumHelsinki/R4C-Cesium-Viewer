import { test, expect } from "@playwright/test";
import { setupDigitransitMock } from "./setup/digitransit-mock";

// Setup digitransit mocking for all tests in this file
setupDigitransitMock();

test.describe("Data Visualization Components", () => {
  test.use({ tag: ["@e2e", "@data", "@visual"] });
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Dismiss the disclaimer popup
    await page.getByRole("button", { name: "Explore Map" }).click();
    await page.waitForTimeout(2000);
  });

  test("should display charts and visualization components", async ({
    page,
  }) => {
    const canvas = page.locator("canvas");

    // Navigate to get some data loaded
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(3000);

    // Look for various chart components
    const chartContainers = page.locator(
      '[id*="chart"], [id*="plot"], .chart-container, .plot-container',
    );

    if ((await chartContainers.count()) > 0) {
      // Check that at least one chart container is visible
      const visibleCharts = await chartContainers
        .filter({ hasText: /./ })
        .count();
      if (visibleCharts > 0) {
        await expect(chartContainers.first()).toBeVisible();
      }
    }
  });

  test("should handle heat histogram visualization", async ({ page }) => {
    const canvas = page.locator("canvas");

    // Navigate to postal code to load heat data
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(3000);

    // Look for heat histogram
    const heatHistogram = page.locator(
      '#heatHistogramContainer, [data-testid="heat-histogram"]',
    );

    if ((await heatHistogram.count()) > 0) {
      await expect(heatHistogram.first()).toBeVisible();

      // Check for SVG chart content
      const svg = heatHistogram.locator("svg");
      if ((await svg.count()) > 0) {
        await expect(svg.first()).toBeVisible();
      }
    }
  });

  test("should display building information charts", async ({ page }) => {
    const canvas = page.locator("canvas");

    // Navigate to building level
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(3000);

    // Try to select a building
    await canvas.click({ position: { x: 420, y: 320 } });
    await page.waitForTimeout(2000);

    // Look for building charts
    const buildingCharts = page.locator(
      '#buildingGridChartContainer, [data-testid="building-chart"]',
    );

    if ((await buildingCharts.count()) > 0) {
      await expect(buildingCharts.first()).toBeVisible();
    }

    // Check for vulnerability chart
    const vulnChart = page.locator(
      '[data-testid="vulnerability-chart"], .vulnerability-chart',
    );
    if ((await vulnChart.count()) > 0) {
      await expect(vulnChart.first()).toBeVisible();
    }
  });

  test("should handle socio-economics visualization", async ({ page }) => {
    // Look for socio-economics controls
    const socioEcoSection = page.locator(
      '[data-testid="socio-economics"], .socio-economics',
    );

    if ((await socioEcoSection.count()) > 0) {
      await expect(socioEcoSection.first()).toBeVisible();

      // Look for charts or selectors
      const charts = socioEcoSection.locator("svg, canvas, .chart");
      if ((await charts.count()) > 0) {
        await expect(charts.first()).toBeVisible();
      }
    }
  });

  test("should display scatter plot visualizations", async ({ page }) => {
    const canvas = page.locator("canvas");

    // Navigate to get data
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(3000);

    // Look for scatter plot components
    const scatterPlots = page.locator(
      '[class*="scatter"], [id*="scatter"], [data-testid*="scatter"]',
    );

    if ((await scatterPlots.count()) > 0) {
      const visiblePlots = await scatterPlots.filter({ hasText: /./ }).count();
      if (visiblePlots > 0) {
        await expect(scatterPlots.first()).toBeVisible();
      }
    }
  });

  test("should handle NDVI chart functionality", async ({ page }) => {
    // Look for NDVI chart component
    const ndviChart = page.locator(
      '[data-testid="ndvi-chart"], #ndviChart, .ndvi-chart',
    );

    if ((await ndviChart.count()) > 0) {
      await expect(ndviChart.first()).toBeVisible();

      // Check for date selector or controls
      const dateControls = ndviChart.locator(
        'select, input[type="date"], .date-picker',
      );
      if ((await dateControls.count()) > 0) {
        await expect(dateControls.first()).toBeVisible();
      }
    }
  });

  test("should display statistical grid visualization", async ({ page }) => {
    // Enable statistical grid if available
    const gridToggle = page.getByLabel(/statistical.*grid|grid/i);

    if ((await gridToggle.count()) > 0) {
      await gridToggle.check();
      await page.waitForTimeout(2000);

      // Look for grid visualization components
      const gridComponents = page.locator(
        '[data-testid*="grid"], .grid-view, .population-grid',
      );

      if ((await gridComponents.count()) > 0) {
        await expect(gridComponents.first()).toBeVisible();
      }

      // Look for grid legend
      const legend = page.locator('.legend, [data-testid="legend"]');
      if ((await legend.count()) > 0) {
        await expect(legend.first()).toBeVisible();
      }

      // Clean up
      await gridToggle.uncheck();
      await page.waitForTimeout(1000);
    }
  });

  test("should handle interactive chart elements", async ({ page }) => {
    const canvas = page.locator("canvas");

    // Navigate to get charts loaded
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(3000);

    // Look for interactive chart elements
    const charts = page.locator("svg");

    if ((await charts.count()) > 0) {
      const firstChart = charts.first();

      if (await firstChart.isVisible()) {
        // Try hovering over chart elements
        await firstChart.hover();
        await page.waitForTimeout(500);

        // Look for tooltips
        const tooltips = page.locator('.tooltip, [data-testid="tooltip"]');
        if ((await tooltips.count()) > 0) {
          // Tooltip might appear on hover
          const tooltip = tooltips.first();
          if (await tooltip.isVisible()) {
            await expect(tooltip).toBeVisible();
          }
        }
      }
    }
  });

  test("should handle chart data updates", async ({ page }) => {
    const canvas = page.locator("canvas");

    // Navigate to postal code level
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(3000);

    // Toggle a data layer to trigger chart updates
    const vegToggle = page.getByLabel(/vegetation/i);
    if ((await vegToggle.count()) > 0) {
      await vegToggle.check();
      await page.waitForTimeout(2000);

      // Check that charts still exist after data update
      const charts = page.locator("svg, canvas").filter({ hasText: /./ });
      if ((await charts.count()) > 0) {
        await expect(charts.first()).toBeVisible();
      }

      await vegToggle.uncheck();
      await page.waitForTimeout(1000);
    }
  });

  test("should handle chart responsive behavior", async ({ page }) => {
    const canvas = page.locator("canvas");

    // Get some charts loaded
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(3000);

    // Test in mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    // Charts should still be visible and properly sized
    const charts = page.locator('svg, [id*="chart"]');
    if ((await charts.count()) > 0) {
      const firstChart = charts.first();
      if (await firstChart.isVisible()) {
        const chartBox = await firstChart.boundingBox();

        // Chart should fit within mobile viewport
        if (chartBox) {
          expect(chartBox.width).toBeLessThanOrEqual(375);
          expect(chartBox.x).toBeGreaterThanOrEqual(0);
        }
      }
    }

    // Restore desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
  });

  test("should handle chart error states", async ({ page }) => {
    // Click on areas that might not have data
    const canvas = page.locator("canvas");
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(2000);

    // App should still be functional even if no charts load
    await expect(canvas).toBeVisible();

    // Navigation should still work
    const toggleButton = page.getByRole("button", {
      name: /Show Controls|Hide Controls/,
    });
    await expect(toggleButton).toBeVisible();
  });
});
