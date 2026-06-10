/**
 * Unit tests for perfStats dev/E2E-gated performance counters.
 *
 * Vitest runs in `test` mode, so `import.meta.env.DEV` is true and
 * PERF_STATS_ENABLED resolves to true — the counters are live here.
 *
 * Tags: @unit
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PERF_STATS_ENABLED, perfStats } from '../../../src/utils/perfStats.js'

describe('perfStats', () => {
	beforeEach(() => {
		perfStats.reset()
	})

	it('is enabled under the test runner (DEV mode)', () => {
		expect(PERF_STATS_ENABLED).toBe(true)
		expect(perfStats.enabled).toBe(true)
	})

	it('exposes a flat, JSON-serializable shape (methods omitted)', () => {
		const snapshot = JSON.parse(JSON.stringify(perfStats))
		expect(snapshot).toEqual({
			enabled: true,
			limiter: { hosts: {} },
			cache: {
				hits: 0,
				misses: 0,
				bytesFromCache: 0,
				bytesFromNetwork: 0,
				deserializeMsTotal: 0,
				deserializeCount: 0,
			},
			render: { requestRenderCount: 0 },
		})
		// Methods must not survive serialization.
		expect(snapshot.reset).toBeUndefined()
		expect(snapshot.recordCacheHit).toBeUndefined()
	})

	describe('limiter counters', () => {
		it('records fast-path acquire (no wait) and release', () => {
			perfStats.recordLimiterAcquire('pygeoapi', 0)
			const host = perfStats.limiter.hosts.pygeoapi
			expect(host.acquired).toBe(1)
			expect(host.inFlight).toBe(1)
			expect(host.queuedCount).toBe(0)
			expect(host.queueWaitMsTotal).toBe(0)

			perfStats.recordLimiterRelease('pygeoapi')
			expect(perfStats.limiter.hosts.pygeoapi.inFlight).toBe(0)
		})

		it('accumulates queue-wait time and count so avg is derivable', () => {
			perfStats.recordLimiterAcquire('pygeoapi', 12)
			perfStats.recordLimiterAcquire('pygeoapi', 8)
			const host = perfStats.limiter.hosts.pygeoapi
			expect(host.queuedCount).toBe(2)
			expect(host.queueWaitMsTotal).toBe(20)
			expect(host.queueWaitMsTotal / host.queuedCount).toBe(10)
		})

		it('tracks queue-depth high-water mark', () => {
			perfStats.recordLimiterEnqueue('pygeoapi', 1)
			perfStats.recordLimiterEnqueue('pygeoapi', 4)
			perfStats.recordLimiterEnqueue('pygeoapi', 2)
			expect(perfStats.limiter.hosts.pygeoapi.queueDepthHWM).toBe(4)
		})

		it('never lets in-flight go negative on extra releases', () => {
			perfStats.recordLimiterRelease('wms')
			expect(perfStats.limiter.hosts.wms.inFlight).toBe(0)
		})
	})

	describe('cache counters', () => {
		it('records hits with served bytes and misses', () => {
			perfStats.recordCacheHit(2048)
			perfStats.recordCacheHit(1024)
			perfStats.recordCacheMiss()
			expect(perfStats.cache.hits).toBe(2)
			expect(perfStats.cache.bytesFromCache).toBe(3072)
			expect(perfStats.cache.misses).toBe(1)
		})

		it('records network bytes and cumulative deserialize time', () => {
			perfStats.recordNetworkBytes(5000)
			perfStats.recordNetworkBytes(0) // Content-Length absent
			perfStats.recordDeserialize(3.5)
			perfStats.recordDeserialize(1.5)
			expect(perfStats.cache.bytesFromNetwork).toBe(5000)
			expect(perfStats.cache.deserializeMsTotal).toBe(5)
			expect(perfStats.cache.deserializeCount).toBe(2)
		})
	})

	describe('render counter', () => {
		it('counts requestRender calls', () => {
			perfStats.recordRequestRender()
			perfStats.recordRequestRender()
			expect(perfStats.render.requestRenderCount).toBe(2)
		})
	})

	describe('flag off (production build)', () => {
		afterEach(() => {
			vi.unstubAllEnvs()
			vi.resetModules()
		})

		it('reports disabled and does not expose window.__perfStats', async () => {
			vi.resetModules()
			vi.stubEnv('DEV', false)
			vi.stubEnv('VITE_E2E_TEST', '')
			// Clear any exposure left by the live (flag-on) import above.
			const testWindow = /** @type {{ __perfStats?: unknown }} */ (window)
			testWindow.__perfStats = undefined

			const mod = await import('../../../src/utils/perfStats.js')

			expect(mod.PERF_STATS_ENABLED).toBe(false)
			expect(mod.perfStats.enabled).toBe(false)
			expect(testWindow.__perfStats).toBeUndefined()
		})
	})

	describe('reset()', () => {
		it('zeroes every counter in place, preserving object identity', () => {
			const limiterRef = perfStats.limiter
			const cacheRef = perfStats.cache

			perfStats.recordLimiterAcquire('pygeoapi', 5)
			perfStats.recordCacheHit(999)
			perfStats.recordNetworkBytes(123)
			perfStats.recordDeserialize(2)
			perfStats.recordRequestRender()

			perfStats.reset()

			expect(perfStats.limiter).toBe(limiterRef) // same reference
			expect(perfStats.cache).toBe(cacheRef)
			expect(perfStats.limiter.hosts).toEqual({})
			expect(perfStats.cache.hits).toBe(0)
			expect(perfStats.cache.bytesFromCache).toBe(0)
			expect(perfStats.cache.bytesFromNetwork).toBe(0)
			expect(perfStats.cache.deserializeMsTotal).toBe(0)
			expect(perfStats.cache.deserializeCount).toBe(0)
			expect(perfStats.render.requestRenderCount).toBe(0)
		})
	})
})
