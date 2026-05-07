import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
	testDir: './tests',
	/* Global setup for test environment */
	globalSetup: './tests/setup/global-setup.ts',
	/* Run tests SEQUENTIALLY to avoid multiple 3D renderers competing for resources */
	fullyParallel: false,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Retry on CI only - Cesium/WebGL tests are inherently flaky due to:
	 * - WebGL rendering timing variability
	 * - Tile loading network dependencies
	 * - Camera animation completion timing
	 * Increased from 1 to 2 to reduce CI noise while still catching real failures */
	retries: process.env.CI ? 2 : 0,
	/* Run ONE test at a time to prevent resource contention with WebGL */
	workers: 1,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters
	 * `line` (one line per test) replaces `list` (per-step) in CI for shorter logs;
	 * `json` keeps a structured artifact for jq-based triage; `blob` enables
	 * cross-shard merges via `playwright merge-reports`. */
	reporter: process.env.CI
		? [
				['line'],
				['json', { outputFile: 'test-results/test-results.json' }],
				['junit', { outputFile: 'test-results/junit.xml' }],
				['blob', { outputDir: 'test-results', fileName: 'blob-report.zip' }],
				['html', { open: 'never' }],
				['./tests/reporters/performance-reporter.ts'],
			]
		: process.env.PERFORMANCE_MONITORING === 'true'
			? [
					['html'],
					['json', { outputFile: 'test-results/test-results.json' }],
					['junit', { outputFile: 'test-results/junit.xml' }],
					['./tests/reporters/performance-reporter.ts'],
				]
			: [
					['html'],
					['json', { outputFile: 'test-results/test-results.json' }],
					['junit', { outputFile: 'test-results/junit.xml' }],
				],
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL: process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173',

		/* Retain trace on any failure (not just retries) so first-failure context
		 * isn't lost. `on-first-retry` requires the failure to repeat, which
		 * masks intermittent issues that pass on retry. */
		trace: 'retain-on-failure',

		/* Screenshots on failure for debugging */
		screenshot: 'only-on-failure',

		/* Video recording for critical tests */
		video: 'retain-on-failure',

		/* Reduced timeouts - requestRenderMode makes elements stable quickly
		 * CI gets slightly more generous timeouts to account for environment variability */
		actionTimeout: process.env.CI ? 8000 : 5000,
		navigationTimeout: process.env.CI ? 15000 : 10000,

		/* Explicitly run headless in CI */
		headless: process.env.CI ? true : undefined,

		/* Browser launch options for WebGL/Cesium support (required for all environments) */
		launchOptions: {
			args: [
				'--use-gl=angle',
				'--use-angle=swiftshader',
				...(process.env.CI
					? [
							'--disable-gpu',
							'--disable-dev-shm-usage',
							'--no-sandbox',
							'--disable-web-security',
						]
					: []),
			],
		},
	},

	/* Test timeout increased to accommodate Cesium initialization + navigation retries
     - Cesium WebGL initialization: 10-15s
     - View navigation with retries: 5-10s
     - Element interactions: 5-10s
     Total: ~25-35s needed for complex tests
     CI gets extra buffer for slower/variable environments */
	timeout: process.env.CI ? 50000 : 40000,
	/* Bound the entire test run so a runaway process doesn't hold the CI
	 * runner indefinitely. 30 minutes covers the slowest current full-suite. */
	globalTimeout: 30 * 60 * 1000,
	/* Surface tests that exceed the per-postal-code-click target documented in
	 * docs/prd/feature-picker-navigation.md (5s 95th percentile). Tests in the
	 * 15s+ band become candidates for optimization. */
	reportSlowTests: { max: 5, threshold: 15_000 },
	/* Keep per-test artifacts (videos, traces, screenshots) out of the
	 * test-results.json directory so jq queries stay fast. */
	outputDir: 'test-results/artifacts',
	expect: {
		/* Timeout for assertions - reduced with stable rendering
		 * CI gets slightly more time for slower execution */
		timeout: process.env.CI ? 8000 : 5000,
		/* Visual-regression thresholds — enables `expect(page).toHaveScreenshot()`
		 * for the toggle-wireframe and color-drift bugs flagged in the
		 * 2026-W19 audit (US-04..-06, US-12). Slightly permissive defaults
		 * because CesiumJS rendering has small frame-to-frame variance. */
		toHaveScreenshot: {
			threshold: 0.2,
			maxDiffPixelRatio: 0.02,
		},
	},

	/* Chrome-only testing — WebGL/Cesium requires Chromium engine */
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
			testMatch: /.*\.spec\.ts/,
		},

		// Accessibility-focused projects with specific viewport testing
		{
			name: 'accessibility-desktop',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 1920, height: 1080 },
			},
			testMatch: /tests\/e2e\/accessibility\/.*\.spec\.ts/,
		},

		{
			name: 'accessibility-tablet',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 768, height: 1024 },
			},
			testMatch: /tests\/e2e\/accessibility\/.*\.spec\.ts/,
		},

		{
			name: 'accessibility-mobile',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 375, height: 667 },
			},
			testMatch: /tests\/e2e\/accessibility\/.*\.spec\.ts/,
		},

		/* Mobile viewport using Chrome engine */
		{
			name: 'Mobile Chrome',
			use: { ...devices['Pixel 5'] },
			testMatch: /tests\/e2e\/(?!accessibility).*\.spec\.ts/,
		},
	],

	/* Run your local dev server before starting the tests */
	webServer: process.env.CI
		? undefined
		: {
				command: 'bun run dev:test',
				url: 'http://localhost:5173',
				reuseExistingServer: true,
			},
});
