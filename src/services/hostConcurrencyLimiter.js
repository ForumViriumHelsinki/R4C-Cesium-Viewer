/**
 * @module services/hostConcurrencyLimiter
 *
 * Per-host (or per-proxy-prefix) async semaphore for HTTP fetches.
 *
 * Why: HSY's GeoServer at kartta.hsy.fi throttles per-IP concurrent requests
 * silently with HTTP 429. Our viewport loader fires up to N tile fetches in
 * parallel, all from the same dev-server IP — past ~3 concurrent the backend
 * starts refusing every request, retries also fail, and the loader never
 * recovers.
 *
 * Instead of capping concurrency at the call site (which can't see across
 * different loaders that share the same upstream), this module gates every
 * fetch through a hostname-keyed semaphore. All callers of `fetchWithRetry`
 * automatically respect the per-host budget.
 *
 * Keying:
 * - Absolute URL → URL.hostname (e.g. `kartta.hsy.fi`)
 * - Relative URL → first path segment (e.g. `/pygeoapi/foo` → `pygeoapi`).
 *   This matches Vite's proxy config, where each prefix maps to one upstream.
 *
 * Defaults to {@link DEFAULT_LIMIT} for any host that isn't explicitly
 * configured. Override per-host via {@link setHostLimit}; the intent is to
 * benchmark and tune individual upstreams over time.
 */

import logger from '../utils/logger.js'

/**
 * Default per-host concurrent request budget. Conservative on purpose — most
 * Finnish open-data GeoServer instances throttle silently around this range.
 * Tune via setHostLimit() once we have per-host benchmark data.
 */
export const DEFAULT_LIMIT = 3

/**
 * Per-host overrides. Empty by default; populate via {@link setHostLimit}.
 * Keys are the result of {@link extractHostKey}.
 *
 * @type {Map<string, number>}
 */
const hostLimits = new Map()

/**
 * Live semaphore state per host.
 *
 * @type {Map<string, { active: number, queue: Array<() => void> }>}
 */
const hostState = new Map()

/**
 * Derive the limiter key for a URL.
 *
 * @param {string} url
 * @returns {string} hostname (absolute URL) or first path segment (relative)
 */
export function extractHostKey(url) {
	try {
		// Absolute URL — use real hostname
		const parsed = new URL(url)
		return parsed.hostname || '__unknown__'
	} catch {
		// Relative URL — bucket by the leading path segment so each Vite
		// proxy prefix gets its own budget.
		const trimmed = String(url).replace(/^\/+/, '')
		const slash = trimmed.indexOf('/')
		const segment = slash === -1 ? trimmed : trimmed.slice(0, slash)
		return segment || '__root__'
	}
}

/**
 * Set the concurrent request budget for a single host or proxy prefix.
 * Affects future acquire() calls only — in-flight requests are not preempted.
 *
 * @param {string} hostKey - As produced by {@link extractHostKey}
 * @param {number} limit - Max in-flight requests for this host (≥ 1)
 */
export function setHostLimit(hostKey, limit) {
	if (!Number.isFinite(limit) || limit < 1) {
		throw new Error(`setHostLimit(${hostKey}): limit must be ≥ 1, got ${limit}`)
	}
	hostLimits.set(hostKey, Math.floor(limit))
}

/**
 * @param {string} hostKey
 * @returns {number}
 */
function getLimit(hostKey) {
	return hostLimits.get(hostKey) ?? DEFAULT_LIMIT
}

/**
 * @param {string} hostKey
 */
function getState(hostKey) {
	let state = hostState.get(hostKey)
	if (!state) {
		state = { active: 0, queue: [] }
		hostState.set(hostKey, state)
	}
	return state
}

/**
 * Wait for a slot on the given host's budget. Resolves when a slot is free.
 * Caller MUST invoke the returned release function in a `finally` so a
 * thrown fetch doesn't leak a slot.
 *
 * Respects AbortSignal: if the signal aborts while waiting in the queue,
 * the returned promise rejects with the signal's reason and the slot is
 * never acquired.
 *
 * @param {string} url
 * @param {AbortSignal} [signal]
 * @returns {Promise<() => void>} release function
 */
export async function acquireHostSlot(url, signal) {
	const hostKey = extractHostKey(url)
	const state = getState(hostKey)

	if (state.active < getLimit(hostKey)) {
		state.active += 1
		return makeReleaser(hostKey, state)
	}

	// Park in the queue, waiting for someone to release.
	return new Promise((resolve, reject) => {
		const wake = () => {
			signal?.removeEventListener('abort', onAbort)
			state.active += 1
			resolve(makeReleaser(hostKey, state))
		}
		const onAbort = () => {
			const idx = state.queue.indexOf(wake)
			if (idx !== -1) state.queue.splice(idx, 1)
			reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'))
		}

		if (signal?.aborted) {
			reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
			return
		}
		signal?.addEventListener('abort', onAbort, { once: true })
		state.queue.push(wake)
	})
}

function makeReleaser(_hostKey, state) {
	let released = false
	return () => {
		if (released) return
		released = true
		state.active = Math.max(0, state.active - 1)
		const next = state.queue.shift()
		if (next) next()
	}
}

/**
 * Snapshot of current limiter state, for debugging / telemetry.
 *
 * @returns {Record<string, { active: number, queued: number, limit: number }>}
 */
export function inspectLimiter() {
	const out = {}
	for (const [hostKey, state] of hostState.entries()) {
		out[hostKey] = {
			active: state.active,
			queued: state.queue.length,
			limit: getLimit(hostKey),
		}
	}
	return out
}

/**
 * Reset all state. Intended for tests; do not call in production code.
 */
export function __resetForTests() {
	hostLimits.clear()
	hostState.clear()
}

// Expose a debug hook in dev so it's easy to inspect from devtools.
if (import.meta.env?.MODE === 'development' && typeof window !== 'undefined') {
	window.__hostLimiter = { inspectLimiter, setHostLimit, DEFAULT_LIMIT }
	logger.debug('[hostConcurrencyLimiter] dev hook on window.__hostLimiter')
}
