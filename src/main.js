import { createApp } from 'vue';
import { createPinia } from 'pinia';
import * as Sentry from '@sentry/vue';
import { createSentryPiniaPlugin } from '@sentry/vue';
import App from './App.vue';

// Vuetify
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi';
import { md1 } from 'vuetify/blueprints';

import { version } from '../package.json';

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
});

const pinia = createPinia();
pinia.use(
	createSentryPiniaPlugin({
		// Exclude deprecated Cesium entity properties from Sentry state capture
		stateTransformer: (state, store) => {
			// For propsStore, exclude deprecated Cesium entity properties
			if (store.$id === 'props') {
				const {
					treeEntities,
					buildingsDatasource,
					postalCodeData,
					heatFloodVulnerabilityEntity,
					...serializable
				} = state;
				return serializable;
			}

			// For all other stores, return state as-is
			return state;
		},
	})
);

const app = createApp(App);

Sentry.init({
	app,
	// debug: true,
	// Passing in `Vue` is optional, if you do not pass it `window.Vue` must be present.
	// Vue: Vue,
	dsn: import.meta.env.VITE_SENTRY_DSN,
	environment: import.meta.env.MODE,
	release: 'r4c-cesium-viewer@' + version,

	// This enables automatic instrumentation (highly recommended),
	// but is not necessary for purely manual usage
	// If you only want to use custom instrumentation:
	// * Remove the `BrowserTracing` integration
	// * add `Sentry.addTracingExtensions()` above your Sentry.init() call
	integrations: [
		Sentry.browserTracingIntegration(),
		Sentry.replayIntegration(),
		Sentry.replayCanvasIntegration(),
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
});

console.log(`Sentry DSN: ${import.meta.env.VITE_SENTRY_DSN}`);
console.log(`Sentry environment: ${import.meta.env.MODE}`);
console.log(`Release: ${version}`);

app.use(pinia);
app.use(vuetify);
app.mount('#app');
