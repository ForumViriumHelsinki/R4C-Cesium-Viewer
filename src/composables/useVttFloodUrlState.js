/**
 * @module composables/useVttFloodUrlState
 * Query-string state for the VTT flood simulation panel, so a link reproduces
 * a flood view.
 *
 * URL parameters (lowercase, like the existing `postalcode`):
 * - `vtt=1`: the panel is open. Any other value counts as closed.
 * - `vttscenario`: scenario id from VTT_SCENARIOS.
 * - `vttframe`: frame index, 0..VTT_FRAME_COUNT-1.
 * - `vttdim`: dimension key from VTT_DIMENSIONS.
 * - `vttopacity`: fill opacity, VTT_OPACITY_MIN..VTT_OPACITY_MAX.
 *
 * All five are written while the panel is open, defaults included, so a link
 * keeps its meaning when a default changes. They are removed when it closes.
 *
 * Writes are read-modify-write on `window.location.search` and touch only these
 * keys, the same contract as useUrlState's camera and navigation writers, so
 * the writers never drop each other's parameters.
 *
 * The camera itself is restored by useUrlState (lon/lat/alt/heading/pitch). A
 * link with camera parameters therefore opens the panel without flying, so the
 * shared view wins; a link without them frames the flood extent.
 */

import { onScopeDispose, watch } from 'vue'
import {
	VTT_DIMENSIONS,
	VTT_OPACITY_MAX,
	VTT_OPACITY_MIN,
	VTT_URL_UPDATE_DEBOUNCE_MS,
	validateFrameNumber,
	validateScenarioId,
} from '../constants/vttFlood'
import { useFeatureFlagStore } from '../stores/featureFlagStore'
import logger from '../utils/logger.js'
import { useUrlState } from './useUrlState.js'

/** Query-string keys owned by the flood panel. */
export const VTT_URL_PARAMS = Object.freeze({
	open: 'vtt',
	scenario: 'vttscenario',
	frame: 'vttframe',
	dimension: 'vttdim',
	opacity: 'vttopacity',
})

/** Longest untrusted value echoed into a log message. */
const MAX_LOGGED_VALUE_LENGTH = 32

/**
 * Digits only. Number() alone would accept '', ' 5', '1e2' and '0x1f', so the
 * shape is checked before the range.
 */
const FRAME_PATTERN = /^\d{1,4}$/
/** A plain decimal such as 1, 0.5 or 0.55. */
const OPACITY_PATTERN = /^\d(?:\.\d{1,3})?$/

/**
 * @typedef {Object} VttFloodUrlParams
 * @property {boolean} open
 * @property {string} [scenarioId]
 * @property {number} [frameNumber]
 * @property {string} [dimension]
 * @property {number} [opacity]
 */

/** @param {string} key @param {string} value */
function warnInvalid(key, value) {
	logger.warn(
		`[useVttFloodUrlState] Ignoring invalid ${key}=${JSON.stringify(value.slice(0, MAX_LOGGED_VALUE_LENGTH))}`
	)
}

/** @param {string} value @returns {number | undefined} */
function parseFrame(value) {
	if (!FRAME_PATTERN.test(value)) return undefined
	try {
		return validateFrameNumber(Number(value))
	} catch {
		return undefined
	}
}

/** @param {string} value @returns {string | undefined} */
function parseScenario(value) {
	try {
		return validateScenarioId(value)
	} catch {
		return undefined
	}
}

/** @param {string} value @returns {string | undefined} */
function parseDimension(value) {
	return VTT_DIMENSIONS.some((d) => d.key === value) ? value : undefined
}

/** @param {string} value @returns {number | undefined} */
function parseOpacity(value) {
	if (!OPACITY_PATTERN.test(value)) return undefined
	const n = Number(value)
	return n >= VTT_OPACITY_MIN && n <= VTT_OPACITY_MAX ? n : undefined
}

/** @type {ReadonlyArray<[keyof VttFloodUrlParams, string, (value: string) => unknown]>} */
const FIELD_PARSERS = [
	['scenarioId', VTT_URL_PARAMS.scenario, parseScenario],
	['frameNumber', VTT_URL_PARAMS.frame, parseFrame],
	['dimension', VTT_URL_PARAMS.dimension, parseDimension],
	['opacity', VTT_URL_PARAMS.opacity, parseOpacity],
]

/**
 * Read flood panel state from a query string. Every value is untrusted: each
 * is checked against its allow-list or range, and an invalid one is omitted
 * with a warning. The other parameters are ignored unless `vtt=1`.
 *
 * @param {string} search - e.g. `window.location.search`.
 * @returns {VttFloodUrlParams}
 */
export function parseVttFloodUrlParams(search) {
	const params = new URLSearchParams(search)
	if (params.get(VTT_URL_PARAMS.open) !== '1') return { open: false }
	/** @type {Record<string, unknown>} */
	const result = { open: true }
	for (const [field, key, parse] of FIELD_PARSERS) {
		const raw = params.get(key)
		if (raw === null) continue
		const value = parse(raw)
		if (value === undefined) {
			warnInvalid(key, raw)
		} else {
			result[field] = value
		}
	}
	return /** @type {VttFloodUrlParams} */ (result)
}

/**
 * The query string with the flood parameters set from `state`, or removed when
 * `state` is null. Other parameters are kept as they are.
 *
 * @param {string} search - Current query string.
 * @param {{scenarioId: string, frameNumber: number, dimension: string, opacity: number} | null} state
 * @returns {string} Query string without the leading `?`.
 */
export function serializeVttFloodUrlParams(search, state) {
	const params = new URLSearchParams(search)
	if (state === null) {
		for (const key of Object.values(VTT_URL_PARAMS)) params.delete(key)
	} else {
		// URLSearchParams percent-encodes values.
		params.set(VTT_URL_PARAMS.open, '1')
		params.set(VTT_URL_PARAMS.scenario, state.scenarioId)
		params.set(VTT_URL_PARAMS.frame, String(state.frameNumber))
		params.set(VTT_URL_PARAMS.dimension, state.dimension)
		params.set(VTT_URL_PARAMS.opacity, String(Math.round(state.opacity * 100) / 100))
	}
	return params.toString()
}

/**
 * Write flood state into the current URL with history.replaceState.
 *
 * @param {Parameters<typeof serializeVttFloodUrlParams>[1]} state - null removes the parameters.
 */
export function writeVttFloodUrlParams(state) {
	const query = serializeVttFloodUrlParams(window.location.search, state)
	const newUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
	window.history.replaceState({ path: newUrl }, '', newUrl)
}

/** @typedef {ReturnType<typeof import('../stores/vttFloodStore').useVttFloodStore>} VttFloodStore */

/**
 * The flood store, imported on first use. ControlPanel is loaded for every
 * user, and the store pulls in the flood renderer, which only flag-enabled
 * users with the panel open need.
 *
 * @returns {Promise<VttFloodStore>}
 */
async function loadFloodStore() {
	const { useVttFloodStore } = await import('../stores/vttFloodStore')
	return useVttFloodStore()
}

/**
 * Restore the flood panel from the URL once the feature flag and the viewer are
 * ready, and keep the URL in step with the panel afterwards.
 *
 * The URL is read once, at setup: the camera writer may add lon/lat before the
 * group-gated flag resolves, which would make a link without camera parameters
 * look like one with them.
 *
 * @param {Object} params
 * @param {import('vue').Ref<boolean>} params.isOpen - Whether the panel is open.
 * @param {import('vue').Ref<boolean>} params.viewerReady - Whether the Cesium viewer exists.
 * @param {(opts: {skipFlight: boolean}) => void} params.onRestoreOpen - Opens the
 *   panel for a restored link; `skipFlight` is true when the link carries its
 *   own camera.
 * @returns {{ready: () => Promise<void>}} `ready` resolves once a pending
 *   restore and store load have settled (for tests).
 */
export function useVttFloodUrlState({ isOpen, viewerReady, onRestoreOpen }) {
	const featureFlagStore = useFeatureFlagStore()
	const initial = parseVttFloodUrlParams(window.location.search)
	// The same predicate CesiumViewer uses to decide whether to restore the camera.
	const hadCameraParams = initial.open && useUrlState().getUrlState() !== null

	// Until a pending restore has run, the writer must not touch the URL: a
	// closed panel would otherwise delete the parameters the restore needs.
	let restored = !initial.open
	let disposed = false
	/** @type {VttFloodStore | null} */
	let store = null
	/** @type {Promise<unknown>} */
	let pending = Promise.resolve()
	/** @type {ReturnType<typeof setTimeout> | null} */
	let timer = null
	/** @type {import('vue').WatchStopHandle | null} */
	let stopStoreWatch = null

	const cancelPendingWrite = () => {
		if (timer) clearTimeout(timer)
		timer = null
	}

	const scheduleWrite = () => {
		cancelPendingWrite()
		if (!store || !isOpen.value) return
		const source = store
		timer = setTimeout(() => {
			timer = null
			writeVttFloodUrlParams({
				scenarioId: source.scenarioId,
				frameNumber: source.frameNumber,
				dimension: source.dimension,
				opacity: source.opacity,
			})
		}, VTT_URL_UPDATE_DEBOUNCE_MS)
	}

	/** Load the store once and follow its panel fields. */
	const attachStore = async () => {
		const loaded = store ?? (await loadFloodStore())
		if (disposed) return null
		store = loaded
		stopStoreWatch ??= watch(
			() => [loaded.scenarioId, loaded.frameNumber, loaded.dimension, loaded.opacity],
			scheduleWrite
		)
		return loaded
	}

	const restore = async () => {
		const loaded = await attachStore()
		if (!loaded) return
		const { open: _open, ...state } = initial
		loaded.hydrateFromUrl(state)
		onRestoreOpen({ skipFlight: hadCameraParams })
	}

	/** @type {import('vue').WatchStopHandle | undefined} */
	let stopRestore
	let restoreStarted = false
	stopRestore = watch(
		() => featureFlagStore.isEnabled('vttFloodSimulation') && viewerReady.value,
		(ready) => {
			if (restored || restoreStarted || !ready) return
			restoreStarted = true
			stopRestore?.()
			pending = restore()
				.catch((error) => logger.error('[useVttFloodUrlState] Restore failed:', error))
				.finally(() => {
					restored = true
					if (disposed) return
					// The open-watcher ignored the panel while the restore ran, so
					// write its state now: open (the usual case), or closed again
					// or never opened (a failed restore), which drops the link.
					if (isOpen.value) scheduleWrite()
					else writeVttFloodUrlParams(null)
				})
		},
		{ immediate: true }
	)
	// An immediate restore started before the stop handle existed.
	if (restored || restoreStarted) stopRestore()

	const stopOpenWatch = watch(isOpen, (open) => {
		if (!restored) return
		cancelPendingWrite()
		if (!open) {
			writeVttFloodUrlParams(null)
			return
		}
		pending = attachStore()
			.then(scheduleWrite)
			.catch((error) => logger.error('[useVttFloodUrlState] Store load failed:', error))
	})

	onScopeDispose(() => {
		disposed = true
		cancelPendingWrite()
		stopRestore?.()
		stopOpenWatch()
		stopStoreWatch?.()
	})

	return { ready: () => pending.then(() => undefined) }
}
