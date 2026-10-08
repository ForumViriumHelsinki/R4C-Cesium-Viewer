/**
 * @module services/vttFloodCamera
 * Camera framing for the VTT flood simulation extent.
 *
 * Kept apart from services/vttFlood.js so ControlPanel can frame the extent
 * without pulling the flood renderer into its eager chunk (the panel itself
 * is lazy-loaded).
 *
 * The camera looks AT the extent centre: flyToBoundingSphere places the eye
 * relative to the target from a heading/pitch/range offset. The previous code
 * passed a coordinate to flyTo as the eye `destination`, so at heading 0 and
 * pitch -55 the view centred ~2.4 km north of it, on Roihuvuori.
 */

import {
	VTT_CAMERA_FLIGHT_SECONDS,
	VTT_CAMERA_VIEWS,
	VTT_DATA_EXTENT,
	VTT_DEFAULT_CAMERA_VIEW,
	VTT_FRAMED_MAX_HEIGHT_M,
} from '../constants/vttFlood'
import { getCesium } from './cesiumProvider.js'

/** @typedef {import('../constants/vttFlood').VttCameraView} VttCameraView */

/**
 * The VTT data extent as a Cesium Rectangle (radians).
 *
 * @param {any} Cesium - Cesium module.
 * @returns {any} Cesium Rectangle.
 */
function extentRectangle(Cesium) {
	const { west, south, east, north } = VTT_DATA_EXTENT
	return Cesium.Rectangle.fromDegrees(west, south, east, north)
}

/**
 * Bounding sphere of the VTT data extent on the ellipsoid surface.
 *
 * @returns {any} Cesium BoundingSphere.
 */
export function vttExtentBoundingSphere() {
	const Cesium = getCesium()
	return Cesium.BoundingSphere.fromRectangle3D(extentRectangle(Cesium))
}

/**
 * Fly the camera so the whole data extent is in view, looking at its centre.
 * The camera is free afterwards: flyToBoundingSphere resets the camera
 * transform and sets no end transform, unlike camera.lookAt, which locks the
 * camera to the target.
 *
 * @param {Object} params
 * @param {any} params.viewer - Cesium viewer.
 * @param {VttCameraView} [params.view] - Orientation; unknown values fall back
 *   to {@link VTT_DEFAULT_CAMERA_VIEW}.
 * @returns {boolean} Whether a flight was started.
 */
export function flyToFloodExtent(
	{
		viewer,
		view = VTT_DEFAULT_CAMERA_VIEW,
	} = /** @type {{viewer: any, view?: VttCameraView}} */ ({})
) {
	if (!viewer || viewer.isDestroyed?.()) return false
	const Cesium = getCesium()
	const { heading, pitch } = Object.hasOwn(VTT_CAMERA_VIEWS, view)
		? VTT_CAMERA_VIEWS[view]
		: VTT_CAMERA_VIEWS[VTT_DEFAULT_CAMERA_VIEW]
	viewer.camera.flyToBoundingSphere(vttExtentBoundingSphere(), {
		// Range 0: Cesium fits the sphere to the view frustum.
		offset: new Cesium.HeadingPitchRange(
			Cesium.Math.toRadians(heading),
			Cesium.Math.toRadians(pitch),
			0
		),
		duration: VTT_CAMERA_FLIGHT_SECONDS,
	})
	return true
}

/**
 * Whether the camera already frames the data extent: the ground point at the
 * centre of the screen lies inside the extent, and the camera is low enough
 * for the ~1.5 km² extent to be legible.
 *
 * The screen-centre point is used rather than computeViewRectangle(), whose
 * lon/lat bounding box of an oblique view also covers ground the camera does
 * not see.
 *
 * @param {any} viewer - Cesium viewer.
 * @returns {boolean}
 */
export function isFloodExtentFramed(viewer) {
	if (!viewer || viewer.isDestroyed?.()) return false
	const Cesium = getCesium()
	const camera = viewer.camera
	const height = camera.positionCartographic?.height
	if (!Number.isFinite(height) || height > VTT_FRAMED_MAX_HEIGHT_M) return false
	const canvas = viewer.scene.canvas
	const target = camera.pickEllipsoid(
		new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2)
	)
	if (!target) return false // screen centre is sky
	return Cesium.Rectangle.contains(
		extentRectangle(Cesium),
		Cesium.Cartographic.fromCartesian(target)
	)
}
