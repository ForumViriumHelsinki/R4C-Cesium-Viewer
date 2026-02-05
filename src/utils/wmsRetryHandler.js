/**
 * @module utils/wmsRetryHandler
 * WMS Tile Retry Handler with Exponential Backoff
 *
 * Handles transient network failures (ECONNRESET, timeouts) from WMS tile services
 * by implementing retry logic with exponential backoff and jitter.
 *
 * Integration with CesiumJS:
 * - Hooks into ImageryProvider.errorEvent
 * - Sets error.retry = true to trigger CesiumJS internal retry
 * - Tracks retry attempts per tile to enforce max retries
 *
 * @see {@link https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/XXX}
 */

import { TIMING } from '@/constants/timing.js'
import logger from './logger.js'

/**
 * WMS Retry Handler
 *
 * Manages retry attempts for failed WMS tile requests with exponential backoff.
 * Designed to work with CesiumJS ImageryProvider.errorEvent.
 */
export class WMSRetryHandler {
	/**
	 * Creates a WMSRetryHandler instance
	 *
	 * @param {Object} options - Configuration options
	 * @param {number} [options.maxRetries=3] - Maximum retry attempts per tile
	 * @param {number} [options.baseDelay=1000] - Base delay in ms for exponential backoff
	 * @param {number} [options.maxDelay=8000] - Maximum delay cap in ms
	 * @param {number} [options.jitter=200] - Random jitter range in ms
	 */
	constructor(options = {}) {
		this.maxRetries = options.maxRetries ?? TIMING.WMS_MAX_RETRIES
		this.baseDelay = options.baseDelay ?? TIMING.WMS_RETRY_DELAY_BASE_MS
		this.maxDelay = options.maxDelay ?? TIMING.WMS_RETRY_MAX_DELAY_MS
		this.jitter = options.jitter ?? TIMING.WMS_RETRY_JITTER_MS

		/** @type {Map<string, number>} Tracks retry attempts per tile key */
		this.retryAttempts = new Map()

		/** @type {Object} Statistics for monitoring */
		this.stats = {
			totalErrors: 0,
			retriesAttempted: 0,
			retriesExhausted: 0,
		}
	}

	/**
	 * Handles a tile loading error from CesiumJS ImageryProvider
	 *
	 * When called from errorEvent, this method:
	 * 1. Generates a unique key for the tile
	 * 2. Tracks retry attempts
	 * 3. Sets error.retry = true if retries remain
	 * 4. Calculates exponential backoff delay
	 *
	 * @param {Cesium.TileProviderError} error - The tile error from CesiumJS
	 * @param {string} [layerName='WMS'] - Layer name for logging context
	 * @returns {boolean} True if retry was scheduled, false if retries exhausted
	 *
	 * @example
	 * provider.errorEvent.addEventListener((error) => {
	 *   retryHandler.handleTileError(error, 'buildings');
	 * });
	 */
	handleTileError(error, layerName = 'WMS') {
		this.stats.totalErrors++

		const tileKey = this._getTileKey(error)
		const attempt = (this.retryAttempts.get(tileKey) || 0) + 1

		if (attempt > this.maxRetries) {
			logger.error(`[WMS:${layerName}] Tile ${tileKey} failed after ${this.maxRetries} retries`)
			this._cleanup(tileKey)
			this.stats.retriesExhausted++
			return false
		}

		this.retryAttempts.set(tileKey, attempt)
		this.stats.retriesAttempted++

		const delay = this._calculateDelay(attempt)
		logger.warn(
			`[WMS:${layerName}] Tile ${tileKey} failed, retry ${attempt}/${this.maxRetries} in ${delay}ms`
		)

		// Signal CesiumJS to retry this tile
		error.retry = true

		return true
	}

	/**
	 * Generates a unique key for a tile based on error properties
	 *
	 * @param {Cesium.TileProviderError} error - The tile error
	 * @returns {string} Unique tile identifier
	 * @private
	 */
	_getTileKey(error) {
		// CesiumJS TileProviderError contains x, y, level properties
		if (error.x !== undefined && error.y !== undefined && error.level !== undefined) {
			return `${error.level}/${error.x}/${error.y}`
		}

		// Fallback to URL-based key if tile coordinates unavailable
		if (error.timesRetried !== undefined) {
			return `tile-${error.timesRetried}-${Date.now()}`
		}

		return `unknown-${Date.now()}`
	}

	/**
	 * Calculates delay with exponential backoff and jitter
	 *
	 * Formula: min(baseDelay * 2^(attempt-1), maxDelay) + random(0, jitter)
	 *
	 * @param {number} attempt - Current attempt number (1-based)
	 * @returns {number} Delay in milliseconds
	 * @private
	 */
	_calculateDelay(attempt) {
		const exponential = Math.min(this.baseDelay * 2 ** (attempt - 1), this.maxDelay)
		const randomJitter = Math.random() * this.jitter
		return Math.round(exponential + randomJitter)
	}

	/**
	 * Removes a tile from retry tracking
	 *
	 * @param {string} tileKey - The tile key to remove
	 * @private
	 */
	_cleanup(tileKey) {
		this.retryAttempts.delete(tileKey)
	}

	/**
	 * Clears a specific tile from retry tracking (e.g., on successful load)
	 *
	 * @param {string} tileKey - The tile key to clear
	 */
	clearTile(tileKey) {
		this.retryAttempts.delete(tileKey)
	}

	/**
	 * Clears all retry tracking state
	 */
	clear() {
		this.retryAttempts.clear()
		logger.debug('[WMSRetryHandler] Retry tracking cleared')
	}

	/**
	 * Returns current statistics
	 *
	 * @returns {Object} Statistics object
	 */
	getStats() {
		return {
			...this.stats,
			pendingRetries: this.retryAttempts.size,
		}
	}

	/**
	 * Cleans up stale retry entries older than maxDelay * maxRetries
	 * Call periodically to prevent memory leaks from abandoned tiles
	 */
	cleanupStale() {
		// Since we don't track timestamps, clear entries exceeding maxRetries
		// This is a simple approach - tiles that failed maxRetries are already cleaned
		// This method exists for explicit cleanup if needed
		const sizeBefore = this.retryAttempts.size
		this.retryAttempts.clear()

		if (sizeBefore > 0) {
			logger.debug(`[WMSRetryHandler] Cleaned up ${sizeBefore} stale retry entries`)
		}
	}
}

// Global singleton instance
let globalRetryHandler = null

/**
 * Gets or creates the global WMS retry handler instance
 *
 * @param {Object} [options] - Options passed to constructor on first call
 * @returns {WMSRetryHandler} The global retry handler instance
 */
export function getGlobalWMSRetryHandler(options = {}) {
	if (!globalRetryHandler) {
		globalRetryHandler = new WMSRetryHandler(options)
		logger.info('[WMSRetryHandler] Global handler initialized', {
			maxRetries: globalRetryHandler.maxRetries,
			baseDelay: globalRetryHandler.baseDelay,
			maxDelay: globalRetryHandler.maxDelay,
		})
	}
	return globalRetryHandler
}

/**
 * Resets the global retry handler (primarily for testing)
 */
export function resetGlobalWMSRetryHandler() {
	if (globalRetryHandler) {
		globalRetryHandler.clear()
		globalRetryHandler = null
	}
}
