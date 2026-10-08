/**
 * @module utils/sentryStateTransformer
 * Pinia state filter and options for Sentry's Pinia plugin
 * (`createSentryPiniaPlugin`, installed in main.js with
 * {@link SENTRY_PINIA_PLUGIN_OPTIONS}).
 *
 * The plugin calls `stateTransformer(states)` with a single argument: a map of
 * every store's state keyed by store id. It sets the result as the scope
 * context after every store action (and, unless `attachPiniaState` is false,
 * attaches it to error events as JSON).
 *
 * {@link SENTRY_EXCLUDED_STATE_FIELDS} lists the store fields that must stay
 * out of that capture:
 *  - Cesium objects (viewer, entities, data sources, imagery layers) are
 *    circular and not serializable.
 *  - `vttFlood.frame` holds a whole VTT simulation frame (13k cells); copying
 *    it into every Sentry event costs megabytes and >100 ms per event.
 *
 * The same list drives `tests/unit/stores/cesiumStateMarkRaw.test.js`: every
 * write to one of these fields must go through `markRaw`, so none of them is
 * ever deep-reactive.
 */

/** @type {Readonly<Record<string, readonly string[]>>} */
export const SENTRY_EXCLUDED_STATE_FIELDS = Object.freeze({
	props: Object.freeze(['postalCodeData']),
	global: Object.freeze(['cesiumViewer', 'currentGridCell', 'pickedEntity']),
	backgroundMap: Object.freeze(['floodLayers', 'landcoverLayers', 'tiffLayers', 'hSYWMSLayers']),
	vttFlood: Object.freeze(['frame']),
})

/**
 * Return a copy of the all-stores state map without the excluded fields.
 * Store states are shallow-copied; the input is not mutated.
 *
 * @param {Record<string, unknown>} states - Store states keyed by store id.
 * @returns {Record<string, unknown>}
 */
export function sentryStateTransformer(states) {
	const result = { ...states }
	for (const [storeId, fields] of Object.entries(SENTRY_EXCLUDED_STATE_FIELDS)) {
		const state = states[storeId]
		if (!state || typeof state !== 'object') continue
		const copy = { ...state }
		for (const field of fields) delete copy[field]
		result[storeId] = copy
	}
	return result
}

/**
 * Options main.js passes to `createSentryPiniaPlugin`.
 *
 * `attachPiniaState: false`: the plugin's event processor would otherwise
 * JSON.stringify every store's state onto each sampled error event, on the
 * main thread. While the transformer threw, that stringify always failed on
 * the circular Cesium viewer and the plugin dropped the attachment, so no
 * event ever carried it. With the filter working it can succeed and include
 * bulk fields that are not excluded here, such as
 * `buildingStore.buildingFeatures` (not measured). The scope context written
 * after each action still carries the filtered state.
 */
export const SENTRY_PINIA_PLUGIN_OPTIONS = Object.freeze({
	attachPiniaState: false,
	stateTransformer: sentryStateTransformer,
})
