import cacheService from './cacheService.js';
import progressiveLoader from './progressiveLoader.js';

/**
 * Background Preloader Service
 * Handles intelligent preloading of data based on user behavior and priorities
 */
class BackgroundPreloader {
  constructor() {
    this.preloadQueue = new Map();
    this.isPreloading = false;
    this.preloadPriorities = new Map();
    this.userBehavior = {
      visitedPostalCodes: new Set(),
      frequentLayers: new Map(),
      lastActivity: Date.now()
    };
  }

  /**
   * Initialize preloader and start background tasks
   */
  async init() {
    // Load user behavior from cache
    await this.loadUserBehavior();

    // Start preloading critical data
    this.startCriticalPreload();

    // Set up idle preloading
    this.setupIdlePreloading();

    console.log('Background preloader initialized');
  }

  /**
   * Preload critical data that's likely to be needed
   */
  async startCriticalPreload() {
    const criticalData = [
      {
        key: 'postal-codes-helsinki',
        url: '/paavo',
        type: 'postal-codes',
        priority: 'high',
        description: 'Helsinki postal code boundaries'
      },
      {
        key: 'heat-exposure-sample',
        url: '/pygeoapi/collections/heatexposure_optimized/items?f=json&limit=100',
        type: 'heat-exposure',
        priority: 'high',
        description: 'Sample heat exposure data'
      },
      {
        key: 'hsy-layer-info',
        url: '/hsy-action?action_route=GetHierarchicalMapLayerGroups',
        type: 'layer-info',
        priority: 'medium',
        description: 'HSY environmental layer information'
      }
    ];

    for (const data of criticalData) {
      this.addToPreloadQueue(data);
    }

    // Start processing the queue
    this.processPreloadQueue();
  }

  /**
   * Add item to preload queue with priority
   */
  addToPreloadQueue(item) {
    const priority = this.calculatePriority(item);
    this.preloadQueue.set(item.key, { ...item, calculatedPriority: priority });
    this.preloadPriorities.set(item.key, priority);
  }

  /**
   * Calculate preload priority based on various factors
   */
  calculatePriority(item) {
    let score = 0;

    // Base priority scores
    const priorityScores = {
      'high': 100,
      'medium': 50,
      'low': 25
    };
    score += priorityScores[item.priority] || 25;

    // User behavior influence
    if (item.type === 'trees' || item.type === 'buildings') {
      const layerFrequency = this.userBehavior.frequentLayers.get(item.type) || 0;
      score += layerFrequency * 10;
    }

    // Postal code relevance
    if (item.postalCode && this.userBehavior.visitedPostalCodes.has(item.postalCode)) {
      score += 30;
    }

    // Data size consideration (smaller data gets higher priority for preloading)
    if (item.estimatedSize) {
      score -= Math.log10(item.estimatedSize) * 5;
    }

    return Math.max(0, score);
  }

  /**
   * Process the preload queue in priority order
   */
  async processPreloadQueue() {
    if (this.isPreloading) return;

    this.isPreloading = true;

    try {
      // Sort queue by priority
      const sortedItems = Array.from(this.preloadQueue.values())
        .sort((a, b) => b.calculatedPriority - a.calculatedPriority);

      for (const item of sortedItems) {
        // Check if user is active (pause preloading during active use)
        if (this.isUserActive()) {
          await this.waitForUserIdle();
        }

        // Check if already cached
        const cached = await cacheService.getData(item.key);
        if (cached) {
          console.log(`Skipping preload of ${item.key} - already cached`);
          this.preloadQueue.delete(item.key);
          continue;
        }

        console.log(`Background preloading: ${item.description}`);

        try {
          await this.preloadItem(item);
          this.preloadQueue.delete(item.key);
        } catch (error) {
          console.warn(`Failed to preload ${item.key}:`, error);
          // Keep in queue but lower priority
          item.calculatedPriority *= 0.5;
        }

        // Small delay to prevent overwhelming the browser
        await this.delay(1000);
      }
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Preload a specific item
   */
  async preloadItem(item) {
    const startTime = Date.now();

    try {
      // Use progressive loader for chunked data
      if (item.type === 'trees' || item.type === 'buildings') {
        const data = await progressiveLoader.loadChunked({
          layerName: `preload-${item.key}`,
          baseUrl: item.url,
          params: item.params || {},
          chunkSize: 200, // Smaller chunks for background loading
          processor: item.processor
        });

        await cacheService.setData(item.key, data, {
          type: item.type,
          postalCode: item.postalCode,
          ttl: item.ttl || 24 * 60 * 60 * 1000, // 24 hours default
          metadata: {
            preloaded: true,
            preloadTime: Date.now(),
            loadDuration: Date.now() - startTime
          }
        });
      } else {
        // Simple fetch for other data types
        const response = await fetch(item.url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        await cacheService.setData(item.key, data, {
          type: item.type,
          postalCode: item.postalCode,
          ttl: item.ttl || 24 * 60 * 60 * 1000,
          metadata: {
            preloaded: true,
            preloadTime: Date.now(),
            loadDuration: Date.now() - startTime
          }
        });
      }

      console.log(`Successfully preloaded ${item.key} in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error(`Preload failed for ${item.key}:`, error);
      throw error;
    }
  }

  /**
   * Preload data for a specific postal code
   */
  async preloadPostalCodeData(postalCode, layers = ['trees', 'buildings', 'vegetation']) {
    this.trackPostalCodeVisit(postalCode);

    const preloadItems = layers.map(layer => ({
      key: `${layer}-${postalCode}`,
      url: this.getLayerUrl(layer, postalCode),
      type: layer,
      postalCode: postalCode,
      priority: this.getLayerPriority(layer),
      description: `${layer} data for postal code ${postalCode}`,
      params: { postalCode }
    }));

    preloadItems.forEach(item => this.addToPreloadQueue(item));

    // Process queue if not already running
    if (!this.isPreloading) {
      this.processPreloadQueue();
    }
  }

  /**
   * Get URL for specific layer type
   */
  getLayerUrl(layer, postalCode) {
    const baseUrls = {
      trees: '/pygeoapi/collections/trees/items',
      buildings: '/pygeoapi/collections/buildings/items',
      vegetation: '/pygeoapi/collections/vegetation/items',
      'heat-exposure': '/pygeoapi/collections/heatexposure_optimized/items'
    };

    const url = baseUrls[layer];
    if (!url) return null;

    const params = new URLSearchParams({
      f: 'json',
      limit: 1000
    });

    if (postalCode) {
      params.append('filter', `postalCode=${postalCode}`);
    }

    return `${url}?${params.toString()}`;
  }

  /**
   * Get priority for different layer types
   */
  getLayerPriority(layer) {
    const priorities = {
      buildings: 'high',
      trees: 'medium',
      vegetation: 'medium',
      'heat-exposure': 'high',
      'other-nature': 'low'
    };

    return priorities[layer] || 'low';
  }

  /**
   * Track user behavior for intelligent preloading
   */
  trackPostalCodeVisit(postalCode) {
    this.userBehavior.visitedPostalCodes.add(postalCode);
    this.userBehavior.lastActivity = Date.now();
    this.saveUserBehavior();
  }

  /**
   * Track layer usage frequency
   */
  trackLayerUsage(layerType) {
    const current = this.userBehavior.frequentLayers.get(layerType) || 0;
    this.userBehavior.frequentLayers.set(layerType, current + 1);
    this.userBehavior.lastActivity = Date.now();
    this.saveUserBehavior();
  }

  /**
   * Check if user is currently active
   */
  isUserActive() {
    const timeSinceActivity = Date.now() - this.userBehavior.lastActivity;
    return timeSinceActivity < 5000; // 5 seconds
  }

  /**
   * Wait for user to become idle
   */
  async waitForUserIdle() {
    return new Promise(resolve => {
      const checkIdle = () => {
        if (!this.isUserActive()) {
          resolve();
        } else {
          setTimeout(checkIdle, 1000);
        }
      };
      checkIdle();
    });
  }

  /**
   * Setup idle detection for background preloading
   */
  setupIdlePreloading() {
    let idleTimer;

    const resetIdleTimer = () => {
      this.userBehavior.lastActivity = Date.now();
      clearTimeout(idleTimer);

      idleTimer = setTimeout(() => {
        // User has been idle for 10 seconds, resume preloading
        if (this.preloadQueue.size > 0 && !this.isPreloading) {
          console.log('User idle, resuming background preloading');
          this.processPreloadQueue();
        }
      }, 10000);
    };

    // Listen for user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetIdleTimer, { passive: true });
    });

    resetIdleTimer();
  }

  /**
   * Load user behavior from cache
   */
  async loadUserBehavior() {
    try {
      const stored = await cacheService.getMetadata('userBehavior');
      if (stored) {
        this.userBehavior = {
          visitedPostalCodes: new Set(stored.visitedPostalCodes || []),
          frequentLayers: new Map(stored.frequentLayers || []),
          lastActivity: Date.now()
        };
      }
    } catch (error) {
      console.warn('Failed to load user behavior:', error);
    }
  }

  /**
   * Save user behavior to cache
   */
  async saveUserBehavior() {
    try {
      await cacheService.setMetadata('userBehavior', {
        visitedPostalCodes: Array.from(this.userBehavior.visitedPostalCodes),
        frequentLayers: Array.from(this.userBehavior.frequentLayers.entries()),
        lastActivity: this.userBehavior.lastActivity
      });
    } catch (error) {
      console.warn('Failed to save user behavior:', error);
    }
  }

  /**
   * Pause all preloading activities
   */
  pause() {
    this.isPreloading = false;
    console.log('Background preloading paused');
  }

  /**
   * Resume preloading activities
   */
  resume() {
    if (this.preloadQueue.size > 0 && !this.isPreloading) {
      console.log('Background preloading resumed');
      this.processPreloadQueue();
    }
  }

  /**
   * Get preload status and statistics
   */
  getStatus() {
    return {
      isPreloading: this.isPreloading,
      queueSize: this.preloadQueue.size,
      visitedPostalCodes: this.userBehavior.visitedPostalCodes.size,
      frequentLayers: Object.fromEntries(this.userBehavior.frequentLayers),
      lastActivity: this.userBehavior.lastActivity
    };
  }

  /**
   * Clear all preload data and reset behavior tracking
   */
  async reset() {
    this.pause();
    this.preloadQueue.clear();
    this.preloadPriorities.clear();
    this.userBehavior = {
      visitedPostalCodes: new Set(),
      frequentLayers: new Map(),
      lastActivity: Date.now()
    };
    await this.saveUserBehavior();
    console.log('Background preloader reset');
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const backgroundPreloader = new BackgroundPreloader();
export default backgroundPreloader;