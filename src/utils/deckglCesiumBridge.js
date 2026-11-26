/**
 * @module utils/deckglCesiumBridge
 *
 * Moves the camera between the Cesium viewer and the deck.gl map renderer when
 * the renderer flag flips (ADR-012), in the degrees form of
 * utils/deckglCamera.js. The Cesium module is passed in, so this file adds no
 * Cesium import of its own.
 */

/**
 * @param {any} viewer - Cesium.Viewer
 * @param {any} Cesium - Cesium module
 * @returns {import('./deckglCamera.js').CesiumCamera | null} null without a viewer camera
 */
export function readCesiumCamera(viewer, Cesium) {
	const camera = viewer?.camera
	if (!camera) return null
	const carto = Cesium.Cartographic.fromCartesian(camera.position)
	if (!carto) return null
	return {
		longitude: Cesium.Math.toDegrees(carto.longitude),
		latitude: Cesium.Math.toDegrees(carto.latitude),
		altitude: carto.height,
		heading: Cesium.Math.toDegrees(camera.heading),
		pitch: Cesium.Math.toDegrees(camera.pitch),
	}
}

/**
 * @param {any} viewer - Cesium.Viewer
 * @param {any} Cesium - Cesium module
 * @param {import('./deckglCamera.js').CesiumCamera} camera
 */
export function applyCesiumCamera(viewer, Cesium, camera) {
	if (!viewer?.camera) return
	viewer.camera.setView({
		destination: Cesium.Cartesian3.fromDegrees(camera.longitude, camera.latitude, camera.altitude),
		orientation: {
			heading: Cesium.Math.toRadians(camera.heading),
			pitch: Cesium.Math.toRadians(camera.pitch),
			roll: 0,
		},
	})
	viewer.scene?.requestRender?.()
}
