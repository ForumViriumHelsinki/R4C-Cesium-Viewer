/**
 * @module services/hostCircuitBreaker
 *
 * Per-host circuit breaker for HTTP fetches, a sibling to
 * {@link module:services/hostConcurrencyLimiter}.
 *
 * Why: when an upstream is down (HSY's Azure App Gateway returning 504 for an
 * entire session, or the service hard-down) every request independently pays
 * the full per-attempt timeout plus retry/backoff penalty, holding a
 * concurrency slot the whole time. The viewport loader's 3-per-host budget is
 * exhausted by hung requests and the map stops filling — the user-reported
 * "HSY down basically breaks the whole app". Retrying a service that is clearly
 * down also just hammers it.
 *
 * The breaker tracks consecutive failures per host. After
 * {@link FAILURE_THRESHOLD} it OPENS: subsequent {@link canRequest} calls
 * return false (callers fast-fail without holding a slot) for
 * {@link COOLDOWN_MS}. After the cooldown the breaker goes HALF-OPEN and lets
 * one probe through; a success closes it, a failure re-opens it.
 *
 * Host keying matches the concurrency limiter exactly (see
 * {@link extractHostKey}), so a degraded `pygeoapi` proxy prefix or a degraded
 * `kartta.hsy.fi` hostname is tracked as one breaker each.
 *
 * State changes are broadcast to subscribers via {@link onBreakerChange} so the
 * UI (serviceHealthStore) can surface a non-blocking "layers unavailable"
 * notice and clear it on recovery.
 */

import { TIMING } from '../constants/timing.js'
import logger from '../utils/logger.js'
import { extractHostKey } from './hostConcurrencyLimiter.js'

/** Consecutive failures before the breaker opens. */
export const FAILURE_THRESHOLD = TIMING.CIRCUIT_BREAKER_FAILURE_THRESHOLD

/** How long the breaker stays open before allowing a half-open probe. */
export const COOLDOWN_MS = TIMING.CIRCUIT_BREAKER_COOLDOWN_MS

/** @type {{ failureThreshold: number, cooldownMs: number }} */
const config = {
	failureThreshold: FAILURE_THRESHOLD,
	cooldownMs: COOLDOWN_MS,
}

/**
 * @typedef {'closed' | 'open' | 'half-open'} BreakerState
 */

/**
 * @typedef {Object} BreakerChangeEvent
 * @property {string} hostKey
 * @property {BreakerState} state
 */

/**
 * Per-host breaker records.
 * @type {Map<string, { state: BreakerState, failures: number, openedAt: number }>}
 */
const breakers = new Map()

/** @type {Set<(event: BreakerChangeEvent) => void>} */
const listeners = new Set()

/**
 * @param {string} hostKey
 */
function getBreaker(hostKey) {
	let breaker = breakers.get(hostKey)
	if (!breaker) {
		breaker = { state: 'closed', failures: 0, openedAt: 0 }
		breakers.set(hostKey, breaker)
	}
	return breaker
}

/**
 * @param {BreakerChangeEvent} event
 */
function emit(event) {
	for (const listener of listeners) {
		try {
			listener(event)
		} catch (error) {
			logger.error('[hostCircuitBreaker] listener threw:', error?.message || error)
		}
	}
}

/**
 * Subscribe to breaker state transitions. Returns an unsubscribe function.
 *
 * @param {(event: BreakerChangeEvent) => void} listener
 * @returns {() => void}
 */
export function onBreakerChange(listener) {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

/**
 * @param {string} hostKey
 * @param {{ state: BreakerState, failures: number, openedAt: number }} breaker
 */
function open(hostKey, breaker) {
	const wasOpen = breaker.state === 'open'
	breaker.state = 'open'
	breaker.openedAt = Date.now()
	if (!wasOpen) {
		logger.warn(
			`[hostCircuitBreaker] OPEN for "${hostKey}" after ${breaker.failures} consecutive failures — fast-failing for ${config.cooldownMs}ms`
		)
		emit({ hostKey, state: 'open' })
	}
}

/**
 * @param {string} hostKey
 * @param {{ state: BreakerState, failures: number, openedAt: number }} breaker
 */
function halfOpen(hostKey, breaker) {
	if (breaker.state === 'half-open') return
	breaker.state = 'half-open'
	logger.info(`[hostCircuitBreaker] half-open probe window for "${hostKey}"`)
	emit({ hostKey, state: 'half-open' })
}

/**
 * @param {string} hostKey
 * @param {{ state: BreakerState, failures: number, openedAt: number }} breaker
 */
function close(hostKey, breaker) {
	const wasDegraded = breaker.state !== 'closed'
	breaker.state = 'closed'
	breaker.failures = 0
	breaker.openedAt = 0
	if (wasDegraded) {
		logger.info(`[hostCircuitBreaker] CLOSED (recovered) for "${hostKey}"`)
		emit({ hostKey, state: 'closed' })
	}
}

/**
 * Whether a request to this URL's host is currently permitted.
 *
 * - closed / half-open → true
 * - open and still in cooldown → false (caller should fast-fail)
 * - open and past cooldown → transitions to half-open and allows one probe
 *
 * @param {string} url
 * @returns {boolean}
 */
export function canRequest(url) {
	const hostKey = extractHostKey(url)
	const breaker = getBreaker(hostKey)

	if (breaker.state !== 'open') {
		return true
	}

	if (Date.now() - breaker.openedAt >= config.cooldownMs) {
		halfOpen(hostKey, breaker)
		return true
	}

	return false
}

/**
 * Record a successful request. Closes the breaker (clears degraded state).
 *
 * @param {string} url
 */
export function recordSuccess(url) {
	const hostKey = extractHostKey(url)
	const breaker = getBreaker(hostKey)
	close(hostKey, breaker)
}

/**
 * Record a failed request (timeout, network error, or retriable 5xx/429).
 * Non-retriable 4xx responses are NOT outages and must not be recorded here.
 *
 * @param {string} url
 */
export function recordFailure(url) {
	const hostKey = extractHostKey(url)
	const breaker = getBreaker(hostKey)

	// A failed half-open probe means the host is still down — re-open.
	if (breaker.state === 'half-open') {
		breaker.failures = Math.max(breaker.failures, config.failureThreshold)
		open(hostKey, breaker)
		return
	}

	// Already open: stay open (cooldown timer governs the next probe).
	if (breaker.state === 'open') {
		return
	}

	breaker.failures += 1
	if (breaker.failures >= config.failureThreshold) {
		open(hostKey, breaker)
	}
}

/**
 * Whether the host serving this URL is currently degraded (breaker open).
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isHostDegraded(url) {
	const breaker = breakers.get(extractHostKey(url))
	return !!breaker && breaker.state === 'open'
}

/**
 * Host keys whose breaker is currently open (degraded).
 *
 * @returns {string[]}
 */
export function getDegradedHostKeys() {
	const out = []
	for (const [hostKey, breaker] of breakers) {
		if (breaker.state === 'open') out.push(hostKey)
	}
	return out
}

/**
 * Snapshot of breaker state for debugging / telemetry.
 *
 * @returns {Record<string, { state: BreakerState, failures: number }>}
 */
export function inspectBreaker() {
	/** @type {Record<string, { state: BreakerState, failures: number }>} */
	const out = {}
	for (const [hostKey, breaker] of breakers) {
		out[hostKey] = { state: breaker.state, failures: breaker.failures }
	}
	return out
}

/**
 * Override breaker thresholds (mainly for tests and per-host tuning).
 *
 * @param {{ failureThreshold?: number, cooldownMs?: number }} overrides
 */
export function setBreakerConfig(overrides = {}) {
	if (overrides.failureThreshold != null) {
		if (!Number.isFinite(overrides.failureThreshold) || overrides.failureThreshold < 1) {
			throw new Error('failureThreshold must be ≥ 1')
		}
		config.failureThreshold = Math.floor(overrides.failureThreshold)
	}
	if (overrides.cooldownMs != null) {
		if (!Number.isFinite(overrides.cooldownMs) || overrides.cooldownMs < 0) {
			throw new Error('cooldownMs must be ≥ 0')
		}
		config.cooldownMs = overrides.cooldownMs
	}
}

/**
 * Reset all breaker state and config. Intended for tests.
 */
export function __resetForTests() {
	breakers.clear()
	listeners.clear()
	config.failureThreshold = FAILURE_THRESHOLD
	config.cooldownMs = COOLDOWN_MS
}
