/**
 * @module utils/deckglCamera
 *
 * Pure conversion between the app's Cesium camera description (the eye
 * position plus heading/pitch, as written to the URL by useUrlState) and a
 * deck.gl MapView `viewState` (the look-at target plus zoom/bearing/pitch).
 *
 * Lets the deck.gl renderer open where the Cesium camera was and hand its own
 * camera back (utils/deckglCameraSync.js), so the URL params keep following the
 * view and switching the renderer flag keeps it. No Cesium / deck.gl imports:
 * unit-testable without a renderer.
 *
 * Model:
 *  - Cesium pitch -90 = straight down; deck pitch 0 = straight down.
 *  - The deck target is where the Cesium view ray meets the ground (flat
 *    ellipsoid terrain, which is what the app uses), also when the pitch is
 *    shallower than deck's 60° limit; only deck's output pitch is clamped.
 *  - Zoom is chosen so the ground height visible at the target matches
 *    Cesium's vertical field of view at the same slant distance. It depends
 *    on the viewport's pixel height, since deck zoom fixes meters per pixel.
 */

/** WGS84 semi-major axis, meters — also the Web Mercator sphere radius. */
const EARTH_RADIUS = 6378137
/** deck.gl Web Mercator world size at zoom 0, pixels. */
const TILE_SIZE = 512
/** deck.gl MapController default maxPitch, degrees. */
export const DECK_MAX_PITCH = 60
/** Shallowest Cesium depression, degrees, still treated as hitting the ground. */
const MIN_GROUND_DEPRESSION = 1
/** Cesium PerspectiveFrustum default `fov`, radians (60°). */
const CESIUM_FOV = Math.PI / 3
/** Default viewport when the caller does not pass one, CSS pixels. */
const DEFAULT_VIEWPORT = { width: 1920, height: 1080 }

const toRad = (deg) => (deg * Math.PI) / 180
const toDeg = (rad) => (rad * 180) / Math.PI

/**
 * Cesium's vertical field of view for a viewport aspect ratio. Cesium applies
 * `fov` to the larger dimension, so on a landscape viewport fovy is narrower.
 * @param {number} aspectRatio - width / height
 */
function cesiumFovy(aspectRatio) {
	return aspectRatio <= 1 ? CESIUM_FOV : 2 * Math.atan(Math.tan(CESIUM_FOV / 2) / aspectRatio)
}

/** Ground meters per pixel at a deck zoom and latitude. */
function metersPerPixel(zoom, latitude) {
	return (2 * Math.PI * EARTH_RADIUS * Math.cos(toRad(latitude))) / (TILE_SIZE * 2 ** zoom)
}

/**
 * Move a lng/lat a ground distance (meters) along a compass bearing (degrees).
 * Local flat-earth step (camera offsets are a few km). The longitude scale uses
 * the mid-latitude, so stepping back along bearing + 180 returns exactly to
 * the start and the two conversions below invert each other.
 */
function offset(longitude, latitude, distance, bearingDeg) {
	const b = toRad(bearingDeg)
	const dLat = toDeg((distance * Math.cos(b)) / EARTH_RADIUS)
	const midLat = latitude + dLat / 2
	const dLng = toDeg((distance * Math.sin(b)) / (EARTH_RADIUS * Math.cos(toRad(midLat))))
	return { longitude: longitude + dLng, latitude: latitude + dLat }
}

/**
 * @typedef {Object} CesiumCamera
 * @property {number} longitude - eye longitude, degrees
 * @property {number} latitude - eye latitude, degrees
 * @property {number} altitude - eye height above the ellipsoid, meters
 * @property {number} heading - degrees, 0 = north, clockwise
 * @property {number} pitch - degrees, -90 = straight down
 */

/**
 * @typedef {Object} DeckViewState
 * @property {number} longitude - target longitude, degrees
 * @property {number} latitude - target latitude, degrees
 * @property {number} zoom
 * @property {number} pitch - degrees, 0 = straight down
 * @property {number} bearing - degrees, 0 = north, clockwise
 */

/**
 * @typedef {Object} Viewport
 * @property {number} width - CSS pixels
 * @property {number} height - CSS pixels
 */

/**
 * Convert a Cesium camera to a deck.gl MapView viewState.
 * @param {CesiumCamera} camera
 * @param {Viewport} [viewport]
 * @returns {DeckViewState}
 */
export function cesiumCameraToViewState(camera, viewport = DEFAULT_VIEWPORT) {
	const aspectRatio = viewport.width / viewport.height
	const deckPitch = Math.min(Math.max(90 + camera.pitch, 0), DECK_MAX_PITCH)
	// The target is where Cesium's view ray actually meets the ground, even when
	// deck cannot tilt that far: only the output pitch is clamped, so the view
	// centre does not jump. A ray at or above the horizon never meets the ground;
	// fall back to the steepest view deck shows.
	const depression =
		-camera.pitch >= MIN_GROUND_DEPRESSION
			? toRad(Math.min(-camera.pitch, 90))
			: toRad(90 - DECK_MAX_PITCH)
	const slant = camera.altitude / Math.sin(depression)
	const ground = camera.altitude / Math.tan(depression)
	const target = offset(camera.longitude, camera.latitude, ground, camera.heading)
	const visibleHeight = 2 * slant * Math.tan(cesiumFovy(aspectRatio) / 2)
	// deck shows `height` px of ground at the target: mpp(zoom) * height = visibleHeight.
	const zoom = Math.log2(
		(2 * Math.PI * EARTH_RADIUS * Math.cos(toRad(target.latitude)) * viewport.height) /
			(TILE_SIZE * visibleHeight)
	)
	return {
		longitude: target.longitude,
		latitude: target.latitude,
		zoom,
		pitch: deckPitch,
		bearing: camera.heading,
	}
}

/**
 * Convert a deck.gl MapView viewState back to a Cesium camera — the inverse of
 * {@link cesiumCameraToViewState} for Cesium pitches of -30° and steeper.
 * @param {DeckViewState} viewState
 * @param {Viewport} [viewport]
 * @returns {CesiumCamera}
 */
export function viewStateToCesiumCamera(viewState, viewport = DEFAULT_VIEWPORT) {
	const aspectRatio = viewport.width / viewport.height
	const visibleHeight = metersPerPixel(viewState.zoom, viewState.latitude) * viewport.height
	const slant = visibleHeight / (2 * Math.tan(cesiumFovy(aspectRatio) / 2))
	const depression = toRad(90 - viewState.pitch)
	const altitude = slant * Math.sin(depression)
	const ground = slant * Math.cos(depression)
	const heading = ((viewState.bearing % 360) + 360) % 360
	const eye = offset(viewState.longitude, viewState.latitude, ground, heading + 180)
	return {
		longitude: eye.longitude,
		latitude: eye.latitude,
		altitude,
		heading,
		pitch: viewState.pitch - 90,
	}
}
