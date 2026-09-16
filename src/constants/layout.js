// src/constants/layout.js
// Sidebar and panel widths shared by the left control panel, the right analysis
// drawer, and floating map controls that offset themselves from the sidebar.
export const LAYOUT = {
	// Left control panel (ControlPanel.vue)
	SIDEBAR_EXPANDED_WIDTH: 360,
	SIDEBAR_RAIL_WIDTH: 56,
	// Fraction of the viewport the sidebar may take on mobile
	SIDEBAR_MOBILE_VIEWPORT_FRACTION: 0.9,

	// Right analysis drawer (AnalysisPanel.vue)
	ANALYSIS_PANEL_WIDTH: 480,
	// Below this viewport width, opening the analysis drawer collapses the
	// sidebar to its rail so the map is not squeezed between the two.
	ANALYSIS_PANEL_COLLAPSE_SIDEBAR_BELOW: 1400,
}
