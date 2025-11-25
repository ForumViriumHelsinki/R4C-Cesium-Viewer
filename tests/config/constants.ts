/**
 * Test Configuration Constants
 *
 * Quick Reference:
 * - TIMEOUTS: Test wait times and delays
 * - PERFORMANCE_THRESHOLDS: Load time budgets
 * - API_ENDPOINTS: Service URLs for request matching
 * - BUNDLE_SIZE_BUDGETS: JavaScript bundle size limits
 * - WEB_VITALS_BUDGETS: Core Web Vitals thresholds
 * - VIEWPORTS: Device screen dimensions for responsive testing
 *
 * @see {@link https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/blob/main/.claude/skills/test-categorization.md}
 */

// Timeout constants (in milliseconds)
export const TIMEOUTS = {
	SHORT: 1000,
	MEDIUM: 2000,
	LONG: 3000,
	VERY_LONG: 5000,
	ELEMENT_WAIT: 10000,
	NETWORK_IDLE: 30000,
	CESIUM_READY: 30000,
	APP_READY: 45000,
} as const;

// Performance thresholds (in milliseconds)
export const PERFORMANCE_THRESHOLDS = {
	INITIAL_LOAD: 5000,
	DOM_READY: 2000,
	FULL_LOAD: 5000,
	API_RESPONSE: 3000,
	SESSION_DURATION: 30000,
	RESPONSIVE_ACTION: 1000,
} as const;

// Test coordinates and dimensions
export const TEST_COORDINATES = {
	HELSINKI: {
		LAT: 60.0,
		LNG: 25.0,
	},
	TEST_POINT_1: {
		X: 1000,
		Y: 2000,
		Z: 3000,
	},
	TEST_POINT_2: {
		X: 1500,
		Y: 2500,
	},
	TEST_POINT_3: {
		X: 2000,
		Y: 3000,
	},
} as const;

// Camera and zoom values
export const CAMERA_CONSTANTS = {
	DEFAULT_HEIGHT: 1000,
	ZOOM_FACTOR: 0.5,
	ZOOM_PRECISION: 0.01,
	DEFAULT_CAPACITY: 1000,
} as const;

// Test dataset sizes
export const DATASET_SIZES = {
	SMALL: 25,
	MEDIUM: 50,
	LARGE: 10000,
} as const;

// URL and ports
export const TEST_URLS = {
	LOCALHOST_DEV: 3000,
	LOCALHOST_PREVIEW: 4173,
} as const;

// Postal code ranges
export const POSTAL_CODE_RANGES = {
	MIN: 0,
	MAX: 1000,
} as const;

/**
 * API and service endpoint patterns for test request matching
 * @example
 * await page.waitForRequest(API_ENDPOINTS.WMS_PROXY);
 */
export const API_ENDPOINTS = {
	WMS_PROXY: '/helsinki-wms',
	DIGITRANSIT: '/digitransit',
	PAAVO: '/paavo',
	PYGEOAPI: '/pygeoapi',
	TERRAIN_PROXY: '/terrain-proxy',
} as const;

/**
 * Performance budgets for JavaScript bundle sizes (in bytes)
 * @example
 * expect(bundleSize).toBeLessThan(BUNDLE_SIZE_BUDGETS.MAX_MAIN_BUNDLE);
 */
export const BUNDLE_SIZE_BUDGETS = {
	MIN_CESIUM_CHUNK: 100000, // 100KB minimum for actual Cesium library
	MAX_MAIN_BUNDLE: 500000, // 500KB budget for largest single bundle (excludes ~5MB Cesium)
	MAX_TOTAL_MAIN_BUNDLE: 1000000, // 1MB total budget for all non-Cesium bundles
	BYTES_PER_KIB: 1024, // Conversion factor for bytes to kibibytes (KiB)
} as const;

/**
 * Web Vitals performance budgets (in milliseconds)
 * @example
 * expect(fcpTime).toBeLessThan(WEB_VITALS_BUDGETS.FCP_BUDGET);
 */
export const WEB_VITALS_BUDGETS = {
	FCP_BUDGET: 2000, // First Contentful Paint budget
	LCP_BUDGET: 3000, // Largest Contentful Paint budget
	DOM_INTERACTIVE_BUDGET: 5000, // DOM Interactive budget
	LCP_OBSERVATION_TIMEOUT_CI: 3000, // LCP timeout in CI
	LCP_OBSERVATION_TIMEOUT_LOCAL: 1500, // LCP timeout locally
} as const;

/**
 * Viewport dimensions for responsive testing
 *
 * Sizes chosen based on:
 * - MOBILE_SMALL: iPhone SE (smallest modern phone)
 * - MOBILE: iPhone 8 (most common mobile size)
 * - TABLET: iPad portrait (common tablet baseline)
 * - TABLET_LANDSCAPE: iPad landscape
 * - DESKTOP: Common laptop resolution
 * - DESKTOP_HD: Full HD monitor (most common desktop resolution)
 *
 * @example
 * await page.setViewportSize(VIEWPORTS.MOBILE);
 */
export const VIEWPORTS = {
	MOBILE_SMALL: { width: 320, height: 568 }, // iPhone SE
	MOBILE: { width: 375, height: 667 }, // iPhone 8
	TABLET: { width: 768, height: 1024 }, // iPad
	TABLET_LANDSCAPE: { width: 1024, height: 768 }, // iPad Landscape
	DESKTOP: { width: 1280, height: 720 }, // Desktop
	DESKTOP_HD: { width: 1920, height: 1080 }, // Desktop HD
} as const;
