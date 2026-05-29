/**
 * @vitest-environment jsdom
 * @tag @unit
 */

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLoadingStore } from '@/stores/loadingStore'

describe('loadingStore', () => {
	let store

	beforeEach(() => {
		// Fresh pinia instance per test so state never leaks across cases.
		setActivePinia(createPinia())
		store = useLoadingStore()
		vi.clearAllMocks()
	})

	describe('lifecycle: start then complete', () => {
		it('clears layerLoading and marks progress completed on success', () => {
			store.startLayerLoading('buildings')
			expect(store.layerLoading.buildings).toBe(true)
			expect(store.loadingProgress.buildings.status).toBe('loading')

			store.completeLayerLoading('buildings', true)

			expect(store.layerLoading.buildings).toBe(false)
			expect(store.loadingProgress.buildings.status).toBe('completed')
			expect(store.isLoading).toBe(false)
		})
	})

	describe('lifecycle: start then setLayerError', () => {
		it('clears layerLoading and records the error', () => {
			store.startLayerLoading('buildings')

			store.setLayerError('buildings', 'boom')

			expect(store.layerLoading.buildings).toBe(false)
			expect(store.loadingProgress.buildings.status).toBe('error')
			expect(store.loadingErrors.buildings).toBe('boom')
			expect(store.isLoading).toBe(false)
		})

		it('does not throw when the layer has no progress entry', () => {
			// Mirrors cancelLoading() calling setLayerError on a dynamic layer
			// whose loadingProgress entry was never created.
			const dynamicLayer = 'viewport_buildings_hsy_2499_6025'
			expect(store.loadingProgress[dynamicLayer]).toBeUndefined()

			expect(() => store.setLayerError(dynamicLayer, 'aborted')).not.toThrow()

			expect(store.layerLoading[dynamicLayer]).toBe(false)
			expect(store.loadingErrors[dynamicLayer]).toBe('aborted')
		})
	})

	describe('clearStaleLoading', () => {
		it('does NOT clear a dynamic layer that started less than the timeout ago (regression for #680)', () => {
			const dynamicLayer = 'viewport_buildings_hsy_2499_6025'
			store.startLayerLoading(dynamicLayer)
			expect(store.layerLoading[dynamicLayer]).toBe(true)

			// Simulate the timer firing while the tile is still legitimately in-flight.
			const cleared = store.clearStaleLoading(30000)

			expect(cleared).toBe(0)
			expect(store.layerLoading[dynamicLayer]).toBe(true)
			expect(store.loadingProgress[dynamicLayer].status).toBe('loading')
		})

		it('clears any layer (dynamic or predefined) older than the timeout', () => {
			const dynamicLayer = 'viewport_buildings_hsy_2499_6025'
			store.startLayerLoading(dynamicLayer)
			store.startLayerLoading('buildings')

			// Backdate both start times so they exceed the 30s timeout.
			const longAgo = Date.now() - 60000
			store.loadingTimes[dynamicLayer].startTime = longAgo
			store.loadingTimes.buildings.startTime = longAgo

			const cleared = store.clearStaleLoading(30000)

			expect(cleared).toBe(2)
			expect(store.layerLoading[dynamicLayer]).toBe(false)
			expect(store.layerLoading.buildings).toBe(false)
			expect(store.loadingProgress[dynamicLayer].status).toBe('timeout')
			expect(store.loadingProgress.buildings.status).toBe('timeout')
		})
	})
})
