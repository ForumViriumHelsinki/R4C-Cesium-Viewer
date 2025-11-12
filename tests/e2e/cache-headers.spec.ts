/**
 * Cache Header Verification Tests
 *
 * These tests verify that cache headers are correctly configured for:
 * 1. index.html - should never be cached (no-cache, no-store, must-revalidate)
 * 2. /assets/* - should be aggressively cached (immutable, max-age=1 year)
 * 3. Hashed assets - should have proper [hash].[version] in filenames
 *
 * This prevents regression of cache busting configuration implemented in PR #345.
 * Cache headers are configured in nginx/default.conf.template (lines 56-70).
 *
 * @see https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/349
 */
import { test, expect } from "@playwright/test";

test.describe("Cache Header Verification", () => {
  test("index.html should have no-cache header", async ({ request }) => {
    // Test index.html cache control
    const response = await request.get("/");
    expect(response.status()).toBe(200);

    const cacheControl = response.headers()["cache-control"];
    expect(cacheControl).toBeDefined();
    // Per nginx config line 58: "no-cache, no-store, must-revalidate"
    expect(cacheControl).toContain("no-cache");
    expect(cacheControl).toContain("no-store");
    expect(cacheControl).toContain("must-revalidate");
  });

  test("hashed assets should have immutable cache headers", async ({
    request,
  }) => {
    // First, we need to get the actual hashed asset filenames
    // In a production environment, these would be built with hashes
    // We'll test the /assets/ path pattern and look for common asset types

    // Try to load the page first to see what assets are loaded
    const pageResponse = await request.get("/");
    const html = await pageResponse.text();

    // Extract asset paths from the HTML
    // Look for patterns like: /assets/index.[hash].[version].js
    const assetMatches = html.matchAll(
      /\/assets\/[a-zA-Z0-9_-]+\.[a-f0-9]+\.[0-9.]+\.(js|css)/g,
    );
    const assetPaths = Array.from(assetMatches, (match) => match[0]);

    // We should have at least one asset
    expect(assetPaths.length).toBeGreaterThan(0);

    // Test the first few assets (to avoid testing too many)
    const assetsToTest = assetPaths.slice(0, 3);

    for (const assetPath of assetsToTest) {
      const assetResponse = await request.get(assetPath);

      // Asset should exist
      expect(assetResponse.status()).toBe(200);

      // Check cache control headers
      const cacheControl = assetResponse.headers()["cache-control"];
      expect(cacheControl).toBeDefined();

      // Should have immutable and long max-age
      expect(cacheControl).toContain("immutable");
      expect(cacheControl).toContain("max-age=31536000");
      expect(cacheControl).toContain("public");
    }
  });

  test("assets should have hash in filename", async ({ request }) => {
    // Get the index page
    const pageResponse = await request.get("/");
    const html = await pageResponse.text();

    // Look for hashed asset filenames
    // Pattern: /assets/[name].[hash].[version].[ext]
    const hashedAssetPattern =
      /\/assets\/[a-zA-Z0-9_-]+\.[a-f0-9]+\.[0-9.]+\.(js|css)/;
    const hasMatch = hashedAssetPattern.test(html);

    expect(hasMatch).toBe(true);
  });

  test("CSS assets should also have proper cache headers", async ({
    request,
  }) => {
    // Get the page to find CSS assets
    const pageResponse = await request.get("/");
    const html = await pageResponse.text();

    // Find CSS asset paths
    const cssMatches = html.matchAll(
      /\/assets\/[a-zA-Z0-9_-]+\.[a-f0-9]+\.[0-9.]+\.css/g,
    );
    const cssPaths = Array.from(cssMatches, (match) => match[0]);

    if (cssPaths.length > 0) {
      // Test the first CSS file
      const cssPath = cssPaths[0];
      const cssResponse = await request.get(cssPath);

      expect(cssResponse.status()).toBe(200);

      const cacheControl = cssResponse.headers()["cache-control"];
      expect(cacheControl).toBeDefined();
      expect(cacheControl).toContain("immutable");
      expect(cacheControl).toContain("max-age=31536000");
      expect(cacheControl).toContain("public");
    } else {
      // If no CSS files found, skip this assertion but don't fail
      test.skip();
    }
  });
});
