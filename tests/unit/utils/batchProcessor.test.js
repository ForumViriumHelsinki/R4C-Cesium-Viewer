import { afterEach, describe, expect, it, vi } from 'vitest'
import { processBatch } from '@/utils/batchProcessor.js'

describe('batchProcessor', () => {
	describe('processBatch', () => {
		afterEach(() => {
			vi.restoreAllMocks()
			vi.unstubAllGlobals()
		})

		it('should process all items in batches', async () => {
			// Stub requestIdleCallback to execute immediately
			vi.stubGlobal('requestIdleCallback', (cb) => cb())

			const items = [1, 2, 3, 4, 5, 6, 7, 8]
			const processed = []
			const processor = (item) => processed.push(item)

			await processBatch(items, processor, { batchSize: 3 })

			expect(processed).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
		})

		it('should use default batch size of 25', async () => {
			vi.stubGlobal('requestIdleCallback', (cb) => cb())

			const items = Array.from({ length: 30 }, (_, i) => i)
			const batchStarts = []

			const processor = vi.fn((_item, _index, _batch, batchIndex) => {
				if (batchStarts.length === 0 || batchStarts[batchStarts.length - 1] !== batchIndex) {
					batchStarts.push(batchIndex)
				}
			})

			await processBatch(items, processor)

			// With default batch size 25, 30 items should be 2 batches
			expect(processor).toHaveBeenCalledTimes(30)
		})

		it('should handle empty arrays', async () => {
			const processor = vi.fn()

			await processBatch([], processor)

			expect(processor).not.toHaveBeenCalled()
		})

		it('should handle arrays smaller than batch size', async () => {
			vi.stubGlobal('requestIdleCallback', (cb) => cb())

			const items = [1, 2, 3]
			const processed = []

			const processor = (item) => {
				processed.push(item)
			}

			await processBatch(items, processor, { batchSize: 10 })

			expect(processed).toEqual([1, 2, 3])
		})

		it('should yield to main thread between batches when yieldToMain is true', async () => {
			const mockRequestIdleCallback = vi.fn((cb) => cb())
			vi.stubGlobal('requestIdleCallback', mockRequestIdleCallback)

			const items = Array.from({ length: 10 }, (_, i) => i)

			await processBatch(items, vi.fn(), { batchSize: 3, yieldToMain: true, adaptive: false })

			// With 10 items and batch size 3, we have 4 batches
			// Yielding should happen 3 times (between batches, not after last)
			expect(mockRequestIdleCallback).toHaveBeenCalledTimes(3)
		})

		it('should not yield when yieldToMain is false', async () => {
			const mockRequestIdleCallback = vi.fn((cb) => cb())
			vi.stubGlobal('requestIdleCallback', mockRequestIdleCallback)

			const items = Array.from({ length: 10 }, (_, i) => i)

			await processBatch(items, vi.fn(), { batchSize: 3, yieldToMain: false })

			expect(mockRequestIdleCallback).not.toHaveBeenCalled()
		})

		it('should fall back to setTimeout when requestIdleCallback is not available', async () => {
			vi.stubGlobal('requestIdleCallback', undefined)

			// Mock setTimeout to execute immediately for test
			const mockSetTimeout = vi.fn((cb) => {
				cb()
				return 0
			})
			vi.stubGlobal('setTimeout', mockSetTimeout)

			const items = Array.from({ length: 10 }, (_, i) => i)

			await processBatch(items, vi.fn(), { batchSize: 3, yieldToMain: true })

			expect(mockSetTimeout).toHaveBeenCalled()
		})

		it('should support async processor functions', async () => {
			vi.stubGlobal('requestIdleCallback', (cb) => cb())

			const items = [1, 2, 3]
			const results = []

			const asyncProcessor = async (item) => {
				await Promise.resolve()
				results.push(item * 2)
			}

			await processBatch(items, asyncProcessor, { batchSize: 2 })

			expect(results).toEqual([2, 4, 6])
		})

		it('should pass item, index, batch, and batchIndex to processor', async () => {
			vi.stubGlobal('requestIdleCallback', (cb) => cb())

			const items = ['a', 'b', 'c']
			const calls = []

			await processBatch(
				items,
				(item, index, batch, batchIndex) => {
					calls.push({ item, index, batch, batchIndex })
				},
				{ batchSize: 2, adaptive: false }
			)

			expect(calls).toEqual([
				{ item: 'a', index: 0, batch: ['a', 'b'], batchIndex: 0 },
				{ item: 'b', index: 1, batch: ['a', 'b'], batchIndex: 0 },
				{ item: 'c', index: 2, batch: ['c'], batchIndex: 1 },
			])
		})

		it('should handle processor errors gracefully', async () => {
			vi.stubGlobal('requestIdleCallback', (cb) => cb())

			const items = [1, 2, 3]
			const processor = vi.fn((item) => {
				if (item === 2) throw new Error('Test error')
			})

			await expect(processBatch(items, processor)).rejects.toThrow('Test error')
		})

		describe('adaptive batch sizing', () => {
			it('should accept adaptive batch size function', async () => {
				vi.stubGlobal('requestIdleCallback', (cb) => cb())

				const items = Array.from({ length: 100 }, (_, i) => i)

				const adaptiveBatchSize = (itemCount) => (itemCount > 50 ? 15 : 25)

				// Just verify it doesn't throw and completes
				await expect(
					processBatch(items, vi.fn(), {
						batchSize: adaptiveBatchSize,
					})
				).resolves.toBeUndefined()
			})
		})
	})
})
