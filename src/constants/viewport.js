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
