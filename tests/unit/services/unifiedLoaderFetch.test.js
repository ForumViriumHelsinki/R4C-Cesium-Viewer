/**
 * Unit tests for unifiedLoader.fetchWithRetry — the HSY-outage-resilience
 * behaviour: per-attempt timeout, circuit-breaker fast-fail, and which failure
 * modes trip the breaker.
 *
 * Tags: @unit
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	isHostDegraded,
	__resetForTests as resetBreaker,
	setBreakerConfig,
} from '../../../src/services/hostCircuitBreaker.js'
import { __resetForTests as resetLimiter } from '../../../src/services/hostConcurrencyLimiter.js'
import unifiedLoader from '../../../src/services/unifiedLoader.js'

const URL = 'https://kartta.hsy.fi/geoserver/wms?tile=1'

/** A Response-like object for fetch mocks. */
function makeResponse({ ok, status = 200, statusText = '', retryAfter = null }) {
	return {
		ok,
		status,
		statusText,
		headers: { get: (name) => (name === 'Retry-After' ? retryAfter : null) },
		json: async () => ({}),
	}
}

describe('unifiedLoader.fetchWithRetry — outage resilience', () => {
	beforeEach(() => {
		resetBreaker()
		resetLimiter()
		// Threshold 1 so a single failed request opens the breaker, keeping the
		// assertions about breaker integration direct.
		setBreakerConfig({ failureThreshold: 1, cooldownMs: 1000 })
		global.fetch = vi.fn()
	})

	afterEach(() => {
		vi.useRealTimers()
		resetBreaker()
		resetLimiter()
		vi.restoreAllMocks()
	})

	it('returns the response on success and keeps the breaker closed', async () => {
		global.fetch.mockResolvedValue(makeResponse({ ok: true, status: 200 }))

		const res = await unifiedLoader.fetchWithRetry(URL, {}, 0)

		expect(res.ok).toBe(true)
		expect(isHostDegraded(URL)).toBe(false)
		expect(global.fetch).toHaveBeenCalledTimes(1)
	})

	it('records a failure and trips the breaker on a retriable 504', async () => {
		global.fetch.mockResolvedValue(
			makeResponse({ ok: false, status: 504, statusText: 'Gateway Timeout' })
		)

		await expect(unifiedLoader.fetchWithRetry(URL, {}, 0)).rejects.toThrow(/HTTP 504/)
		expect(isHostDegraded(URL)).toBe(true) // threshold 1 → open
	})

	it('records a failure on a network error', async () => {
		global.fetch.mockRejectedValue(new Error('Network error'))

		await expect(unifiedLoader.fetchWithRetry(URL, {}, 0)).rejects.toThrow(/Network error/)
		expect(isHostDegraded(URL)).toBe(true)
	})

	it('does NOT trip the breaker on a non-retriable 404', async () => {
		global.fetch.mockResolvedValue(
			makeResponse({ ok: false, status: 404, statusText: 'Not Found' })
		)

		await expect(unifiedLoader.fetchWithRetry(URL, {}, 0)).rejects.toThrow(/HTTP 404/)
		expect(isHostDegraded(URL)).toBe(false) // client error, not an outage
	})

	it('fast-fails without calling fetch when the breaker is already open', async () => {
		// Open the breaker via one 504.
		global.fetch.mockResolvedValueOnce(makeResponse({ ok: false, status: 504 }))
		await expect(unifiedLoader.fetchWithRetry(URL, {}, 0)).rejects.toThrow(/HTTP 504/)
		expect(isHostDegraded(URL)).toBe(true)

		global.fetch.mockClear()
		await expect(unifiedLoader.fetchWithRetry(URL, {}, 0)).rejects.toThrow(/Circuit open/)
		expect(global.fetch).not.toHaveBeenCalled() // never hit the network
	})

	it('aborts a hung request via the per-attempt timeout and trips the breaker', async () => {
		vi.useFakeTimers()

		// Hung upstream: never resolves; rejects (AbortError) only when its
		// signal is aborted — mirrors real fetch + Azure gateway hang.
		global.fetch.mockImplementation(
			(_url, opts) =>
				new Promise((_resolve, reject) => {
					opts.signal?.addEventListener('abort', () =>
						reject(new DOMException('Aborted', 'AbortError'))
					)
				})
		)

		const promise = unifiedLoader.fetchWithRetry(URL, {}, 0)
		const assertion = expect(promise).rejects.toThrow(/timed out/i)

		// Advance past FETCH_TIMEOUT_MS (12s) to fire the attempt timeout.
		await vi.advanceTimersByTimeAsync(12_000)

		await assertion
		expect(isHostDegraded(URL)).toBe(true)
	})

	it('does not penalise the breaker when the caller aborts', async () => {
		const controller = new AbortController()
		global.fetch.mockImplementation(
			(_url, opts) =>
				new Promise((_resolve, reject) => {
					opts.signal?.addEventListener('abort', () =>
						reject(new DOMException('Aborted', 'AbortError'))
					)
				})
		)

		const promise = unifiedLoader.fetchWithRetry(URL, { signal: controller.signal }, 0)
		controller.abort()

		await expect(promise).rejects.toThrow()
		expect(isHostDegraded(URL)).toBe(false) // user cancel ≠ host outage
	})
})
