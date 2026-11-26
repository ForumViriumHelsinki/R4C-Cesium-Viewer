/**
 * @module utils/deckglGridLayer
 *
 * The 250 m statistics grid as a deck.gl layer-registry entry (ADR-012). Same
 * GeoJsonLayer, palette and alpha as the DeckGlGridView spike (PR #879) it
 * replaces.
 */
import { getGridFillColorRgba } from './gridColorMapping.js'

/** Cesium baseAlpha (0.8, NDVI off) as 0-255, for parity with the Cesium grid. */
export const GRID_ALPHA = 204

/** Stats grid GeoJSON, already WGS84. */
export const GRID_URL = '/assets/data/r4c_stats_grid_index.json'

/**
 * @typedef {Object} GridState
 * @property {boolean} visible - toggleStore.grid250m
 * @property {string} statsIndex - propsStore.statsIndex
 * @property {any | null} data - grid FeatureCollection, null until loaded
 */

export const gridLayerDefinition = {
	id: 'stats-grid',
	order: 100,
	/** @param {{state: {grid: GridState}}} ctx */
	isActive: (ctx) => Boolean(ctx.state.grid.visible && ctx.state.grid.data),
	/** @param {{state: {grid: GridState}, modules: any}} ctx */
	build: (ctx) => {
		const { GeoJsonLayer } = ctx.modules.layers
		const { data, statsIndex } = ctx.state.grid
		return new GeoJsonLayer({
			id: 'stats-grid',
			data,
			filled: true,
			stroked: true,
			getLineColor: [0, 0, 0, 40],
			lineWidthMinPixels: 0.5,
			getFillColor: (f) => getGridFillColorRgba(f.properties, statsIndex, GRID_ALPHA),
			pickable: false,
			// Index in the accessor identity so a stats-index change recolours.
			updateTriggers: { getFillColor: [statsIndex] },
		})
	},
}
