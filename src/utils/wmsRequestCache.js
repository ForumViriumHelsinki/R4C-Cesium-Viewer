/**
 * @module utils/wmsRequestCache
 * WMS Tile Request Deduplication and Caching
 *
 * Prevents N+1 API calls to WMS tile services by:
 * 1. Deduplicating in-flight requests for the same tile
 * 2. Caching tile responses to avoid redundant fetches
 * 3. Managing cache lifecycle with configurable TTL
 *
 * Issue #584: N+1 API calls to Helsinki WMS tile service
 * - Root cause: Multiple viewport changes trigger duplicate tile requests
 * - Impact: 145 events, 14 users affected, slow page loads
 * - Solution: Request cache + deduplication at service level
 *
 * @see {@link https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/584}
 */

import logger from './logger.js'

/**
 * WMS Request Cache
 *
 * Manages tile request deduplication and caching for WMS ImageryProviders.
 * Prevents duplicate in-flight requests and caches responses to reduce API load.
 */
export class WMSRequestCache {
	constructor(options = {}) {
		this.maxSize = options.maxSize || 500
		this.ttl = options.ttl || 1800000 // 30 minutes default
		this.enabled = options.enabled !== false

		this.inFlightRequests = new Map()
		this.tileCache = new Map()

		this.stats = {
			hits: 0,
			misses: 0,
			evictions: 0,
			requests: 0,
		}
	}

	getStats() {
		const total = this.stats.hits + this.stats.misses
		const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(1) : 0

		return {
			...this.stats,
			hitRate: `${hitRate}%`,
			inFlightCount: this.inFlightRequests.size,
			cacheSize: this.tileCache.size,
		}
	}

	intercept(tileKey, requestFn) {
		if (!this.enabled) {
			return Promise.resolve(requestFn())
		}

		this.stats.requests++

		if (this.inFlightRequests.has(tileKey)) {
			logger.debug(`[WMSRequestCache] Deduplicating in-flight request: ${tileKey}`)
			return this.inFlightRequests.get(tileKey)
		}

		const cached = this.tileCache.get(tileKey)
		if (cached && !this._isExpired(cached.timestamp)) {
			this.stats.hits++
			logger.debug(`[WMSRequestCache] Cache hit: ${tileKey}`)
			return Promise.resolve(cached.data)
		}

		this.stats.misses++

		const promise = Promise.resolve(requestFn())
			.then((data) => {
				this._setCache(tileKey, data)
				return data
			})
			.finally(() => {
				this.inFlightRequests.delete(tileKey)
			})

		this.inFlightRequests.set(tileKey, promise)

		return promise
	}

	_setCache(tileKey, data) {
		if (this.tileCache.size >= this.maxSize) {
			const oldestKey = this.tileCache.keys().next().value
			this.tileCache.delete(oldestKey)
			this.stats.evictions++
			logger.debug(`[WMSRequestCache] Evicted tile: ${oldestKey}`)
		}

		this.tileCache.set(tileKey, {
			data,
			timestamp: Date.now(),
		})
	}

	_isExpired(timestamp) {
		return Date.now() - timestamp > this.ttl
	}

	clear() {
		this.inFlightRequests.clear()
		this.tileCache.clear()
		logger.info('[WMSRequestCache] Cache cleared')
	}

	cleanupExpired() {
		let evicted = 0

		for (const [key, value] of this.tileCache.entries()) {
			if (this._isExpired(value.timestamp)) {
				this.tileCache.delete(key)
				evicted++
			}
		}

		if (evicted > 0) {
			logger.debug(`[WMSRequestCache] Cleaned up ${evicted} expired entries`)
		}
	}
}

let globalWMSCache = null

export function getGlobalWMSCache(options = {}) {
	if (!globalWMSCache) {
		globalWMSCache = new WMSRequestCache(options)
		logger.info('[WMSRequestCache] Global cache initialized', {
			maxSize: globalWMSCache.maxSize,
			ttl: globalWMSCache.ttl,
		})
	}

	return globalWMSCache
}

export function resetGlobalWMSCache() {
	if (globalWMSCache) {
		globalWMSCache.clear()
		globalWMSCache = null
	}
}
