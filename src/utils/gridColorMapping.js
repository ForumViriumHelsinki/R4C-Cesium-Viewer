/**
 * @module utils/gridColorMapping
 *
 * Pure, renderer-agnostic color logic for the 250m statistical grid choropleth.
 *
 * This is the single source of truth for the grid palette and the value→color
 * threshold mapping. Both renderers consume it:
 *  - the Cesium path (`composables/useGridStyling.js`) wraps the returned hex
 *    string in a cached `Cesium.Color`;
 *  - the deck.gl spike (`components/DeckGlGridView.vue`) converts it to an
 *    `[r,g,b,a]` array for `GeoJsonLayer.getFillColor`.
 *
 * No Cesium / deck.gl imports here on purpose — keeping it pure means it can be
 * unit-tested directly and imported by the eager bundle without pulling either
 * renderer in.
 */

/** Heat vulnerability color scale (white -> dark red) */
export const heatColors = [
	{ color: '#ffffff', range: 'Incomplete data' },
	{ color: '#A9A9A9', range: 'Missing values' },
	{ color: '#ffffcc', range: '< 0.2' },
	{ color: '#ffeda0', range: '0.2 - 0.4' },
	{ color: '#feb24c', range: '0.4 - 0.6' },
	{ color: '#f03b20', range: '0.6 - 0.8' },
	{ color: '#bd0026', range: '> 0.8' },
]
export const partialHeatColors = heatColors.slice(2)

export const floodColors = [
	{ color: '#ffffff', range: 'Incomplete data' },
	{ color: '#A9A9A9', range: 'Missing values' },
	{ color: '#c6dbef', range: '< 0.2' },
	{ color: '#9ecae1', range: '0.2 - 0.4' },
	{ color: '#6baed6', range: '0.4 - 0.6' },
	{ color: '#3182bd', range: '0.6 - 0.8' },
	{ color: '#08519c', range: '> 0.8' },
]
export const partialFloodColors = floodColors.slice(2)

export const greenSpaceColors = [
	{ color: '#006d2c', range: '< 0.2' },
	{ color: '#31a354', range: '0.2 - 0.4' },
	{ color: '#74c476', range: '0.4 - 0.6' },
	{ color: '#a1d99b', range: '0.6 - 0.8' },
	{ color: '#e5f5e0', range: '> 0.8' },
]

export const bothColors = [
	{ color: '#ffffff', range: 'Incomplete data' },
	{ color: '#A9A9A9', range: 'Missing values' },
]

/** Map from index name to its color scheme. */
export const indexToColorScheme = {
	partialHeat: partialHeatColors,
	partialFlood: partialFloodColors,
	heat_index: heatColors,
	flood_index: floodColors,
	sensitivity: heatColors,
	flood_exposure: greenSpaceColors,
	flood_prepare: floodColors,
	flood_respond: floodColors,
	flood_recover: floodColors,
	heat_exposure: heatColors,
	heat_prepare: heatColors,
	heat_respond: heatColors,
	age: heatColors,
	income: heatColors,
	info: heatColors,
	tenure: heatColors,
	green: greenSpaceColors,
	social_networks: floodColors,
	overcrowding: floodColors,
	combined_heat_flood: heatColors,
	combined_flood_heat: floodColors,
	combined_heatindex_avgheatexposure: heatColors,
	combined_heat_flood_green: heatColors,
	both: bothColors,
	avgheatexposure: [{ color: 'gradient', range: 'Heat Exposure' }],
	combined_avgheatexposure: [{ color: 'gradient', range: 'Combined Heat Exposure' }],
}

/**
 * Resolve an index value (0-1) to its threshold color hex string.
 *
 * Color schemes carry 2 "missing data" entries at indices 0-1, then 5 threshold
 * colors at indices 2-6. Thresholds: < 0.2 (2), 0.2-0.4 (3), 0.4-0.6 (4),
 * 0.6-0.8 (5), > 0.8 (6). Direct comparison avoids array allocation.
 *
 * @param {number} indexValue - The index value (0-1 range)
 * @param {string} indexType - The index type key for color scheme lookup
 * @returns {string} Hex color string (e.g. '#feb24c')
 */
export function getGridColorString(indexValue, indexType) {
	const colorScheme = indexToColorScheme[indexType] || heatColors

	let colorIndex
	if (indexValue < 0.2) {
		colorIndex = 2
	} else if (indexValue < 0.4) {
		colorIndex = 3
	} else if (indexValue < 0.6) {
		colorIndex = 4
	} else if (indexValue < 0.8) {
		colorIndex = 5
	} else {
		colorIndex = colorScheme.length - 1 // > 0.8
	}

	const effectiveIndex = Math.min(colorIndex, colorScheme.length - 1)
	return colorScheme[effectiveIndex]?.color || colorScheme[colorScheme.length - 1].color
}

/**
 * Convert a hex color string to an `[r, g, b, a]` array (0-255 components),
 * the shape deck.gl's `getFillColor` / `getLineColor` accessors expect.
 *
 * Accepts `#rgb` and `#rrggbb` (with or without leading `#`).
 *
 * @param {string} hex - Hex color string
 * @param {number} [alpha=255] - Alpha component, 0-255
 * @returns {[number, number, number, number]}
 */
export function hexToRgba(hex, alpha = 255) {
	let h = String(hex).replace('#', '')
	if (h.length === 3) {
		h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
	}
	const r = parseInt(h.slice(0, 2), 16)
	const g = parseInt(h.slice(2, 4), 16)
	const b = parseInt(h.slice(4, 6), 16)
	return [r, g, b, alpha]
}

/**
 * deck.gl-side equivalent of the Cesium `styleGridEntity` color decision for the
 * default (`heat_index`) and other simple-index paths.
 *
 * Mirrors the Cesium logic exactly, reusing {@link getGridColorString}:
 *  - `missing_values` truthy (and not an index that ignores it) -> gray;
 *  - index value null/undefined -> white (incomplete data, e.g. cells with no
 *    `heat_index`);
 *  - otherwise the threshold color for the value.
 *
 * Mitigation reduction is intentionally not applied: with no cooling centers
 * placed (the default app state) the Cesium reduction is 0, so raw `heat_index`
 * coloring is identical to the Cesium default.
 *
 * @param {Record<string, any>} properties - GeoJSON feature properties (raw object)
 * @param {string} selectedIndex - The selected vulnerability index
 * @param {number} [alpha=204] - Alpha 0-255 (Cesium baseAlpha 0.8 -> 204)
 * @returns {[number, number, number, number]}
 */
export function getGridFillColorRgba(properties, selectedIndex, alpha = 204) {
	const missing = properties?.missing_values
	if (
		missing &&
		selectedIndex !== 'flood_exposure' &&
		selectedIndex !== 'avgheatexposure' &&
		selectedIndex !== 'green'
	) {
		return hexToRgba('#A9A9A9', alpha)
	}

	const value = properties?.[selectedIndex]
	if (value == null) {
		return hexToRgba('#FFFFFF', alpha)
	}
	return hexToRgba(getGridColorString(value, selectedIndex), alpha)
}
