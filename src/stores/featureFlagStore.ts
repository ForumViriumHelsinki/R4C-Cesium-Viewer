import { defineStore } from 'pinia';

/**
 * Feature flag category types
 */
export type FeatureFlagCategory =
	| 'data-layers'
	| 'graphics'
	| 'analysis'
	| 'ui'
	| 'integration'
	| 'developer';

/**
 * Feature flag names
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
	| 'healthChecks';

/**
 * Feature flag configuration
 */
export interface FeatureFlagConfig {
	enabled: boolean;
	category: FeatureFlagCategory;
	label: string;
	description: string;
	experimental?: boolean;
	requiresSupport?: boolean;
}

/**
 * Feature flags map
 */
export type FeatureFlagsMap = Record<FeatureFlagName, FeatureFlagConfig>;

/**
 * User overrides map
 */
export type UserOverridesMap = Partial<Record<FeatureFlagName, boolean>>;

/**
 * Feature flag with name
 */
export interface FeatureFlagWithName extends FeatureFlagConfig {
	name: FeatureFlagName;
}

/**
 * Store state
 */
interface FeatureFlagState {
	flags: FeatureFlagsMap;
	userOverrides: UserOverridesMap;
}

/**
 * Type predicate to check if a string is a valid FeatureFlagName
 * Provides runtime validation for type safety
 */
function isFeatureFlagName(key: string, flags: FeatureFlagsMap): key is FeatureFlagName {
	return key in flags;
}

/**
 * Feature Flag Store
 *
 * Manages feature flags with runtime toggling capability.
 * Flags can be initialized from environment variables and overridden at runtime.
 * User overrides are persisted to localStorage.
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
		 */
		isEnabled:
			(state) =>
			(flagName: FeatureFlagName): boolean => {
				// Check user override first
				if (state.userOverrides[flagName] !== undefined) {
					return state.userOverrides[flagName]!;
				}

				// Fall back to default flag value
				return state.flags[flagName]?.enabled ?? false;
			},

		/**
		 * Get all flags in a specific category
		 */
		flagsByCategory:
			(state) =>
			(category: FeatureFlagCategory): FeatureFlagWithName[] => {
				return Object.entries(state.flags)
					.filter(
						([name, flag]) => isFeatureFlagName(name, state.flags) && flag.category === category
					)
					.map(([name, flag]) => ({ name, ...flag }));
			},

		/**
		 * Get all experimental flags
		 */
		experimentalFlags: (state): FeatureFlagWithName[] => {
			return Object.entries(state.flags)
				.filter(([name, flag]) => isFeatureFlagName(name, state.flags) && flag.experimental)
				.map(([name, flag]) => ({ name, ...flag }));
		},

		/**
		 * Get all available categories
		 */
		categories: (state): FeatureFlagCategory[] => {
			const cats = new Set<FeatureFlagCategory>();
			Object.values(state.flags).forEach((flag) => {
				cats.add(flag.category);
			});
			return Array.from(cats).sort();
		},

		/**
		 * Get count of enabled flags
		 */
		enabledCount: (state): number => {
			return (Object.keys(state.flags) as FeatureFlagName[]).filter((name) => {
				if (state.userOverrides[name] !== undefined) {
					return state.userOverrides[name];
				}
				return state.flags[name]?.enabled ?? false;
			}).length;
		},

		/**
		 * Check if a flag has been overridden by the user
		 */
		hasOverride:
			(state) =>
			(flagName: FeatureFlagName): boolean => {
				return state.userOverrides[flagName] !== undefined;
			},
	},

	actions: {
		/**
		 * Set a feature flag state
		 */
		setFlag(flagName: FeatureFlagName, enabled: boolean): void {
			if (this.flags[flagName]) {
				this.userOverrides[flagName] = enabled;
				this.persistOverrides();
			}
		},

		/**
		 * Reset a feature flag to its default value
		 */
		resetFlag(flagName: FeatureFlagName): void {
			delete this.userOverrides[flagName];
			this.persistOverrides();
		},

		/**
		 * Reset all feature flags to default values
		 */
		resetAllFlags(): void {
			this.userOverrides = {};
			this.persistOverrides();
		},

		/**
		 * Persist user overrides to localStorage
		 */
		persistOverrides(): void {
			try {
				localStorage.setItem('featureFlags', JSON.stringify(this.userOverrides));
			} catch (error) {
				console.warn('Failed to persist feature flag overrides:', error);
			}
		},

		/**
		 * Load user overrides from localStorage
		 */
		loadOverrides(): void {
			try {
				const stored = localStorage.getItem('featureFlags');
				if (stored) {
					this.userOverrides = JSON.parse(stored) as UserOverridesMap;
				}
			} catch (error) {
				console.warn('Failed to load feature flag overrides:', error);
			}
		},

		/**
		 * Check hardware support for a feature and disable if not supported
		 */
		checkHardwareSupport(flagName: FeatureFlagName, isSupported: boolean): void {
			const flag = this.flags[flagName];
			if (flag && flag.requiresSupport && !isSupported) {
				this.flags[flagName].enabled = false;
				console.info(`Feature '${flagName}' disabled: hardware not supported`);
			}
		},

		/**
		 * Get feature flag metadata
		 */
		getFlagMetadata(flagName: FeatureFlagName): FeatureFlagConfig | null {
			return this.flags[flagName] || null;
		},

		/**
		 * Export current configuration as JSON
		 */
		exportConfig(): Record<FeatureFlagName, boolean> {
			const config: Partial<Record<FeatureFlagName, boolean>> = {};
			(Object.keys(this.flags) as FeatureFlagName[]).forEach((name) => {
				config[name] = this.isEnabled(name);
			});
			return config as Record<FeatureFlagName, boolean>;
		},

		/**
		 * Import configuration from JSON
		 */
		importConfig(config: Partial<Record<FeatureFlagName, boolean>>): void {
			Object.entries(config).forEach(([name, enabled]) => {
				const flagName = name as FeatureFlagName;
				if (this.flags[flagName] && typeof enabled === 'boolean') {
					this.setFlag(flagName, enabled);
				} else if (!this.flags[flagName]) {
					console.warn(`Unknown feature flag "${name}" in imported configuration`);
				} else if (typeof enabled !== 'boolean') {
					console.warn(
						`Invalid value for feature flag "${name}": expected boolean, got ${typeof enabled}`
					);
				}
			});
		},
	},
});
