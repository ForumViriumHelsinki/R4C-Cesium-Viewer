/**
 * Unit tests for hostCircuitBreaker.
 *
 * Tags: @unit
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	__resetForTests,
	canRequest,
	getDegradedHostKeys,
	inspectBreaker,
	isHostDegraded,
	onBreakerChange,
	recordFailure,
	recordSuccess,
	setBreakerConfig,
} from '../../../src/services/hostCircuitBreaker.js'

const URL_A = 'https://kartta.hsy.fi/geoserver/wms'
const URL_B = '/pygeoapi/collections/foo'

describe('hostCircuitBreaker', () => {
	beforeEach(() => {
		__resetForTests()
		// Small threshold + cooldown so tests are fast and explicit.
		setBreakerConfig({ failureThreshold: 3, cooldownMs: 1000 })
	})

	afterEach(() => {
		vi.useRealTimers()
		__resetForTests()
	})

	it('stays closed and permits requests below the failure threshold', () => {
		recordFailure(URL_A)
		recordFailure(URL_A)
		expect(canRequest(URL_A)).toBe(true)
		expect(isHostDegraded(URL_A)).toBe(false)
		expect(inspectBreaker()['kartta.hsy.fi']).toEqual({ state: 'closed', failures: 2 })
	})

	it('opens after N consecutive failures and fast-fails subsequent requests', () => {
		recordFailure(URL_A)
		recordFailure(URL_A)
		recordFailure(URL_A) // threshold reached

		expect(isHostDegraded(URL_A)).toBe(true)
		expect(canRequest(URL_A)).toBe(false)
		expect(getDegradedHostKeys()).toEqual(['kartta.hsy.fi'])
	})

	it('isolates breakers per host', () => {
		recordFailure(URL_A)
		recordFailure(URL_A)
		recordFailure(URL_A) // opens A only

		expect(isHostDegraded(URL_A)).toBe(true)
		expect(isHostDegraded(URL_B)).toBe(false)
		expect(canRequest(URL_B)).toBe(true)
	})

	it('a success resets the consecutive-failure count (no premature open)', () => {
		recordFailure(URL_A)
		recordFailure(URL_A)
		recordSuccess(URL_A) // resets to closed/0
		recordFailure(URL_A)
		recordFailure(URL_A)

		expect(canRequest(URL_A)).toBe(true) // only 2 since reset
		expect(isHostDegraded(URL_A)).toBe(false)
	})

	it('transitions to half-open after the cooldown and recovers on a successful probe', () => {
		vi.useFakeTimers()
		vi.setSystemTime(0)

		recordFailure(URL_A)
		recordFailure(URL_A)
		recordFailure(URL_A) // open at t=0

		expect(canRequest(URL_A)).toBe(false)

		// Still within cooldown.
		vi.setSystemTime(500)
		expect(canRequest(URL_A)).toBe(false)

		// Past cooldown → half-open, one probe allowed.
		vi.setSystemTime(1500)
		expect(canRequest(URL_A)).toBe(true)
		expect(getDegradedHostKeys()).toEqual([]) // half-open is not "degraded"

		// Probe succeeds → fully closed.
		recordSuccess(URL_A)
		expect(inspectBreaker()['kartta.hsy.fi']).toEqual({ state: 'closed', failures: 0 })
	})

	it('re-opens immediately if the half-open probe fails', () => {
		vi.useFakeTimers()
		vi.setSystemTime(0)

		recordFailure(URL_A)
		recordFailure(URL_A)
		recordFailure(URL_A) // open

		vi.setSystemTime(2000) // past cooldown
		expect(canRequest(URL_A)).toBe(true) // half-open probe

		recordFailure(URL_A) // probe fails
		expect(isHostDegraded(URL_A)).toBe(true)
		expect(canRequest(URL_A)).toBe(false) // back in cooldown
	})

	it('emits open and recovered (closed) transitions to subscribers', () => {
		const events = []
		const unsubscribe = onBreakerChange((e) => events.push(e))

		recordFailure(URL_A)
		recordFailure(URL_A)
		recordFailure(URL_A) // open
		recordSuccess(URL_A) // closed (recovered)

		expect(events).toEqual([
			{ hostKey: 'kartta.hsy.fi', state: 'open' },
			{ hostKey: 'kartta.hsy.fi', state: 'closed' },
		])

		unsubscribe()
		recordFailure(URL_A)
		recordFailure(URL_A)
		recordFailure(URL_A)
		expect(events).toHaveLength(2) // no further events after unsubscribe
	})

	it('does not emit a duplicate open event while already open', () => {
		const events = []
		onBreakerChange((e) => events.push(e))

		recordFailure(URL_A)
		recordFailure(URL_A)
		recordFailure(URL_A) // open (1 event)
		recordFailure(URL_A) // still open, no new event

		expect(events.filter((e) => e.state === 'open')).toHaveLength(1)
	})
})
