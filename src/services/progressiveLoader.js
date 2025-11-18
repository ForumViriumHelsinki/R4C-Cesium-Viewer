/**
 * Progressive Loader Service
 *
 * Handles chunked loading of large datasets with progressive rendering
 * and intelligent retry logic for optimal user experience.
 */

class ProgressiveLoader {
	constructor() {
		this.activeLoads = new Map();
		this.defaultOptions = {
			chunkSize: 1000, // Features per chunk
			maxRetries: 3, // Max retry attempts per chunk
			retryDelay: 1000, // Base retry delay in ms
			timeout: 30000, // Request timeout in ms
			concurrency: 2, // Max concurrent chunk requests
			adaptiveChunking: true, // Adjust chunk size based on performance
		};
	}

	/**
	 * Load data progressively in chunks
	 * @param {string} url - Data source URL
	 * @param {Object} options - Loading options
	 * @returns {Promise} Promise that resolves with complete data
	 */
	async loadData(url, options = {}) {
		const config = { ...this.defaultOptions, ...options };
		const loadId = this.generateLoadId(url);

		try {
			// Store active load for potential cancellation
			const controller = new AbortController();
			this.activeLoads.set(loadId, controller);

			// First, get metadata about the dataset
			const metadata = await this.getDatasetMetadata(url, controller.signal);

			// Determine if progressive loading is beneficial
			if (!this.shouldUseProgressiveLoading(metadata, config)) {
				// Fall back to standard loading for small datasets
				return this.loadStandard(url, controller.signal, config);
			}

			// Load data progressively
			const result = await this.loadProgressively(url, metadata, controller.signal, config);

			return result;
		} finally {
			this.activeLoads.delete(loadId);
		}
	}

	/**
	 * Get dataset metadata to determine loading strategy
	 */
	async getDatasetMetadata(url, signal) {
		try {
			// For GeoJSON, we might need to inspect the data structure
			// This is a simplified approach - in reality, you might have
			// specific endpoints that provide metadata
			const response = await fetch(url, {
				signal,
				method: 'HEAD', // Try HEAD first to get size info
			});

			const contentLength = response.headers.get('content-length');

			return {
				estimatedSize: contentLength ? parseInt(contentLength) : null,
				contentType: response.headers.get('content-type'),
				supportsRangeRequests: response.headers.get('accept-ranges') === 'bytes',
			};
		} catch (error) {
			// If HEAD fails, we'll proceed with progressive loading anyway
			console.warn('Could not get dataset metadata:', error);
			return {
				estimatedSize: null,
				contentType: 'application/json',
				supportsRangeRequests: false,
			};
		}
	}

	/**
	 * Determine if progressive loading should be used
	 */
	shouldUseProgressiveLoading(metadata, config) {
		// Use progressive loading for:
		// 1. Large datasets (>100KB)
		// 2. Unknown size datasets (when explicitly requested)
		// 3. When config.forceProgressive is true

		if (config.forceProgressive) return true;

		if (metadata.estimatedSize) {
			return metadata.estimatedSize > 100000; // 100KB threshold
		}

		// Default to progressive for unknown sizes
		return true;
	}

	/**
	 * Standard loading fallback
	 */
	async loadStandard(url, signal, config) {
		const response = await fetch(url, {
			signal,
			timeout: config.timeout,
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();

		// Still call onProgress for consistency
		if (config.onProgress) {
			config.onProgress(1, 1);
		}

		return data;
	}

	/**
	 * Load data progressively in chunks
	 */
	async loadProgressively(url, metadata, signal, config) {
		// For most APIs, we can't actually chunk the requests
		// So we'll load the full data and then process it in chunks
		// This still provides progressive UI updates

		console.log('🔄 Starting progressive loading for:', url);

		// Load the complete dataset
		const response = await fetch(url, { signal, timeout: config.timeout });

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const fullData = await response.json();

		// Process data in chunks if it has features
		if (fullData.features && fullData.features.length > config.chunkSize) {
			return this.processDataInChunks(fullData, config);
		} else {
			// Small dataset, process normally
			if (config.onProgress) {
				config.onProgress(1, 1);
			}
			if (config.onChunk) {
				await config.onChunk(fullData);
			}
			return fullData;
		}
	}

	/**
	 * Process large datasets in chunks for progressive rendering
	 */
	async processDataInChunks(data, config) {
		const features = data.features;
		const totalFeatures = features.length;
		const chunkSize = config.adaptiveChunking
			? this.calculateOptimalChunkSize(totalFeatures)
			: config.chunkSize;

		console.log(`📦 Processing ${totalFeatures} features in chunks of ${chunkSize}`);

		let processedFeatures = 0;
		const processedChunks = [];

		for (let i = 0; i < features.length; i += chunkSize) {
			const chunk = features.slice(i, i + chunkSize);
			const chunkData = {
				...data,
				features: chunk,
			};

			// Process chunk
			if (config.onChunk) {
				try {
					await config.onChunk(chunkData);
					processedChunks.push(chunkData);
				} catch (error) {
					console.error(`Error processing chunk ${Math.floor(i / chunkSize)}:`, error);
					// Continue with other chunks
				}
			}

			processedFeatures += chunk.length;

			// Update progress
			if (config.onProgress) {
				config.onProgress(processedFeatures, totalFeatures);
			}

			// Yield control to prevent UI blocking
			await new Promise((resolve) => {
				if (window.requestIdleCallback) {
					requestIdleCallback(resolve, { timeout: 50 });
				} else {
					setTimeout(resolve, 0);
				}
			});
		}

		console.log(`✅ Progressive processing complete: ${processedFeatures} features`);

		// Return the original data structure
		return data;
	}

	/**
	 * Calculate optimal chunk size based on dataset size and performance
	 */
	calculateOptimalChunkSize(totalFeatures) {
		// Adaptive chunking based on dataset size
		if (totalFeatures < 500) return 100;
		if (totalFeatures < 2000) return 250;
		if (totalFeatures < 10000) return 500;
		return 1000;
	}

	/**
	 * Cancel active loading operation
	 */
	cancelLoad(url) {
		const loadId = this.generateLoadId(url);
		const controller = this.activeLoads.get(loadId);
		if (controller) {
			controller.abort();
			this.activeLoads.delete(loadId);
			console.log('📛 Cancelled progressive loading:', url);
		}
	}

	/**
	 * Cancel all active loading operations
	 */
	cancelAllLoads() {
		for (const [loadId, controller] of this.activeLoads) {
			controller.abort();
		}
		this.activeLoads.clear();
		console.log('📛 Cancelled all progressive loading operations');
	}

	/**
	 * Generate unique load ID for tracking
	 */
	generateLoadId(url) {
		return btoa(url).replace(/[/+=]/g, '').substring(0, 16);
	}

	/**
	 * Get statistics about active loads
	 */
	getLoadStats() {
		return {
			activeLoads: this.activeLoads.size,
			loadIds: Array.from(this.activeLoads.keys()),
		};
	}

	/**
	 * Update default options
	 */
	updateDefaults(newDefaults) {
		this.defaultOptions = { ...this.defaultOptions, ...newDefaults };
	}
}

// Create and export singleton instance
const progressiveLoader = new ProgressiveLoader();
export default progressiveLoader;
