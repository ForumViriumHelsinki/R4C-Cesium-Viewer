/**
 * Test configuration constants to avoid magic numbers
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