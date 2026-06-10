/**
 * @module utils/deckglWms
 *
 * Pure helpers for the deck.gl spike's WMS underlay. Kept free of deck.gl
 * imports so the URL-building + projection math is unit-testable without
 * instantiating a renderer.
 *
 * Strategy (per WO-5): use a stable `TileLayer` + WMS `GetMap` URL template
 * rather than deck's experimental `WMSLayer`. Each deck tile supplies a
 * WGS84 lng/lat bbox; we reproject it to EPSG:3857 meters and request the
 * tile in EPSG:3857 — exercising HSY GeoServer's on-the-fly reprojection
 * (3857 is served despite not being advertised in GetCapabilities).
 */

/** Spherical Mercator radius (EPSG:3857), meters. */
const MERCATOR_R = 6378137

/**
 * Project a WGS84 lng/lat (degrees) to EPSG:3857 meters (x = easting,
 * y = northing). Standard spherical Web Mercator forward transform.
 *
 * @param {number} lng - Longitude in degrees
 * @param {number} lat - Latitude in degrees
 * @returns {[number, number]} [x, y] in EPSG:3857 meters
 */
export function lngLatToMercator(lng, lat) {
	const x = (MERCATOR_R * lng * Math.PI) / 180
	const clampedLat = Math.max(Math.min(lat, 89.9999), -89.9999)
	const y = MERCATOR_R * Math.log(Math.tan(Math.PI / 4 + (clampedLat * Math.PI) / 360))
	return [x, y]
}

/**
 * Convert a deck.gl tile's WGS84 bbox to an EPSG:3857 `minx,miny,maxx,maxy`
 * BBOX string suitable for a WMS 1.3.0 GetMap with `CRS=EPSG:3857` (3857 has
 * x,y axis order, so min/max easting then min/max northing).
 *
 * @param {{west:number, south:number, east:number, north:number}} bbox
 * @returns {string} `minx,miny,maxx,maxy` in EPSG:3857 meters
 */
export function mercatorBBoxString({ west, south, east, north }) {
	const [minX, minY] = lngLatToMercator(west, south)
	const [maxX, maxY] = lngLatToMercator(east, north)
	return `${minX},${minY},${maxX},${maxY}`
}

/**
 * Build a WMS 1.3.0 GetMap URL for one deck tile in EPSG:3857.
 *
 * Routes through the app's existing `/wms/proxy` path (rewritten to
 * `kartta.hsy.fi/geoserver/wms` by the Vite dev proxy / nginx in prod) so the
 * spike reuses the same upstream the Cesium path uses.
 *
 * @param {Object} opts
 * @param {{west:number, south:number, east:number, north:number}} opts.bbox - tile bbox (WGS84)
 * @param {string} opts.layers - comma-separated WMS layer names
 * @param {string} [opts.baseUrl='/wms/proxy'] - WMS endpoint
 * @param {number} [opts.tileSize=256] - tile pixel size
 * @returns {string} Fully-formed GetMap URL
 */
export function buildWmsGetMapUrl({ bbox, layers, baseUrl = '/wms/proxy', tileSize = 256 }) {
	const params = new URLSearchParams({
		service: 'WMS',
		request: 'GetMap',
		version: '1.3.0',
		layers,
		styles: '',
		format: 'image/png',
		transparent: 'true',
		crs: 'EPSG:3857',
		width: String(tileSize),
		height: String(tileSize),
		bbox: mercatorBBoxString(bbox),
	})
	return `${baseUrl}?${params.toString()}`
}
