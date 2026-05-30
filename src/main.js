import * as Sentry from '@sentry/vue'
import { createSentryPiniaPlugin } from '@sentry/vue'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import './version.js' // Log version info to console
import { useBuildingStore } from './stores/buildingStore.js'
import { useFeatureFlagStore } from './stores/featureFlagStore.ts'
import { useGlobalStore } from './stores/globalStore.js'
import { useToggleStore } from './stores/toggleStore.js'
import logger from './utils/logger.js'
import { installPreloadErrorHandler } from './utils/preloadErrorHandler.js'

// Install the global vite:preloadError handler before any dynamic imports
// can run, so stale-chunk failures after a deploy trigger a reload rather
// than a hard crash. See issue #740.
installPreloadErrorHandler()

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { md1 } from 'vuetify/blueprints'
import { version } from '../package.json'
// Custom SVG iconset: ships only the ~81 icons we use as inline @mdi/js paths
// instead of the render-blocking Material Design Icons webfont (#821).
import { aliases, mdi } from './plugins/mdiIconset.js'

// If you're using one of our framework SDK packages, like `@sentry/react`,
// substitute its name for `@sentry/browser` here

// Vuetify configuration - components are auto-imported via vite-plugin-vuetify
const vuetify = createVuetify({
	blueprint: md1,
	theme: {
		defaultTheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
		themes: {
			light: {
				// MD1 defaults are fine, no overrides needed
			},
			dark: {
				colors: {
					surface: '#1e1e2e',
					background: '#121212',
					'surface-variant': '#e0e0e0',
					'on-surface-variant': '#1e1e2e',
				},
			},
		},
	},
	defaults: {
		VCard: { elevation: 2 },
		VTextField: { density: 'compact', variant: 'outlined' },
		VSelect: { density: 'compact', variant: 'outlined' },
		VSlider: { color: 'primary' },
		VTooltip: { location: 'bottom' },
	},
	icons: {
		defaultSet: 'mdi',
		aliases,
		sets: {
			mdi,
		},
	},
})

const pinia = createPinia()
pinia.use(
	createSentryPiniaPlugin({
		// Exclude Cesium objects from Sentry state capture to prevent DataCloneError
		// Cesium objects contain non-serializable properties (functions, circular refs, getters)
		// that cannot be cloned for postMessage() calls to Sentry servers
		stateTransformer: (state, store) => {
			// For propsStore, exclude Cesium entity/datasource properties that remain on the store
			if (store.$id === 'props') {
				const {
					postalCodeData: _postalCodeData,
					heatFloodVulnerabilityEntity: _heatFloodVulnerabilityEntity,
					...serializable
				} = state
				return serializable
			}

			// For globalStore, exclude Cesium viewer and entity references
			if (store.$id === 'global') {
				const {
					cesiumViewer: _cesiumViewer,
					currentGridCell: _currentGridCell,
					pickedEntity: _pickedEntity,
					...serializable
				} = state
				return serializable
			}

			// For backgroundMapStore, exclude Cesium imagery layer objects
			if (store.$id === 'backgroundMap') {
				const {
					floodLayers: _floodLayers,
					landcoverLayers: _landcoverLayers,
					tiffLayers: _tiffLayers,
					hSYWMSLayers: _hSYWMSLayers,
					...serializable
				} = state
				return serializable
			}

			// For all other stores, return state as-is
			return state
		},
	})
)

const app = createApp(App)

if (import.meta.env.VITE_SENTRY_DSN) {
	Sentry.init({
		app,
		dsn: import.meta.env.VITE_SENTRY_DSN,
		environment: import.meta.env.MODE,
		release: `r4c-cesium-viewer@${version}`,

		integrations: [
			Sentry.browserTracingIntegration(),
			Sentry.replayIntegration(),
			// Note: replayCanvasIntegration removed - incompatible with CesiumJS WebGL
			// Canvas replay captures every frame, causing 30-40s of main thread blocking
			// Session replay still works for DOM elements; only canvas content is excluded
		],

		// Sample error events - full capture in dev, 20% in production
		sampleRate: import.meta.env.PROD ? 0.2 : 1.0,

		// We recommend adjusting this value in production, or using tracesSampler
		// for finer control
		tracesSampleRate: 1.0,

		// Set `tracePropagationTargets` to control for which URLs trace propagation should be enabled
		tracePropagationTargets: [
			'localhost',
			/^https:\/\/r4c\.dataportal\.fi/,
			/^https:\/\/r4c\.dev\.dataportal\.fi/,
		],

		// Capture Replay for 10% of all sessions,
		// plus for 100% of sessions with an error
		replaysSessionSampleRate: 0.1,
		replaysOnErrorSampleRate: 1.0,

		// CPU profiling: 10% in production (minimal overhead), 100% in dev
		profilesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
	})

	logger.debug('Sentry configuration:', {
		environment: import.meta.env.MODE,
		release: `r4c-cesium-viewer@${version}`,
	})
} else {
	logger.info('Sentry: DSN not configured, error monitoring disabled')
}

app.use(pinia)
app.use(vuetify)

// Expose store instances to window for E2E testing
// Must be done BEFORE mounting so the store is available when components initialize
if (import.meta.env.MODE === 'development' || import.meta.env.MODE === 'test') {
	// Initialize the stores and expose the instances
	const globalStore = useGlobalStore()
	window.globalStore = globalStore
	// Also expose the function for backwards compatibility
	window.useGlobalStore = () => globalStore

	const buildingStore = useBuildingStore()
	window.buildingStore = buildingStore
	window.useBuildingStore = () => buildingStore

	const toggleStore = useToggleStore()
	window.toggleStore = toggleStore
	window.useToggleStore = () => toggleStore

	const featureFlagStore = useFeatureFlagStore()
	window.featureFlagStore = featureFlagStore
	window.useFeatureFlagStore = () => featureFlagStore
}

app.mount('#app')
