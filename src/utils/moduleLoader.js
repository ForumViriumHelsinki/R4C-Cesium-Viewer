/**
 * @module utils/moduleLoader
 * Utilities for dynamic module import with retry logic and error handling.
 */

import logger from './logger.js'

/**
 * Attempts to dynamically import a module with exponential backoff retry logic.
 * Handles transient network failures and temporary module unavailability.
 *
 * Retry Strategy:
 * - Attempts import immediately
 * - On failure, retries with exponential backoff: 1s, 2s, 4s, 8s, etc.
 * - Continues until success or max retries exceeded
 * - Only retries on network-related errors (Failed to fetch dynamically imported module)
 * - Fails immediately on syntax or other non-transient errors
 *
 * @async
 * @param {Function} importFn - Function that returns a Promise with the module import
 * @param {number} [retries=3] - Number of retry attempts after initial failure (default: 3)
 * @returns {Promise<any>} The default export from the imported module
 *
 * @example
 * // Basic usage
 * const decoder = await loadWithRetry(() => import('./decoder.js'));
 *
 * @example
 * // With custom retry count
 * const datasource = await loadWithRetry(() => import('./datasource.js'), 5);
 *
 * @example
 * // Error handling
 * try {
 *   const module = await loadWithRetry(() => import('./critical-module.js'));
 * } catch (error) {
 *   logger.error('Failed to load module after retries:', error);
 *   // Handle fallback or user notification
 * }
 *
 * @throws {Error} If import fails after all retries or on non-transient errors
 */
export async function loadWithRetry(importFn, retries = 3) {
	let lastError = null

	// Initial attempt plus retries
	const maxAttempts = retries + 1

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			const module = await importFn()
			// Return the default export if available, otherwise return the module
			return module.default || module
		} catch (error) {
			lastError = error

			// Check if this is a network-related error that should be retried
			const isNetworkError = error.message?.includes('Failed to fetch dynamically imported module')

			// Fail immediately on non-network errors (syntax, parsing, etc.)
			if (!isNetworkError) {
				logger.debug(
					`[loadWithRetry] Non-transient error on attempt ${attempt + 1}/${maxAttempts}, failing immediately:`,
					error.message
				)
				throw error
			}

			// If this is the last attempt, throw the error
			if (attempt === maxAttempts - 1) {
				logger.error(
					`[loadWithRetry] Failed to load module after ${maxAttempts} attempts:`,
					error.message
				)
				throw error
			}

			// Calculate exponential backoff delay: 1s * 2^attempt
			const delayMs = 1000 * 2 ** attempt

			logger.debug(
				`[loadWithRetry] Attempt ${attempt + 1}/${maxAttempts} failed, retrying in ${delayMs}ms:`,
				error.message
			)

			// Wait before retrying
			await new Promise((resolve) => setTimeout(resolve, delayMs))
		}
	}

	// This should never be reached, but throw lastError just in case
	throw lastError
}
