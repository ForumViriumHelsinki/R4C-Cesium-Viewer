import * as Sentry from '@sentry/vue'
import { createSentryPiniaPlugin } from '@sentry/vue'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import './version.js' // Log version info to console
import { useGlobalStore } from './stores/globalStore.js'
import logger from './utils/logger.js'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { md1 } from 'vuetify/blueprints'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

import { version } from '../package.json'

// If you're using one of our framework SDK packages, like `@sentry/react`,
// substitute its name for `@sentry/browser` here

// Vuetify configuration - components are auto-imported via vite-plugin-vuetify
const vuetify = createVuetify({
	blueprint: md1,
	icons: {
		defaultSet: 'mdi',
		aliases,
		sets: {
			mdi,
		},
	},
})

const pinia = createPinia()

// Configuration: Non-serializable Cesium objects to exclude from Sentry state capture
// These objects contain functions, circular references, getters, and WebGL contexts
// that cannot be cloned by the structured clone algorithm used in postMessage()
const nonSerializableKeysByStore = {
	props: [
		'treeEntities', // Cesium entity collection
		'buildingsDatasource', // Cesium data source
		'postalCodeData', // Contains Cesium entities
		'heatFloodVulnerabilityEntity', // Cesium entity
	],
	global: [
		'cesiumViewer', // Cesium Viewer instance (contains WebGL context)
		'currentGridCell', // Cesium entity reference
		'pickedEntity', // Cesium entity reference
	],
	backgroundMap: [
		'floodLayers', // Array of Cesium ImageryLayer objects
		'landcoverLayers', // Array of Cesium ImageryLayer objects
		'tiffLayers', // Array of Cesium ImageryLayer objects
		'hSYWMSLayers', // Array of Cesium ImageryLayer objects
	],
}

pinia.use(
	createSentryPiniaPlugin({
		stateTransformer: (state, store) => {
			const keysToOmit = nonSerializableKeysByStore[store.$id]
			if (!keysToOmit) {
				return state // Return state as-is for stores without filtering config
			}

			// Filter out non-serializable keys
			const serializableState = { ...state }
			for (const key of keysToOmit) {
				delete serializableState[key]
			}
			return serializableState
		},
	})
)

const app = createApp(App)

Sentry.init({
	app,
	// debug: true,
	// Passing in `Vue` is optional, if you do not pass it `window.Vue` must be present.
	// Vue: Vue,
	dsn: import.meta.env.VITE_SENTRY_DSN,
	environment: import.meta.env.MODE,
	release: `r4c-cesium-viewer@${version}`,

	// This enables automatic instrumentation (highly recommended),
	// but is not necessary for purely manual usage
	// If you only want to use custom instrumentation:
	// * Remove the `BrowserTracing` integration
	// * add `Sentry.addTracingExtensions()` above your Sentry.init() call
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

// Log Sentry configuration in development only (security: avoid exposing DSN)
logger.debug('Sentry configuration:', {
	environment: import.meta.env.MODE,
	release: `r4c-cesium-viewer@${version}`,
	dsnConfigured: !!import.meta.env.VITE_SENTRY_DSN,
})

app.use(pinia)
app.use(vuetify)

// Expose store instance to window for E2E testing
// Must be done BEFORE mounting so the store is available when components initialize
if (import.meta.env.MODE === 'development' || import.meta.env.MODE === 'test') {
	// Initialize the store and expose the instance
	const globalStore = useGlobalStore()
	window.globalStore = globalStore
	// Also expose the function for backwards compatibility
	window.useGlobalStore = () => globalStore
}

app.mount('#app')
