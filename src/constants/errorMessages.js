/**
 * @module constants/errorMessages
 * User-facing error copy, kept in one place so every entry point that can fail
 * the same way says the same thing (#1152, #1153).
 *
 * Convention: sentence case, "Unable to load <thing>." followed by the
 * consequence or the next step. Never show `error.message` to the user; pass it
 * as the technical context of `globalStore.showError()`, which logs it.
 *
 * Severity:
 * - `error` (`mdi-alert-circle`): an action the user asked for failed.
 * - `warning` (`mdi-alert-circle-outline`): the app keeps working with less data.
 */

/**
 * Messages for layers the user switches on, keyed by the loadingStore layer
 * name. `loadingStore.reportLayerFailure()` shows these through
 * `globalStore.showError()`, whichever tab switched the layer on.
 */
export const LAYER_FAILURE_MESSAGES = Object.freeze({
	trees: 'Unable to load trees. Please try again.',
	vegetation: 'Unable to load vegetation areas. Please try again.',
	otherNature: 'Unable to load nature areas. Please try again.',
	landcover: 'Unable to load land cover layer. Please try again.',
	ndvi: 'Unable to load NDVI vegetation data. Please try again.',
	statsGrid: 'Unable to load the statistical grid. Please try again.',
})

/** Fallback for a layer with no entry in LAYER_FAILURE_MESSAGES. */
export const GENERIC_LAYER_FAILURE_MESSAGE = 'Unable to load this layer. Please try again.'

/** Background data the app can run without; shown with severity `warning`. */
export const DEGRADED_DATA_MESSAGES = Object.freeze({
	socioeconomic: 'Unable to load socioeconomic data. Some features may be unavailable.',
	heatExposure: 'Unable to load heat exposure data. Some features may be unavailable.',
})

/** Viewport building streaming (ViewportLoadingIndicator, which has its own Retry). */
export const VIEWPORT_BUILDINGS_FAILURE_MESSAGE = 'Unable to load buildings for this view.'

/**
 * Viewer initialisation failure. The top snackbar in CesiumViewer.vue owns this
 * failure and offers Retry; the sidebar only shows a passive hint. After a module
 * load failure (`network`) Retry reloads the page, because an in-app retry cannot
 * re-import a failed chunk (#1040).
 */
export const VIEWER_INIT_MESSAGES = Object.freeze({
	title: 'Unable to load the map viewer',
	/** The Cesium chunk or a service module did not load. */
	network: 'Check your internet connection and try again.',
	/** `new Cesium.Viewer` threw, usually because WebGL is unavailable. */
	construction:
		'Your browser could not start 3D graphics (WebGL). Try again, or use another browser or device.',
	sidebarHint: 'Unable to load the map. Use Retry at the top of the screen.',
})

/** Create Parks (LandcoverToParks.vue). */
export const PARKS_MESSAGES = Object.freeze({
	noConvertibleLandcover: 'This grid cell has no land cover that can be converted to parks.',
	landcoverFailure: 'Unable to load land cover for this grid cell. Select the cell to try again.',
})

/** Cooling centers (CoolingCenter.vue). */
export const COOLING_CENTER_MESSAGES = Object.freeze({
	limitReached: 'This grid cell already has the maximum of 5 cooling centers.',
})
