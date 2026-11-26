/**
 * @module utils/deckglCameraSync
 *
 * Two-way camera sync between the deck.gl map renderer and the hidden Cesium
 * viewer while the renderer flag is on (ADR-012).
 *
 * - deck → Cesium: once deck's view settles (debounced), the Cesium camera is
 *   moved to match. Everything that already follows the Cesium camera keeps
 *   working: useUrlState writes the URL camera params on Cesium's moveEnd, so
 *   reloads and shared links keep the deck view.
 * - Cesium → deck: a Cesium move made elsewhere (search, the zoom and compass
 *   controls, a drill-down flyTo) is reported through `onCesiumMove` as a deck
 *   viewState. Moves this module made itself are recognised and not echoed.
 */
import { cesiumCameraToViewState, viewStateToCesiumCamera } from './deckglCamera.js'
import { applyCesiumCamera, readCesiumCamera } from './deckglCesiumBridge.js'

/** Echo tolerance: a Cesium camera this close to the one we set is our own move. */
const SAME_DEGREES = 1e-6
const SAME_METERS = 0.5
const SAME_ANGLE_DEGREES = 0.01

function sameCamera(a, b) {
	if (!a || !b) return false
	const angle = (x, y) => Math.abs(((x - y + 540) % 360) - 180) < SAME_ANGLE_DEGREES
	return (
		Math.abs(a.longitude - b.longitude) < SAME_DEGREES &&
		Math.abs(a.latitude - b.latitude) < SAME_DEGREES &&
		Math.abs(a.altitude - b.altitude) < SAME_METERS &&
		angle(a.heading, b.heading) &&
		Math.abs(a.pitch - b.pitch) < SAME_ANGLE_DEGREES
	)
}

/**
 * @param {Object} options
 * @param {any} options.viewer - Cesium.Viewer, or null before it exists
 * @param {any} options.Cesium - Cesium module
 * @param {() => import('./deckglCamera.js').Viewport} options.getViewport
 * @param {(viewState: import('./deckglCamera.js').DeckViewState) => void} options.onCesiumMove
 * @param {number} [options.debounceMs]
 */
export function createCameraSync({ viewer, Cesium, getViewport, onCesiumMove, debounceMs = 250 }) {
	/** Last camera this module applied to Cesium, to recognise its own moveEnd. */
	let applied = null
	let pending = null
	let timer = null

	const flush = () => {
		if (timer) clearTimeout(timer)
		timer = null
		if (!pending || !viewer?.camera) return
		const camera = viewStateToCesiumCamera(pending, getViewport())
		pending = null
		// Record before applying: a moveEnd may fire before setView returns.
		applied = camera
		applyCesiumCamera(viewer, Cesium, camera)
	}

	const onMoveEnd = () => {
		const camera = readCesiumCamera(viewer, Cesium)
		if (!camera || sameCamera(camera, applied)) return
		applied = null
		onCesiumMove(cesiumCameraToViewState(camera, getViewport()))
	}

	const removeListener = viewer?.camera?.moveEnd?.addEventListener(onMoveEnd) ?? null

	return {
		/** @param {import('./deckglCamera.js').DeckViewState} viewState */
		pushFromDeck(viewState) {
			pending = viewState
			if (timer) clearTimeout(timer)
			timer = setTimeout(flush, debounceMs)
		},
		/** Apply any pending deck move, then stop syncing. */
		dispose() {
			removeListener?.()
			flush()
		},
	}
}
