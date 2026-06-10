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
	BUILDINGS_CACHE_TTL_MS: 60 * 60 * 1000, // 1 hour
	TREES_CACHE_TTL_MS: 25 * 60 * 1000, // 25 minutes

	// Retry/polling
	RETRY_DELAY_BASE_MS: 1000,
	MAX_RETRY_DELAY_MS: 30000,

	// WMS tile retry configuration
	WMS_MAX_RETRIES: 3,
	WMS_RETRY_DELAY_BASE_MS: 1000,
	WMS_RETRY_MAX_DELAY_MS: 8000,
	WMS_RETRY_JITTER_MS: 200,

	// Per-attempt fetch timeout. Bounds a single request so a hung upstream
	// (e.g. HSY's Azure App Gateway, which holds ~20s before returning 504)
	// cannot pin a hostConcurrencyLimiter slot for the full gateway timeout.
	// Kept well under 20s so the request aborts, retries, and degrades while
	// the gateway is still hanging.
	FETCH_TIMEOUT_MS: 12000,

	// Per-host circuit breaker: after this many consecutive failures the
	// breaker opens and requests to that host fast-fail for the cooldown
	// window, instead of every request independently paying the full
	// timeout + retry penalty against a service that is clearly down.
	CIRCUIT_BREAKER_FAILURE_THRESHOLD: 5,
	CIRCUIT_BREAKER_COOLDOWN_MS: 30000,
}
