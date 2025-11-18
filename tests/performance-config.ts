/**
 * Performance Monitoring Configuration
 *
 * Shared configuration for performance regression monitoring.
 * Defines thresholds and settings used by both the reporter and regression checker.
 */

export const PERFORMANCE_CONFIG = {
	/**
	 * Warning threshold: Tests 20% slower than baseline will generate warnings
	 */
	WARNING_THRESHOLD_PERCENT: 20,

	/**
	 * Critical threshold: Tests 30% slower than baseline will fail CI
	 */
	CRITICAL_THRESHOLD_PERCENT: 30,

	/**
	 * Minimum duration (in ms) for a test to be included in baseline validation
	 * Tests shorter than this are considered too fast to generate reliable baselines
	 */
	MIN_BASELINE_DURATION: 50,

	/**
	 * Maximum duration (in ms) that seems suspiciously high for initial baseline
	 * Warns if a baseline exceeds this value
	 */
	MAX_BASELINE_DURATION: 60000, // 60 seconds
} as const;

/**
 * Convert percentage threshold to decimal for calculations
 */
export function percentToDecimal(percent: number): number {
	return percent / 100;
}
