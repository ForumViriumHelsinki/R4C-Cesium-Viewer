// src/constants/viewport.js
export const VIEWPORT = {
	MAX_CAMERA_HEIGHT_FOR_BUILDINGS: 50000, // meters
	MAX_CAMERA_HEIGHT_FOR_TREES: 30000, // meters
	DRAG_DETECTION_THRESHOLD_PX: 5,
	CLICK_PICK_TOLERANCE_PX: 5,
	MIN_ZOOM_FOR_DETAILS: 15,
	// Fog effect thresholds - indicates buildings won't load until zoomed in
	FOG_START_HEIGHT: 3000, // meters - fog begins appearing
	FOG_FULL_HEIGHT: 10000, // meters - fog reaches maximum density
}

/**
 * Adaptive zoom constants for postal-code camera positioning.
 * Altitude is derived from the polygon bounding-box diagonal (in meters),
 * scaled per view-type, then clamped to MIN/MAX to keep sea-adjacent
 * postal codes (where water inflates the bbox) bounded.
 */
export const POSTAL_CODE_ZOOM = {
	// Multiplier applied to the bbox diagonal length to derive altitude.
	// ~1.6x diagonal frames the area comfortably with margin in 2D top-down.
	SCALE_2D: 1.6,
	// 3D oblique view: camera sits lower and slightly south of center,
	// so a smaller scale fills the same screen extent.
	SCALE_3D: 1.1,
	// Focus (45° pitch) view: between 2D and 3D scales.
	SCALE_FOCUS: 1.3,
	// Hard floor — very small postal codes should not zoom in closer than this.
	MIN_ALTITUDE: 1500, // meters
	// Hard ceiling — sea-adjacent postal codes with huge water bboxes get clamped.
	MAX_ALTITUDE: 8000, // meters
	// Fallback altitude used if bbox cannot be computed (no polygon hierarchy).
	FALLBACK_ALTITUDE: 3500, // meters
}
