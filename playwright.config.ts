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
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only - increased for flaky Cesium tests */
  retries: process.env.CI ? 3 : 0,
  /* Reduce parallel workers for accessibility tests to avoid resource contention */
  workers: process.env.CI ? 2 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [
    ['list'],  // Verbose output in CI
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['html', { open: 'never' }]
  ] : [
    ['html'],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Screenshots on failure for debugging */
    screenshot: 'only-on-failure',
    
    /* Video recording for critical tests */
    video: 'retain-on-failure',
    
    /* Extended timeouts for Cesium loading */
    actionTimeout: 30000,
    navigationTimeout: 30000,
    
    /* Explicitly run headless in CI */
    headless: process.env.CI ? true : undefined,
    
    /* CI-specific browser launch options for WebGL support */
    ...(process.env.CI && {
      launchOptions: {
        args: [
          '--disable-gpu',
          '--use-gl=swiftshader',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-web-security'
        ]
      }
    }),
  },

  /* Test timeout extended for complex 3D interactions, increased for CI due to Cesium complexity */
  timeout: process.env.CI ? 180000 : 60000,  // 3 minutes in CI for accessibility tests
  expect: {
    /* Timeout for assertions - increased for CI accessibility tests */
    timeout: process.env.CI ? 30000 : 10000,  // 30 seconds in CI for complex assertions
  },

  /* Configure projects for major browsers */
  projects: [
    // Desktop browsers for comprehensive accessibility testing
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.spec\.ts/,
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /.*\.spec\.ts/,
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
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

    /* Test against mobile viewports for general E2E. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: /tests\/e2e\/(?!accessibility).*\.spec\.ts/,
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
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
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
