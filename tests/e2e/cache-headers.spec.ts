/**
 * Cache Header Verification Tests
 *
 * ===================================================================
 * REQUIREMENTS - PRODUCTION BUILD ONLY
 * ===================================================================
 *
 * These tests verify nginx cache header configuration and REQUIRE
 * a production build. They will be SKIPPED when running against
 * the development server.
 *
 * Setup Instructions:
 * 1. Build the production bundle: `npm run build`
 * 2. Start the preview server: `npm run preview`
 * 3. Run tests: `npx playwright test cache-headers`
 *
 * CI Environment:
 * - CI automatically uses the production server (port 4173)
 * - See playwright.config.ts line 50 for base URL configuration
 *
 * Local Development:
 * - Default base URL is http://localhost:5173 (dev server)
 * - Dev server does NOT set cache headers (handled by nginx in production)
 * - Tests will skip gracefully with informational message
 *
 * ===================================================================
 * TEST COVERAGE
 * ===================================================================
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
import { expect, test } from '@playwright/test'

/**
 * Matches Vite build output pattern: /assets/[name].[8-char-hex-hash].[semver].[ext]
 * This pattern is tightly coupled to vite.config.js build.rollupOptions.output (lines 23-25).
 * Update this constant if the hash length or format changes in the Vite configuration.
 *
 * Pattern breakdown:
 * - /assets/ - Asset directory prefix
 * - [\w-]+ - Asset name (word characters and hyphens)
 * - \.[a-f0-9]{8} - 8-character hexadecimal hash (content-based)
 * - \.\d+\.\d+\.\d+ - Semantic version from package.json (major.minor.patch)
 * - \.(js|css) - File extension (JavaScript or CSS)
 */
const HASHED_ASSET_PATTERN = /\/assets\/[\w-]+\.[a-f0-9]{8}\.\d+\.\d+\.\d+\.(js|css)/g

/**
 * CSS-only variant of HASHED_ASSET_PATTERN for CSS-specific tests
 */
const HASHED_CSS_PATTERN = /\/assets\/[\w-]+\.[a-f0-9]{8}\.\d+\.\d+\.\d+\.css/g

/**
 * Helper function to assert no-cache headers
 */
function assertNoCacheHeaders(cacheControl: string | undefined, assetPath?: string) {
	const pathInfo = assetPath ? ` for ${assetPath}` : ''
	expect(cacheControl, `Cache-Control header missing${pathInfo}`).toBeDefined()
	expect(cacheControl).toContain('no-cache')
	expect(cacheControl).toContain('no-store')
	expect(cacheControl).toContain('must-revalidate')
}

/**
 * Helper function to assert immutable cache headers for hashed assets
 */
function assertImmutableCacheHeaders(cacheControl: string | undefined, assetPath: string) {
	expect(cacheControl, `Cache-Control header missing for ${assetPath}`).toBeDefined()
	expect(cacheControl).toContain('immutable')
	expect(cacheControl).toContain('max-age=31536000')
	expect(cacheControl).toContain('public')
}

/**
 * Helper function to detect if running against production build
 * Checks if we're running against port 4173 (preview server) or if CI environment
 */
function isProductionEnvironment(): boolean {
	// CI always uses production build (port 4173)
	if (process.env.CI) {
		return true
	}

	// Check if PLAYWRIGHT_BASE_URL is set to preview server
	const baseUrl = process.env.PLAYWRIGHT_BASE_URL
	if (baseUrl?.includes(':4173')) {
		return true
	}

	// Default local development uses port 5173 (dev server)
	return false
}

test.describe('Cache Header Verification', () => {
	test.beforeEach(async () => {
		// Skip all cache header tests when running against dev server
		if (!isProductionEnvironment()) {
			test.skip(
				true,
				'⚠️  Cache header tests require production build.\n' +
					'   Run: npm run build && npm run preview\n' +
					'   Then: npx playwright test cache-headers --config playwright.config.ts -c "baseURL=http://localhost:4173"'
			)
		}
	})

	test(
		'index.html should have no-cache header',
		{ tag: ['@e2e', '@performance'] },
		async ({ request }) => {
			// Test index.html cache control
			const response = await request.get('/')
			expect(response.status()).toBe(200)

			const cacheControl = response.headers()['cache-control']
			// Per nginx config line 58: "no-cache, no-store, must-revalidate"
			assertNoCacheHeaders(cacheControl)
		}
	)

	test(
		'hashed assets should have immutable cache headers',
		{ tag: ['@e2e', '@performance'] },
		async ({ request }) => {
			// First, we need to get the actual hashed asset filenames
			// In a production environment, these would be built with hashes
			// We'll test the /assets/ path pattern and look for common asset types

			// Try to load the page first to see what assets are loaded
			const pageResponse = await request.get('/')
			const html = await pageResponse.text()

			// Extract asset paths from the HTML
			// Look for patterns like: /assets/index.[hash].[version].js
			// Pattern matches: [name].[hash].[version].[ext] per vite.config.js:19
			// Version is semantic versioning format (e.g., 1.29.1) from package.json
			const assetMatches = html.matchAll(HASHED_ASSET_PATTERN)
			const assetPaths = Array.from(assetMatches, (match) => match[0])

			// We should have at least one asset
			expect(
				assetPaths.length,
				'No hashed assets found. Ensure production build has been created with `npm run build`'
			).toBeGreaterThan(0)

			// Test the first 3 assets to balance coverage vs. test duration
			// Testing all assets would be redundant since they all use the same nginx config
			const assetsToTest = assetPaths.slice(0, 3)

			// Fetch all assets in parallel for better performance
			const responses = await Promise.all(assetsToTest.map((path) => request.get(path)))

			responses.forEach((assetResponse, idx) => {
				const assetPath = assetsToTest[idx]

				// Asset should exist
				expect(assetResponse.status(), `Asset ${assetPath} not found`).toBe(200)

				// Check cache control headers
				const cacheControl = assetResponse.headers()['cache-control']
				assertImmutableCacheHeaders(cacheControl, assetPath)
			})
		}
	)

	test(
		'assets should have hash in filename',
		{ tag: ['@e2e', '@performance'] },
		async ({ request }) => {
			// Get the index page
			const pageResponse = await request.get('/')
			const html = await pageResponse.text()

			// Look for hashed asset filenames
			// Pattern: /assets/[name].[hash].[version].[ext] per vite.config.js:19
			// Hash is 8 hex chars, version is semantic versioning (major.minor.patch)
			const hasMatch = HASHED_ASSET_PATTERN.test(html)

			expect(
				hasMatch,
				'No hashed asset filenames found. Assets should follow pattern: /assets/[name].[hash].[version].[ext]'
			).toBe(true)
		}
	)

	test(
		'CSS assets should also have proper cache headers',
		{ tag: ['@e2e', '@performance'] },
		async ({ request }) => {
			// Get the page to find CSS assets
			const pageResponse = await request.get('/')
			const html = await pageResponse.text()

			// Find CSS asset paths - CSS-specific pattern
			const cssMatches = html.matchAll(HASHED_CSS_PATTERN)
			const cssPaths = Array.from(cssMatches, (match) => match[0])

			// CSS files should exist in production build
			expect(cssPaths.length, 'No CSS assets found in build output').toBeGreaterThan(0)

			// Test the first CSS file
			const cssPath = cssPaths[0]
			const cssResponse = await request.get(cssPath)

			expect(cssResponse.status(), `CSS asset ${cssPath} not found`).toBe(200)

			const cacheControl = cssResponse.headers()['cache-control']
			assertImmutableCacheHeaders(cacheControl, cssPath)
		}
	)

	test(
		'unhashed static assets should have no-cache header',
		{ tag: ['@e2e', '@performance'] },
		async ({ request }) => {
			// Test multiple unhashed static files from the public directory
			// Per nginx config lines 72-76, unhashed static files should have no-cache
			// These files don't have content hashes in their names, so they need no-cache
			// to ensure browsers always check for updates
			const unhashedAssets = [
				'/vite.svg', // Vite branding
				'/assets/vue.svg', // Vue branding
				'/assets/images/fvh-1_musta.png', // Forum Virium Helsinki logo
				'/assets/images/regions4climate-black.png', // R4C logo
				'/assets/images/hsy-logo_600px.png', // HSY logo
				'/assets/images/hero_logo.png', // Hero logo
				'/assets/images/tilastokeskus_en.png', // Statistics Finland logo
				'/assets/images/sentinel_hub_by_sinergise_logo_big.png', // Sentinel Hub logo
			]

			let testedCount = 0
			const results: { asset: string; tested: boolean; reason?: string }[] = []

			// Test each asset
			for (const asset of unhashedAssets) {
				const response = await request.get(asset)

				if (response.status() === 200) {
					const cacheControl = response.headers()['cache-control']
					assertNoCacheHeaders(cacheControl, asset)
					testedCount++
					results.push({ asset, tested: true })
				} else {
					results.push({
						asset,
						tested: false,
						reason: `Status ${response.status()}`,
					})
				}
			}

			// Ensure we tested at least some assets
			// This prevents the test from silently passing if all assets are missing
			expect(
				testedCount,
				`Only ${testedCount} of ${unhashedAssets.length} unhashed assets were found and tested. ` +
					`Missing assets: ${results
						.filter((r) => !r.tested)
						.map((r) => r.asset)
						.join(', ')}`
			).toBeGreaterThan(0)
		}
	)
})
