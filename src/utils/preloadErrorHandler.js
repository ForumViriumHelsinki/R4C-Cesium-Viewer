/**
 * @module utils/preloadErrorHandler
 * Global recovery for stale dynamic-import chunks after a deploy.
 *
 * Vite emits a `vite:preloadError` event on `window` whenever a code-split
 * chunk fails to preload (typically a 404 because the user has a stale
 * `index.html` referencing chunk hashes that no longer exist on the CDN
 * after a deploy). Reloading the page fetches a fresh `index.html` with
 * the current chunk hashes, naturally retrying the navigation.
 *
 * This complements the per-call-site `loadWithRetry` in `moduleLoader.js`:
 * - `loadWithRetry` covers a small set of explicit service-module imports
 *   in `useViewerInitialization.js` with exponential backoff for transient
 *   network errors.
 * - This handler covers **every** dynamic import (route-split components,
 *   `defineAsyncComponent` chunks, etc.) and recovers from the post-deploy
 *   stale-hash failure mode that retry cannot resolve.
 *
 * See issue #740 (ControlPanel chunk 404 after deploy).
 *
 * @see https://vite.dev/guide/build.html#load-error-handling
 */

import logger from './logger.js'

/**
 * Window augmented with the idempotency flags this module stores on it.
 * @typedef {Window & {
 *   __r4cPreloadErrorHandlerInstalled?: boolean,
 *   __r4cPreloadErrorHandlerCleanup?: (() => void) | null,
 * }} PreloadHandlerWindow
 */

/**
 * Session-storage key used to short-circuit a reload-loop when even the
 * fresh `index.html` cannot recover. If we just reloaded for a preload
 * error and immediately hit another one, the problem is not stale chunks
 * — it's network unreachability or a broken deploy. In that case we log
 * and surface the failure rather than reloading forever.
 */
const RELOAD_GUARD_KEY = 'r4c:preloadErrorReloadAt'

/**
 * Minimum interval between automatic reloads (ms). If a second
 * `vite:preloadError` fires within this window, we treat it as a
 * non-recoverable failure and stop reloading.
 */
const RELOAD_GUARD_WINDOW_MS = 10_000

/**
 * Installs a global `vite:preloadError` handler that reloads the page on
 * dynamic-import failures, recovering from stale chunk hashes after a
 * deploy.
 *
 * Idempotent: safe to call multiple times — only the first call attaches
 * a listener.
 *
 * @param {object} [deps] - Injected dependencies (for testing).
 * @param {Window} [deps.win] - Window object. Defaults to global `window`.
 * @param {Storage} [deps.storage] - Storage for the reload-loop guard.
 *   Defaults to `window.sessionStorage`.
 * @param {() => number} [deps.now] - Time source. Defaults to `Date.now`.
 * @returns {() => void} A cleanup function that removes the listener.
 *
 * @example
 * // In src/main.js
 * import { installPreloadErrorHandler } from './utils/preloadErrorHandler.js'
 * installPreloadErrorHandler()
 */
export function installPreloadErrorHandler(deps = {}) {
	const win = /** @type {PreloadHandlerWindow | null} */ (
		deps.win ?? (typeof window !== 'undefined' ? window : null)
	)
	if (!win) {
		// Non-browser environment (SSR, unit-test without DOM) — no-op.
		return () => {}
	}

	// `win.sessionStorage` itself can throw SecurityError in Safari private mode
	// and restricted iframes — accessing the property triggers the throw, not the
	// later get/setItem calls. Without this guard, a crash at the top of main.js
	// would block app boot for those users.
	/** @type {Storage | null | undefined} */
	let storage = deps.storage
	if (storage === undefined) {
		try {
			storage = win.sessionStorage
		} catch {
			storage = null
		}
	}
	const now = deps.now ?? Date.now

	// Guard against double-install (e.g. HMR re-running main.js).
	if (win.__r4cPreloadErrorHandlerInstalled) {
		return win.__r4cPreloadErrorHandlerCleanup ?? (() => {})
	}

	const handler = (event) => {
		const payload = event?.payload
		const message = payload?.message ?? String(payload ?? 'unknown error')

		// Check the reload-loop guard: if we already reloaded recently for the
		// same reason, don't reload again. A second failure inside the guard
		// window means the fresh index.html *also* can't load the chunk —
		// likely a CDN outage, a broken deploy, or no network.
		let lastReload = 0
		try {
			lastReload = Number.parseInt(storage?.getItem(RELOAD_GUARD_KEY) ?? '0', 10) || 0
		} catch {
			// SessionStorage can throw in private browsing on some browsers.
			lastReload = 0
		}

		const currentTime = now()
		// Only short-circuit if we actually have a recorded prior reload that's
		// inside the guard window. `lastReload === 0` means this is the first
		// preload error of the session — proceed with reload.
		if (lastReload > 0 && currentTime - lastReload < RELOAD_GUARD_WINDOW_MS) {
			logger.error(
				'[preloadErrorHandler] Dynamic import failed again within reload-guard window — stopping reload loop. Likely a broken deploy or network outage.',
				{ message, lastReload, currentTime }
			)
			return
		}

		try {
			storage?.setItem(RELOAD_GUARD_KEY, String(currentTime))
		} catch {
			// Best-effort — if storage is unavailable we still proceed with the
			// reload; the worst case is one extra reload if a CDN outage hits.
		}

		logger.warn(
			'[preloadErrorHandler] Dynamic import failed, reloading for fresh chunk hashes:',
			message
		)

		// Reload from origin to bypass cached index.html that references
		// the stale chunk hashes.
		win.location.reload()
	}

	win.addEventListener('vite:preloadError', handler)
	win.__r4cPreloadErrorHandlerInstalled = true

	const cleanup = () => {
		win.removeEventListener('vite:preloadError', handler)
		win.__r4cPreloadErrorHandlerInstalled = false
		win.__r4cPreloadErrorHandlerCleanup = null
	}
	win.__r4cPreloadErrorHandlerCleanup = cleanup
	return cleanup
}
