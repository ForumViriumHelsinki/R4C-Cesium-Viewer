/**
 * Postal code area GeoJSON sources, shared by the Cesium `PostCodes` data
 * source and the deck.gl postal code layer (ADR-012), so both renderers draw
 * the same file at the same fill opacity.
 */

/**
 * @typedef {Object} PostalCodeSource
 * @property {string} url - GeoJSON, WGS84
 * @property {number} fillOpacity - 0-1; 0 draws outlines only
 */

/** @type {{capitalRegion: PostalCodeSource, helsinki: PostalCodeSource}} */
export const POSTAL_CODE_SOURCES = Object.freeze({
	/** Whole capital region, shown at the start level. */
	capitalRegion: Object.freeze({ url: '/assets/data/hsy_po.json', fillOpacity: 0.2 }),
	/** Helsinki areas clipped to land, outlines only, below the start level in the Helsinki view. */
	helsinki: Object.freeze({ url: '/assets/data/hki_po_clipped.json', fillOpacity: 0 }),
})

/** Cesium data source name for the postal code areas. */
export const POSTAL_CODE_DATA_SOURCE = 'PostCodes'
