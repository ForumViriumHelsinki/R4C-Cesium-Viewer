/**
 * @module constants/vttFlood
 * Constants for the VTT R4C flood-simulation integration.
 *
 * Source of truth for scenarios, dimensions, frame budget, and camera target.
 * The VTT API returns one GeoJSON FeatureCollection per (scenario, frame); the
 * UI lets users page through frames and switch the property used for colour/
 * extrusion without re-fetching.
 */

export interface VttScenario {
	/** Body field sent to VTT API as scenario_number (string per upstream contract). */
	readonly id: string
	readonly label: string
	readonly description: string
}

export interface VttDimension {
	/** Property name on returned GeoJSON Feature.properties. */
	readonly key: string
	readonly label: string
	readonly unit: string
}

/**
 * Scenarios mirrored from the standalone POC (API-ver2/index.html).
 * TODO(vtt-api): replace with a backend discovery call once VTT exposes one.
 */
export const VTT_SCENARIOS: readonly VttScenario[] = [
	{
		id: '1',
		label: '80 mm/h cloudburst',
		description: 'Worst-case 80 mm/h cloudburst (rankkasade)',
	},
	{
		id: '2',
		label: 'HSY 2019-08-23',
		description: 'HSY large rainfall event — 60 mm/24h on 2019-08-23',
	},
	{
		id: '3',
		label: 'July 2025 event',
		description: 'Large rainfall event 07.07–08.07.2025 — 40 mm/12h',
	},
] as const

export const VTT_DIMENSIONS: readonly VttDimension[] = [
	{ key: 'canopy_air_temperature', label: 'Canopy air temperature', unit: 'K' },
	{ key: 'overland_water_depth', label: 'Overland water depth', unit: 'm' },
	{ key: 'transpiration', label: 'Transpiration', unit: 'mm/h' },
	{ key: 'upper_storage_water_depth', label: 'Upper storage water depth', unit: 'm' },
] as const

/** Frames available per scenario: 0..288 inclusive (12h × 2.5min steps + t0). */
export const VTT_FRAME_COUNT = 289
export const VTT_FRAME_INTERVAL_MINUTES = 2.5

/** Maximum extrusion height for the highest normalized value, in metres. */
export const VTT_MAX_EXTRUSION_M = 100

/** Constant alpha applied to all rendered cells (per POC). */
export const VTT_FILL_ALPHA = 0.8

/**
 * Camera target for the first time the panel is opened — Laajasalo, where the
 * simulation extent lives. Co-ordinates picked to centre on the southern
 * Helsinki islands without zooming so far in that the extent is clipped.
 */
export const LAAJASALO_CAMERA = {
	longitude: 25.0419,
	latitude: 60.1781,
	/** Eye height in metres. */
	height: 3500,
	/** Heading (degrees, 0 = north). */
	heading: 0,
	/** Pitch in degrees (-90 = straight down). */
	pitch: -55,
} as const

/** Name prefix used for the VTT data source / primitive collection in Cesium. */
export const VTT_FLOOD_LAYER_NAME = 'VTT-Flood-Simulation'

/** Default proxy endpoint — Vite/nginx forward this to the VTT API. */
export const VTT_API_PATH = '/vtt-api'

/**
 * Validate a scenario id against the allow-list above.
 *
 * @param id - Untrusted scenario id (typically from user dropdown).
 * @returns The validated id verbatim.
 * @throws {Error} If the id is not in {@link VTT_SCENARIOS}.
 */
export function validateScenarioId(id: unknown): string {
	const candidate = typeof id === 'string' ? id : String(id)
	if (!VTT_SCENARIOS.some((s) => s.id === candidate)) {
		throw new Error(
			`Invalid VTT scenario id: "${candidate}". Allowed: ${VTT_SCENARIOS.map((s) => s.id).join(', ')}`
		)
	}
	return candidate
}

/**
 * Validate a frame number against the 0..VTT_FRAME_COUNT-1 range.
 *
 * @param frame - Untrusted frame index (typically from a slider).
 * @returns The validated integer.
 * @throws {Error} If the frame is not a non-negative integer below the limit.
 */
export function validateFrameNumber(frame: unknown): number {
	const n = typeof frame === 'number' ? frame : Number(frame)
	if (!Number.isInteger(n) || n < 0 || n >= VTT_FRAME_COUNT) {
		throw new Error(
			`Invalid VTT frame number: "${String(frame)}". Must be integer in 0..${VTT_FRAME_COUNT - 1}.`
		)
	}
	return n
}

/**
 * Format a frame index as a +HH:MM offset from t0.
 *
 * @param frame - Frame index in 0..VTT_FRAME_COUNT-1.
 * @returns Formatted string like "+02:30".
 */
export function formatFrameOffset(frame: number): string {
	const minutes = Math.round(frame * VTT_FRAME_INTERVAL_MINUTES)
	const hh = Math.floor(minutes / 60)
	const mm = minutes % 60
	return `+${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}
