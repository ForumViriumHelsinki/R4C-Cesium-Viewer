/**
 * Unit tests for unifiedLoader.loadLayer's per-layer lifecycle tracking (#816):
 * a single AbortController owns each layer's whole call, registered in
 * activeRequests, so cancelLoading() deterministically aborts an in-flight load
 * and the loading state is settled (errored) — no time-based stale sweep needed.
 *
 * Tags: @unit
 */

import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetForTests as resetBreaker } from '../../../src/services/hostCircuitBreaker.js'
import { __resetForTests as resetLimiter } from '../../../src/services/hostConcurrencyLimiter.js'
import unifiedLoader from '../../../src/services/unifiedLoader.js'
import { useLoadingStore } from '../../../src/stores/loadingStore.js'

const URL = 'https://pygeoapi.dataportal.fi/collections/x/items?tile=1'

describe('unifiedLoader.loadLayer — per-layer lifecycle & abort (#816)', () => {
	let loadingStore

	beforeEach(() => {
		setActivePinia(createPinia())
		loadingStore = useLoadingStore()
		// Force the loader's lazy store getter to resolve to this fresh store.
		unifiedLoader._loadingStore = null
		unifiedLoader._loadingStoreFallback = false
		resetBreaker()
		resetLimiter()
		global.fetch = vi.fn()
	})

	afterEach(() => {
		resetBreaker()
		resetLimiter()
		vi.restoreAllMocks()
	})

	it('registers a controller for the whole call and clears it after a successful load', async () => {
		const layerId = 'viewport_buildings_hsy_2490_6010'
		global.fetch.mockResolvedValue({
			ok: true,
			status: 200,
			headers: { get: () => null },
			json: async () => ({ type: 'FeatureCollection', features: [] }),
		})

		await unifiedLoader.loadLayer({ layerId, url: URL, type: 'geojson', options: { cache: false } })

		expect(unifiedLoader.activeRequests.has(layerId)).toBe(false)
		expect(loadingStore.layerLoading[layerId]).toBe(false)
	})

	it('cancelLoading aborts an in-flight load, settling the layer and clearing the controller', async () => {
		const layerId = 'viewport_buildings_hsy_2491_6010'
		// Hung upstream: resolves only when its signal aborts (mirrors real fetch).
		global.fetch.mockImplementation(
			(_url, opts) =>
				new Promise((_resolve, reject) => {
					opts.signal?.addEventListener('abort', () =>
						reject(new DOMException('Aborted', 'AbortError'))
					)
				})
		)

		const promise = unifiedLoader.loadLayer({
			layerId,
			url: URL,
			type: 'geojson',
			options: { cache: false, retries: 0 },
		})

		// Let startLayerLoading + controller registration run before asserting.
		await vi.waitFor(() => {
			expect(unifiedLoader.activeRequests.has(layerId)).toBe(true)
			expect(loadingStore.layerLoading[layerId]).toBe(true)
		})

		unifiedLoader.cancelLoading(layerId)

		await expect(promise).rejects.toThrow()
		expect(unifiedLoader.activeRequests.has(layerId)).toBe(false)
		// Deterministically settled — not waiting on any stale-cleanup timer.
		expect(loadingStore.layerLoading[layerId]).toBe(false)
	})
})
