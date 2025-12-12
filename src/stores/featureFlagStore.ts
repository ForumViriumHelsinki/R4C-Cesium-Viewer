/**
 * @module stores/featureFlagStore
 * Manages runtime feature toggles with environment variable initialization and localStorage persistence.
 * Provides centralized control for experimental features, integration toggles, and developer tools.
 *
 * Feature flag architecture:
 * - **Environment-based defaults**: Initialized from VITE_FEATURE_* environment variables
 * - **Runtime overrides**: User can toggle flags during runtime via UI or programmatically
 * - **LocalStorage persistence**: User overrides persisted across sessions
 * - **Hardware validation**: Flags with requiresSupport disabled if hardware doesn't support them
 * - **Category organization**: Flags grouped into logical categories for management
 *
 * Categories:
 * - **data-layers**: NDVI, flood layers, 250m grid, tree coverage, land cover
 * - **graphics**: HDR, ambient occlusion, MSAA, FXAA, request render mode, 3D terrain
 * - **analysis**: Heat histogram, building scatter plot, cooling optimizer, NDVI analysis, socioeconomic viz
 * - **ui**: Compact view, mobile optimization, control panel, data source status, loading performance info
 * - **integration**: Sentry error tracking, Digitransit transport, background map providers
 * - **developer**: Debug mode, performance monitoring, cache visualization, health checks
 *
 * Usage patterns:
 * ```typescript
 * const featureFlagStore = useFeatureFlagStore();
 *
 * // Check if feature is enabled
 * if (featureFlagStore.isEnabled('ndvi')) {
 *   // Show NDVI layer controls
 * }
 *
 * // Toggle feature at runtime
 * featureFlagStore.setFlag('debugMode', true);
 *
 * // Get all experimental features
 * const experimental = featureFlagStore.experimentalFlags;
 *
 * // Export/import configuration
 * const config = featureFlagStore.exportConfig();
 * featureFlagStore.importConfig(config);
 * ```
 *
 * @see {@link https://pinia.vuejs.org/|Pinia Documentation}
 */

import { defineStore } from 'pinia'

/**
 * Feature flag category types for organizational grouping
 * @typedef {'data-layers' | 'graphics' | 'analysis' | 'ui' | 'integration' | 'developer'} FeatureFlagCategory
 */
export type FeatureFlagCategory =
	| 'data-layers'
	| 'graphics'
	| 'analysis'
	| 'ui'
	| 'integration'
	| 'developer'

/**
 * Feature flag names - comprehensive list of all available feature toggles
 *
 * Naming convention: camelCase descriptive names
 * Environment variable mapping: VITE_FEATURE_<SCREAMING_SNAKE_CASE>
 *
 * @typedef {string} FeatureFlagName
 */
export type FeatureFlagName =
	// Data layers
	| 'ndvi'
	| 'floodLayers'
	| 'grid250m'
	| 'treeCoverage'
	| 'landCover'
	// Graphics & Performance
	| 'hdrRendering'
	| 'ambientOcclusion'
	| 'msaaOptions'
	| 'fxaaOptions'
	| 'requestRenderMode'
	| 'terrain3d'
	| 'viewportStreaming'
	// Analysis tools
	| 'heatHistogram'
	| 'buildingScatterPlot'
	| 'coolingOptimizer'
	| 'ndviAnalysis'
	| 'socioeconomicViz'
	// UI/UX
	| 'compactView'
	| 'mobileOptimized'
	| 'controlPanelDefault'
	| 'dataSourceStatus'
	| 'loadingPerformanceInfo'
	| 'backgroundPreload'
	// Integration
	| 'sentryErrorTracking'
	| 'digitransitIntegration'
	| 'backgroundMapProviders'
	// Developer
	| 'debugMode'
	| 'performanceMonitoring'
	| 'cacheVisualization'
	| 'healthChecks'

/**
 * Feature flag configuration object
 *
 * @interface FeatureFlagConfig
 * @property {boolean} enabled - Whether the feature is currently enabled
 * @property {FeatureFlagCategory} category - Category for grouping and filtering
 * @property {string} label - Human-readable display name
 * @property {string} description - Detailed explanation of the feature's purpose
 * @property {boolean} [experimental] - If true, marks feature as experimental/unstable
 * @property {boolean} [requiresSupport] - If true, requires hardware/browser support validation
 */
export interface FeatureFlagConfig {
	enabled: boolean
	category: FeatureFlagCategory
	label: string
	description: string
	experimental?: boolean
	requiresSupport?: boolean
}

/**
 * Complete feature flags map with all flag configurations
 * @typedef {Record<FeatureFlagName, FeatureFlagConfig>} FeatureFlagsMap
 */
export type FeatureFlagsMap = Record<FeatureFlagName, FeatureFlagConfig>

/**
 * User runtime overrides for feature flags (persisted to localStorage)
 * @typedef {Partial<Record<FeatureFlagName, boolean>>} UserOverridesMap
 */
export type UserOverridesMap = Partial<Record<FeatureFlagName, boolean>>

/**
 * Feature flag with name attached (for iteration/display purposes)
 *
 * @interface FeatureFlagWithName
 * @extends FeatureFlagConfig
 * @property {FeatureFlagName} name - The flag's identifier
 */
export interface FeatureFlagWithName extends FeatureFlagConfig {
	name: FeatureFlagName
}

/**
 * Pinia store state shape
 *
 * @interface FeatureFlagState
 * @property {FeatureFlagsMap} flags - All feature flag configurations
 * @property {UserOverridesMap} userOverrides - Runtime user toggles (persisted to localStorage)
 */
interface FeatureFlagState {
	flags: FeatureFlagsMap
	userOverrides: UserOverridesMap
}

/**
 * Type predicate to check if a string is a valid FeatureFlagName
 * Provides runtime validation for type safety.
 *
 * @param {string} key - The key to validate
 * @param {FeatureFlagsMap} flags - The flags map to check against
 * @returns {boolean} True if key is a valid feature flag name
 */
function isFeatureFlagName(key: string, flags: FeatureFlagsMap): key is FeatureFlagName {
	return key in flags
}

/**
 * Feature Flag Pinia Store
 *
 * Manages runtime feature toggles with environment variable initialization and localStorage persistence.
 * Provides centralized control over experimental features, integrations, and developer tools.
 *
 * Initialization flow:
 * 1. State initialized from VITE_FEATURE_* environment variables
 * 2. User overrides loaded from localStorage (if any)
 * 3. Hardware support checked for flags with requiresSupport=true
 * 4. Features enabled/disabled based on combined configuration
 *
 * Persistence:
 * - User overrides automatically saved to localStorage on change
 * - Overrides take precedence over environment variable defaults
 * - Can reset individual flags or all flags to defaults
 *
 * @example
 * // Basic usage
 * const store = useFeatureFlagStore();
 * store.loadOverrides(); // Load saved overrides from localStorage
 *
 * if (store.isEnabled('ndvi')) {
 *   // Show NDVI controls
 * }
 *
 * // Runtime toggle
 * store.setFlag('debugMode', true);
 *
 * // Category filtering
 * const graphicsFlags = store.flagsByCategory('graphics');
 *
 * // Hardware validation
 * store.checkHardwareSupport('hdrRendering', viewer.scene.highDynamicRangeSupported);
 */
export const useFeatureFlagStore = defineStore('featureFlags', {
	state: (): FeatureFlagState => ({
		// Initialize from env vars with runtime override capability
		flags: {
			// Data layers
			ndvi: {
				enabled: import.meta.env.VITE_FEATURE_NDVI !== 'false',
				label: 'NDVI Vegetation Index',
				description:
					'Normalized Difference Vegetation Index visualization for vegetation health analysis',
				category: 'data-layers',
				experimental: false,
			},
			floodLayers: {
				enabled: import.meta.env.VITE_FEATURE_FLOOD_LAYERS === 'true',
				label: 'Flood Risk Layers',
				description: 'SYKE flood risk data visualization',
				category: 'data-layers',
				experimental: true,
			},
			grid250m: {
				enabled: import.meta.env.VITE_FEATURE_250M_GRID !== 'false',
				label: '250m Socioeconomic Grid',
				description: 'Fine-grained socioeconomic data overlay at 250m resolution',
				category: 'data-layers',
				experimental: false,
			},
			treeCoverage: {
				enabled: import.meta.env.VITE_FEATURE_TREE_COVERAGE !== 'false',
				label: 'Tree Coverage Visualization',
				description: 'Display tree coverage and canopy data',
				category: 'data-layers',
				experimental: false,
			},
			landCover: {
				enabled: import.meta.env.VITE_FEATURE_LAND_COVER !== 'false',
				label: 'Land Cover Analysis',
				description: 'Land cover classification and analysis tools',
				category: 'data-layers',
				experimental: false,
			},

			// Graphics & Performance features
			hdrRendering: {
				enabled: import.meta.env.VITE_FEATURE_HDR === 'true',
				label: 'HDR Rendering',
				description: 'High Dynamic Range rendering for better lighting',
				category: 'graphics',
				experimental: true,
				requiresSupport: true,
			},
			ambientOcclusion: {
				enabled: import.meta.env.VITE_FEATURE_AO === 'true',
				label: 'Ambient Occlusion',
				description: 'Screen Space Ambient Occlusion for depth perception',
				category: 'graphics',
				experimental: true,
				requiresSupport: true,
			},
			msaaOptions: {
				enabled: import.meta.env.VITE_FEATURE_MSAA !== 'false',
				label: 'MSAA Anti-aliasing',
				description: 'Multi-Sample Anti-Aliasing options',
				category: 'graphics',
				experimental: false,
			},
			fxaaOptions: {
				enabled: import.meta.env.VITE_FEATURE_FXAA !== 'false',
				label: 'FXAA Anti-aliasing',
				description: 'Fast Approximate Anti-Aliasing',
				category: 'graphics',
				experimental: false,
			},
			requestRenderMode: {
				enabled: import.meta.env.VITE_FEATURE_REQUEST_RENDER === 'true',
				label: 'Request Render Mode',
				description: 'Performance optimization - only render when scene changes',
				category: 'graphics',
				experimental: true,
			},
			terrain3d: {
				enabled: import.meta.env.VITE_FEATURE_3D_TERRAIN !== 'false',
				label: '3D Terrain',
				description: 'Helsinki 3D terrain rendering',
				category: 'graphics',
				experimental: false,
			},
			viewportStreaming: {
				enabled: import.meta.env.VITE_FEATURE_VIEWPORT_STREAMING !== 'false',
				label: 'Viewport Streaming',
				description:
					'Load buildings based on viewport tiles instead of postal code boundaries for more efficient streaming',
				category: 'graphics',
				experimental: false,
			},

			// Analysis tools
			heatHistogram: {
				enabled: import.meta.env.VITE_FEATURE_HEAT_HISTOGRAM !== 'false',
				label: 'Heat Histogram Analysis',
				description: 'Temperature distribution histogram visualization',
				category: 'analysis',
				experimental: false,
			},
			buildingScatterPlot: {
				enabled: import.meta.env.VITE_FEATURE_BUILDING_SCATTER !== 'false',
				label: 'Building Scatter Plot',
				description: 'Building attribute correlation analysis',
				category: 'analysis',
				experimental: false,
			},
			coolingOptimizer: {
				enabled: import.meta.env.VITE_FEATURE_COOLING_OPTIMIZER !== 'false',
				label: 'Cooling Center Optimizer',
				description: 'Tool to optimize cooling center placement',
				category: 'analysis',
				experimental: false,
			},
			ndviAnalysis: {
				enabled: import.meta.env.VITE_FEATURE_NDVI_ANALYSIS !== 'false',
				label: 'NDVI Analysis Tools',
				description: 'Vegetation analysis and health monitoring',
				category: 'analysis',
				experimental: false,
			},
			socioeconomicViz: {
				enabled: import.meta.env.VITE_FEATURE_SOCIOECONOMIC !== 'false',
				label: 'Socioeconomic Visualizations',
				description: 'Demographic and economic data overlays',
				category: 'analysis',
				experimental: false,
			},

			// UI/UX features
			compactView: {
				enabled: import.meta.env.VITE_FEATURE_COMPACT_VIEW === 'true',
				label: 'Compact View Mode',
				description: 'Reduced UI elements for smaller screens',
				category: 'ui',
				experimental: false,
			},
			mobileOptimized: {
				enabled: import.meta.env.VITE_FEATURE_MOBILE_OPTIMIZED === 'true',
				label: 'Mobile Optimization',
				description: 'Touch-optimized controls and layouts',
				category: 'ui',
				experimental: true,
			},
			controlPanelDefault: {
				enabled: import.meta.env.VITE_FEATURE_CONTROL_PANEL_DEFAULT !== 'false',
				label: 'Control Panel Open by Default',
				description: 'Show control panel on load',
				category: 'ui',
				experimental: false,
			},
			dataSourceStatus: {
				enabled: import.meta.env.VITE_FEATURE_DATA_SOURCE_STATUS !== 'false',
				label: 'Data Source Status Indicators',
				description: 'Show connection status for data sources',
				category: 'ui',
				experimental: false,
			},
			loadingPerformanceInfo: {
				enabled: import.meta.env.VITE_FEATURE_LOADING_PERF === 'true',
				label: 'Loading Performance Info',
				description: 'Display detailed performance metrics during loading',
				category: 'ui',
				experimental: true,
			},
			backgroundPreload: {
				enabled: import.meta.env.VITE_FEATURE_BACKGROUND_PRELOAD === 'true',
				label: 'Background Data Preloading',
				description: 'Preload data in background for faster transitions',
				category: 'ui',
				experimental: true,
			},

			// Integration features
			sentryErrorTracking: {
				enabled:
					import.meta.env.VITE_SENTRY_DSN !== undefined && import.meta.env.VITE_SENTRY_DSN !== '',
				label: 'Sentry Error Tracking',
				description: 'Error monitoring and reporting via Sentry',
				category: 'integration',
				experimental: false,
			},
			digitransitIntegration: {
				enabled:
					import.meta.env.VITE_DIGITRANSIT_KEY !== undefined &&
					import.meta.env.VITE_DIGITRANSIT_KEY !== '',
				label: 'Digitransit Public Transport',
				description: 'Public transport route integration',
				category: 'integration',
				experimental: false,
			},
			backgroundMapProviders: {
				enabled: import.meta.env.VITE_FEATURE_BG_MAP_PROVIDERS !== 'false',
				label: 'Multiple Background Map Providers',
				description: 'Switch between different base map providers',
				category: 'integration',
				experimental: false,
			},

			// Developer features
			debugMode: {
				enabled: import.meta.env.MODE === 'development',
				label: 'Debug Mode',
				description: 'Enable debug logging and developer tools',
				category: 'developer',
				experimental: false,
			},
			performanceMonitoring: {
				enabled: import.meta.env.VITE_FEATURE_PERF_MONITOR === 'true',
				label: 'Performance Monitoring',
				description: 'Real-time performance metrics and profiling',
				category: 'developer',
				experimental: false,
			},
			cacheVisualization: {
				enabled: import.meta.env.VITE_FEATURE_CACHE_VIZ === 'true',
				label: 'Cache Visualization',
				description: 'Visualize data cache status and usage',
				category: 'developer',
				experimental: true,
			},
			healthChecks: {
				enabled: import.meta.env.VITE_FEATURE_HEALTH_CHECKS === 'true',
				label: 'Health Checks Display',
				description: 'Show system health check results',
				category: 'developer',
				experimental: true,
			},
		},

		// User overrides (stored in localStorage)
		userOverrides: {},
	}),

	getters: {
		/**
		 * Check if a feature flag is enabled
		 * User overrides take precedence over default flag values.
		 *
		 * @param {Object} state - Pinia state
		 * @returns {(flagName: FeatureFlagName) => boolean} Function that returns true if flag is enabled
		 *
		 * @example
		 * if (store.isEnabled('ndvi')) {
		 *   // Show NDVI controls
		 * }
		 */
		isEnabled:
			(state) =>
			(flagName: FeatureFlagName): boolean => {
				// Check user override first
				if (state.userOverrides[flagName] !== undefined) {
					return state.userOverrides[flagName]!
				}

				// Fall back to default flag value
				return state.flags[flagName]?.enabled ?? false
			},

		/**
		 * Get all flags in a specific category
		 * Useful for building category-based settings panels.
		 *
		 * @param {Object} state - Pinia state
		 * @returns {(category: FeatureFlagCategory) => FeatureFlagWithName[]} Function that returns array of flags in category
		 *
		 * @example
		 * const graphicsFlags = store.flagsByCategory('graphics');
		 * graphicsFlags.forEach(flag => {
		 *   console.log(flag.name, flag.label, flag.enabled);
		 * });
		 */
		flagsByCategory:
			(state) =>
			(category: FeatureFlagCategory): FeatureFlagWithName[] => {
				return Object.entries(state.flags)
					.filter(
						([name, flag]) => isFeatureFlagName(name, state.flags) && flag.category === category
					)
					.map(([name, flag]) => ({ name, ...flag }))
			},

		/**
		 * Get all experimental flags
		 * Returns flags marked as experimental, useful for showing beta feature warnings.
		 *
		 * @param {Object} state - Pinia state
		 * @returns {FeatureFlagWithName[]} Array of experimental flags
		 *
		 * @example
		 * const betaFeatures = store.experimentalFlags;
		 * if (betaFeatures.some(f => store.isEnabled(f.name))) {
		 *   showExperimentalWarning();
		 * }
		 */
		experimentalFlags: (state): FeatureFlagWithName[] => {
			return Object.entries(state.flags)
				.filter(([name, flag]) => isFeatureFlagName(name, state.flags) && flag.experimental)
				.map(([name, flag]) => ({ name, ...flag }))
		},

		/**
		 * Get all available categories
		 * Returns sorted list of all unique categories in the feature flag system.
		 *
		 * @param {Object} state - Pinia state
		 * @returns {FeatureFlagCategory[]} Sorted array of category names
		 *
		 * @example
		 * const categories = store.categories;
		 * // ['analysis', 'data-layers', 'developer', 'graphics', 'integration', 'ui']
		 */
		categories: (state): FeatureFlagCategory[] => {
			const cats = new Set<FeatureFlagCategory>()
			Object.values(state.flags).forEach((flag) => {
				cats.add(flag.category)
			})
			return Array.from(cats).sort()
		},

		/**
		 * Get count of enabled flags
		 * Counts flags considering both default values and user overrides.
		 *
		 * @param {Object} state - Pinia state
		 * @returns {number} Number of currently enabled flags
		 *
		 * @example
		 * console.log(`${store.enabledCount} of ${Object.keys(store.flags).length} features enabled`);
		 */
		enabledCount: (state): number => {
			return (Object.keys(state.flags) as FeatureFlagName[]).filter((name) => {
				if (state.userOverrides[name] !== undefined) {
					return state.userOverrides[name]
				}
				return state.flags[name]?.enabled ?? false
			}).length
		},

		/**
		 * Check if a flag has been overridden by the user
		 * Useful for UI to show which flags differ from defaults.
		 *
		 * @param {Object} state - Pinia state
		 * @returns {(flagName: FeatureFlagName) => boolean} Function that returns true if flag has user override
		 *
		 * @example
		 * if (store.hasOverride('debugMode')) {
		 *   // Show "reset to default" button
		 * }
		 */
		hasOverride:
			(state) =>
			(flagName: FeatureFlagName): boolean => {
				return state.userOverrides[flagName] !== undefined
			},
	},

	actions: {
		/**
		 * Set a feature flag state at runtime
		 * Creates a user override and persists to localStorage.
		 *
		 * @param {FeatureFlagName} flagName - Name of the feature flag
		 * @param {boolean} enabled - True to enable, false to disable
		 *
		 * @example
		 * store.setFlag('debugMode', true);
		 * // Flag is now enabled and saved to localStorage
		 */
		setFlag(flagName: FeatureFlagName, enabled: boolean): void {
			if (this.flags[flagName]) {
				this.userOverrides[flagName] = enabled
				this.persistOverrides()
			}
		},

		/**
		 * Reset a feature flag to its default value
		 * Removes user override and persists change to localStorage.
		 *
		 * @param {FeatureFlagName} flagName - Name of the feature flag
		 *
		 * @example
		 * store.resetFlag('debugMode');
		 * // Flag now uses environment variable default
		 */
		resetFlag(flagName: FeatureFlagName): void {
			delete this.userOverrides[flagName]
			this.persistOverrides()
		},

		/**
		 * Reset all feature flags to default values
		 * Clears all user overrides and persists to localStorage.
		 *
		 * @example
		 * store.resetAllFlags();
		 * // All flags now use environment variable defaults
		 */
		resetAllFlags(): void {
			this.userOverrides = {}
			this.persistOverrides()
		},

		/**
		 * Persist user overrides to localStorage
		 * Automatically called by setFlag/resetFlag actions.
		 *
		 * @private
		 */
		persistOverrides(): void {
			try {
				localStorage.setItem('featureFlags', JSON.stringify(this.userOverrides))
			} catch (error) {
				console.warn('Failed to persist feature flag overrides:', error)
			}
		},

		/**
		 * Load user overrides from localStorage
		 * Should be called during application initialization.
		 *
		 * @example
		 * const store = useFeatureFlagStore();
		 * store.loadOverrides(); // Restore saved user preferences
		 */
		loadOverrides(): void {
			try {
				const stored = localStorage.getItem('featureFlags')
				if (stored) {
					this.userOverrides = JSON.parse(stored) as UserOverridesMap
				}
			} catch (error) {
				console.warn('Failed to load feature flag overrides:', error)
			}
		},

		/**
		 * Check hardware support for a feature and disable if not supported
		 * For flags with requiresSupport=true, validates hardware capability.
		 *
		 * @param {FeatureFlagName} flagName - Name of the feature flag
		 * @param {boolean} isSupported - True if hardware supports the feature
		 *
		 * @example
		 * const viewer = new Cesium.Viewer(...);
		 * store.checkHardwareSupport('hdrRendering', viewer.scene.highDynamicRangeSupported);
		 * store.checkHardwareSupport('ambientOcclusion', viewer.scene.postProcessStages.ambientOcclusion);
		 */
		checkHardwareSupport(flagName: FeatureFlagName, isSupported: boolean): void {
			const flag = this.flags[flagName]
			if (flag?.requiresSupport && !isSupported) {
				this.flags[flagName].enabled = false
				console.info(`Feature '${flagName}' disabled: hardware not supported`)
			}
		},

		/**
		 * Get feature flag metadata
		 * Returns the full configuration object for a flag.
		 *
		 * @param {FeatureFlagName} flagName - Name of the feature flag
		 * @returns {FeatureFlagConfig | null} Flag configuration or null if not found
		 *
		 * @example
		 * const metadata = store.getFlagMetadata('ndvi');
		 * console.log(metadata.label, metadata.description, metadata.category);
		 */
		getFlagMetadata(flagName: FeatureFlagName): FeatureFlagConfig | null {
			return this.flags[flagName] || null
		},

		/**
		 * Export current configuration as JSON
		 * Returns effective state (defaults + overrides) for all flags.
		 *
		 * @returns {Record<FeatureFlagName, boolean>} Complete flag state map
		 *
		 * @example
		 * const config = store.exportConfig();
		 * // Save to file or send to server
		 * downloadJSON(config, 'feature-flags.json');
		 */
		exportConfig(): Record<FeatureFlagName, boolean> {
			const config: Partial<Record<FeatureFlagName, boolean>> = {}
			;(Object.keys(this.flags) as FeatureFlagName[]).forEach((name) => {
				config[name] = this.isEnabled(name)
			})
			return config as Record<FeatureFlagName, boolean>
		},

		/**
		 * Import configuration from JSON
		 * Sets user overrides based on imported configuration.
		 * Validates flag names and value types before importing.
		 *
		 * @param {Partial<Record<FeatureFlagName, boolean>>} config - Configuration to import
		 *
		 * @example
		 * const config = await fetch('/api/feature-flags').then(r => r.json());
		 * store.importConfig(config);
		 * // User overrides updated and persisted
		 */
		importConfig(config: Partial<Record<FeatureFlagName, boolean>>): void {
			Object.entries(config).forEach(([name, enabled]) => {
				const flagName = name as FeatureFlagName
				if (this.flags[flagName] && typeof enabled === 'boolean') {
					this.setFlag(flagName, enabled)
				} else if (!this.flags[flagName]) {
					console.warn(`Unknown feature flag "${name}" in imported configuration`)
				} else if (typeof enabled !== 'boolean') {
					console.warn(
						`Invalid value for feature flag "${name}": expected boolean, got ${typeof enabled}`
					)
				}
			})
		},
	},
})
