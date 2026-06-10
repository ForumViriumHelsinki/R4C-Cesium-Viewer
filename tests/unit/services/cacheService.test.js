/**
 * Unit tests for cacheService perf-stats recording.
 *
 * Focused regression coverage for the getData/hasValidData split: only an
 * actual `getData` retrieval may record a cache hit/miss; `hasValidData` must
 * not, even though it shares the same `_lookup` internal. Stubbing `_lookup`
 * keeps these tests free of IndexedDB.
 *
 * Tags: @unit
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cacheService } from '../../../src/services/cacheService.js'
import { perfStats } from '../../../src/utils/perfStats.js'

describe('cacheService perf-stats recording', () => {
	beforeEach(() => {
		perfStats.reset()
		vi.restoreAllMocks()
	})

	it('getData records a hit (with stored size) on a lookup hit', async () => {
		vi.spyOn(cacheService, '_lookup').mockResolvedValue({
			result: { data: {}, timestamp: 0, age: 0, cached: true, metadata: {} },
			size: 2048,
		})

		const result = await cacheService.getData('key')

		expect(result).not.toBeNull()
		expect(perfStats.cache.hits).toBe(1)
		expect(perfStats.cache.bytesFromCache).toBe(2048)
		expect(perfStats.cache.misses).toBe(0)
	})

	it('getData records a miss on a lookup miss', async () => {
		vi.spyOn(cacheService, '_lookup').mockResolvedValue({ result: null, size: 0 })

		const result = await cacheService.getData('key')

		expect(result).toBeNull()
		expect(perfStats.cache.misses).toBe(1)
		expect(perfStats.cache.hits).toBe(0)
	})

	it('hasValidData does NOT record stats (no double-count with getData)', async () => {
		const lookup = vi.spyOn(cacheService, '_lookup').mockResolvedValue({
			result: { data: {}, timestamp: 0, age: 0, cached: true, metadata: {} },
			size: 1024,
		})

		const exists = await cacheService.hasValidData('key')

		expect(exists).toBe(true)
		expect(lookup).toHaveBeenCalledTimes(1)
		// The hit/miss counters and served-bytes total stay flat.
		expect(perfStats.cache.hits).toBe(0)
		expect(perfStats.cache.misses).toBe(0)
		expect(perfStats.cache.bytesFromCache).toBe(0)
	})
})
