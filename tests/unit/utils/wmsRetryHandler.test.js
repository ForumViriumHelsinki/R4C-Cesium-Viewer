import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	getGlobalWMSRetryHandler,
	resetGlobalWMSRetryHandler,
	WMSRetryHandler,
} from '@/utils/wmsRetryHandler.js'

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

describe('WMSRetryHandler', { tags: ['@unit', '@wms'] }, () => {
	let handler

	beforeEach(() => {
		handler = new WMSRetryHandler({ maxRetries: 3, baseDelay: 1000, maxDelay: 8000, jitter: 200 })
	})

	afterEach(() => {
		handler.clear()
	})

	describe('initialization', () => {
		it('should create handler with default options from TIMING constants', () => {
			const defaultHandler = new WMSRetryHandler()

			expect(defaultHandler.maxRetries).toBe(3)
			expect(defaultHandler.baseDelay).toBe(1000)
			expect(defaultHandler.maxDelay).toBe(8000)
			expect(defaultHandler.jitter).toBe(200)
		})

		it('should create handler with custom options', () => {
			const customHandler = new WMSRetryHandler({
				maxRetries: 5,
				baseDelay: 500,
				maxDelay: 4000,
				jitter: 100,
			})

			expect(customHandler.maxRetries).toBe(5)
			expect(customHandler.baseDelay).toBe(500)
			expect(customHandler.maxDelay).toBe(4000)
			expect(customHandler.jitter).toBe(100)
		})
	})

	describe('handleTileError', () => {
		it('should return true and set error.retry for first retry attempt', () => {
			const error = { x: 100, y: 200, level: 10 }

			const result = handler.handleTileError(error, 'buildings')

			expect(result).toBe(true)
			expect(error.retry).toBe(true)
			expect(handler.stats.retriesAttempted).toBe(1)
		})

		it('should track retry attempts per tile', () => {
			const error1 = { x: 100, y: 200, level: 10 }
			const error2 = { x: 100, y: 200, level: 10 }
			const error3 = { x: 100, y: 200, level: 10 }

			handler.handleTileError(error1, 'test')
			handler.handleTileError(error2, 'test')
			handler.handleTileError(error3, 'test')

			expect(handler.retryAttempts.get('10/100/200')).toBe(3)
		})

		it('should return false when max retries exceeded', () => {
			const error = { x: 100, y: 200, level: 10 }

			handler.handleTileError(error, 'test') // 1
			handler.handleTileError(error, 'test') // 2
			handler.handleTileError(error, 'test') // 3
			const result = handler.handleTileError(error, 'test') // 4 - exceeds

			expect(result).toBe(false)
			expect(handler.stats.retriesExhausted).toBe(1)
		})

		it('should track different tiles separately', () => {
			const error1 = { x: 100, y: 200, level: 10 }
			const error2 = { x: 101, y: 200, level: 10 }

			handler.handleTileError(error1, 'test')
			handler.handleTileError(error1, 'test')
			handler.handleTileError(error2, 'test')

			expect(handler.retryAttempts.get('10/100/200')).toBe(2)
			expect(handler.retryAttempts.get('10/101/200')).toBe(1)
		})

		it('should clean up tile after max retries exhausted', () => {
			const error = { x: 100, y: 200, level: 10 }

			handler.handleTileError(error, 'test')
			handler.handleTileError(error, 'test')
			handler.handleTileError(error, 'test')
			handler.handleTileError(error, 'test') // exceeds, triggers cleanup

			expect(handler.retryAttempts.has('10/100/200')).toBe(false)
		})

		it('should handle errors without tile coordinates', () => {
			const error = { timesRetried: 0 }

			const result = handler.handleTileError(error, 'test')

			expect(result).toBe(true)
			expect(error.retry).toBe(true)
		})
	})

	describe('delay calculation', () => {
		it('should calculate exponential backoff', () => {
			// Mock Math.random to return 0 for predictable results
			vi.spyOn(Math, 'random').mockReturnValue(0)

			const delay1 = handler._calculateDelay(1)
			const delay2 = handler._calculateDelay(2)
			const delay3 = handler._calculateDelay(3)

			expect(delay1).toBe(1000) // 1000 * 2^0 = 1000
			expect(delay2).toBe(2000) // 1000 * 2^1 = 2000
			expect(delay3).toBe(4000) // 1000 * 2^2 = 4000

			vi.restoreAllMocks()
		})

		it('should cap delay at maxDelay', () => {
			vi.spyOn(Math, 'random').mockReturnValue(0)

			const delay = handler._calculateDelay(10) // 1000 * 2^9 = 512000, capped at 8000

			expect(delay).toBe(8000)

			vi.restoreAllMocks()
		})

		it('should add jitter to delay', () => {
			vi.spyOn(Math, 'random').mockReturnValue(0.5)

			const delay = handler._calculateDelay(1)

			expect(delay).toBe(1100) // 1000 + (0.5 * 200)

			vi.restoreAllMocks()
		})
	})

	describe('tile key generation', () => {
		it('should generate key from x, y, level', () => {
			const error = { x: 512, y: 256, level: 15 }

			const key = handler._getTileKey(error)

			expect(key).toBe('15/512/256')
		})

		it('should handle fallback for missing coordinates', () => {
			const error = { timesRetried: 2 }

			const key = handler._getTileKey(error)

			expect(key).toMatch(/^tile-2-\d+$/)
		})

		it('should handle completely unknown error format', () => {
			const error = {}

			const key = handler._getTileKey(error)

			expect(key).toMatch(/^unknown-\d+$/)
		})
	})

	describe('cache management', () => {
		it('should clear specific tile', () => {
			const error = { x: 100, y: 200, level: 10 }
			handler.handleTileError(error, 'test')

			handler.clearTile('10/100/200')

			expect(handler.retryAttempts.has('10/100/200')).toBe(false)
		})

		it('should clear all retry tracking', () => {
			handler.handleTileError({ x: 100, y: 200, level: 10 }, 'test')
			handler.handleTileError({ x: 101, y: 200, level: 10 }, 'test')

			handler.clear()

			expect(handler.retryAttempts.size).toBe(0)
		})

		it('should cleanup stale entries', () => {
			handler.handleTileError({ x: 100, y: 200, level: 10 }, 'test')
			handler.handleTileError({ x: 101, y: 200, level: 10 }, 'test')

			handler.cleanupStale()

			expect(handler.retryAttempts.size).toBe(0)
		})
	})

	describe('statistics', () => {
		it('should track error statistics', () => {
			const error = { x: 100, y: 200, level: 10 }

			handler.handleTileError(error, 'test')
			handler.handleTileError(error, 'test')
			handler.handleTileError(error, 'test')
			handler.handleTileError(error, 'test') // exceeds

			const stats = handler.getStats()

			expect(stats.totalErrors).toBe(4)
			expect(stats.retriesAttempted).toBe(3)
			expect(stats.retriesExhausted).toBe(1)
			expect(stats.pendingRetries).toBe(0) // cleaned up after exhaustion
		})
	})
})

describe('Global WMS Retry Handler', { tags: ['@unit', '@wms'] }, () => {
	beforeEach(() => {
		resetGlobalWMSRetryHandler()
	})

	afterEach(() => {
		resetGlobalWMSRetryHandler()
	})

	it('should provide singleton instance', () => {
		const handler1 = getGlobalWMSRetryHandler()
		const handler2 = getGlobalWMSRetryHandler()

		expect(handler1).toBe(handler2)
	})

	it('should initialize with custom options on first call', () => {
		const handler = getGlobalWMSRetryHandler({ maxRetries: 5, baseDelay: 500 })

		expect(handler.maxRetries).toBe(5)
		expect(handler.baseDelay).toBe(500)
	})

	it('should ignore options on subsequent calls', () => {
		getGlobalWMSRetryHandler({ maxRetries: 5 })
		const handler2 = getGlobalWMSRetryHandler({ maxRetries: 10 })

		expect(handler2.maxRetries).toBe(5) // First call's options persist
	})

	it('should reset global handler', () => {
		const handler1 = getGlobalWMSRetryHandler()
		handler1.handleTileError({ x: 1, y: 1, level: 1 }, 'test')

		resetGlobalWMSRetryHandler()

		const handler2 = getGlobalWMSRetryHandler()
		expect(handler2).not.toBe(handler1)
		expect(handler2.retryAttempts.size).toBe(0)
	})
})
