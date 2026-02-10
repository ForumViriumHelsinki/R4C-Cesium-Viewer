import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadWithRetry } from '@/utils/moduleLoader.js'

describe('moduleLoader', () => {
	describe('loadWithRetry', () => {
		beforeEach(() => {
			vi.useFakeTimers()
		})

		afterEach(() => {
			vi.clearAllTimers()
			vi.useRealTimers()
			vi.restoreAllMocks()
		})

		it('should successfully import module on first try', async () => {
			const mockImport = vi.fn().mockResolvedValue({ default: 'test-module' })

			const result = await loadWithRetry(mockImport)

			expect(result).toBe('test-module')
			expect(mockImport).toHaveBeenCalledTimes(1)
		})

		it('should retry after transient failure', async () => {
			const mockImport = vi
				.fn()
				.mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module'))
				.mockResolvedValueOnce({ default: 'test-module' })

			const importPromise = loadWithRetry(mockImport, 3)

			// Advance timer to trigger retry
			await vi.advanceTimersByTimeAsync(1000)

			const result = await importPromise

			expect(result).toBe('test-module')
			expect(mockImport).toHaveBeenCalledTimes(2)
		})

		it('should use exponential backoff between retries', async () => {
			const error = new Error('Failed to fetch dynamically imported module')
			const mockImport = vi
				.fn()
				.mockRejectedValueOnce(error)
				.mockRejectedValueOnce(error)
				.mockRejectedValueOnce(error)
				.mockRejectedValueOnce(error)

			const importPromise = loadWithRetry(mockImport, 3)
			// Attach catch immediately to prevent unhandled rejection during timer advancement
			importPromise.catch(() => {})

			// Initial attempt happens synchronously
			expect(mockImport).toHaveBeenCalledTimes(1)

			// Advance by first backoff delay (1000ms * 2^0 = 1000ms)
			await vi.advanceTimersByTimeAsync(1000)
			expect(mockImport).toHaveBeenCalledTimes(2) // Initial + first retry

			// Advance by second backoff delay (1000ms * 2^1 = 2000ms)
			await vi.advanceTimersByTimeAsync(2000)
			expect(mockImport).toHaveBeenCalledTimes(3) // Initial + 2 retries

			// Advance by third backoff delay (1000ms * 2^2 = 4000ms)
			await vi.advanceTimersByTimeAsync(4000)
			expect(mockImport).toHaveBeenCalledTimes(4) // Initial + 3 retries

			// Verify it rejected with the expected error
			await expect(importPromise).rejects.toThrow('Failed to fetch dynamically imported module')
		})

		it('should throw error after max retries exceeded', async () => {
			const error = new Error('Failed to fetch dynamically imported module')
			const mockImport = vi
				.fn()
				.mockRejectedValueOnce(error)
				.mockRejectedValueOnce(error)
				.mockRejectedValueOnce(error)
				.mockRejectedValueOnce(error)

			const importPromise = loadWithRetry(mockImport, 3)
			// Attach catch immediately to prevent unhandled rejection during timer advancement
			importPromise.catch(() => {})

			// Advance through all retry delays
			await vi.advanceTimersByTimeAsync(1000) // First retry
			await vi.advanceTimersByTimeAsync(2000) // Second retry
			await vi.advanceTimersByTimeAsync(4000) // Third retry (final)

			await expect(importPromise).rejects.toThrow('Failed to fetch dynamically imported module')
			expect(mockImport).toHaveBeenCalledTimes(4) // Initial + 3 retries
		})

		it('should succeed on last retry', async () => {
			const mockImport = vi
				.fn()
				.mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module'))
				.mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module'))
				.mockResolvedValueOnce({ default: 'success-module' })

			const importPromise = loadWithRetry(mockImport, 3)

			// Advance through retries
			await vi.advanceTimersByTimeAsync(1000) // First retry
			await vi.advanceTimersByTimeAsync(2000) // Second retry (succeeds)

			const result = await importPromise

			expect(result).toBe('success-module')
			expect(mockImport).toHaveBeenCalledTimes(3) // Initial + 2 retries
		})

		it('should accept custom retry count', async () => {
			const error = new Error('Failed to fetch dynamically imported module')
			const mockImport = vi
				.fn()
				.mockRejectedValueOnce(error)
				.mockRejectedValueOnce(error)
				.mockRejectedValueOnce(error)

			const importPromise = loadWithRetry(mockImport, 2)
			// Attach catch immediately to prevent unhandled rejection during timer advancement
			importPromise.catch(() => {})

			await vi.advanceTimersByTimeAsync(1000) // First retry
			await vi.advanceTimersByTimeAsync(2000) // Second retry (final)

			await expect(importPromise).rejects.toThrow('Failed to fetch dynamically imported module')
			expect(mockImport).toHaveBeenCalledTimes(3) // Initial + 2 retries
		})

		it('should preserve original error message on final failure', async () => {
			const mockImport = vi.fn().mockRejectedValue(new Error('Network timeout: connection refused'))

			const importPromise = loadWithRetry(mockImport, 2)

			// This error is non-transient so it fails immediately
			await expect(importPromise).rejects.toThrow('Network timeout: connection refused')
			expect(mockImport).toHaveBeenCalledTimes(1)
		})

		it('should handle module default exports correctly', async () => {
			const mockModule = { default: { foo: 'bar' } }
			const mockImport = vi.fn().mockResolvedValue(mockModule)

			const result = await loadWithRetry(mockImport)

			expect(result).toEqual({ foo: 'bar' })
		})

		it('should handle modules with named exports', async () => {
			const mockModule = { namedExport: 'value', default: 'default-value' }
			const mockImport = vi.fn().mockResolvedValue(mockModule)

			const result = await loadWithRetry(mockImport)

			expect(result).toBe('default-value')
		})

		it('should not retry on non-network errors', async () => {
			const syntaxError = new SyntaxError('Invalid module syntax')
			const mockImport = vi.fn().mockRejectedValue(syntaxError)

			const importPromise = loadWithRetry(mockImport, 3)

			// Immediately throws without retry
			await expect(importPromise).rejects.toThrow('Invalid module syntax')
			expect(mockImport).toHaveBeenCalledTimes(1)
		})

		it('should default to 3 retries when not specified', async () => {
			const error = new Error('Failed to fetch dynamically imported module')
			const mockImport = vi
				.fn()
				.mockRejectedValueOnce(error)
				.mockRejectedValueOnce(error)
				.mockRejectedValueOnce(error)
				.mockRejectedValueOnce(error)

			const importPromise = loadWithRetry(mockImport) // No retry count specified
			// Attach catch immediately to prevent unhandled rejection during timer advancement
			importPromise.catch(() => {})

			await vi.advanceTimersByTimeAsync(1000) // First retry
			await vi.advanceTimersByTimeAsync(2000) // Second retry
			await vi.advanceTimersByTimeAsync(4000) // Third retry (final)

			await expect(importPromise).rejects.toThrow('Failed to fetch dynamically imported module')
			expect(mockImport).toHaveBeenCalledTimes(4) // Initial + 3 retries
		})
	})
})
