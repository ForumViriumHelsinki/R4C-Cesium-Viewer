/**
 * Idle Callback Compatibility Helper
 *
 * Cross-browser-safe wrappers around `requestIdleCallback` /
 * `cancelIdleCallback`. `requestIdleCallback` is not implemented on WebKit
 * (Safari, iOS Safari, Firefox iOS — all share the WebKit engine), so referencing
 * the identifier directly throws `ReferenceError: Can't find variable:
 * requestIdleCallback`. Use these helpers instead of touching the global API.
 *
 * Usage:
 *   import { requestIdle, cancelIdle } from '@/utils/idle.js'
 *
 *   const handle = requestIdle(() => doWork(), { timeout: 2000 })
 *   cancelIdle(handle)
 *
 *   // Yielding inside a batch loop:
 *   await new Promise((resolve) => requestIdle(resolve))
 *
 * Fallback behavior:
 * - Calls `setTimeout(cb, 1)` when the browser lacks `requestIdleCallback`.
 *   The callback receives a stub `IdleDeadline`-shaped object so call sites
 *   that read `deadline.timeRemaining()` keep working.
 *
 * Notes:
 * - We use `setTimeout` (not `requestAnimationFrame`) because all call sites
 *   in this codebase use idle callbacks for low-priority background work
 *   (cache warming, prefetching, deferred init, batch-yield). `setTimeout`
 *   does not block the browser the way an rAF-based fallback could in
 *   render-sensitive loops.
 * - No global polyfill (`window.requestIdleCallback = ...`) is installed —
 *   keep the shim local and explicit, mirroring the pattern used by the
 *   `logger` utility.
 *
 * @module utils/idle
 */

/**
 * Detects native `requestIdleCallback` support at call time (not module-load
 * time) so test harnesses like `vi.stubGlobal` can inject/remove the global
 * between test cases.
 *
 * @returns {boolean}
 */
function hasNativeIdle() {
	return typeof globalThis !== 'undefined' && typeof globalThis.requestIdleCallback === 'function'
}

/**
 * Schedule `callback` to run during browser idle time, or via `setTimeout`
 * when the platform does not implement `requestIdleCallback` (WebKit/iOS).
 *
 * @param {(deadline: IdleDeadline) => void} callback - Function invoked when idle.
 * @param {{ timeout?: number }} [options] - Same shape as the native API.
 * @returns {number} Handle that can be passed to {@link cancelIdle}.
 */
export function requestIdle(callback, options) {
	if (hasNativeIdle()) {
		return globalThis.requestIdleCallback(callback, options)
	}
	// WebKit fallback: invoke via setTimeout with a stub deadline so call sites
	// using `deadline.timeRemaining()` / `deadline.didTimeout` keep working.
	return setTimeout(() => {
		callback({
			didTimeout: false,
			timeRemaining: () => 0,
		})
	}, 1)
}

/**
 * Cancel a handle previously returned by {@link requestIdle}.
 *
 * Falls back to `clearTimeout` when the platform lacks `cancelIdleCallback`
 * (the matching fallback for {@link requestIdle}'s `setTimeout` shim).
 *
 * @param {number} handle - Handle returned by `requestIdle`.
 * @returns {void}
 */
export function cancelIdle(handle) {
	if (handle === null || handle === undefined) return
	if (
		typeof globalThis !== 'undefined' &&
		typeof globalThis.cancelIdleCallback === 'function' &&
		hasNativeIdle()
	) {
		globalThis.cancelIdleCallback(handle)
		return
	}
	clearTimeout(handle)
}

export default requestIdle
