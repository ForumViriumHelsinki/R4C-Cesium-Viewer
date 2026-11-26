/**
 * @module utils/deckglImagery
 *
 * Raster imagery for the deck.gl map renderer (ADR-012): base maps, HSY land
 * cover, a selected HSY overlay and SYKE flood scenarios.
 *
 * - {@link selectImagerySpecs} turns store state into an ordered list of
 *   declarative layer specs. It is the deck.gl counterpart of the imperative
 *   Cesium `imageryLayers.add*` calls in wms.js, landcover.js, floodwms.js and
 *   BackgroundMapBrowser.vue, and reads the same sources (constants/basemaps.js,
 *   constants/landcoverLayers.js).
 * - {@link createImageryTileLayer} builds one deck `TileLayer` per spec, a
 *   reusable component for any WMS or XYZ source.
 * - {@link imageryLayerDefinition} registers the whole stack in the deck.gl
 *   layer registry (utils/deckglLayerRegistry.js).
 *
 * No deck.gl imports: modules arrive through the registry context, so the
 * deck.gl bundle stays lazy and this module is unit-testable.
 */
import { BASE_MAP_LAYER, BASIC_MAP_TEMPLATES } from '../constants/basemaps.js'
import { landcoverLayersForYear } from '../constants/landcoverLayers.js'
import { buildWmsGetMapUrl, WMS_TILE_SIZE } from './deckglWms.js'

export { BASE_MAP_LAYER }

/** Standard slippy-map tile size for XYZ templates (not WMS, so #966 parity does not apply). */
export const XYZ_TILE_SIZE = 256
/** Same ceiling as every Cesium WMS provider (maximumLevel 18, #340). */
const WMS_MAX_ZOOM = 18

/**
 * @typedef {{kind: 'wms', id: string, url: string, layers: string}} WmsSpec
 * @typedef {{kind: 'xyz', id: string, url: string, maxZoom: number}} XyzSpec
 * @typedef {WmsSpec | XyzSpec} ImagerySpec
 */

/**
 * @typedef {Object} ImageryState
 * @property {{helsinkiWMS: string, wmsProxy: string}} urls
 * @property {'default' | 'satellite' | 'terrain' | string} basicMap
 * @property {boolean} landCover
 * @property {number} hsyYear
 * @property {string | null} hsyOverlayLayer
 * @property {{id: string, url: string} | null} floodSelection
 */

/**
 * Ordered imagery specs, bottom to top. Ids change when the content changes
 * (year, layer, scenario), so deck.gl drops the old tiles instead of mixing them.
 * @param {ImageryState} state
 * @returns {ImagerySpec[]}
 */
export function selectImagerySpecs(state) {
	/** @type {ImagerySpec[]} */
	const specs = []
	const template = BASIC_MAP_TEMPLATES[state.basicMap]
	if (template) {
		specs.push({
			kind: 'xyz',
			id: `imagery-base-${state.basicMap}`,
			url: template.url,
			maxZoom: template.maxZoom,
		})
	} else {
		specs.push({
			kind: 'wms',
			id: 'imagery-base',
			url: state.urls.helsinkiWMS,
			layers: BASE_MAP_LAYER,
		})
	}
	if (state.landCover) {
		specs.push({
			kind: 'wms',
			id: `imagery-landcover-${state.hsyYear}`,
			url: state.urls.wmsProxy,
			layers: landcoverLayersForYear(state.hsyYear),
		})
	}
	if (state.hsyOverlayLayer) {
		specs.push({
			kind: 'wms',
			id: `imagery-hsy-${state.hsyOverlayLayer}`,
			url: state.urls.wmsProxy,
			layers: state.hsyOverlayLayer,
		})
	}
	if (state.floodSelection) {
		specs.push({
			kind: 'wms',
			id: `imagery-flood-${state.floodSelection.id}`,
			url: state.floodSelection.url,
			layers: state.floodSelection.id,
		})
	}
	return specs
}

/**
 * Merge a WMS base URL's own query (`/helsinki-wms?SERVICE=WMS&`, absolute SYKE
 * URLs with `SERVICE=WMS&VERSION=…`) under a GetMap URL built for its path. The
 * GetMap params win; WMS keys are case-insensitive, so any spelling of a key the
 * GetMap URL sets is dropped from the base.
 * @param {string} baseUrl - WMS endpoint, possibly with a query
 * @param {string} getMapUrl - `buildWmsGetMapUrl` result for the same path
 * @returns {string}
 */
export function mergeWmsBaseQuery(baseUrl, getMapUrl) {
	const [, baseQuery = ''] = baseUrl.split('?')
	const [path, getMapQuery = ''] = getMapUrl.split('?')
	const own = new URLSearchParams(getMapQuery)
	const ownKeys = new Set([...own.keys()].map((k) => k.toLowerCase()))
	const merged = new URLSearchParams()
	for (const [key, value] of new URLSearchParams(baseQuery)) {
		if (!ownKeys.has(key.toLowerCase())) merged.append(key, value)
	}
	for (const [key, value] of own) merged.set(key, value)
	return `${path}?${merged.toString()}`
}

/** Path part of a URL, without its query. */
const pathOf = (url) => url.split('?')[0]

/**
 * Fill an XYZ template from a deck tile index.
 * @param {string} template - URL with `{x}`, `{y}`, `{z}`
 * @param {{x: number, y: number, z: number}} index
 */
export function xyzTileUrl(template, { x, y, z }) {
	return template.replace('{x}', String(x)).replace('{y}', String(y)).replace('{z}', String(z))
}

/**
 * BitmapLayer for one tile. `props.data` is the tile URL from getTileData; a
 * string `data` makes BitmapLayer throw "count(): argument not a container"
 * (#1228), so it is cleared and the URL goes in as `image`.
 * TODO: use wmsBitmapSubLayerProps from deckglWms.js once #1244 merges.
 */
function renderBitmapTile(BitmapLayer, props) {
	if (props.data == null) return null
	const { west, south, east, north } = props.tile.bbox
	return new BitmapLayer(props, {
		data: null,
		image: props.data,
		bounds: [west, south, east, north],
	})
}

/**
 * deck `TileLayer` for a WMS spec: EPSG:3857 GetMap per tile, 512 px tiles to
 * match the Cesium providers (#966).
 * @param {WmsSpec} spec
 * @param {{layers: any, geoLayers: any}} modules - lazily imported @deck.gl/layers and @deck.gl/geo-layers
 */
export function createWmsTileLayer(spec, modules) {
	const { BitmapLayer } = modules.layers
	const { TileLayer } = modules.geoLayers
	return new TileLayer({
		id: spec.id,
		minZoom: 0,
		maxZoom: WMS_MAX_ZOOM,
		tileSize: WMS_TILE_SIZE,
		getTileData: (tile) =>
			mergeWmsBaseQuery(
				spec.url,
				buildWmsGetMapUrl({
					bbox: tile.bbox,
					layers: spec.layers,
					baseUrl: pathOf(spec.url),
					tileSize: WMS_TILE_SIZE,
				})
			),
		renderSubLayers: (props) => renderBitmapTile(BitmapLayer, props),
	})
}

/**
 * deck `TileLayer` for an XYZ template (satellite, topographic base maps).
 * @param {XyzSpec} spec
 * @param {{layers: any, geoLayers: any}} modules
 */
export function createXyzTileLayer(spec, modules) {
	const { BitmapLayer } = modules.layers
	const { TileLayer } = modules.geoLayers
	return new TileLayer({
		id: spec.id,
		minZoom: 0,
		maxZoom: spec.maxZoom,
		tileSize: XYZ_TILE_SIZE,
		getTileData: (tile) => xyzTileUrl(spec.url, tile.index),
		renderSubLayers: (props) => renderBitmapTile(BitmapLayer, props),
	})
}

/**
 * One deck `TileLayer` for an imagery spec.
 * @param {ImagerySpec} spec
 * @param {{layers: any, geoLayers: any}} modules
 */
export function createImageryTileLayer(spec, modules) {
	return spec.kind === 'xyz' ? createXyzTileLayer(spec, modules) : createWmsTileLayer(spec, modules)
}

/** Registry entry: imagery sits under every vector layer. */
export const imageryLayerDefinition = {
	id: 'imagery',
	order: 0,
	/** @param {{state: ImageryState}} ctx */
	isActive: (ctx) => selectImagerySpecs(ctx.state).length > 0,
	/** @param {{state: ImageryState, modules: any}} ctx */
	build: (ctx) =>
		selectImagerySpecs(ctx.state).map((spec) => createImageryTileLayer(spec, ctx.modules)),
}

/**
 * Imagery slice of the deck.gl map state, read from the stores the Cesium path
 * already writes. Plain values only, so the layer factories never touch Pinia.
 * @param {{toggleStore: any, backgroundMapStore: any, urlStore: any}} stores
 * @returns {ImageryState}
 */
export function readImageryState({ toggleStore, backgroundMapStore, urlStore }) {
	return {
		urls: { helsinkiWMS: urlStore.helsinkiWMS, wmsProxy: urlStore.wmsProxy },
		basicMap: backgroundMapStore.basicMap,
		landCover: Boolean(toggleStore.landCover),
		hsyYear: backgroundMapStore.hsyYear,
		hsyOverlayLayer: backgroundMapStore.hsyOverlayLayer,
		floodSelection: backgroundMapStore.floodSelection,
	}
}
