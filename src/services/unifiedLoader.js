/**
 * @module services/unifiedLoader
 * Unified Layer Loading Service
 *
 * Provides a harmonized interface for loading all types of data layers
 * with consistent progress tracking, error handling, and performance optimization.
 *
 * Features:
 * - Single interface for all layer types (GeoJSON, JSON, WMS, tiles)
 * - Automatic cache integration with configurable TTL
 * - Progressive loading for large datasets (>100 features)
 * - Automatic retry with exponential backoff
 * - Cancellable requests with AbortController
 * - Batched processing to prevent UI blocking
 * - Progress tracking and error recovery
 *
 * Loading Strategies:
 * - **Standard loading**: Fast, single-request for small datasets
 * - **Progressive loading**: Chunked processing for large GeoJSON (>100 features)
 * - **Background loading**: Low-priority preloading without UI impact
 *
 * Performance Optimizations:
 * - Uses requestIdleCallback for non-blocking batch processing
 * - Automatic GeoJSON validation and repair (missing 'type' property)
 * - Exponential backoff retry strategy (1s, 2s, 4s delays)
 * - AbortController for request cancellation
 *
 * Integration Points:
 * - Integrates with loadingStore for progress tracking
 * - Uses cacheService for persistent storage
 * - Coordinates with progressiveLoader for large datasets
 *
 * @see {@link module:services/cacheService}
 * @see {@link module:services/progressiveLoader}
 * @see {@link module:stores/loadingStore}
 */

import { TIMING } from '../constants/timing.js'
import { useLoadingStore } from '../stores/loadingStore.js'
import { requestIdle } from '../utils/idle.js'
import { PERF_STATS_ENABLED, perfStats } from '../utils/perfStats.js'
import cacheService from './cacheService.js'
import {
	canRequest as breakerCanRequest,
	recordFailure as breakerRecordFailure,
	recordSuccess as breakerRecordSuccess,
} from './hostCircuitBreaker.js'
import { acquireHostSlot } from './hostConcurrencyLimiter.js'
import progressiveLoader from './progressiveLoader.js'

/**
 * Layer loading configuration
 * @typedef {Object} LayerConfig
 * @property {string} layerId - Unique identifier for the layer (used for tracking and caching)
 * @property {string} [url] - Data source URL (HTTP/HTTPS endpoint); omit when supplying in-memory `data`
 * @property {*} [data] - Pre-loaded in-memory data (alternative to `url`)
 * @property {string} [type='geojson'] - Data type: 'geojson', 'json', 'text', 'blob', 'wms', 'tiles'
 * @property {Function} [processor] - Function to process loaded data: (data, metadata) => Promise<void>
 * @property {LoadingOptions} [options={}] - Additional loading options
 */

/**
 * Loading options configuration
 * @typedef {Object} LoadingOptions
 * @property {boolean} [cache=true] - Enable IndexedDB caching
 * @property {number} [cacheTTL=1800000] - Cache time-to-live in milliseconds (default: 30 minutes)
 * @property {number} [retries=3] - Maximum number of retry attempts on failure
 * @property {number} [batchSize=50] - Features per batch for progressive processing
 * @property {boolean} [progressive=false] - Enable progressive loading for large datasets
 * @property {boolean} [background=false] - Load in background (low priority)
 * @property {string} [priority='normal'] - Loading priority: 'critical', 'high', 'normal', 'low', 'background'
 * @property {boolean} [cacheOnly=false] - Cache data but don't return it (for prefetching)
 * @property {boolean} [enableYielding] - Hint to yield to the main thread between batches (consumed by some processors)
 * @property {number} [yieldInterval] - Number of batches between yields when enableYielding is set
 */

/**
 * Processing metadata passed to processor functions
 * @typedef {Object} ProcessingMetadata
 * @property {boolean} [fromCache] - True if data loaded from cache
 * @property {boolean} [progressive] - True if using progressive loading
 * @property {boolean} [streaming] - True if processing individual chunks
 * @property {number} [batch] - Current batch number (progressive mode)
 */

/**
 * UnifiedLoader Class
 * Provides harmonized interface for loading all layer types with
 * automatic caching, retry logic, and progress tracking.
 *
 * @class UnifiedLoader
 */
import logger from '../utils/logger.js'

class UnifiedLoader {
	/**
	 * Creates a UnifiedLoader instance
	 * Initializes request tracking and lazy-loaded store reference.
	 */
	constructor() {
		/** @type {Map<string, AbortController>} Active request controllers for cancellation */
		this.activeRequests = new Map()
		/** @type {Object|null} Lazy-loaded loading store instance */
		this._loadingStore = null
	}

	/**
	 * Get loading store instance (lazy-loaded to avoid Pinia initialization issues)
	 * Provides fallback with no-op methods if store is unavailable.
	 *
	 * @returns {Object} Loading store instance or fallback
	 * @private
	 */
	get loadingStore() {
		if (!this._loadingStore || this._loadingStoreFallback) {
			try {
				this._loadingStore = useLoadingStore()
				this._loadingStoreFallback = false
			} catch (error) {
				if (!this._loadingStoreFallback) {
					logger.warn('Loading store not available, using fallback:', error.message)
				}
				this._loadingStoreFallback = true
				this._loadingStore = {
					startLayerLoading: () => {},
					updateLayerProgress: () => {},
					completeLayerLoading: () => {},
					setLayerError: () => {},
					clearLayerError: () => {},
					updateCacheStatus: () => {},
					layers: {},
				}
			}
		}
		return this._loadingStore
	}

	/**
	 * Universal layer loading method with harmonized interface
	 * Coordinates caching, loading strategy selection, data processing, and progress tracking.
	 *
	 * Loading Flow:
	 * 1. Start progress tracking
	 * 2. Check cache (if enabled)
	 * 3. Select loading strategy (standard vs progressive)
	 * 4. Load and process data
	 * 5. Cache result (if enabled)
	 * 6. Complete progress tracking
	 *
	 * @param {LayerConfig} config - Loading configuration
	 * @returns {Promise<*>} Loaded data (format depends on type)
	 * @throws {Error} If loading fails after all retries
	 *
	 * @example
	 * // Standard loading with caching
	 * const data = await unifiedLoader.loadLayer({
	 *   layerId: 'buildings-00100',
	 *   url: 'https://api.example.com/buildings?postal=00100',
	 *   type: 'geojson',
	 *   processor: async (data) => {
	 *     // Process and display data
	 *     viewer.dataSources.add(Cesium.GeoJsonDataSource.load(data));
	 *   },
	 *   options: {
	 *     cache: true,
	 *     cacheTTL: 60 * 60 * 1000, // 1 hour
	 *     priority: 'high'
	 *   }
	 * });
	 *
	 * @example
	 * // Progressive loading for large datasets
	 * const data = await unifiedLoader.loadLayer({
	 *   layerId: 'trees-capital-region',
	 *   url: 'https://api.example.com/trees',
	 *   type: 'geojson',
	 *   processor: async (chunk, metadata) => {
	 *     // Process each chunk as it loads
	 *     if (metadata.streaming) {
	 *       logger.debug('Processing chunk with', chunk.features.length, 'features');
	 *     }
	 *   },
	 *   options: {
	 *     progressive: true,
	 *     batchSize: 100,
	 *     background: true
	 *   }
	 * });
	 */
	async loadLayer(config) {
		const { layerId, url = '', type = 'geojson', processor, options = {} } = config

		const {
			cache = true,
			cacheTTL = 30 * 60 * 1000, // 30 minutes default
			retries = 3,
			batchSize = 50,
			progressive = false,
			background = false,
			priority = 'normal',
			cacheOnly = false,
		} = options

		// A single AbortController owns this layer's whole lifecycle (cache check,
		// fetch + retries, processing). Registering it in activeRequests for the
		// entire call — not just the fetch phase — means cancelLoading(layerId)
		// can abort at any point and the loading-state lifecycle is tracked
		// deterministically: every layerId that starts loading here is settled
		// (completed / errored / aborted) before activeRequests.delete in finally.
		// This is what makes the loadingStore stale-sweep path unreachable rather
		// than merely time-gated (see #816, #680).
		const controller = new AbortController()
		this.activeRequests.set(layerId, controller)

		try {
			// Start loading tracking
			this.loadingStore.startLayerLoading(layerId, { url, type, priority })

			// Check cache first if enabled
			if (cache) {
				const cached = await this.checkCache(layerId, url, cacheTTL)
				if (cached) {
					// For cacheOnly mode, return null (data is already cached)
					if (cacheOnly) {
						this.loadingStore.completeLayerLoading(layerId)
						return null
					}
					await this.processData(cached, processor, layerId, {
						fromCache: true,
						progressive,
					})
					this.loadingStore.completeLayerLoading(layerId)
					return cached
				}
			}

			// Choose loading strategy based on configuration
			let data
			if (progressive && type === 'geojson') {
				data = await this.loadProgressively(layerId, url, processor, {
					batchSize,
					background,
					retries,
				})
			} else {
				data = await this.loadStandard(layerId, url, type, retries, controller.signal)
			}

			// Cache the data if enabled
			if (cache && data) {
				await this.cacheData(layerId, url, data, cacheTTL)
			}

			// For cacheOnly mode, return null (data is now cached, don't process or return)
			if (cacheOnly) {
				this.loadingStore.completeLayerLoading(layerId)
				return null
			}

			// Process the loaded data
			if (processor && data) {
				await this.processData(data, processor, layerId, { fromCache: false, progressive })
			}

			this.loadingStore.completeLayerLoading(layerId)
			return data
		} catch (error) {
			this.loadingStore.setLayerError(layerId, error.message)
			logger.error(`Failed to load layer ${layerId}:`, error?.message || error)
			throw error
		} finally {
			// The lifecycle is over (resolved, rejected, or aborted) — drop the
			// controller so the map reflects only genuinely in-flight layers.
			// Idempotent with cancelLoading()'s own delete.
			this.activeRequests.delete(layerId)
		}
	}

	/**
	 * Check cache for existing data
	 * Validates cache age and updates progress tracking if cache hit.
	 *
	 * @param {string} layerId - Layer identifier
	 * @param {string} url - Data source URL
	 * @param {number} ttl - Time-to-live in milliseconds
	 * @returns {Promise<*|null>} Cached data or null if not found/expired
	 * @private
	 */
	async checkCache(layerId, url, ttl) {
		try {
			const cacheKey = this.generateCacheKey(layerId, url)
			const cached = await cacheService.getData(cacheKey)

			if (cached && this.isCacheValid(cached, ttl)) {
				logger.debug(`✓ Using cached data for ${layerId}`)
				this.loadingStore.updateLayerProgress(layerId, 100, 100)
				return cached.data
			}
		} catch (error) {
			logger.warn(`Cache check failed for ${layerId}:`, error?.message || error)
		}
		return null
	}

	/**
	 * Standard loading method for smaller datasets
	 * Single fetch request with automatic type parsing.
	 *
	 * @param {string} layerId - Layer identifier
	 * @param {string} url - Data source URL
	 * @param {string} type - Data type ('json', 'geojson', 'text', 'blob')
	 * @param {number} retries - Maximum retry attempts
	 * @param {AbortSignal} [signal] - Abort signal owned by loadLayer's lifecycle controller
	 * @returns {Promise<*>} Parsed data
	 * @throws {Error} If fetch fails after all retries
	 * @private
	 */
	async loadStandard(layerId, url, type, retries, signal) {
		// The AbortController lifecycle is owned by loadLayer (registered in
		// activeRequests for the whole call); here we just honor its signal.
		const response = await this.fetchWithRetry(url, { signal }, retries)

		// Network byte count (Content-Length; absent on chunked/gzip-without-length
		// responses, in which case it reads 0).
		if (PERF_STATS_ENABLED) {
			const contentLength = Number(response.headers.get('content-length'))
			perfStats.recordNetworkBytes(Number.isFinite(contentLength) ? contentLength : 0)
		}

		// `response.json()/.text()/.blob()` stream the body from the network
		// before parsing, so this span measures body download + parse time,
		// not pure CPU-bound deserialization. On slow links it is dominated by
		// transfer time. Kept as one combined "body read" metric on purpose:
		// awaiting `.text()` first to isolate `JSON.parse` would double-buffer
		// large payloads and drop blob handling.
		const deserializeStart = PERF_STATS_ENABLED ? performance.now() : 0
		let data
		switch (type) {
			case 'json':
			case 'geojson':
				data = await response.json()
				break
			case 'text':
				data = await response.text()
				break
			case 'blob':
				data = await response.blob()
				break
			default:
				data = await response.json()
		}
		if (PERF_STATS_ENABLED) perfStats.recordDeserialize(performance.now() - deserializeStart)

		this.loadingStore.updateLayerProgress(layerId, 100, 100)
		return data
	}

	/**
	 * Progressive loading for large datasets
	 * Delegates to progressiveLoader service for chunked processing.
	 *
	 * @param {string} layerId - Layer identifier
	 * @param {string} url - Data source URL
	 * @param {Function} [processor] - Data processor function
	 * @param {Object} [options] - Progressive loading options
	 * @returns {Promise<*>} Complete dataset
	 * @private
	 */
	async loadProgressively(layerId, url, processor, options = {}) {
		return await progressiveLoader.loadData(url, {
			...options,
			onProgress: (current, total) => {
				this.loadingStore.updateLayerProgress(layerId, current, total)
			},
			onChunk: async (chunk) => {
				if (processor) {
					await this.processDataChunk(chunk, processor, layerId)
				}
			},
		})
	}

	/**
	 * Process loaded data with yielding for non-blocking execution
	 * Automatically batches large datasets and repairs invalid GeoJSON.
	 *
	 * GeoJSON Validation:
	 * - Auto-fixes missing 'type' property (common API issue)
	 * - Batches features >100 for progressive rendering
	 * - Only batches in progressive mode (non-progressive processors expect full data)
	 *
	 * @param {*} data - Loaded data to process
	 * @param {Function} [processor] - Processing function: (data, metadata) => Promise<void> (no-op when omitted)
	 * @param {string} [layerId] - Layer identifier
	 * @param {ProcessingMetadata} [metadata={}] - Processing metadata
	 * @returns {Promise<void>}
	 * @throws {Error} If processing fails
	 * @private
	 */
	async processData(data, processor, layerId = '', metadata = {}) {
		if (!processor || !data) return

		// Auto-fix GeoJSON missing type property
		if (data.features && !data.type) {
			logger.warn(
				`[UnifiedLoader] GeoJSON data for ${layerId} missing 'type' property, auto-fixing to 'FeatureCollection'`
			)
			data.type = 'FeatureCollection'
		}

		try {
			// For large datasets, process in batches to avoid blocking
			// Only batch if progressive mode is enabled - non-progressive processors
			// are not designed for batched data and will fail
			const shouldBatch = metadata.progressive && data.features && data.features.length > 100
			if (shouldBatch) {
				await this.processBatchedData(data, processor, layerId)
			} else {
				await processor(data, metadata)
			}
		} catch (error) {
			logger.error(`Error processing data for ${layerId}:`, error?.message || error)
			throw error
		}
	}

	/**
	 * Process data in batches with yielding
	 * Splits large feature collections into manageable chunks (25 features)
	 * and yields control between batches to keep UI responsive.
	 *
	 * Performance Strategy:
	 * - 25 feature batches balance throughput with responsiveness
	 * - Uses requestIdleCallback when available (otherwise setTimeout)
	 * - Updates progress after each batch
	 * - Yields with 50ms timeout to guarantee UI updates
	 *
	 * @param {Object} data - GeoJSON FeatureCollection
	 * @param {Function} processor - Batch processor function
	 * @param {string} layerId - Layer identifier for progress tracking
	 * @returns {Promise<void>}
	 * @private
	 */
	async processBatchedData(data, processor, layerId) {
		const features = data.features || []
		const batchSize = 25
		let processed = 0

		for (let i = 0; i < features.length; i += batchSize) {
			const batch = features.slice(i, i + batchSize)
			const batchData = { ...data, features: batch }

			await processor(batchData, { batch: i / batchSize + 1 })

			processed += batch.length
			this.loadingStore.updateLayerProgress(layerId, processed, features.length)

			// Yield control to prevent UI blocking
			if (i + batchSize < features.length) {
				await new Promise((resolve) => requestIdle(resolve))
			}
		}
	}

	/**
	 * Process individual data chunks from progressive loading
	 * Called by progressiveLoader for each chunk during streaming.
	 *
	 * @param {*} chunk - Data chunk to process
	 * @param {Function} processor - Chunk processor function
	 * @param {string} layerId - Layer identifier
	 * @returns {Promise<void>}
	 * @private
	 */
	async processDataChunk(chunk, processor, layerId) {
		try {
			await processor(chunk, { streaming: true })

			// Brief yield for UI responsiveness
			await new Promise((resolve) => setTimeout(resolve, 0))
		} catch (error) {
			logger.error(`Error processing chunk for ${layerId}:`, error?.message || error)
		}
	}

	/**
	 * Fetch with automatic retry logic and outage resilience.
	 *
	 * Retry Strategy:
	 * - Honors Retry-After header on 429/503 (seconds or HTTP-date)
	 * - Falls back to exponential backoff with jitter (50–150% of 2^n * 1000ms)
	 * - Caps the delay at MAX_RETRY_DELAY_MS so a misbehaving Retry-After
	 *   doesn't pin a tab for minutes
	 * - Skips retry entirely on non-retriable 4xx (anything except 408/429)
	 * - Respects AbortController signal
	 *
	 * Outage resilience (HSY flakiness / down):
	 * - Bounds each attempt with a {@link TIMING.FETCH_TIMEOUT_MS} timeout so a
	 *   hung upstream (HSY's Azure App Gateway holds ~20s before a 504) cannot
	 *   pin a hostConcurrencyLimiter slot for the full gateway timeout. On
	 *   timeout the attempt aborts and is treated as a retriable failure.
	 * - A per-host circuit breaker fast-fails when a host has had too many
	 *   consecutive failures, so the app stops hammering a service that is
	 *   clearly down and frees concurrency slots immediately. The breaker also
	 *   drives the user-facing "layers unavailable" notice.
	 *
	 * @param {string} url - Request URL
	 * @param {Object} [options={}] - Fetch options (including signal)
	 * @param {number} [retries=3] - Maximum retry attempts
	 * @returns {Promise<Response>} Fetch response
	 * @throws {Error} If all retries fail
	 * @private
	 */
	async fetchWithRetry(url, options = {}, retries = 3) {
		const MAX_RETRY_DELAY_MS = 30_000
		const isRetriableStatus = (status) => status === 408 || status === 429 || status >= 500
		const parseRetryAfter = (header) => {
			if (!header) return null
			const trimmed = String(header).trim()
			const seconds = Number(trimmed)
			if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
			const date = Date.parse(trimmed)
			if (Number.isNaN(date)) return null
			return Math.max(0, date - Date.now())
		}
		// Abortable sleep: resolves after `ms`, or rejects immediately if the
		// caller's AbortSignal fires. Keeps backoff delays from leaking a
		// pending timer (up to MAX_RETRY_DELAY_MS) after cancellation.
		const sleep = (ms) =>
			new Promise(
				/** @type {(resolve: (value?: any) => void, reject: (reason?: any) => void) => void} */ (
					(resolve, reject) => {
						if (options.signal?.aborted) {
							reject(options.signal.reason ?? new DOMException('Aborted', 'AbortError'))
							return
						}
						const onAbort = () => {
							clearTimeout(timer)
							reject(options.signal?.reason ?? new DOMException('Aborted', 'AbortError'))
						}
						const timer = setTimeout(() => {
							options.signal?.removeEventListener('abort', onAbort)
							resolve()
						}, ms)
						options.signal?.addEventListener('abort', onAbort)
					}
				)
			)

		// Run a single fetch bounded by FETCH_TIMEOUT_MS, while still honoring
		// the caller's AbortSignal. Returns { response } on completion or
		// { timedOut: true } when our own timeout fired (a retriable failure).
		// A caller-driven abort propagates as a thrown AbortError.
		/** @returns {Promise<{ response?: Response, timedOut?: boolean }>} */
		const fetchWithTimeout = async () => {
			const attemptController = new AbortController()
			let timedOut = false
			const onCallerAbort = () => attemptController.abort(options.signal?.reason)
			if (options.signal) {
				if (options.signal.aborted) {
					throw options.signal.reason ?? new DOMException('Aborted', 'AbortError')
				}
				options.signal.addEventListener('abort', onCallerAbort, { once: true })
			}
			const timer = setTimeout(() => {
				timedOut = true
				attemptController.abort()
			}, TIMING.FETCH_TIMEOUT_MS)
			try {
				const response = await fetch(url, { ...options, signal: attemptController.signal })
				return { response }
			} catch (error) {
				if (timedOut) {
					return { timedOut: true }
				}
				throw error
			} finally {
				clearTimeout(timer)
				options.signal?.removeEventListener('abort', onCallerAbort)
			}
		}

		let lastError

		for (let attempt = 0; attempt <= retries; attempt++) {
			// Circuit breaker: if this host is degraded, fast-fail without
			// acquiring a slot or hitting the network. Frees concurrency
			// immediately and stops hammering a down service.
			if (!breakerCanRequest(url)) {
				lastError = new Error(`Circuit open: host for ${url} is degraded`)
				break
			}

			// Per-host concurrency gate. Throws AbortError if signal fires
			// while we're queued.
			let releaseSlot
			try {
				releaseSlot = await acquireHostSlot(url, options.signal)
			} catch (error) {
				lastError = error
				break
			}

			// Whatever happens in this attempt, release the slot before
			// sleeping/returning/throwing so other waiters can proceed.
			try {
				const { response, timedOut } = await fetchWithTimeout()

				// `!response` is a defensive guard (and narrows `response` to
				// defined for the rest of the block); `timedOut` is the real
				// signal that our per-attempt timeout fired.
				if (timedOut || !response) {
					// Our own timeout fired — treat like a retriable failure.
					breakerRecordFailure(url)
					lastError = new Error(`Fetch timed out after ${TIMING.FETCH_TIMEOUT_MS}ms`)
					if (attempt >= retries) break
					const expBackoff = 2 ** attempt * 1000
					const jitter = 0.5 + Math.random()
					const delay = Math.min(MAX_RETRY_DELAY_MS, Math.round(expBackoff * jitter))
					logger.warn(`Fetch attempt ${attempt + 1} timed out, retrying in ${delay}ms...`)
					releaseSlot()
					releaseSlot = null
					await sleep(delay)
					continue
				}

				if (response.ok) {
					breakerRecordSuccess(url)
					return response
				}

				const status = response.status
				const retriable = isRetriableStatus(status)

				// Record outage signal only for retriable (server/limit) failures;
				// a non-retriable 4xx is a client error, not a host outage.
				if (retriable) {
					breakerRecordFailure(url)
				}

				// Terminal for this response — set lastError and break out rather
				// than throwing into the local catch (which is for genuine
				// network/timeout exceptions and would double-count the failure).
				lastError = new Error(`HTTP ${status}: ${response.statusText}`)
				if (!retriable || attempt >= retries || options.signal?.aborted) {
					break
				}

				const retryAfterMs = parseRetryAfter(response.headers.get('Retry-After'))
				const expBackoff = 2 ** attempt * 1000
				const jitter = 0.5 + Math.random() // 0.5x–1.5x
				const baseDelay = retryAfterMs != null ? retryAfterMs : expBackoff * jitter
				const delay = Math.min(MAX_RETRY_DELAY_MS, Math.max(0, Math.round(baseDelay)))

				logger.warn(
					`Fetch attempt ${attempt + 1} got HTTP ${status}, retrying in ${delay}ms` +
						(retryAfterMs != null ? ' (server Retry-After)' : '')
				)
				// lastError already set above before the retriable break-check.
				releaseSlot()
				releaseSlot = null
				await sleep(delay)
			} catch (error) {
				lastError = error

				// A caller-driven cancel is not a host outage — don't penalize
				// the breaker for it. A network/DNS error is.
				if (!options.signal?.aborted) {
					breakerRecordFailure(url)
				}

				if (attempt < retries && !options.signal?.aborted) {
					const expBackoff = 2 ** attempt * 1000
					const jitter = 0.5 + Math.random()
					const delay = Math.min(MAX_RETRY_DELAY_MS, Math.round(expBackoff * jitter))
					logger.warn(`Fetch attempt ${attempt + 1} failed, retrying in ${delay}ms...`)
					releaseSlot?.()
					releaseSlot = null
					await sleep(delay)
				} else {
					break
				}
			} finally {
				// Cover any path that didn't already release (e.g. terminal
				// throw on a non-retriable status). Idempotent — second call
				// is a no-op.
				releaseSlot?.()
			}
		}

		throw lastError
	}

	/**
	 * Cache data with metadata
	 * Stores raw data directly to avoid double-wrapping that causes
	 * GeoJSON validation failures.
	 *
	 * @param {string} layerId - Layer identifier
	 * @param {string} url - Data source URL
	 * @param {*} data - Data to cache
	 * @param {number} ttl - Time-to-live in milliseconds
	 * @returns {Promise<void>}
	 * @private
	 */
	async cacheData(layerId, url, data, ttl) {
		try {
			const cacheKey = this.generateCacheKey(layerId, url)
			// Pass raw data directly - cacheService handles its own metadata (timestamp, etc.)
			// Avoid double-wrapping which caused GeoJSON validation failures
			await cacheService.setData(cacheKey, data, {
				ttl,
				metadata: { url, layerId },
			})

			this.loadingStore.updateCacheStatus(layerId, true, Date.now())
		} catch (error) {
			logger.warn(`Failed to cache data for ${layerId}:`, error?.message || error)
		}
	}

	/**
	 * Generate consistent cache keys
	 * Creates URL-safe keys by base64 encoding URL and sanitizing.
	 * Format: `layer_{layerId}_{base64Hash}`
	 *
	 * @param {string} layerId - Layer identifier
	 * @param {string} url - Data source URL
	 * @returns {string} Generated cache key
	 * @private
	 */
	generateCacheKey(layerId, url) {
		const urlHash = btoa(url).replace(/[/+=]/g, '')
		return `layer_${layerId}_${urlHash}`
	}

	/**
	 * Check if cached data is still valid
	 * Compares cache age against TTL.
	 *
	 * @param {Object} cached - Cached data object with timestamp
	 * @param {number} ttl - Time-to-live in milliseconds
	 * @returns {boolean} True if cache is still valid
	 * @private
	 */
	isCacheValid(cached, ttl) {
		return Date.now() - cached.timestamp < ttl
	}

	/**
	 * Cancel active loading for a layer
	 * Aborts the fetch request and updates loading store with error.
	 *
	 * @param {string} layerId - Layer identifier to cancel
	 * @returns {void}
	 *
	 * @example
	 * // Cancel loading when user navigates away
	 * unifiedLoader.cancelLoading('buildings-00100');
	 */
	cancelLoading(layerId) {
		const controller = this.activeRequests.get(layerId)
		if (controller) {
			controller.abort()
			this.activeRequests.delete(layerId)
			this.loadingStore.setLayerError(layerId, 'Loading cancelled')
		}
	}

	/**
	 * Retry failed loading
	 * Clears error state to allow retry. Actual retry requires re-calling loadLayer
	 * with original configuration (stored by calling component).
	 *
	 * @param {string} layerId - Layer identifier to retry
	 * @returns {Promise<void>}
	 *
	 * @example
	 * // Retry after error
	 * await unifiedLoader.retryLoading('buildings-00100');
	 * // Then re-call loadLayer with original config
	 */
	async retryLoading(layerId) {
		const layerInfo = this.loadingStore.layers[layerId]
		if (layerInfo?.error) {
			this.loadingStore.clearLayerError(layerId)
			// The retry logic would need the original config
			// This would typically be stored or passed from the calling component
		}
	}

	/**
	 * Preload data in background
	 * Loads layer with low priority and background mode enabled.
	 *
	 * @param {LayerConfig} config - Loading configuration
	 * @returns {Promise<*>} Loaded data
	 *
	 * @example
	 * // Preload nearby postal code data
	 * unifiedLoader.preloadLayer({
	 *   layerId: 'buildings-00150',
	 *   url: 'https://api.example.com/buildings?postal=00150',
	 *   type: 'geojson',
	 *   options: { cache: true }
	 * });
	 */
	async preloadLayer(config) {
		return this.loadLayer({
			...config,
			options: {
				...config.options,
				background: true,
				priority: 'low',
			},
		})
	}

	/**
	 * Load multiple layers in parallel with coordination
	 * Uses Promise.allSettled to continue loading even if some layers fail.
	 *
	 * @param {LayerConfig[]} configs - Array of layer configurations
	 * @returns {Promise<Object[]>} Array of settled results (fulfilled or rejected)
	 *
	 * @example
	 * // Load multiple layers for postal code
	 * const results = await unifiedLoader.loadLayers([
	 *   { layerId: 'buildings-00100', url: buildingsUrl, type: 'geojson' },
	 *   { layerId: 'trees-00100', url: treesUrl, type: 'geojson' },
	 *   { layerId: 'vegetation-00100', url: vegUrl, type: 'geojson' }
	 * ]);
	 *
	 * results.forEach((result, i) => {
	 *   if (result.status === 'fulfilled') {
	 *     logger.debug(`Layer ${i} loaded successfully`);
	 *   } else {
	 *     logger.error(`Layer ${i} failed:`, result.reason);
	 *   }
	 * });
	 */
	async loadLayers(configs) {
		const promises = configs.map((config) =>
			this.loadLayer(config).catch((error) => ({ error, config }))
		)

		const results = await Promise.allSettled(promises)

		// Report any failures
		results.forEach((result, index) => {
			if (result.status === 'rejected') {
				logger.error(`Failed to load layer ${configs[index].layerId}:`, result.reason)
			} else if (result.value?.error) {
				logger.error(`Failed to load layer ${configs[index].layerId}:`, result.value.error)
			}
		})

		return results
	}
}

// Create and export singleton instance
const unifiedLoader = new UnifiedLoader()
export default unifiedLoader
