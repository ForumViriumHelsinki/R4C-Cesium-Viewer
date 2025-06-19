/**
 * Progressive Data Loader Service
 * Provides utilities for loading large datasets with progress tracking and streaming
 */
export class ProgressiveLoader {
  constructor() {
    this.activeRequests = new Map();
    this.chunkSize = 1000; // Default chunk size
    this.progressCallbacks = new Map(); // Store progress callbacks
  }

  /**
   * Load data in chunks with progress tracking
   * @param {Object} options Configuration options
   * @param {string} options.layerName Name of the layer being loaded
   * @param {string} options.baseUrl Base URL for the API
   * @param {Object} options.params Query parameters
   * @param {number} options.chunkSize Number of items per chunk
   * @param {Function} options.processor Function to process each chunk
   * @param {Function} options.onProgress Progress callback
   * @param {Function} options.onStart Start callback for external progress tracking
   * @param {Function} options.onComplete Complete callback for external progress tracking
   * @param {Function} options.onError Error callback for external progress tracking
   * @param {AbortSignal} options.signal Abort signal for cancellation
   * @returns {Promise} Promise that resolves when all chunks are loaded
   */
  async loadChunked(options) {
    const {
      layerName,
      baseUrl,
      params = {},
      chunkSize = this.chunkSize,
      processor,
      onProgress,
      onStart,
      onComplete,
      onError,
      signal,
    } = options;

    // Call start callback if provided
    if (onStart) {
      onStart(layerName, { message: `Preparing to load ${layerName}...`, total: 1 });
    }

    try {
      // First, get the total count
      const countUrl = new URL(baseUrl);
      const countParams = { ...params, limit: 1, resulttype: 'hits' };
      Object.entries(countParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          countUrl.searchParams.append(key, value);
        }
      });

      const countResponse = await fetch(countUrl, { signal });
      const countData = await countResponse.json();
      const totalItems = countData.numberMatched || countData.features?.length || 0;
      
      if (totalItems === 0) {
        if (onComplete) onComplete(layerName, true);
        return [];
      }

      const totalChunks = Math.ceil(totalItems / chunkSize);
      
      // Update progress tracking with actual totals
      if (onStart) {
        onStart(layerName, { 
          message: `Loading ${layerName}: 0/${totalChunks} chunks (${totalItems} items)`,
          total: totalChunks 
        });
      }

      const allData = [];
      let currentChunk = 0;

      // Load chunks sequentially to avoid overwhelming the server
      for (let offset = 0; offset < totalItems; offset += chunkSize) {
        if (signal?.aborted) {
          throw new Error('Request aborted');
        }

        currentChunk++;
        
        // Update progress
        if (onProgress) {
          onProgress(layerName, currentChunk, `Loading ${layerName}: ${currentChunk}/${totalChunks} chunks`);
        }

        // Build chunk URL
        const chunkUrl = new URL(baseUrl);
        const chunkParams = {
          ...params,
          limit: chunkSize,
          offset: offset,
        };
        
        Object.entries(chunkParams).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            chunkUrl.searchParams.append(key, value);
          }
        });

        // Fetch chunk with retry logic
        const chunkData = await this.fetchWithRetry(chunkUrl, {
          signal,
          maxRetries: 3,
          retryDelay: 1000,
        });

        // Process chunk if processor provided
        let processedChunk = chunkData.features || chunkData;
        if (processor && typeof processor === 'function') {
          processedChunk = await processor(processedChunk, currentChunk, totalChunks);
        }

        allData.push(...processedChunk);

        // Call detailed progress callback
        if (typeof onProgress === 'function') {
          onProgress({
            layerName,
            chunk: currentChunk,
            totalChunks,
            items: processedChunk.length,
            totalItems: allData.length,
            data: processedChunk,
          });
        }

        // Small delay to prevent overwhelming the UI
        await this.delay(50);
      }

      if (onComplete) onComplete(layerName, true);
      return allData;

    } catch (error) {
      if (onError) onError(layerName, error.message);
      throw error;
    }
  }

  /**
   * Load data with streaming/progressive display
   * @param {Object} options Configuration options
   * @returns {Promise} Promise that resolves when loading is complete
   */
  async loadProgressive(options) {
    const {
      layerName,
      baseUrl,
      params = {},
      chunkSize = this.chunkSize,
      onChunkLoaded,
      signal,
    } = options;

    return this.loadChunked({
      ...options,
      onProgress: (progressInfo) => {
        // Immediately display each chunk as it loads
        if (onChunkLoaded && typeof onChunkLoaded === 'function') {
          onChunkLoaded(progressInfo.data, progressInfo);
        }
      }
    });
  }

  /**
   * Fetch with automatic retry logic
   * @param {string|URL} url URL to fetch
   * @param {Object} options Fetch options including retry configuration
   * @returns {Promise} Promise that resolves to the response data
   */
  async fetchWithRetry(url, options = {}) {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      signal,
      ...fetchOptions
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (signal?.aborted) {
          throw new Error('Request aborted');
        }

        const response = await fetch(url, { ...fetchOptions, signal });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries && !signal?.aborted) {
          // Exponential backoff
          const delay = retryDelay * Math.pow(2, attempt);
          await this.delay(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Cancel a loading operation
   * @param {string} layerName Name of the layer to cancel
   */
  cancelLoading(layerName) {
    const request = this.activeRequests.get(layerName);
    if (request && request.controller) {
      request.controller.abort();
      this.activeRequests.delete(layerName);
    }
  }

  /**
   * Start a cancellable loading operation
   * @param {string} layerName Name of the layer
   * @param {Function} loadFunction Function that performs the loading
   * @returns {Promise} Promise that resolves when loading completes
   */
  async loadCancellable(layerName, loadFunction, onError = null) {
    // Cancel any existing loading for this layer
    this.cancelLoading(layerName);

    const controller = new AbortController();
    this.activeRequests.set(layerName, { controller });

    try {
      const result = await loadFunction(controller.signal);
      this.activeRequests.delete(layerName);
      return result;
    } catch (error) {
      this.activeRequests.delete(layerName);
      if (onError) {
        if (error.name === 'AbortError') {
          onError(layerName, 'Loading cancelled');
        } else {
          onError(layerName, error.message);
        }
      }
      throw error;
    }
  }

  /**
   * Load multiple layers in parallel with coordination
   * @param {Array} layerConfigs Array of layer configuration objects
   * @returns {Promise} Promise that resolves when all layers are loaded
   */
  async loadParallel(layerConfigs) {
    const promises = layerConfigs.map(config => 
      this.loadCancellable(config.layerName, (signal) => 
        this.loadChunked({ ...config, signal })
      )
    );

    return Promise.allSettled(promises);
  }

  /**
   * Utility function for creating delays
   * @param {number} ms Milliseconds to delay
   * @returns {Promise} Promise that resolves after the delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get optimal chunk size based on data type and network conditions
   * @param {string} dataType Type of data being loaded
   * @param {number} estimatedItemSize Estimated size per item in bytes
   * @returns {number} Optimal chunk size
   */
  getOptimalChunkSize(dataType, estimatedItemSize = 1000) {
    // Estimate based on connection and data type
    const connection = navigator.connection;
    let baseChunkSize = 500;

    if (connection) {
      // Adjust based on connection speed
      switch (connection.effectiveType) {
        case 'slow-2g':
        case '2g':
          baseChunkSize = 100;
          break;
        case '3g':
          baseChunkSize = 300;
          break;
        case '4g':
          baseChunkSize = 1000;
          break;
        default:
          baseChunkSize = 500;
      }
    }

    // Adjust based on data type
    const typeMultipliers = {
      trees: 0.5,      // Trees have complex geometry
      buildings: 0.3,  // Buildings are very complex
      vegetation: 0.7, // Moderate complexity
      points: 1.5,     // Simple point data
    };

    const multiplier = typeMultipliers[dataType] || 1;
    return Math.max(50, Math.round(baseChunkSize * multiplier));
  }

  /**
   * Preload data for faster access
   * @param {Object} options Preload configuration
   * @returns {Promise} Promise that resolves when preloading completes
   */
  async preload(options) {
    const { layerName, ...loadOptions } = options;
    
    // Load in background without showing progress
    try {
      const data = await this.loadChunked({
        ...loadOptions,
        layerName: `${layerName}_preload`,
      });
      
      // Cache the data for quick access
      this.cacheData(layerName, data);
      return data;
    } catch (error) {
      console.warn(`Preload failed for ${layerName}:`, error);
      return null;
    }
  }

  /**
   * Simple data caching
   * @param {string} key Cache key
   * @param {*} data Data to cache
   */
  cacheData(key, data) {
    // Simple in-memory cache - could be replaced with IndexedDB for persistence
    if (!this.cache) {
      this.cache = new Map();
    }
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size: JSON.stringify(data).length
    });

    // Clean up old cache entries (simple LRU)
    if (this.cache.size > 10) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Get cached data
   * @param {string} key Cache key
   * @param {number} maxAge Maximum age in milliseconds
   * @returns {*} Cached data or null
   */
  getCachedData(key, maxAge = 5 * 60 * 1000) { // 5 minutes default
    if (!this.cache) return null;
    
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
}

// Export singleton instance
export const progressiveLoader = new ProgressiveLoader();