// src/constants/timing.js
export const TIMING = {
    // Camera/viewport
    CAMERA_DEBOUNCE_MS: 1500,
    CAMERA_SETTLED_DELAY_MS: 500,
    
    // User interaction
    CLICK_THROTTLE_MS: 500,
    DRAG_DETECTION_MS: 100,
    
    // Loading states
    STALE_LOADING_TIMEOUT_MS: 15000,
    LOADING_SPINNER_DELAY_MS: 200,
    
    // Cache TTLs
    BUILDINGS_CACHE_TTL_MS: 60 * 60 * 1000,  // 1 hour
    TREES_CACHE_TTL_MS: 25 * 60 * 1000,      // 25 minutes
    
    // Retry/polling
    RETRY_DELAY_BASE_MS: 1000,
    MAX_RETRY_DELAY_MS: 30000
  }