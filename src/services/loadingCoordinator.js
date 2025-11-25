/**
 * @module services/loadingCoordinator
 * Loading Coordinator Service
 *
 * Orchestrates smooth, non-disruptive loading of multiple layers
 * with intelligent prioritization and user experience optimization.
 *
 * Features:
 * - Multi-layer loading coordination with priority management
 * - Three loading strategies: sequential, parallel, and balanced
 * - Intelligent staggering to prevent network congestion
 * - Background loading with requestIdleCallback integration
 * - Session tracking and performance metrics
 * - Graceful failure handling (continues on partial failures)
 *
 * Loading Strategies:
 * - **Critical-first**: Sequential loading by priority (critical → high → normal → low)
 * - **Parallel**: Load all layers simultaneously (maximum throughput)
 * - **Balanced** (default): Load critical/high first, then parallel normal/low, background scheduled
 *
 * Priority Levels:
 * 1. **Critical**: Essential data (postal codes, core map layers)
 * 2. **High**: Important data (buildings, trees)
 * 3. **Normal**: Standard data (vegetation, other nature features)
 * 4. **Low**: Background data (cache warming, preloading)
 * 5. **Background**: Silent background operations
 *
 * Performance Features:
 * - Staggered loading (100ms delays) to prevent request congestion
 * - Session-based metrics (load times, success rates)
 * - Progressive progress tracking for all strategies
 * - Automatic error recovery with partial success handling
 *
 * @see {@link module:services/unifiedLoader}
 * @see {@link module:services/backgroundPreloader}
 * @see {@link module:stores/loadingStore}
 */

import { useLoadingStore } from '../stores/loadingStore.js';
import { useGlobalStore } from '../stores/globalStore.js';
import unifiedLoader from './unifiedLoader.js';
import backgroundPreloader from './backgroundPreloader.js';

/**
 * Loading session configuration
 * @typedef {Object} SessionOptions
 * @property {boolean} [showGlobalProgress=false] - Show global progress indicator
 * @property {boolean} [allowInterruption=true] - Allow user to cancel loading
 * @property {boolean} [backgroundMode=false] - Use background priority for all layers
 * @property {string} [priorityStrategy='balanced'] - Loading strategy: 'critical-first', 'parallel', 'balanced'
 */

/**
 * Session result object
 * @typedef {Object} SessionResult
 * @property {string} status - Result status: 'fulfilled' or 'rejected'
 * @property {*} [value] - Loaded data (if fulfilled)
 * @property {Error} [reason] - Error object (if rejected)
 * @property {Object} config - Original layer configuration
 */

/**
 * Performance metrics object
 * @typedef {Object} PerformanceMetrics
 * @property {number|null} sessionStartTime - Performance.now() timestamp when session started
 * @property {number} layersLoaded - Total layers loaded across all sessions
 * @property {number} totalLoadTime - Cumulative loading time in milliseconds
 * @property {number} avgLoadTime - Average loading time per layer in milliseconds
 * @property {number} activeSessions - Number of currently active sessions
 * @property {number} sessionDuration - Current session duration in milliseconds
 */

/**
 * LoadingCoordinator Class
 * Orchestrates multi-layer loading with intelligent prioritization
 * and user experience optimization.
 *
 * @class LoadingCoordinator
 */
class LoadingCoordinator {
	/**
	 * Creates a LoadingCoordinator instance
	 * Initializes priority levels, session tracking, and performance metrics.
	 */
	constructor() {
		/** @type {Object|null} Lazy-loaded loading store instance */
		this._loadingStore = null;
		/** @type {Object|null} Lazy-loaded global store instance */
		this._globalStore = null;

		/** @type {Map<string, Object>} Active loading sessions by ID */
		this.activeSessions = new Map();

		/** @type {Object<string, number>} Priority level mappings (lower = higher priority) */
		this.priorities = {
			critical: 1, // Essential data (postal codes, core map layers)
			high: 2, // Important data (buildings, trees)
			normal: 3, // Standard data (vegetation, other nature)
			low: 4, // Background data (cache warming, preloading)
			background: 5, // Silent background operations
		};

		/** @type {Map} Loading queue for managing load order */
		this.loadingQueue = new Map();

		/** @type {PerformanceMetrics} Performance tracking metrics */
		this.performanceMetrics = {
			sessionStartTime: null,
			layersLoaded: 0,
			totalLoadTime: 0,
			avgLoadTime: 0,
		};
	}

	/**
	 * Get loading store instance (lazy-loaded to avoid Pinia initialization issues)
	 * Provides fallback with no-op methods if store is unavailable.
	 *
	 * @returns {Object} Loading store instance or fallback
	 * @private
	 */
	get loadingStore() {
		if (!this._loadingStore) {
			try {
				this._loadingStore = useLoadingStore();
			} catch (error) {
				console.warn('Loading store not available, using fallback:', error.message);
				this._loadingStore = {
					startLayerLoading: () => {},
					updateLayerProgress: () => {},
					completeLayerLoading: () => {},
					setLayerError: () => {},
					layers: {},
				};
			}
		}
		return this._loadingStore;
	}

	/**
	 * Get global store instance (lazy-loaded to avoid Pinia initialization issues)
	 * Provides fallback with default values if store is unavailable.
	 *
	 * @returns {Object} Global store instance or fallback
	 * @private
	 */
	get globalStore() {
		if (!this._globalStore) {
			try {
				this._globalStore = useGlobalStore();
			} catch (error) {
				console.warn('Global store not available, using fallback:', error.message);
				this._globalStore = {
					cesiumViewer: null,
					postalcode: null,
					view: 'capitalRegion',
				};
			}
		}
		return this._globalStore;
	}

	/**
	 * Start a coordinated loading session for multiple layers
	 * Manages session lifecycle from initialization through completion with
	 * automatic error handling and performance tracking.
	 *
	 * Session Lifecycle:
	 * 1. Initialize session and tracking
	 * 2. Select and execute loading strategy
	 * 3. Track progress and handle errors
	 * 4. Complete session and log metrics
	 *
	 * @param {string} sessionId - Unique identifier for the loading session
	 * @param {Object[]} layerConfigs - Array of layer configurations for unifiedLoader
	 * @param {SessionOptions} [options={}] - Session options
	 * @returns {Promise<SessionResult[]>} Array of loading results (fulfilled or rejected)
	 * @throws {Error} If session initialization fails
	 *
	 * @example
	 * // Load postal code data with balanced strategy
	 * const results = await loadingCoordinator.startLoadingSession(
	 *   'postal_00100',
	 *   [
	 *     { layerId: 'buildings-00100', url: buildingsUrl, options: { priority: 'critical' } },
	 *     { layerId: 'trees-00100', url: treesUrl, options: { priority: 'high' } },
	 *     { layerId: 'vegetation-00100', url: vegUrl, options: { priority: 'normal' } }
	 *   ],
	 *   { priorityStrategy: 'balanced', showGlobalProgress: true }
	 * );
	 *
	 * @example
	 * // Background preloading with low priority
	 * await loadingCoordinator.startLoadingSession(
	 *   'preload_adjacent',
	 *   adjacentLayerConfigs,
	 *   { priorityStrategy: 'parallel', backgroundMode: true }
	 * );
	 */
	async startLoadingSession(sessionId, layerConfigs, options = {}) {
		const {
			showGlobalProgress = false,
			allowInterruption = true,
			backgroundMode = false,
			priorityStrategy = 'balanced', // 'critical-first', 'parallel', 'balanced'
		} = options;

		try {
			// Initialize session
			this.initializeSession(sessionId, layerConfigs, options);

			// Choose loading strategy based on configuration
			let results;
			switch (priorityStrategy) {
				case 'critical-first':
					results = await this.loadSequentially(sessionId, layerConfigs);
					break;
				case 'parallel':
					results = await this.loadInParallel(sessionId, layerConfigs);
					break;
				case 'balanced':
				default:
					results = await this.loadBalanced(sessionId, layerConfigs);
					break;
			}

			// Complete session
			this.completeSession(sessionId, results);

			return results;
		} catch (error) {
			this.handleSessionError(sessionId, error);
			throw error;
		}
	}

	/**
	 * Initialize a loading session with tracking
	 * Creates session metadata and starts performance measurement.
	 *
	 * @param {string} sessionId - Session identifier
	 * @param {Object[]} layerConfigs - Layer configurations
	 * @param {SessionOptions} options - Session options
	 * @returns {void}
	 * @private
	 */
	initializeSession(sessionId, layerConfigs, options) {
		this.performanceMetrics.sessionStartTime = performance.now();

		const session = {
			id: sessionId,
			configs: layerConfigs,
			options,
			startTime: performance.now(),
			status: 'loading',
			layersCompleted: 0,
			totalLayers: layerConfigs.length,
		};

		this.activeSessions.set(sessionId, session);

		console.log(`🚀 Starting loading session: ${sessionId} (${layerConfigs.length} layers)`);
	}

	/**
	 * Balanced loading strategy - prioritizes critical data while allowing parallel loading
	 * Default strategy that provides best balance of speed and UX.
	 *
	 * Loading Order:
	 * 1. Critical + High priority: Staggered (100ms delays)
	 * 2. Normal + Low priority: Parallel (no delays)
	 * 3. Background priority: Scheduled with requestIdleCallback
	 *
	 * @param {string} sessionId - Session identifier
	 * @param {Object[]} layerConfigs - Layer configurations
	 * @returns {Promise<SessionResult[]>} Loading results
	 * @private
	 */
	async loadBalanced(sessionId, layerConfigs) {
		// Group layers by priority
		const priorityGroups = this.groupByPriority(layerConfigs);
		const results = [];

		// Load critical and high priority layers first
		const criticalAndHigh = [...(priorityGroups.critical || []), ...(priorityGroups.high || [])];

		if (criticalAndHigh.length > 0) {
			console.log(`⚡ Loading ${criticalAndHigh.length} critical/high priority layers`);
			const criticalResults = await this.loadWithStaggering(criticalAndHigh, 100); // 100ms stagger
			results.push(...criticalResults);
		}

		// Load normal and low priority layers in parallel
		const normalAndLow = [...(priorityGroups.normal || []), ...(priorityGroups.low || [])];

		if (normalAndLow.length > 0) {
			console.log(`🔄 Loading ${normalAndLow.length} normal/low priority layers in parallel`);
			const normalResults = await unifiedLoader.loadLayers(normalAndLow);
			results.push(...normalResults);
		}

		// Handle background layers separately
		if (priorityGroups.background?.length > 0) {
			console.log(`🌅 Scheduling ${priorityGroups.background.length} background layers`);
			this.scheduleBackgroundLoading(priorityGroups.background);
		}

		return results;
	}

	/**
	 * Load layers in parallel with intelligent staggering
	 * Prevents network congestion by staggering requests with delays.
	 *
	 * @param {Object[]} layerConfigs - Layer configurations
	 * @param {number} [staggerDelay=50] - Delay between requests in milliseconds
	 * @returns {Promise<SessionResult[]>} Loading results
	 * @private
	 */
	async loadWithStaggering(layerConfigs, staggerDelay = 50) {
		const promises = layerConfigs.map(
			(config, index) =>
				new Promise((resolve) => {
					setTimeout(async () => {
						try {
							const result = await unifiedLoader.loadLayer(config);
							resolve({ status: 'fulfilled', value: result, config });
						} catch (error) {
							resolve({ status: 'rejected', reason: error, config });
						}
					}, index * staggerDelay);
				})
		);

		return Promise.all(promises);
	}

	/**
	 * Load layers sequentially based on priority
	 * Ensures high-priority data loads before lower-priority data.
	 *
	 * Strategy:
	 * - Sorts by priority (critical → background)
	 * - Loads one at a time with progress updates
	 * - Brief 10ms pauses between layers for UI responsiveness
	 *
	 * @param {string} sessionId - Session identifier
	 * @param {Object[]} layerConfigs - Layer configurations
	 * @returns {Promise<SessionResult[]>} Loading results
	 * @private
	 */
	async loadSequentially(sessionId, layerConfigs) {
		const sortedConfigs = this.sortByPriority(layerConfigs);
		const results = [];

		for (const config of sortedConfigs) {
			try {
				console.log(
					`📥 Loading layer: ${config.layerId} (priority: ${config.options?.priority || 'normal'})`
				);
				const result = await unifiedLoader.loadLayer(config);
				results.push({ status: 'fulfilled', value: result, config });

				// Update session progress
				this.updateSessionProgress(sessionId, results.length, sortedConfigs.length);

				// Brief pause to allow UI updates
				await new Promise((resolve) => setTimeout(resolve, 10));
			} catch (error) {
				console.error(`❌ Failed to load layer: ${config.layerId}`, error?.message || error);
				results.push({ status: 'rejected', reason: error, config });
			}
		}

		return results;
	}

	/**
	 * Load all layers in parallel
	 * Maximum throughput strategy - all layers load simultaneously.
	 *
	 * @param {string} sessionId - Session identifier
	 * @param {Object[]} layerConfigs - Layer configurations
	 * @returns {Promise<SessionResult[]>} Loading results
	 * @private
	 */
	async loadInParallel(sessionId, layerConfigs) {
		console.log(`🚄 Loading ${layerConfigs.length} layers in parallel`);
		return unifiedLoader.loadLayers(layerConfigs);
	}

	/**
	 * Schedule background loading for low-priority data
	 * Uses requestIdleCallback to load during browser idle time,
	 * minimizing impact on user interactions.
	 *
	 * Loading Strategy:
	 * - Uses requestIdleCallback when available (falls back to setTimeout)
	 * - 1-second delays between background layers
	 * - Silent failure (logs warnings, doesn't throw)
	 * - Recursive scheduling for multiple layers
	 *
	 * @param {Object[]} backgroundConfigs - Background layer configurations
	 * @returns {void}
	 * @private
	 */
	scheduleBackgroundLoading(backgroundConfigs) {
		// Use requestIdleCallback or setTimeout for background loading
		const scheduleNext = (configs, index = 0) => {
			if (index >= configs.length) return;

			const scheduleFunction =
				window.requestIdleCallback || ((callback) => setTimeout(callback, 1000));

			scheduleFunction(async () => {
				try {
					const config = configs[index];
					console.log(`🌙 Background loading: ${config.layerId}`);
					await unifiedLoader.loadLayer({
						...config,
						options: {
							...config.options,
							background: true,
							priority: 'background',
						},
					});
				} catch (error) {
					console.warn(
						`Background loading failed for ${configs[index].layerId}:`,
						error?.message || error
					);
				}

				// Schedule next layer
				scheduleNext(configs, index + 1);
			});
		};

		scheduleNext(backgroundConfigs);
	}

	/**
	 * Group layer configs by priority
	 * Creates priority groups for strategic loading order.
	 *
	 * @param {Object[]} layerConfigs - Layer configurations
	 * @returns {Object<string, Object[]>} Grouped configs by priority level
	 * @private
	 */
	groupByPriority(layerConfigs) {
		return layerConfigs.reduce((groups, config) => {
			const priority = config.options?.priority || 'normal';
			if (!groups[priority]) groups[priority] = [];
			groups[priority].push(config);
			return groups;
		}, {});
	}

	/**
	 * Sort layer configs by priority
	 * Orders configs from highest priority (critical=1) to lowest (background=5).
	 *
	 * @param {Object[]} layerConfigs - Layer configurations
	 * @returns {Object[]} Sorted configs (high priority first)
	 * @private
	 */
	sortByPriority(layerConfigs) {
		return [...layerConfigs].sort((a, b) => {
			const priorityA = this.priorities[a.options?.priority || 'normal'];
			const priorityB = this.priorities[b.options?.priority || 'normal'];
			return priorityA - priorityB;
		});
	}

	/**
	 * Update session progress tracking
	 * Logs progress and updates session metadata.
	 *
	 * @param {string} sessionId - Session identifier
	 * @param {number} completed - Number of completed layers
	 * @param {number} total - Total number of layers
	 * @returns {void}
	 * @private
	 */
	updateSessionProgress(sessionId, completed, total) {
		const session = this.activeSessions.get(sessionId);
		if (session) {
			session.layersCompleted = completed;
			const progress = (completed / total) * 100;
			console.log(
				`📊 Session ${sessionId}: ${completed}/${total} layers (${progress.toFixed(1)}%)`
			);
		}
	}

	/**
	 * Complete a loading session
	 * Finalizes session, calculates performance metrics, and logs results.
	 *
	 * @param {string} sessionId - Session identifier
	 * @param {SessionResult[]} results - Loading results
	 * @returns {void}
	 * @private
	 */
	completeSession(sessionId, results) {
		const session = this.activeSessions.get(sessionId);
		if (!session) return;

		const endTime = performance.now();
		const duration = endTime - session.startTime;

		// Update performance metrics
		this.performanceMetrics.layersLoaded += session.totalLayers;
		this.performanceMetrics.totalLoadTime += duration;
		this.performanceMetrics.avgLoadTime =
			this.performanceMetrics.totalLoadTime / this.performanceMetrics.layersLoaded;

		// Log completion
		const successful = results.filter((r) => r.status === 'fulfilled').length;
		const failed = results.length - successful;

		console.log(`✅ Session ${sessionId} completed in ${duration.toFixed(0)}ms`);
		console.log(`📈 Success rate: ${successful}/${results.length} layers`);

		if (failed > 0) {
			console.warn(`⚠️ ${failed} layers failed to load`);
		}

		// Clean up session
		this.activeSessions.delete(sessionId);
	}

	/**
	 * Handle session errors
	 * Logs error and cleans up session tracking.
	 *
	 * @param {string} sessionId - Session identifier
	 * @param {Error} error - Error object
	 * @returns {void}
	 * @private
	 */
	handleSessionError(sessionId, error) {
		console.error(`❌ Loading session ${sessionId} failed:`, error?.message || error);
		this.activeSessions.delete(sessionId);
	}

	/**
	 * Cancel an active loading session
	 * Aborts all layer loading requests for the session.
	 *
	 * @param {string} sessionId - Session identifier to cancel
	 * @returns {void}
	 *
	 * @example
	 * // Cancel loading when user navigates away
	 * loadingCoordinator.cancelSession('postal_00100');
	 */
	cancelSession(sessionId) {
		const session = this.activeSessions.get(sessionId);
		if (session) {
			console.log(`🛑 Cancelling loading session: ${sessionId}`);

			// Cancel individual layer loading
			session.configs.forEach((config) => {
				unifiedLoader.cancelLoading(config.layerId);
			});

			this.activeSessions.delete(sessionId);
		}
	}

	/**
	 * Get performance metrics
	 * Returns current performance statistics including active sessions.
	 *
	 * @returns {PerformanceMetrics} Performance metrics object
	 *
	 * @example
	 * const metrics = loadingCoordinator.getPerformanceMetrics();
	 * console.log(`Average load time: ${metrics.avgLoadTime.toFixed(0)}ms`);
	 * console.log(`Active sessions: ${metrics.activeSessions}`);
	 */
	getPerformanceMetrics() {
		return {
			...this.performanceMetrics,
			activeSessions: this.activeSessions.size,
			sessionDuration: this.performanceMetrics.sessionStartTime
				? performance.now() - this.performanceMetrics.sessionStartTime
				: 0,
		};
	}

	/**
	 * Smart preloading based on user context
	 * Analyzes user behavior to predict and preload likely next actions.
	 *
	 * Note: Currently returns empty array. Future implementation will use
	 * analytics and user history to predict needed data.
	 *
	 * @param {Object} [context={}] - User context for prediction
	 * @param {string} [context.currentPostalCode] - Current postal code
	 * @param {string} [context.view] - Current view mode
	 * @param {string[]} [context.userHistory] - Recent user actions
	 * @returns {Promise<SessionResult[]>} Preload results
	 *
	 * @example
	 * // Intelligent preloading based on current location
	 * await loadingCoordinator.intelligentPreload({
	 *   currentPostalCode: '00100',
	 *   view: 'postalcode',
	 *   userHistory: ['00150', '00170']
	 * });
	 */
	async intelligentPreload(context = {}) {
		const { currentPostalCode, view, userHistory = [] } = context;

		// Determine what to preload based on context
		const preloadConfigs = this.generatePreloadConfigs(context);

		if (preloadConfigs.length > 0) {
			console.log(`🔮 Starting intelligent preload of ${preloadConfigs.length} layers`);

			await this.startLoadingSession('preload', preloadConfigs, {
				priorityStrategy: 'balanced',
				backgroundMode: true,
			});
		}
	}

	/**
	 * Generate preload configurations based on context
	 * Future: Analyze user patterns and predict likely next actions.
	 *
	 * @param {Object} context - User context
	 * @returns {Object[]} Preload configurations (currently empty)
	 * @private
	 */
	generatePreloadConfigs(context) {
		// This would analyze user patterns and predict likely next actions
		// For now, return empty array - would be expanded based on analytics
		return [];
	}

	/**
	 * Optimized loading for postal code changes
	 * Loads standard postal code layers with critical-first strategy.
	 *
	 * Standard Layers:
	 * - Buildings (critical priority)
	 * - Trees (high priority)
	 * - Vegetation (normal priority)
	 * - Other nature (normal priority)
	 *
	 * Note: Actual layer configurations must be provided by calling service.
	 *
	 * @param {string} postalCode - Postal code to load
	 * @param {SessionOptions} [options={}] - Session options
	 * @returns {Promise<SessionResult[]>} Loading results
	 *
	 * @example
	 * // Load postal code data when user selects area
	 * const results = await loadingCoordinator.loadPostalCodeData('00100', {
	 *   showGlobalProgress: true
	 * });
	 */
	async loadPostalCodeData(postalCode, options = {}) {
		const sessionId = `postal_code_${postalCode}`;

		// Define standard postal code layer configurations
		const layerConfigs = [
			{
				layerId: `buildings_${postalCode}`,
				priority: 'critical',
				// Additional config would be provided by calling service
			},
			{
				layerId: `trees_${postalCode}`,
				priority: 'high',
			},
			{
				layerId: `vegetation_${postalCode}`,
				priority: 'normal',
			},
			{
				layerId: `othernature_${postalCode}`,
				priority: 'normal',
			},
		];

		return this.startLoadingSession(sessionId, layerConfigs, {
			priorityStrategy: 'critical-first',
			showGlobalProgress: true,
			...options,
		});
	}
}

// Create and export singleton instance
const loadingCoordinator = new LoadingCoordinator();
export default loadingCoordinator;
