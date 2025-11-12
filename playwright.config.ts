import { defineConfig, devices } from "@playwright/test";

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
  testDir: "./tests",
  /* Global setup for test environment */
  globalSetup: "./tests/setup/global-setup.ts",
  /* Run tests SEQUENTIALLY to avoid multiple 3D renderers competing for resources */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only - reduced now that stability issues are fixed */
  retries: process.env.CI ? 1 : 0,
  /* Run ONE test at a time to prevent resource contention with WebGL */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [
        ["list"], // Verbose output in CI
        ["json", { outputFile: "test-results/test-results.json" }],
        ["junit", { outputFile: "test-results/junit.xml" }],
        ["html", { open: "never" }],
      ]
    : [
        ["html"],
        ["json", { outputFile: "test-results/test-results.json" }],
        ["junit", { outputFile: "test-results/junit.xml" }],
      ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.CI ? "http://localhost:4173" : "http://localhost:5173",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Screenshots on failure for debugging */
    screenshot: "only-on-failure",

    /* Video recording for critical tests */
    video: "retain-on-failure",

    /* Reduced timeouts - requestRenderMode makes elements stable quickly
     * CI gets slightly more generous timeouts to account for environment variability */
    actionTimeout: process.env.CI ? 8000 : 5000,
    navigationTimeout: process.env.CI ? 15000 : 10000,

    /* Explicitly run headless in CI */
    headless: process.env.CI ? true : undefined,

    /* CI-specific browser launch options for WebGL support */
    ...(process.env.CI && {
      launchOptions: {
        args: [
          "--disable-gpu",
          "--use-gl=swiftshader",
          "--disable-dev-shm-usage",
          "--no-sandbox",
          "--disable-web-security",
        ],
      },
    }),
  },

  /* Test timeout increased to accommodate Cesium initialization + navigation retries
     - Cesium WebGL initialization: 10-15s
     - View navigation with retries: 5-10s
     - Element interactions: 5-10s
     Total: ~25-35s needed for complex tests
     CI gets extra buffer for slower/variable environments */
  timeout: process.env.CI ? 50000 : 40000,
  expect: {
    /* Timeout for assertions - reduced with stable rendering
     * CI gets slightly more time for slower execution */
    timeout: process.env.CI ? 8000 : 5000,
  },

  /* Configure projects for major browsers */
  projects: [
    // Desktop browsers for comprehensive accessibility testing
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /.*\.spec\.ts/,
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      testMatch: /.*\.spec\.ts/,
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testMatch: /.*\.spec\.ts/,
    },

    // Accessibility-focused projects with specific viewport testing
    {
      name: "accessibility-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: /tests\/e2e\/accessibility\/.*\.spec\.ts/,
    },

    {
      name: "accessibility-tablet",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
      },
      testMatch: /tests\/e2e\/accessibility\/.*\.spec\.ts/,
    },

    {
      name: "accessibility-mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 667 },
      },
      testMatch: /tests\/e2e\/accessibility\/.*\.spec\.ts/,
    },

    /* Test against mobile viewports for general E2E. */
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
      testMatch: /tests\/e2e\/(?!accessibility).*\.spec\.ts/,
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
      testMatch: /tests\/e2e\/(?!accessibility).*\.spec\.ts/,
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:5173",
        reuseExistingServer: true,
      },
});
