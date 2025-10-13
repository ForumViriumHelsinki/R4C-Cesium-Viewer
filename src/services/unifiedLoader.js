/**
 * Unified Layer Loading Service
 *
 * Provides a harmonized interface for loading all types of data layers
 * with consistent progress tracking, error handling, and performance optimization.
 */

import { useLoadingStore } from "../stores/loadingStore.js";
import cacheService from "./cacheService.js";
import progressiveLoader from "./progressiveLoader.js";

class UnifiedLoader {
  constructor() {
    this.activeRequests = new Map(); // Track active requests for cancellation
    this._loadingStore = null; // Lazy-loaded store
  }

  /**
   * Get loading store instance (lazy-loaded to avoid Pinia initialization issues)
   */
  get loadingStore() {
    if (!this._loadingStore) {
      try {
        this._loadingStore = useLoadingStore();
      } catch (error) {
        console.warn(
          "Loading store not available, using fallback:",
          error.message,
        );
        // Provide a fallback object with minimal interface
        this._loadingStore = {
          startLayerLoading: () => {},
          updateLayerProgress: () => {},
          completeLayerLoading: () => {},
          setLayerError: () => {},
          clearLayerError: () => {},
          updateCacheStatus: () => {},
          layers: {},
        };
      }
    }
    return this._loadingStore;
  }

  /**
   * Universal layer loading method with harmonized interface
   * @param {Object} config - Loading configuration
   * @param {string} config.layerId - Unique identifier for the layer
   * @param {string} config.url - Data source URL
   * @param {string} config.type - Data type: 'geojson', 'json', 'wms', 'tiles'
   * @param {Function} config.processor - Function to process loaded data
   * @param {Object} config.options - Additional loading options
   * @returns {Promise} Loading promise
   */
  async loadLayer(config) {
    const { layerId, url, type = "geojson", processor, options = {} } = config;

    const {
      cache = true,
      cacheTTL = 30 * 60 * 1000, // 30 minutes default
      retries = 3,
      batchSize = 50,
      progressive = false,
      background = false,
      priority = "normal",
    } = options;

    try {
      // Start loading tracking
      this.loadingStore.startLayerLoading(layerId, { url, type, priority });

      // Check cache first if enabled
      if (cache) {
        const cached = await this.checkCache(layerId, url, cacheTTL);
        if (cached) {
          await this.processData(cached, processor, layerId, {
            fromCache: true,
          });
          this.loadingStore.completeLayerLoading(layerId);
          return cached;
        }
      }

      // Choose loading strategy based on configuration
      let data;
      if (progressive && type === "geojson") {
        data = await this.loadProgressively(layerId, url, processor, {
          batchSize,
          background,
          retries,
        });
      } else {
        data = await this.loadStandard(layerId, url, type, retries);
      }

      // Process the loaded data
      if (processor && data) {
        await this.processData(data, processor, layerId, { fromCache: false });
      }

      // Cache the data if enabled
      if (cache && data) {
        await this.cacheData(layerId, url, data, cacheTTL);
      }

      this.loadingStore.completeLayerLoading(layerId);
      return data;
    } catch (error) {
      this.loadingStore.setLayerError(layerId, error.message);
      console.error(`Failed to load layer ${layerId}:`, error);
      throw error;
    }
  }

  /**
   * Check cache for existing data
   */
  async checkCache(layerId, url, ttl) {
    try {
      const cacheKey = this.generateCacheKey(layerId, url);
      const cached = await cacheService.get(cacheKey);

      if (cached && this.isCacheValid(cached, ttl)) {
        console.log(`✓ Using cached data for ${layerId}`);
        this.loadingStore.updateLayerProgress(layerId, 100, 100);
        return cached.data;
      }
    } catch (error) {
      console.warn(`Cache check failed for ${layerId}:`, error);
    }
    return null;
  }

  /**
   * Standard loading method for smaller datasets
   */
  async loadStandard(layerId, url, type, retries) {
    const controller = new AbortController();
    this.activeRequests.set(layerId, controller);

    try {
      const response = await this.fetchWithRetry(
        url,
        {
          signal: controller.signal,
        },
        retries,
      );

      let data;
      switch (type) {
        case "json":
        case "geojson":
          data = await response.json();
          break;
        case "text":
          data = await response.text();
          break;
        case "blob":
          data = await response.blob();
          break;
        default:
          data = await response.json();
      }

      this.loadingStore.updateLayerProgress(layerId, 100, 100);
      return data;
    } finally {
      this.activeRequests.delete(layerId);
    }
  }

  /**
   * Progressive loading for large datasets
   */
  async loadProgressively(layerId, url, processor, options) {
    return await progressiveLoader.loadData(url, {
      ...options,
      onProgress: (current, total) => {
        this.loadingStore.updateLayerProgress(layerId, current, total);
      },
      onChunk: async (chunk) => {
        if (processor) {
          await this.processDataChunk(chunk, processor, layerId);
        }
      },
    });
  }

  /**
   * Process loaded data with yielding for non-blocking execution
   */
  async processData(data, processor, layerId, metadata = {}) {
    if (!processor || !data) return;

    try {
      // For large datasets, process in batches to avoid blocking
      if (data.features && data.features.length > 100) {
        await this.processBatchedData(data, processor, layerId);
      } else {
        await processor(data, metadata);
      }
    } catch (error) {
      console.error(`Error processing data for ${layerId}:`, error);
      throw error;
    }
  }

  /**
   * Process data in batches with yielding
   */
  async processBatchedData(data, processor, layerId) {
    const features = data.features || [];
    const batchSize = 25;
    let processed = 0;

    for (let i = 0; i < features.length; i += batchSize) {
      const batch = features.slice(i, i + batchSize);
      const batchData = { ...data, features: batch };

      await processor(batchData, { batch: i / batchSize + 1 });

      processed += batch.length;
      this.loadingStore.updateLayerProgress(
        layerId,
        processed,
        features.length,
      );

      // Yield control to prevent UI blocking
      if (i + batchSize < features.length) {
        await new Promise((resolve) => {
          if (window.requestIdleCallback) {
            requestIdleCallback(resolve);
          } else {
            setTimeout(resolve, 0);
          }
        });
      }
    }
  }

  /**
   * Process individual data chunks from progressive loading
   */
  async processDataChunk(chunk, processor, layerId) {
    try {
      await processor(chunk, { streaming: true });

      // Brief yield for UI responsiveness
      await new Promise((resolve) => setTimeout(resolve, 0));
    } catch (error) {
      console.error(`Error processing chunk for ${layerId}:`, error);
    }
  }

  /**
   * Fetch with automatic retry logic
   */
  async fetchWithRetry(url, options = {}, retries = 3) {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error;

        if (attempt < retries && !options.signal?.aborted) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.warn(
            `Fetch attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          break;
        }
      }
    }

    throw lastError;
  }

  /**
   * Cache data with metadata
   */
  async cacheData(layerId, url, data, ttl) {
    try {
      const cacheKey = this.generateCacheKey(layerId, url);
      await cacheService.set(
        cacheKey,
        {
          data,
          timestamp: Date.now(),
          url,
          layerId,
        },
        ttl,
      );

      this.loadingStore.updateCacheStatus(layerId, true, Date.now());
    } catch (error) {
      console.warn(`Failed to cache data for ${layerId}:`, error);
    }
  }

  /**
   * Generate consistent cache keys
   */
  generateCacheKey(layerId, url) {
    const urlHash = btoa(url).replace(/[/+=]/g, "");
    return `layer_${layerId}_${urlHash}`;
  }

  /**
   * Check if cached data is still valid
   */
  isCacheValid(cached, ttl) {
    return Date.now() - cached.timestamp < ttl;
  }

  /**
   * Cancel active loading for a layer
   */
  cancelLoading(layerId) {
    const controller = this.activeRequests.get(layerId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(layerId);
      this.loadingStore.setLayerError(layerId, "Loading cancelled");
    }
  }

  /**
   * Retry failed loading
   */
  async retryLoading(layerId) {
    const layerInfo = this.loadingStore.layers[layerId];
    if (layerInfo && layerInfo.error) {
      this.loadingStore.clearLayerError(layerId);
      // The retry logic would need the original config
      // This would typically be stored or passed from the calling component
    }
  }

  /**
   * Preload data in background
   */
  async preloadLayer(config) {
    return this.loadLayer({
      ...config,
      options: {
        ...config.options,
        background: true,
        priority: "low",
      },
    });
  }

  /**
   * Load multiple layers in parallel with coordination
   */
  async loadLayers(configs) {
    const promises = configs.map((config) =>
      this.loadLayer(config).catch((error) => ({ error, config })),
    );

    const results = await Promise.allSettled(promises);

    // Report any failures
    results.forEach((result, index) => {
      if (result.status === "rejected" || result.value?.error) {
        console.error(
          `Failed to load layer ${configs[index].layerId}:`,
          result.reason || result.value?.error,
        );
      }
    });

    return results;
  }
}

// Create and export singleton instance
const unifiedLoader = new UnifiedLoader();
export default unifiedLoader;
