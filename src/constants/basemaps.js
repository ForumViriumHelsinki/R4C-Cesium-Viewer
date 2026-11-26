/**
 * Base-map sources shared by the Cesium imagery code and the deck.gl imagery
 * layers, so both renderers show the same maps.
 */

/** Helsinki WMS layer used as the default base map. */
export const BASE_MAP_LAYER = 'avoindata:Karttasarja_PKS'

/**
 * Alternative base maps offered in BackgroundMapBrowser, as XYZ templates.
 * Templates use `{z}`, `{x}` and `{y}` placeholders.
 */
export const BASIC_MAP_TEMPLATES = Object.freeze({
	// ESRI World Imagery, no token required.
	satellite: Object.freeze({
		url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
		maxZoom: 19,
		credit: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',
	}),
	// OpenTopoMap, CC-BY-SA, no token required.
	terrain: Object.freeze({
		url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
		maxZoom: 17,
		credit: '© OpenTopoMap contributors (CC-BY-SA)',
	}),
})
