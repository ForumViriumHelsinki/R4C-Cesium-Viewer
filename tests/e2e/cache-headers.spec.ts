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
    // Pattern matches: [name].[hash].[version].[ext] per vite.config.js
    const assetMatches = html.matchAll(
      /\/assets\/[\w-]+\.[a-f0-9]{8,}\.[0-9.]+\.(js|css)/g,
    );
    const assetPaths = Array.from(assetMatches, (match) => match[0]);

    // We should have at least one asset
    expect(
      assetPaths.length,
      "No hashed assets found. Ensure production build has been created with `npm run build`",
    ).toBeGreaterThan(0);

    // Test the first few assets (to avoid testing too many)
    const assetsToTest = assetPaths.slice(0, 3);

    // Fetch all assets in parallel for better performance
    const responses = await Promise.all(
      assetsToTest.map((path) => request.get(path)),
    );

    responses.forEach((assetResponse, idx) => {
      const assetPath = assetsToTest[idx];

      // Asset should exist
      expect(
        assetResponse.status(),
        `Asset ${assetPath} not found`,
      ).toBe(200);

      // Check cache control headers
      const cacheControl = assetResponse.headers()["cache-control"];
      expect(
        cacheControl,
        `Cache-Control header missing for ${assetPath}`,
      ).toBeDefined();

      // Should have immutable and long max-age
      expect(cacheControl).toContain("immutable");
      expect(cacheControl).toContain("max-age=31536000");
      expect(cacheControl).toContain("public");
    });
  });

  test("assets should have hash in filename", async ({ request }) => {
    // Get the index page
    const pageResponse = await request.get("/");
    const html = await pageResponse.text();

    // Look for hashed asset filenames
    // Pattern: /assets/[name].[hash].[version].[ext]
    const hashedAssetPattern =
      /\/assets\/[\w-]+\.[a-f0-9]{8,}\.[0-9.]+\.(js|css)/;
    const hasMatch = hashedAssetPattern.test(html);

    expect(
      hasMatch,
      "No hashed asset filenames found. Assets should follow pattern: /assets/[name].[hash].[version].[ext]",
    ).toBe(true);
  });

  test("CSS assets should also have proper cache headers", async ({
    request,
  }) => {
    // Get the page to find CSS assets
    const pageResponse = await request.get("/");
    const html = await pageResponse.text();

    // Find CSS asset paths
    const cssMatches = html.matchAll(
      /\/assets\/[\w-]+\.[a-f0-9]{8,}\.[0-9.]+\.css/g,
    );
    const cssPaths = Array.from(cssMatches, (match) => match[0]);

    // CSS files should exist in production build
    expect(
      cssPaths.length,
      "No CSS assets found in build output",
    ).toBeGreaterThan(0);

    // Test the first CSS file
    const cssPath = cssPaths[0];
    const cssResponse = await request.get(cssPath);

    expect(cssResponse.status(), `CSS asset ${cssPath} not found`).toBe(200);

    const cacheControl = cssResponse.headers()["cache-control"];
    expect(
      cacheControl,
      `Cache-Control header missing for ${cssPath}`,
    ).toBeDefined();
    expect(cacheControl).toContain("immutable");
    expect(cacheControl).toContain("max-age=31536000");
    expect(cacheControl).toContain("public");
  });

  test("unhashed static assets should have no-cache header", async ({
    request,
  }) => {
    // Test vite.svg which is a known unhashed static file
    // Per nginx config lines 72-76, unhashed static files should have no-cache
    const staticResponse = await request.get("/vite.svg");

    // Only test if the file exists (it may not in all environments)
    if (staticResponse.status() === 200) {
      const cacheControl = staticResponse.headers()["cache-control"];
      expect(
        cacheControl,
        "Cache-Control header missing for unhashed static file",
      ).toBeDefined();
      expect(cacheControl).toContain("no-cache");
    } else {
      // Skip if vite.svg doesn't exist - test is informational only
      test.skip(
        true,
        "vite.svg not found - skipping unhashed static asset test",
      );
    }
  });
});
