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

/** d3-scale-chromatic sequential ramp used for a dimension's colour classes. */
export type VttPalette = 'YlGnBu' | 'YlGn'

/**
 * How a dimension's values map to colour classes.
 *  - `fixed`: physical class breaks, stable across frames and scenarios. The
 *    last class is open-ended (`[lastBreak, ∞)`).
 *  - `robust`: per-frame domain between two quantiles of the shown cells,
 *    split into {@link VTT_COLOR_STEPS} equal-width classes. Outliers fall
 *    into the end classes instead of compressing everything else.
 */
export type VttScaleSpec =
	| { readonly kind: 'fixed'; readonly breaks: readonly number[] }
	| { readonly kind: 'robust'; readonly lowerQuantile: number; readonly upperQuantile: number }

export interface VttDimension {
	/** Property name on returned GeoJSON Feature.properties. */
	readonly key: string
	readonly label: string
	readonly unit: string
	readonly palette: VttPalette
	/** Cells with a value at or below this are not drawn. */
	readonly hideBelow: number
	readonly scale: VttScaleSpec
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

/**
 * Overland water depth below this is not drawn: 1 cm is the usual dry/wet cut
 * on flood maps. VTT frames carry a ~1 mm film over most cells (12,860 of
 * 13,077 cells in scenario 2 frame 60) that would otherwise paint the whole
 * extent.
 */
export const VTT_WET_DEPTH_THRESHOLD_M = 0.01

/**
 * Overland depth class breaks in metres: 1–5 cm, 5–10 cm, 10–30 cm, 30–50 cm,
 * 50 cm–1 m, ≥ 1 m. Sampled VTT frames peak at 1.23–1.54 m.
 */
export const VTT_DEPTH_CLASS_BREAKS_M = [
	VTT_WET_DEPTH_THRESHOLD_M,
	0.05,
	0.1,
	0.3,
	0.5,
	1.0,
] as const

/** Quantiles bounding a `robust` colour domain (2nd–98th percentile). */
export const VTT_ROBUST_LOWER_QUANTILE = 0.02
export const VTT_ROBUST_UPPER_QUANTILE = 0.98

const ROBUST_SCALE: VttScaleSpec = {
	kind: 'robust',
	lowerQuantile: VTT_ROBUST_LOWER_QUANTILE,
	upperQuantile: VTT_ROBUST_UPPER_QUANTILE,
}

/**
 * Transpiration is first: it is the default view and the radio list follows
 * this order. Unit labels are as received; VTT has not confirmed them
 * (transpiration grows monotonically over frames, so it looks cumulative, and
 * canopy_air_temperature is a constant 5 in every sampled real frame).
 */
export const VTT_DIMENSIONS: readonly VttDimension[] = [
	{
		key: 'transpiration',
		label: 'Transpiration',
		unit: 'mm/h',
		palette: 'YlGn',
		hideBelow: 0,
		scale: ROBUST_SCALE,
	},
	{
		key: 'overland_water_depth',
		label: 'Overland water depth',
		unit: 'm',
		palette: 'YlGnBu',
		hideBelow: VTT_WET_DEPTH_THRESHOLD_M,
		scale: { kind: 'fixed', breaks: VTT_DEPTH_CLASS_BREAKS_M },
	},
	{
		key: 'upper_storage_water_depth',
		label: 'Upper storage water depth',
		unit: 'm',
		palette: 'YlGnBu',
		hideBelow: 0,
		scale: ROBUST_SCALE,
	},
	{
		key: 'canopy_air_temperature',
		label: 'Canopy air temperature',
		unit: 'K',
		palette: 'YlGn',
		hideBelow: Number.NEGATIVE_INFINITY,
		scale: ROBUST_SCALE,
	},
] as const

/**
 * Dimension shown when the panel first opens. Named explicitly rather than
 * taken from the list order so the URL-state code and the store share one
 * default that survives reordering the radio list.
 */
export const VTT_DEFAULT_DIMENSION = 'transpiration'

/**
 * Frames per scenario: 0..287 inclusive (288 × 2.5 min = 12 h). Upstream
 * returns 404 for frame 288 (mesh2d_out_288.geojson), measured 2026-10-08 for
 * scenarios 1–3.
 */
export const VTT_FRAME_COUNT = 288
export const VTT_FRAME_INTERVAL_MINUTES = 2.5

/** Extrusion height of the highest colour class, in metres. */
export const VTT_MAX_EXTRUSION_M = 100

/** Extrusion height of the lowest colour class, so it still reads as a column. */
export const VTT_MIN_EXTRUSION_M = 2

/** Number of equal-width colour classes in a `robust` scale. */
export const VTT_COLOR_STEPS = 8

/**
 * Part of each d3 colour ramp used, as [start, end] in 0..1. The near-white
 * start of YlGn/YlGnBu disappears over light imagery once translucent.
 */
export const VTT_PALETTE_T_RANGE = [0.25, 1] as const

/**
 * Frames kept in the store's client cache (least recently used evicted). A
 * compact frame is ~210 KB (4 dimensions × 13,077 Float32 values; the mesh is
 * shared), so 48 frames is ~10 MB. Scrubbing back over viewed frames or
 * switching scenarios then needs no 6 MB re-fetch.
 */
export const VTT_FRAME_CACHE_SIZE = 48

/** Fill opacity of flood cells: default and slider bounds. */
export const VTT_DEFAULT_OPACITY = 0.55
export const VTT_OPACITY_MIN = 0.1
export const VTT_OPACITY_MAX = 1
export const VTT_OPACITY_STEP = 0.05

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
