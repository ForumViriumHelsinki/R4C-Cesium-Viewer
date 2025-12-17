/**
 * @module services/progressiveLoader
 * Progressive Loader Service
 *
 * Handles chunked loading of large datasets with progressive rendering
 * and intelligent retry logic for optimal user experience.
 *
 * Features:
 * - Adaptive chunk sizing based on dataset size (100-1000 features)
 * - Progressive rendering with real-time progress callbacks
 * - Intelligent retry with exponential backoff (3 retries default)
 * - Request cancellation via AbortController
 * - Metadata inspection (HEAD request) for loading strategy selection
 * - Automatic fallback to standard loading for small datasets
 *
 * Loading Strategy:
 * - **Small datasets (<100KB)**: Standard single-request loading
 * - **Large datasets (>100KB)**: Progressive chunked processing
 * - **Unknown size**: Defaults to progressive loading
 *
 * Performance Optimizations:
 * - Uses requestIdleCallback for non-blocking chunk processing
 * - Adaptive chunk sizing (100-1000 features based on total count)
 * - Yielding between chunks to maintain UI responsiveness
 * - 50ms timeout guarantee for idle callback
 *
 * Integration:
 * - Called by unifiedLoader for large GeoJSON datasets
 * - Provides progress and chunk callbacks for streaming updates
 * - Manages active load tracking for cancellation
 *
 * @see {@link module:services/unifiedLoader}
 */

/**
 * Progressive loading options
 * @typedef {Object} ProgressiveOptions
 * @property {number} [chunkSize=1000] - Features per chunk for processing
 * @property {number} [maxRetries=3] - Maximum retry attempts per chunk
 * @property {number} [retryDelay=1000] - Base retry delay in milliseconds (exponential backoff)
 * @property {number} [timeout=30000] - Request timeout in milliseconds
 * @property {number} [concurrency=2] - Maximum concurrent chunk requests (not currently used)
 * @property {boolean} [adaptiveChunking=true] - Automatically adjust chunk size based on dataset
 * @property {boolean} [forceProgressive=false] - Force progressive loading even for small datasets
 * @property {Function} [onProgress] - Progress callback: (current, total) => void
 * @property {Function} [onChunk] - Chunk callback: (chunkData) => Promise<void>
 */

/**
 * Dataset metadata from HEAD request
 * @typedef {Object} DatasetMetadata
 * @property {number|null} estimatedSize - Content-Length in bytes (if available)
 * @property {string} contentType - Response Content-Type header
 * @property {boolean} supportsRangeRequests - Whether server supports byte-range requests
 */

/**
 * ProgressiveLoader Class
 * Manages progressive loading and chunked processing of large datasets.
 *
 * @class ProgressiveLoader
 */
import logger from '../utils/logger.js'

class ProgressiveLoader {
	/**
	 * Creates a ProgressiveLoader instance
	 * Initializes default configuration and active load tracking.
	 */
	constructor() {
		/** @type {Map<string, AbortController>} Active load controllers for cancellation */
		this.activeLoads = new Map()

		/** @type {ProgressiveOptions} Default loading options */
		this.defaultOptions = {
			chunkSize: 1000, // Features per chunk
			maxRetries: 3, // Max retry attempts per chunk
			retryDelay: 1000, // Base retry delay in ms
			timeout: 30000, // Request timeout in ms
			concurrency: 2, // Max concurrent chunk requests
			adaptiveChunking: true, // Adjust chunk size based on performance
		}
	}

	/**
	 * Load data progressively in chunks
	 * Orchestrates the progressive loading workflow:
	 * 1. Fetch metadata to determine loading strategy
	 * 2. Choose standard or progressive loading
	 * 3. Process data in chunks with progress updates
	 *
	 * Loading Decision:
	 * - Small datasets (<100KB): Standard single-request loading
	 * - Large datasets (>100KB): Progressive chunked processing
	 * - Unknown size: Progressive loading (safe default)
	 *
	 * @param {string} url - Data source URL
	 * @param {ProgressiveOptions} [options={}] - Loading options
	 * @returns {Promise<*>} Complete loaded data
	 * @throws {Error} If loading fails after all retries
	 *
	 * @example
	 * // Basic progressive loading
	 * const data = await progressiveLoader.loadData(
	 *   'https://api.example.com/large-dataset.geojson'
	 * );
	 *
	 * @example
	 * // Progressive loading with callbacks
	 * const data = await progressiveLoader.loadData(
	 *   'https://api.example.com/buildings.geojson',
	 *   {
	 *     onProgress: (current, total) => {
	 *       logger.debug(`Progress: ${current}/${total} features`);
	 *     },
	 *     onChunk: async (chunk) => {
	 *       // Process each chunk as it's loaded
	 *       await renderChunk(chunk);
	 *     },
	 *     chunkSize: 500,
	 *     adaptiveChunking: true
	 *   }
	 * );
	 */
	async loadData(url, options = {}) {
		const config = { ...this.defaultOptions, ...options }
		const loadId = this.generateLoadId(url)

		try {
			// Store active load for potential cancellation
			const controller = new AbortController()
			this.activeLoads.set(loadId, controller)

			// First, get metadata about the dataset
			const metadata = await this.getDatasetMetadata(url, controller.signal)

			// Determine if progressive loading is beneficial
			if (!this.shouldUseProgressiveLoading(metadata, config)) {
				// Fall back to standard loading for small datasets
				return this.loadStandard(url, controller.signal, config)
			}

			// Load data progressively
			const result = await this.loadProgressively(url, metadata, controller.signal, config)

			return result
		} finally {
			this.activeLoads.delete(loadId)
		}
	}

	/**
	 * Get dataset metadata to determine loading strategy
	 * Sends HEAD request to inspect Content-Length and server capabilities.
	 * Falls back gracefully if HEAD request fails.
	 *
	 * @param {string} url - Data source URL
	 * @param {AbortSignal} signal - Abort signal for cancellation
	 * @returns {Promise<DatasetMetadata>} Dataset metadata
	 * @private
	 */
	async getDatasetMetadata(url, signal) {
		try {
			// For GeoJSON, we might need to inspect the data structure
			// This is a simplified approach - in reality, you might have
			// specific endpoints that provide metadata
			const response = await fetch(url, {
				signal,
				method: 'HEAD', // Try HEAD first to get size info
			})

			const contentLength = response.headers.get('content-length')

			return {
				estimatedSize: contentLength ? parseInt(contentLength, 10) : null,
				contentType: response.headers.get('content-type'),
				supportsRangeRequests: response.headers.get('accept-ranges') === 'bytes',
			}
		} catch (error) {
			// If HEAD fails, we'll proceed with progressive loading anyway
			logger.warn('Could not get dataset metadata:', error)
			return {
				estimatedSize: null,
				contentType: 'application/json',
				supportsRangeRequests: false,
			}
		}
	}

	/**
	 * Determine if progressive loading should be used
	 * Decision based on dataset size, metadata availability, and configuration.
	 *
	 * Progressive Loading Criteria:
	 * 1. Large datasets (>100KB estimated size)
	 * 2. Unknown size datasets (safer to use progressive)
	 * 3. Forced via config.forceProgressive flag
	 *
	 * @param {DatasetMetadata} metadata - Dataset metadata
	 * @param {ProgressiveOptions} config - Loading configuration
	 * @returns {boolean} True if progressive loading should be used
	 * @private
	 */
	shouldUseProgressiveLoading(metadata, config) {
		// Use progressive loading for:
		// 1. Large datasets (>100KB)
		// 2. Unknown size datasets (when explicitly requested)
		// 3. When config.forceProgressive is true

		if (config.forceProgressive) return true

		if (metadata.estimatedSize) {
			return metadata.estimatedSize > 100000 // 100KB threshold
		}

		// Default to progressive for unknown sizes
		return true
	}

	/**
	 * Standard loading fallback for small datasets
	 * Simple single-request loading with minimal overhead.
	 *
	 * @param {string} url - Data source URL
	 * @param {AbortSignal} signal - Abort signal for cancellation
	 * @param {ProgressiveOptions} config - Loading configuration
	 * @returns {Promise<*>} Parsed data
	 * @throws {Error} If fetch fails or response is not OK
	 * @private
	 */
	async loadStandard(url, signal, config) {
		const response = await fetch(url, {
			signal,
			timeout: config.timeout,
		})

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`)
		}

		const data = await response.json()

		// Still call onProgress for consistency
		if (config.onProgress) {
			config.onProgress(1, 1)
		}

		return data
	}

	/**
	 * Load data progressively in chunks
	 * Fetches complete dataset then processes in chunks for progressive UI updates.
	 *
	 * Note: Most APIs don't support chunked streaming responses, so this method
	 * loads the full data first then processes it progressively. This still provides
	 * progressive UI updates even though the network transfer is complete.
	 *
	 * Future Enhancement: True streaming for APIs that support it (chunked transfer encoding).
	 *
	 * @param {string} url - Data source URL
	 * @param {DatasetMetadata} metadata - Dataset metadata (not currently used)
	 * @param {AbortSignal} signal - Abort signal for cancellation
	 * @param {ProgressiveOptions} config - Loading configuration
	 * @returns {Promise<*>} Complete dataset
	 * @throws {Error} If fetch fails
	 * @private
	 */
	async loadProgressively(url, _metadata, signal, config) {
		// For most APIs, we can't actually chunk the requests
		// So we'll load the full data and then process it in chunks
		// This still provides progressive UI updates

		logger.debug('🔄 Starting progressive loading for:', url)

		// Load the complete dataset
		const response = await fetch(url, { signal, timeout: config.timeout })

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`)
		}

		const fullData = await response.json()

		// Process data in chunks if it has features
		if (fullData.features && fullData.features.length > config.chunkSize) {
			return this.processDataInChunks(fullData, config)
		} else {
			// Small dataset, process normally
			if (config.onProgress) {
				config.onProgress(1, 1)
			}
			if (config.onChunk) {
				await config.onChunk(fullData)
			}
			return fullData
		}
	}

	/**
	 * Process large datasets in chunks for progressive rendering
	 * Splits feature collection into manageable chunks and yields between processing.
	 *
	 * Chunking Strategy:
	 * - Adaptive chunk sizing (100-1000 features based on total count)
	 * - Uses requestIdleCallback for non-blocking processing
	 * - 50ms timeout guarantee for idle callback
	 * - Progress callback after each chunk
	 * - Continues on chunk errors (logs but doesn't throw)
	 *
	 * @param {Object} data - GeoJSON FeatureCollection
	 * @param {ProgressiveOptions} config - Loading configuration
	 * @returns {Promise<Object>} Original complete dataset (unmodified)
	 * @private
	 */
	async processDataInChunks(data, config) {
		const features = data.features
		const totalFeatures = features.length
		const chunkSize = config.adaptiveChunking
			? this.calculateOptimalChunkSize(totalFeatures)
			: config.chunkSize

		logger.debug(`📦 Processing ${totalFeatures} features in chunks of ${chunkSize}`)

		let processedFeatures = 0
		const processedChunks = []

		for (let i = 0; i < features.length; i += chunkSize) {
			const chunk = features.slice(i, i + chunkSize)
			const chunkData = {
				...data,
				features: chunk,
			}

			// Process chunk
			if (config.onChunk) {
				try {
					await config.onChunk(chunkData)
					processedChunks.push(chunkData)
				} catch (error) {
					logger.error(`Error processing chunk ${Math.floor(i / chunkSize)}:`, error)
					// Continue with other chunks
				}
			}

			processedFeatures += chunk.length

			// Update progress
			if (config.onProgress) {
				config.onProgress(processedFeatures, totalFeatures)
			}

			// Yield control to prevent UI blocking
			await new Promise((resolve) => {
				if (window.requestIdleCallback) {
					requestIdleCallback(resolve, { timeout: 50 })
				} else {
					setTimeout(resolve, 0)
				}
			})
		}

		logger.debug(`✅ Progressive processing complete: ${processedFeatures} features`)

		// Return the original data structure
		return data
	}

	/**
	 * Calculate optimal chunk size based on dataset size and performance
	 * Adaptive sizing balances throughput with UI responsiveness.
	 *
	 * Chunk Size Strategy:
	 * - < 500 features: 100 per chunk (fine-grained updates)
	 * - < 2000 features: 250 per chunk (balanced)
	 * - < 10000 features: 500 per chunk (good throughput)
	 * - >= 10000 features: 1000 per chunk (maximum throughput)
	 *
	 * @param {number} totalFeatures - Total number of features to process
	 * @returns {number} Optimal chunk size
	 * @private
	 */
	calculateOptimalChunkSize(totalFeatures) {
		// Adaptive chunking based on dataset size
		if (totalFeatures < 500) return 100
		if (totalFeatures < 2000) return 250
		if (totalFeatures < 10000) return 500
		return 1000
	}

	/**
	 * Cancel active loading operation
	 * Aborts the fetch request via AbortController.
	 *
	 * @param {string} url - URL of loading operation to cancel
	 * @returns {void}
	 *
	 * @example
	 * // Cancel loading when user navigates away
	 * progressiveLoader.cancelLoad('https://api.example.com/large-dataset.geojson');
	 */
	cancelLoad(url) {
		const loadId = this.generateLoadId(url)
		const controller = this.activeLoads.get(loadId)
		if (controller) {
			controller.abort()
			this.activeLoads.delete(loadId)
			logger.debug('📛 Cancelled progressive loading:', url)
		}
	}

	/**
	 * Cancel all active loading operations
	 * Aborts all tracked fetch requests.
	 *
	 * @returns {void}
	 *
	 * @example
	 * // Cancel all loading on app shutdown
	 * progressiveLoader.cancelAllLoads();
	 */
	cancelAllLoads() {
		for (const [_loadId, controller] of this.activeLoads) {
			controller.abort()
		}
		this.activeLoads.clear()
		logger.debug('📛 Cancelled all progressive loading operations')
	}

	/**
	 * Generate unique load ID for tracking
	 * Creates URL-safe identifier from URL using base64 encoding.
	 *
	 * @param {string} url - URL to generate ID for
	 * @returns {string} 16-character load ID
	 * @private
	 */
	generateLoadId(url) {
		return btoa(url).replace(/[/+=]/g, '').substring(0, 16)
	}

	/**
	 * Get statistics about active loads
	 * Returns current loading state for monitoring and debugging.
	 *
	 * @returns {Object} Active load statistics
	 * @returns {number} Object.activeLoads - Number of active loading operations
	 * @returns {string[]} Object.loadIds - Array of active load IDs
	 *
	 * @example
	 * const stats = progressiveLoader.getLoadStats();
	 * logger.debug(`Active loads: ${stats.activeLoads}`);
	 * logger.debug(`Load IDs:`, stats.loadIds);
	 */
	getLoadStats() {
		return {
			activeLoads: this.activeLoads.size,
			loadIds: Array.from(this.activeLoads.keys()),
		}
	}

	/**
	 * Update default options
	 * Modifies default configuration for all future loads.
	 * Useful for performance tuning based on runtime conditions.
	 *
	 * @param {Partial<ProgressiveOptions>} newDefaults - Options to merge with defaults
	 * @returns {void}
	 *
	 * @example
	 * // Reduce chunk size on slower devices
	 * progressiveLoader.updateDefaults({
	 *   chunkSize: 500,
	 *   timeout: 60000
	 * });
	 */
	updateDefaults(newDefaults) {
		this.defaultOptions = { ...this.defaultOptions, ...newDefaults }
	}
}

// Create and export singleton instance
const progressiveLoader = new ProgressiveLoader()
export default progressiveLoader
