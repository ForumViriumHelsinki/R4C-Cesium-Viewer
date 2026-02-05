/**
 * Static flag metadata registry.
 * Maps internal flag names to GOFF flag IDs and stores display metadata.
 * This file is the single source of truth for flag definitions.
 */

export type FeatureFlagCategory =
	| 'data-layers'
	| 'graphics'
	| 'analysis'
	| 'ui'
	| 'integration'
	| 'developer'

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
	| 'predictivePrefetch'
	// Analysis tools
	| 'heatHistogram'
	| 'buildingScatterPlot'
	| 'coolingOptimizer'
	| 'ndviAnalysis'
	| 'socioeconomicViz'
	// UI/UX
	| 'controlPanelDefault'
	| 'dataSourceStatus'
	| 'loadingPerformanceInfo'
	| 'backgroundPreload'
	| 'mapClickLoadingOverlay'
	// Integration
	| 'sentryErrorTracking'
	| 'digitransitIntegration'
	| 'backgroundMapProviders'
	// Developer
	| 'debugMode'
	| 'cacheVisualization'
	| 'healthChecks'
	// Panel visibility
	| 'showFeaturePanel'

export interface FlagMetadata {
	/** GOFF flag ID (r4c- prefixed, kebab-case) */
	goffId: string
	label: string
	description: string
	category: FeatureFlagCategory
	experimental: boolean
	/** If true, requires hardware/browser support validation client-side */
	requiresSupport: boolean
	/** Default value when GOFF is unavailable (InMemoryProvider fallback) */
	fallbackDefault: boolean
}

export type FlagMetadataMap = Record<FeatureFlagName, FlagMetadata>

/**
 * Complete registry of all feature flags with their metadata.
 * The goffId field maps to the flag name in the GOFF ConfigMap.
 */
export const FLAG_METADATA: FlagMetadataMap = {
	// Data layers
	ndvi: {
		goffId: 'r4c-ndvi',
		label: 'NDVI Vegetation Index',
		description:
			'Normalized Difference Vegetation Index visualization for vegetation health analysis',
		category: 'data-layers',
		experimental: false,
		requiresSupport: false,
		fallbackDefault: true,
	},
	floodLayers: {
		goffId: 'r4c-flood-layers',
		label: 'Flood Risk Layers',
		description: 'SYKE flood risk data visualization',
		category: 'data-layers',
		experimental: true,
		requiresSupport: false,
		fallbackDefault: false,
	},
	grid250m: {
		goffId: 'r4c-grid-250m',
		label: '250m Socioeconomic Grid',
		description: 'Fine-grained socioeconomic data overlay at 250m resolution',
		category: 'data-layers',
		experimental: false,
		requiresSupport: false,
		fallbackDefault: true,
	},
	treeCoverage: {
		goffId: 'r4c-tree-coverage',
		label: 'Tree Coverage Visualization',
		description: 'Display tree coverage and canopy data',
		category: 'data-layers',
		experimental: false,
		requiresSupport: false,
		fallbackDefault: true,
	},
	landCover: {
		goffId: 'r4c-land-cover',
		label: 'Land Cover Analysis',
		description: 'Land cover classification and analysis tools',
		category: 'data-layers',
		experimental: false,
		requiresSupport: false,
		fallbackDefault: true,
	},

	// Graphics & Performance
	hdrRendering: {
		goffId: 'r4c-hdr-rendering',
		label: 'HDR Rendering',
		description: 'High Dynamic Range rendering for better lighting',
		category: 'graphics',
		experimental: true,
		requiresSupport: true,
		fallbackDefault: false,
	},
	ambientOcclusion: {
		goffId: 'r4c-ambient-occlusion',
		label: 'Ambient Occlusion',
		description: 'Screen Space Ambient Occlusion for depth perception',
		category: 'graphics',
		experimental: true,
		requiresSupport: true,
		fallbackDefault: false,
	},
	msaaOptions: {
		goffId: 'r4c-msaa-options',
		label: 'MSAA Anti-aliasing',
		description: 'Multi-Sample Anti-Aliasing options',
		category: 'graphics',
		experimental: false,
		requiresSupport: false,
		fallbackDefault: true,
	},
	fxaaOptions: {
		goffId: 'r4c-fxaa-options',
		label: 'FXAA Anti-aliasing',
		description: 'Fast Approximate Anti-Aliasing',
		category: 'graphics',
		experimental: false,
		requiresSupport: false,
		fallbackDefault: true,
	},
	requestRenderMode: {
		goffId: 'r4c-request-render-mode',
		label: 'Request Render Mode',
		description: 'Performance optimization - only render when scene changes',
		category: 'graphics',
		experimental: true,
		requiresSupport: false,
		fallbackDefault: false,
	},
	terrain3d: {
		goffId: 'r4c-terrain-3d',
		label: '3D Terrain',
		description: 'Helsinki 3D terrain rendering',
		category: 'graphics',
		experimental: false,
		requiresSupport: false,
		fallbackDefault: true,
	},
	viewportStreaming: {
		goffId: 'r4c-viewport-streaming',
		label: 'Viewport Streaming',
		description: 'Load buildings based on viewport tiles for more efficient streaming',
		category: 'graphics',
		experimental: false,
		requiresSupport: false,
		fallbackDefault: true,
	},
	predictivePrefetch: {
		goffId: 'r4c-predictive-prefetch',
		label: 'Predictive Prefetching',
		description: 'Prefetch adjacent tiles during idle time for instant display when panning',
		category: 'graphics',
		experimental: true,
		requiresSupport: false,
		fallbackDefault: false,
	},

	// Analysis tools
	heatHistogram: {
		goffId: 'r4c-heat-histogram',
		label: 'Heat Histogram Analysis',
		description: 'Temperature distribution histogram visualization',
		category: 'analysis',
		experimental: false,
		requiresSupport: false,
		fallbackDefault: true,
	},
	buildingScatterPlot: {
		goffId: 'r4c-building-scatter-plot',
		label: 'Building Scatter Plot',
		description: 'Building attribute correlation analysis',
		category: 'analysis',
		experimental: false,
		requiresSupport: false,
		fallbackDefault: true,
	},
	coolingOptimizer: {
		goffId: 'r4c-cooling-optimizer',
		label: 'Cooling Center Optimizer',
		description: 'Tool to optimize cooling center placement',
		category: 'analysis',
		experimental: false,
		requiresSupport: false,
		fallbackDefault: true,
	},
	ndviAnalysis: {
		goffId: 'r4c-ndvi-analysis',
		label: 'NDVI Analysis Tools',
		description: 'Vegetation analysis and health monitoring',
		category: 'analysis',
		experimental: false,
		requiresSupport: false,
		fallbackDefault: true,
	},
	socioeconomicViz: {
		goffId: 'r4c-socioeconomic-viz',
		label: 'Socioeconomic Visualizations',
		description: 'Demographic and economic data overlays',
		category: 'analysis',
		experimental: false,
		requiresSupport: false,
		fallbackDefault: true,
	},

	// UI/UX
	controlPanelDefault: {
		goffId: 'r4c-control-panel-default',
		label: 'Control Panel Open by Default',
		description: 'Show control panel on load',
		category: 'ui',
		experimental: false,
		requiresSupport: false,
		fallbackDefault: true,
	},
	dataSourceStatus: {
		goffId: 'r4c-data-source-status',
		label: 'Data Source Status Indicators',
		description: 'Show connection status for data sources',
		category: 'ui',
		experimental: false,
		requiresSupport: false,
		fallbackDefault: true,
	},
	loadingPerformanceInfo: {
		goffId: 'r4c-loading-performance-info',
		label: 'Loading Performance Info',
		description: 'Display detailed performance metrics during loading',
		category: 'ui',
		experimental: true,
		requiresSupport: false,
		fallbackDefault: false,
	},
	backgroundPreload: {
		goffId: 'r4c-background-preload',
		label: 'Background Data Preloading',
		description: 'Preload data in background for faster transitions',
		category: 'ui',
		experimental: true,
		requiresSupport: false,
		fallbackDefault: false,
	},
	mapClickLoadingOverlay: {
		goffId: 'r4c-map-click-loading-overlay',
		label: 'Map Click Loading Overlay',
		description: 'Show loading overlay with progress when navigating to postal codes',
		category: 'ui',
		experimental: false,
		requiresSupport: false,
		fallbackDefault: false,
	},

	// Integration
	sentryErrorTracking: {
		goffId: 'r4c-sentry-error-tracking',
		label: 'Sentry Error Tracking',
		description: 'Error monitoring and reporting via Sentry',
		category: 'integration',
		experimental: false,
		requiresSupport: false,
		// Sentry is enabled when DSN is configured
		fallbackDefault:
			import.meta.env.VITE_SENTRY_DSN !== undefined && import.meta.env.VITE_SENTRY_DSN !== '',
	},
	digitransitIntegration: {
		goffId: 'r4c-digitransit-integration',
		label: 'Digitransit Public Transport',
		description: 'Public transport route integration',
		category: 'integration',
		experimental: false,
		requiresSupport: false,
		// Digitransit is enabled when API key is configured
		fallbackDefault:
			import.meta.env.VITE_DIGITRANSIT_KEY !== undefined &&
			import.meta.env.VITE_DIGITRANSIT_KEY !== '',
	},
	backgroundMapProviders: {
		goffId: 'r4c-background-map-providers',
		label: 'Multiple Background Map Providers',
		description: 'Switch between different base map providers',
		category: 'integration',
		experimental: false,
		requiresSupport: false,
		fallbackDefault: true,
	},

	// Developer
	debugMode: {
		goffId: 'r4c-debug-mode',
		label: 'Debug Mode',
		description: 'Enable debug logging and developer tools',
		category: 'developer',
		experimental: false,
		requiresSupport: false,
		fallbackDefault: import.meta.env.MODE === 'development',
	},
	cacheVisualization: {
		goffId: 'r4c-cache-visualization',
		label: 'Cache Visualization',
		description: 'Visualize data cache status and usage',
		category: 'developer',
		experimental: true,
		requiresSupport: false,
		fallbackDefault: false,
	},
	healthChecks: {
		goffId: 'r4c-health-checks',
		label: 'Health Checks Display',
		description: 'Show system health check results',
		category: 'developer',
		experimental: true,
		requiresSupport: false,
		fallbackDefault: false,
	},

	// Panel visibility
	showFeaturePanel: {
		goffId: 'r4c-show-feature-panel',
		label: 'Feature Flag Panel',
		description: 'Show the feature flag management panel in the toolbar',
		category: 'developer',
		experimental: false,
		requiresSupport: false,
		fallbackDefault: false,
	},
}

/** All flag names as an array for iteration */
export const ALL_FLAG_NAMES = Object.keys(FLAG_METADATA) as FeatureFlagName[]

/** Map from GOFF flag ID back to internal flag name */
export const GOFF_ID_TO_NAME: Record<string, FeatureFlagName> = Object.fromEntries(
	ALL_FLAG_NAMES.map((name) => [FLAG_METADATA[name].goffId, name])
) as Record<string, FeatureFlagName>

/** Category display labels */
export const CATEGORY_LABELS: Record<FeatureFlagCategory, string> = {
	'data-layers': 'Data Layers',
	graphics: 'Graphics & Performance',
	analysis: 'Analysis Tools',
	ui: 'UI & UX',
	integration: 'Integrations',
	developer: 'Developer Tools',
}

/** Category icons */
export const CATEGORY_ICONS: Record<FeatureFlagCategory, string> = {
	'data-layers': 'mdi-layers',
	graphics: 'mdi-chart-line',
	analysis: 'mdi-chart-box',
	ui: 'mdi-palette',
	integration: 'mdi-puzzle',
	developer: 'mdi-code-braces',
}
