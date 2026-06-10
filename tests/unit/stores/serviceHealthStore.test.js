/**
 * Unit tests for serviceHealthStore — the bridge from the per-host circuit
 * breaker to the user-facing degradation notice.
 *
 * Tags: @unit
 */

import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	__resetForTests,
	recordFailure,
	recordSuccess,
	setBreakerConfig,
} from '../../../src/services/hostCircuitBreaker.js'
import { useServiceHealthStore } from '../../../src/stores/serviceHealthStore.js'

const HSY_WMS_URL = '/wms/proxy/landcover'
const PYGEOAPI_URL = '/pygeoapi/collections/buildings'
const NON_HSY_URL = '/digitransit/routing'

describe('serviceHealthStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		__resetForTests()
		setBreakerConfig({ failureThreshold: 2, cooldownMs: 1000 })
	})

	afterEach(() => {
		const store = useServiceHealthStore()
		store.teardown()
		__resetForTests()
	})

	it('starts uninitialized and healthy', () => {
		const store = useServiceHealthStore()
		expect(store.initialized).toBe(false)
		expect(store.isAnyServiceDegraded).toBe(false)
		expect(store.degradedMessage).toBe('')
	})

	it('init() wires the breaker subscription and flips initialized', () => {
		const store = useServiceHealthStore()
		store.init()
		expect(store.initialized).toBe(true)
	})

	it('reflects a degraded HSY host once the breaker opens', () => {
		const store = useServiceHealthStore()
		store.init()

		recordFailure(HSY_WMS_URL)
		recordFailure(HSY_WMS_URL) // opens (threshold 2)

		expect(store.isAnyServiceDegraded).toBe(true)
		expect(store.isHsyDegraded).toBe(true)
		expect(store.degradedMessage).toMatch(/HSY map layers/i)
		expect(store.degradedHostKeys).toContain('wms')
	})

	it('does not surface the HSY notice for a degraded non-HSY host', () => {
		const store = useServiceHealthStore()
		store.init()

		recordFailure(NON_HSY_URL)
		recordFailure(NON_HSY_URL) // opens (threshold 2)

		// A non-HSY host is degraded, but the message is HSY-specific.
		expect(store.isAnyServiceDegraded).toBe(true)
		expect(store.isHsyDegraded).toBe(false)
		expect(store.degradedMessage).toBe('')
	})

	it('clears the notice when the breaker recovers', () => {
		const store = useServiceHealthStore()
		store.init()

		recordFailure(PYGEOAPI_URL)
		recordFailure(PYGEOAPI_URL) // open
		expect(store.isAnyServiceDegraded).toBe(true)

		recordSuccess(PYGEOAPI_URL) // recovered → closed
		expect(store.isAnyServiceDegraded).toBe(false)
		expect(store.degradedMessage).toBe('')
	})

	it('picks up a breaker that opened before init()', () => {
		recordFailure(HSY_WMS_URL)
		recordFailure(HSY_WMS_URL) // open before the store subscribes

		const store = useServiceHealthStore()
		store.init() // refresh() reads current degraded state
		expect(store.isAnyServiceDegraded).toBe(true)
	})

	it('teardown() unsubscribes and stops tracking further changes', () => {
		const store = useServiceHealthStore()
		store.init()
		store.teardown()

		recordFailure(HSY_WMS_URL)
		recordFailure(HSY_WMS_URL) // would open, but we are unsubscribed

		expect(store.initialized).toBe(false)
		expect(store.isAnyServiceDegraded).toBe(false)
	})
})
