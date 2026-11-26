/**
 * @module utils/deckglPostalCodeLayer
 *
 * Postal code areas as a deck.gl layer-registry entry (ADR-012). Shows the
 * file the Cesium `PostCodes` data source would hold at the same level and
 * view, with the same grey fill and black outline.
 */
import { POSTAL_CODE_SOURCES } from '../constants/postalCodeLayers.js'

/** Cesium fill colour (0.3, 0.3, 0.3) as 0-255. */
const FILL_RGB = [77, 77, 77]
const LINE_COLOR = [0, 0, 0, 255]

/**
 * @typedef {Object} PostalCodeState
 * @property {string} level - globalStore.level
 * @property {boolean} helsinkiView - toggleStore.helsinkiView
 */

/**
 * Which postal code file Cesium shows: the capital region at the start level;
 * below it, Helsinki outlines in the Helsinki view (helsinki.js) and none in
 * the capital-region view (the data sources are cleared on drill-down).
 * @param {PostalCodeState} state
 * @returns {import('../constants/postalCodeLayers.js').PostalCodeSource | null}
 */
export function selectPostalCodeSource({ level, helsinkiView }) {
	if (level === 'start') return POSTAL_CODE_SOURCES.capitalRegion
	return helsinkiView ? POSTAL_CODE_SOURCES.helsinki : null
}

/** @typedef {{postalCodes: PostalCodeState, geojson: Record<string, any>}} State */

export const postalCodeLayerDefinition = {
	id: 'postal-codes',
	order: 50,
	/** @param {State} state */
	dataUrl: (state) => selectPostalCodeSource(state.postalCodes)?.url ?? null,
	/** @param {{state: State}} ctx */
	isActive: (ctx) => {
		const source = selectPostalCodeSource(ctx.state.postalCodes)
		return Boolean(source && ctx.state.geojson[source.url])
	},
	/** @param {{state: State, modules: any}} ctx */
	build: (ctx) => {
		const { GeoJsonLayer } = ctx.modules.layers
		const source = /** @type {NonNullable<ReturnType<typeof selectPostalCodeSource>>} */ (
			selectPostalCodeSource(ctx.state.postalCodes)
		)
		return new GeoJsonLayer({
			id: 'postal-codes',
			data: ctx.state.geojson[source.url],
			filled: source.fillOpacity > 0,
			stroked: true,
			getFillColor: [...FILL_RGB, Math.round(source.fillOpacity * 255)],
			getLineColor: LINE_COLOR,
			lineWidthMinPixels: 1,
			pickable: false,
		})
	},
}
