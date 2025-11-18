/**
 * Loading Coordinator Service
 *
 * Orchestrates smooth, non-disruptive loading of multiple layers
 * with intelligent prioritization and user experience optimization.
 */

import { useLoadingStore } from '../stores/loadingStore.js';
import { useGlobalStore } from '../stores/globalStore.js';
import unifiedLoader from './unifiedLoader.js';
import backgroundPreloader from './backgroundPreloader.js';

class LoadingCoordinator {
	constructor() {
		// Lazy-loaded stores to avoid Pinia initialization issues
		this._loadingStore = null;
		this._globalStore = null;

		// Track active loading sessions
		this.activeSessions = new Map();

		// Loading priorities
		this.priorities = {
			critical: 1, // Essential data (postal codes, core map layers)
			high: 2, // Important data (buildings, trees)
			normal: 3, // Standard data (vegetation, other nature)
			low: 4, // Background data (cache warming, preloading)
			background: 5, // Silent background operations
		};

		// Queue for managing loading order
		this.loadingQueue = new Map();

		// Performance tracking
		this.performanceMetrics = {
			sessionStartTime: null,
			layersLoaded: 0,
			totalLoadTime: 0,
			avgLoadTime: 0,
		};
	}

	/**
	 * Get loading store instance (lazy-loaded to avoid Pinia initialization issues)
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
	 * @param {string} sessionId - Unique identifier for the loading session
	 * @param {Array} layerConfigs - Array of layer configurations
	 * @param {Object} options - Session options
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
				console.error(`❌ Failed to load layer: ${config.layerId}`, error);
				results.push({ status: 'rejected', reason: error, config });
			}
		}

		return results;
	}

	/**
	 * Load all layers in parallel
	 */
	async loadInParallel(sessionId, layerConfigs) {
		console.log(`🚄 Loading ${layerConfigs.length} layers in parallel`);
		return unifiedLoader.loadLayers(layerConfigs);
	}

	/**
	 * Schedule background loading for low-priority data
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
					console.warn(`Background loading failed for ${configs[index].layerId}:`, error);
				}

				// Schedule next layer
				scheduleNext(configs, index + 1);
			});
		};

		scheduleNext(backgroundConfigs);
	}

	/**
	 * Group layer configs by priority
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
	 */
	handleSessionError(sessionId, error) {
		console.error(`❌ Loading session ${sessionId} failed:`, error);
		this.activeSessions.delete(sessionId);
	}

	/**
	 * Cancel an active loading session
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
	 */
	generatePreloadConfigs(context) {
		// This would analyze user patterns and predict likely next actions
		// For now, return empty array - would be expanded based on analytics
		return [];
	}

	/**
	 * Optimized loading for postal code changes
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
