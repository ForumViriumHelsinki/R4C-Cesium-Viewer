import { afterEach, describe, expect, it, vi } from 'vitest'
import { cancelIdle, requestIdle } from '@/utils/idle.js'

describe('idle utilities', () => {
	afterEach(() => {
		vi.restoreAllMocks()
		vi.unstubAllGlobals()
	})

	describe('requestIdle', () => {
		it('delegates to native requestIdleCallback when available', () => {
			const native = vi.fn((_cb, _opts) => 42)
			vi.stubGlobal('requestIdleCallback', native)

			const callback = vi.fn()
			const handle = requestIdle(callback, { timeout: 2000 })

			expect(native).toHaveBeenCalledTimes(1)
			expect(native).toHaveBeenCalledWith(callback, { timeout: 2000 })
			expect(handle).toBe(42)
		})

		it('falls back to setTimeout when requestIdleCallback is undefined (iOS/WebKit)', () => {
			vi.stubGlobal('requestIdleCallback', undefined)
			vi.useFakeTimers()

			const callback = vi.fn()
			const handle = requestIdle(callback)

			// Handle should be a timer id (number-like — Node returns Timeout object,
			// browsers return number; both are truthy and clearable).
			expect(handle).toBeDefined()
			expect(callback).not.toHaveBeenCalled()

			vi.runAllTimers()

			expect(callback).toHaveBeenCalledTimes(1)
			const deadline = callback.mock.calls[0][0]
			expect(deadline).toBeDefined()
			expect(deadline.didTimeout).toBe(false)
			expect(typeof deadline.timeRemaining).toBe('function')
			expect(deadline.timeRemaining()).toBe(0)

			vi.useRealTimers()
		})

		it('does not throw when requestIdleCallback is not defined at all', () => {
			// Simulate iOS where the identifier is genuinely missing — the helper
			// must not reference the bare identifier or it would throw ReferenceError.
			vi.stubGlobal('requestIdleCallback', undefined)
			expect(() => requestIdle(() => {})).not.toThrow()
		})
	})

	describe('cancelIdle', () => {
		it('delegates to native cancelIdleCallback when both APIs are available', () => {
			const native = vi.fn((_cb) => 99)
			const cancel = vi.fn()
			vi.stubGlobal('requestIdleCallback', native)
			vi.stubGlobal('cancelIdleCallback', cancel)

			const handle = requestIdle(() => {})
			cancelIdle(handle)

			expect(cancel).toHaveBeenCalledWith(99)
		})

		it('falls back to clearTimeout when cancelIdleCallback is missing', () => {
			vi.stubGlobal('requestIdleCallback', undefined)
			vi.stubGlobal('cancelIdleCallback', undefined)
			const clearSpy = vi.spyOn(globalThis, 'clearTimeout')

			const handle = requestIdle(() => {})
			cancelIdle(handle)

			expect(clearSpy).toHaveBeenCalledWith(handle)
		})

		it('is a no-op for null/undefined handles', () => {
			vi.stubGlobal('cancelIdleCallback', vi.fn())
			expect(() => cancelIdle(null)).not.toThrow()
			expect(() => cancelIdle(undefined)).not.toThrow()
		})
	})
})
