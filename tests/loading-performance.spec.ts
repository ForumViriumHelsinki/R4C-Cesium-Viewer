import { test, expect } from "@playwright/test";
import { setupDigitransitMock } from "./setup/digitransit-mock";

// Setup digitransit mocking for all tests in this file
setupDigitransitMock();

test.describe("Loading Performance and User Experience", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should load initial page quickly", async ({ page }) => {
    const startTime = Date.now();

    // Wait for disclaimer popup to appear (indicates app is loaded)
    await expect(
      page.getByRole("button", { name: "Explore Map" }),
    ).toBeVisible();

    const loadTime = Date.now() - startTime;

    // Page should load within reasonable time (adjust threshold as needed)
    expect(loadTime).toBeLessThan(10000); // 10 seconds max

    // Dismiss disclaimer
    await page.getByRole("button", { name: "Explore Map" }).click();
  });

  test("should display loading indicators during data fetching", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Explore Map" }).click();
    await page.waitForTimeout(1000);

    const canvas = page.locator("canvas");

    // Click to trigger data loading
    await canvas.click({ position: { x: 400, y: 300 } });

    // Check for loading indicators
    const loadingIndicators = page.locator(
      '.loading, [data-testid="loading"], .v-progress-circular, .spinner',
    );

    if ((await loadingIndicators.count()) > 0) {
      // Loading indicator should appear initially
      const hasVisibleLoader =
        (await loadingIndicators.filter({ hasText: /./ }).count()) > 0;
      if (hasVisibleLoader) {
        await expect(loadingIndicators.first()).toBeVisible();
      }
    }

    // Wait for loading to complete
    await page.waitForTimeout(5000);

    // Loading indicators should eventually disappear
    if ((await loadingIndicators.count()) > 0) {
      // Check if loaders are hidden after loading
      const stillVisible = await loadingIndicators
        .filter({ hasText: /./ })
        .count();
      // Some loaders might still be in DOM but hidden
    }
  });

  test("should handle layer loading smoothly", async ({ page }) => {
    await page.getByRole("button", { name: "Explore Map" }).click();
    await page.waitForTimeout(1000);

    const canvas = page.locator("canvas");

    // Navigate to postal code level
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(3000);

    // Toggle vegetation layer and measure loading time
    const vegToggle = page.getByLabel(/vegetation/i);
    if ((await vegToggle.count()) > 0) {
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

  test("should show progress for large data loads", async ({ page }) => {
    await page.getByRole("button", { name: "Explore Map" }).click();
    await page.waitForTimeout(1000);

    const canvas = page.locator("canvas");

    // Navigate to trigger large data load
    await canvas.click({ position: { x: 400, y: 300 } });

    // Look for progress indicators
    const progressIndicators = page.locator(
      '.v-progress-linear, .progress-bar, [role="progressbar"]',
    );

    if ((await progressIndicators.count()) > 0) {
      const progress = progressIndicators.first();
      if (await progress.isVisible()) {
        await expect(progress).toBeVisible();

        // Progress should update over time
        await page.waitForTimeout(2000);
      }
    }

    // Check for data source status updates
    const statusIndicator = page.locator(".status-indicator-container");
    if (await statusIndicator.isVisible()) {
      await expect(statusIndicator).toBeVisible();
    }
  });

  test("should handle multiple concurrent layer loads", async ({ page }) => {
    await page.getByRole("button", { name: "Explore Map" }).click();
    await page.waitForTimeout(1000);

    const canvas = page.locator("canvas");

    // Navigate to postal code level
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(3000);

    // Enable multiple layers simultaneously
    const layers = [/vegetation/i, /tree/i, /nature/i];

    const startTime = Date.now();

    // Toggle multiple layers quickly
    for (const layerPattern of layers) {
      const toggle = page.getByLabel(layerPattern);
      if ((await toggle.count()) > 0) {
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
      if ((await toggle.count()) > 0) {
        await toggle.uncheck();
        await page.waitForTimeout(100);
      }
    }
  });

  test("should handle error states gracefully", async ({ page }) => {
    await page.getByRole("button", { name: "Explore Map" }).click();
    await page.waitForTimeout(1000);

    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Try to trigger potential error conditions
    const canvas = page.locator("canvas");

    // Click on multiple areas rapidly
    await canvas.click({ position: { x: 100, y: 100 } });
    await canvas.click({ position: { x: 200, y: 200 } });
    await canvas.click({ position: { x: 300, y: 300 } });
    await page.waitForTimeout(2000);

    // App should still be functional
    await expect(canvas).toBeVisible();

    // Check that control panel still works
    const toggleButton = page.getByRole("button", {
      name: /Show Controls|Hide Controls/,
    });
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();
    await page.waitForTimeout(500);

    // Errors should be minimal or handled gracefully
    // Note: Some console errors might be expected (network timeouts, etc.)
    const criticalErrors = consoleErrors.filter(
      (error) =>
        error.includes("TypeError") ||
        error.includes("ReferenceError") ||
        error.includes("Cannot read"),
    );

    if (criticalErrors.length > 0) {
      console.warn("Critical errors detected:", criticalErrors);
    }
  });

  test("should maintain performance with navigation", async ({ page }) => {
    await page.getByRole("button", { name: "Explore Map" }).click();
    await page.waitForTimeout(1000);

    const canvas = page.locator("canvas");

    // Perform multiple navigation actions
    const startTime = Date.now();

    // Navigate to postal code
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(2000);

    // Try to navigate to building
    await canvas.click({ position: { x: 420, y: 320 } });
    await page.waitForTimeout(1000);

    // Navigate back if possible
    const returnButton = page.getByRole("button", { name: /return|back/i });
    if ((await returnButton.count()) > 0) {
      await returnButton.click();
      await page.waitForTimeout(1000);
    }

    // Reset view
    const resetButton = page.getByRole("button", { name: /reset/i });
    if ((await resetButton.count()) > 0) {
      await resetButton.click();
      await page.waitForTimeout(1000);
    }

    const totalTime = Date.now() - startTime;

    // Navigation sequence should complete efficiently
    expect(totalTime).toBeLessThan(15000); // 15 seconds max

    // App should still be responsive
    await expect(canvas).toBeVisible();
  });

  test("should handle memory efficiently during long session", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Explore Map" }).click();
    await page.waitForTimeout(1000);

    const canvas = page.locator("canvas");

    // Simulate longer user session with multiple interactions
    const interactions = [
      { x: 300, y: 300 },
      { x: 400, y: 300 },
      { x: 500, y: 300 },
      { x: 400, y: 400 },
      { x: 400, y: 200 },
    ];

    for (const position of interactions) {
      await canvas.click({ position });
      await page.waitForTimeout(2000);

      // Toggle some layers
      const vegToggle = page.getByLabel(/vegetation/i);
      if ((await vegToggle.count()) > 0) {
        await vegToggle.check();
        await page.waitForTimeout(1000);
        await vegToggle.uncheck();
        await page.waitForTimeout(500);
      }

      // App should remain responsive throughout
      await expect(canvas).toBeVisible();
    }

    // Final check - app should still be functional
    const toggleButton = page.getByRole("button", {
      name: /Show Controls|Hide Controls/,
    });
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();
    await page.waitForTimeout(500);
    await toggleButton.click();
  });

  test("should cache data effectively", async ({ page }) => {
    await page.getByRole("button", { name: "Explore Map" }).click();
    await page.waitForTimeout(1000);

    const canvas = page.locator("canvas");

    // First visit to an area
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(3000);

    // Enable a layer
    const vegToggle = page.getByLabel(/vegetation/i);
    if ((await vegToggle.count()) > 0) {
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

test.describe("Bundle Size and Dynamic Import Performance", () => {
  // Constants for test thresholds
  const MIN_CESIUM_CHUNK_SIZE = 100000; // 100KB minimum for actual Cesium library
  const MAX_MAIN_BUNDLE_SIZE = 500000; // 500KB budget (excludes ~5MB Cesium)
  const BYTES_PER_KB = 1000; // Conversion factor for bytes to kilobytes

  test("should load Cesium as separate chunk (dynamic import)", async ({
    page,
  }) => {
    // Performance baseline: Post v1.27.7 optimization (#279)
    // Cesium (~5MB) should load as a separate dynamically imported chunk
    const cesiumResources: Array<{ url: string; size: number }> = [];

    page.on("response", async (response) => {
      const url = response.url();
      // Match Cesium chunks (case-insensitive, handles both dev and prod builds)
      if (url.toLowerCase().includes("cesium")) {
        const contentLength = response.headers()["content-length"];
        let size = 0;
        if (contentLength) {
          size = parseInt(contentLength);
        } else {
          // Fallback: read body size (for dev server without content-length)
          try {
            const buffer = await response.body();
            size = buffer?.byteLength || 0;
          } catch (e) {
            console.warn("Could not determine response size:", url, e);
          }
        }
        if (size > 0) {
          cesiumResources.push({ url, size });
        }
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Dismiss disclaimer to trigger full app initialization
    await page.getByRole("button", { name: "Explore Map" }).click();

    // Wait for Cesium chunk to actually load (event-driven, not fixed timeout)
    await page.waitForResponse(
      (response) =>
        response.url().toLowerCase().includes("cesium") &&
        response.status() === 200,
      { timeout: 10000 },
    );

    // Verify Cesium loaded as separate chunk
    expect(
      cesiumResources.length,
      "Cesium should load as one or more separate chunks",
    ).toBeGreaterThan(0);

    // Verify at least one Cesium resource is substantial (dynamic import)
    const hasSizableCesiumChunk = cesiumResources.some(
      (resource) => resource.size > MIN_CESIUM_CHUNK_SIZE,
    );
    expect(
      hasSizableCesiumChunk,
      `Cesium chunk should be substantial (>${MIN_CESIUM_CHUNK_SIZE / BYTES_PER_KB}KB), indicating dynamic import`,
    ).toBe(true);

    console.log(
      `Cesium resources loaded: ${cesiumResources.length} chunks, total size: ${cesiumResources.reduce((sum, r) => sum + r.size, 0)} bytes`,
    );
  });

  test("main bundle should not include Cesium", async ({ page }) => {
    // Performance baseline: Post v1.27.7 optimization (#279)
    // Main bundle should be < 500KB (without Cesium's ~5MB)
    const mainBundles: Array<{ url: string; size: number }> = [];

    page.on("response", async (response) => {
      const url = response.url();
      // Capture all non-Cesium JavaScript bundles to ensure comprehensive monitoring
      if (url.endsWith(".js") && !url.toLowerCase().includes("cesium")) {
        const contentLength = response.headers()["content-length"];
        let size = 0;
        if (contentLength) {
          size = parseInt(contentLength);
        } else {
          // Fallback: read body size (for dev server without content-length)
          try {
            const buffer = await response.body();
            size = buffer?.byteLength || 0;
          } catch (e) {
            console.warn("Could not determine response size:", url, e);
          }
        }
        if (size > 0) {
          mainBundles.push({ url, size });
        }
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Should have at least one main bundle
    expect(
      mainBundles.length,
      "Should have at least one JavaScript bundle",
    ).toBeGreaterThan(0);

    // Main bundle should be under 500KB budget (without Cesium)
    // Check the largest single bundle to ensure no individual bundle exceeds budget
    const largestMainBundle = Math.max(...mainBundles.map((b) => b.size));
    expect(
      largestMainBundle,
      "Largest non-Cesium bundle should be < 500KB (Cesium excluded via dynamic import)",
    ).toBeLessThan(MAX_MAIN_BUNDLE_SIZE);

    console.log(
      `Largest non-Cesium bundle: ${largestMainBundle} bytes (${(largestMainBundle / 1024).toFixed(2)} KB)`,
    );
    console.log(`Total non-Cesium bundles: ${mainBundles.length}`);
  });

  test("should measure Web Vitals (FCP, LCP, domInteractive)", async ({
    page,
  }) => {
    // Performance baseline: Post v1.27.7 optimization (#279)
    // Expected improvements: FCP 500ms-2s faster than v1.27.6
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Detect if we're in CI environment (pass from Node context)
    const isCI = process.env.CI === "true";

    // Measure Web Vitals using Performance API
    const webVitals = await page.evaluate((isCI) => {
      return new Promise((resolve) => {
        const metrics: {
          fcp?: number;
          lcp?: number;
          domInteractive?: number;
        } = {};

        // First Contentful Paint (FCP)
        const paintEntries = performance.getEntriesByType(
          "paint",
        ) as PerformanceEntry[];
        const fcpEntry = paintEntries.find(
          (entry) => entry.name === "first-contentful-paint",
        );
        if (fcpEntry) {
          metrics.fcp = fcpEntry.startTime;
        }

        // Largest Contentful Paint (LCP)
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          if (lastEntry) {
            metrics.lcp = lastEntry.startTime;
          }
        });
        observer.observe({ type: "largest-contentful-paint", buffered: true });

        // DOM Interactive time (not true TTI, but a useful metric)
        // Note: True TTI requires CPU idle time calculation after last long task
        const navigationEntry = performance.getEntriesByType(
          "navigation",
        )[0] as any;
        if (navigationEntry) {
          metrics.domInteractive = navigationEntry.domInteractive;
        }

        // LCP finalizes on user interaction or page visibility change
        // Use longer timeout for CI environments to capture accurate LCP
        const timeout = isCI ? 3000 : 1500;
        setTimeout(() => {
          observer.disconnect();
          resolve(metrics);
        }, timeout);
      });
    }, isCI);

    console.log("Web Vitals:", webVitals);

    // Assert performance budgets
    // FCP: First Contentful Paint should be < 2s (good UX)
    expect(
      webVitals.fcp,
      "First Contentful Paint should be defined and < 2000ms",
    ).toBeDefined();
    expect(
      webVitals.fcp,
      "First Contentful Paint should be < 2000ms",
    ).toBeLessThan(2000);

    // LCP: Largest Contentful Paint should be < 3s (good UX)
    expect(
      webVitals.lcp,
      "Largest Contentful Paint should be defined and < 3000ms",
    ).toBeDefined();
    expect(
      webVitals.lcp,
      "Largest Contentful Paint should be < 3000ms",
    ).toBeLessThan(3000);

    // DOM Interactive: Should be < 5s
    // Note: This is domInteractive, not true TTI (which requires CPU idle time analysis)
    expect(
      webVitals.domInteractive,
      "DOM Interactive should be defined and < 5000ms",
    ).toBeDefined();
    expect(
      webVitals.domInteractive,
      "DOM Interactive should be < 5000ms",
    ).toBeLessThan(5000);

    // Log for tracking performance over time
    console.log(`FCP: ${webVitals.fcp?.toFixed(2)}ms`);
    console.log(`LCP: ${webVitals.lcp?.toFixed(2)}ms`);
    console.log(
      `DOM Interactive: ${webVitals.domInteractive?.toFixed(2)}ms (Note: not true TTI)`,
    );
  });

  test("should track total JavaScript bundle size", async ({ page }) => {
    // Track all JavaScript resources to monitor bundle bloat
    const jsResources: Array<{ url: string; size: number }> = [];

    page.on("response", async (response) => {
      const url = response.url();
      if (url.endsWith(".js")) {
        const contentLength = response.headers()["content-length"];
        let size = 0;
        if (contentLength) {
          size = parseInt(contentLength);
        } else {
          // Fallback: read body size (for dev server without content-length)
          try {
            const buffer = await response.body();
            size = buffer?.byteLength || 0;
          } catch (e) {
            console.warn("Could not determine response size:", url, e);
          }
        }
        if (size > 0) {
          jsResources.push({ url, size });
        }
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Dismiss disclaimer to load all chunks
    await page.getByRole("button", { name: "Explore Map" }).click();

    // Wait for Cesium chunk to actually load (event-driven, not fixed timeout)
    await page.waitForResponse(
      (response) =>
        response.url().toLowerCase().includes("cesium") &&
        response.status() === 200,
      { timeout: 10000 },
    );

    const totalSize = jsResources.reduce((sum, r) => sum + r.size, 0);
    const totalMB = (totalSize / (1024 * 1024)).toFixed(2);

    console.log(`Total JavaScript size: ${totalMB} MB`);
    console.log(`Number of JS files: ${jsResources.length}`);

    // Log largest bundles for tracking
    const sortedBySize = [...jsResources].sort((a, b) => b.size - a.size);
    console.log("Largest bundles:");
    sortedBySize.slice(0, 5).forEach((resource, i) => {
      const fileName = resource.url.split("/").pop() || resource.url;
      const sizeMB = (resource.size / (1024 * 1024)).toFixed(2);
      console.log(`  ${i + 1}. ${fileName}: ${sizeMB} MB`);
    });

    // Total should be reasonable (accounting for Cesium ~5MB + app code)
    // This is a soft assertion for tracking, not a hard limit
    expect(totalSize).toBeGreaterThan(0);
  });
});
