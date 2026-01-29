import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getGlobalWMSCache, resetGlobalWMSCache, WMSRequestCache } from '@/utils/wmsRequestCache.js'

// Mock logger
vi.mock('@/utils/logger.js', () => {
	const mockLogger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}
	return {
		default: mockLogger,
		logger: mockLogger,
	}
})

describe('WMSRequestCache', { tags: ['@unit', '@performance'] }, () => {
	let cache

	beforeEach(() => {
		cache = new WMSRequestCache({ maxSize: 100, ttl: 60000 })
	})

	afterEach(() => {
		cache.clear()
	})

	describe('initialization', () => {
		it('should create cache with default options', () => {
			const defaultCache = new WMSRequestCache()

			expect(defaultCache.maxSize).toBe(500)
			expect(defaultCache.ttl).toBe(1800000)
			expect(defaultCache.enabled).toBe(true)
		})

		it('should create cache with custom options', () => {
			const customCache = new WMSRequestCache({ maxSize: 200, ttl: 5000 })

			expect(customCache.maxSize).toBe(200)
			expect(customCache.ttl).toBe(5000)
		})
	})

	describe('deduplication of in-flight requests', () => {
		it('should return same promise for duplicate in-flight requests', async () => {
			const tileKey = '10/512/512'
			let callCount = 0
			let resolveRequest

			const requestFn = () => {
				callCount++
				return new Promise((resolve) => {
					resolveRequest = resolve
				})
			}

			const promise1 = cache.intercept(tileKey, requestFn)

			await new Promise((r) => setImmediate(r))

			const promise2 = cache.intercept(tileKey, requestFn)

			expect(promise1).toBe(promise2)

			resolveRequest({ data: 'tile_data' })

			await Promise.all([promise1, promise2])

			expect(callCount).toBe(1)
		})

		it('should return cached result on cache hit', async () => {
			const tileKey = '10/512/512'
			let callCount = 0

			const requestFn = async () => {
				callCount++
				return { data: 'tile_data' }
			}

			const result1 = await cache.intercept(tileKey, requestFn)
			expect(callCount).toBe(1)

			const result2 = await cache.intercept(tileKey, requestFn)
			expect(callCount).toBe(1)

			expect(result1).toBe(result2)
		})

		it('should update cache statistics on hits and misses', async () => {
			const tileKey = '10/512/512'
			const requestFn = async () => ({ data: 'tile_data' })

			await cache.intercept(tileKey, requestFn)
			expect(cache.stats.misses).toBe(1)
			expect(cache.stats.hits).toBe(0)

			await cache.intercept(tileKey, requestFn)
			expect(cache.stats.misses).toBe(1)
			expect(cache.stats.hits).toBe(1)

			await cache.intercept(tileKey, requestFn)
			expect(cache.stats.hits).toBe(2)
		})
	})

	describe('cache expiration', () => {
		it('should expire cache entries after TTL', async () => {
			const shortTtlCache = new WMSRequestCache({ maxSize: 100, ttl: 10 })
			const tileKey = '10/512/512'
			let callCount = 0

			const requestFn = async () => {
				callCount++
				return { data: `tile_${callCount}` }
			}

			const result1 = await shortTtlCache.intercept(tileKey, requestFn)
			expect(callCount).toBe(1)

			await new Promise((resolve) => setTimeout(resolve, 15))

			const result2 = await shortTtlCache.intercept(tileKey, requestFn)
			expect(callCount).toBe(2)

			expect(result1.data).toBe('tile_1')
			expect(result2.data).toBe('tile_2')
		})
	})

	describe('cache management operations', () => {
		it('should clear all cache and in-flight requests', async () => {
			const requestFn = async () => ({ data: 'tile_data' })

			await cache.intercept('10/100/100', requestFn)
			await cache.intercept('10/101/100', requestFn)

			expect(cache.tileCache.size).toBe(2)

			cache.clear()

			expect(cache.tileCache.size).toBe(0)
			expect(cache.inFlightRequests.size).toBe(0)
		})

		it('should provide statistics', async () => {
			const requestFn = async () => ({ data: 'tile_data' })

			await cache.intercept('10/100/100', requestFn)
			await cache.intercept('10/100/100', requestFn)
			await cache.intercept('10/101/100', requestFn)

			const stats = cache.getStats()

			expect(stats.requests).toBe(3)
			expect(stats.hits).toBe(1)
			expect(stats.misses).toBe(2)
			expect(stats.cacheSize).toBe(2)
			expect(stats.hitRate).toBe('33.3%')
		})
	})
})

describe('Global WMS Cache', { tags: ['@unit', '@performance'] }, () => {
	beforeEach(() => {
		resetGlobalWMSCache()
	})

	afterEach(() => {
		resetGlobalWMSCache()
	})

	it('should provide singleton instance', () => {
		const cache1 = getGlobalWMSCache()
		const cache2 = getGlobalWMSCache()

		expect(cache1).toBe(cache2)
	})

	it('should initialize with custom options on first call', () => {
		const cache = getGlobalWMSCache({ maxSize: 250, ttl: 5000 })

		expect(cache.maxSize).toBe(250)
		expect(cache.ttl).toBe(5000)
	})
})
