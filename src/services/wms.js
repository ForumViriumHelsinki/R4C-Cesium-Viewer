import * as Cesium from 'cesium';
import { useURLStore } from '../stores/urlStore.js';

/**
 * WMS (Web Map Service) Integration Service
 * Provides utilities for creating and managing WMS imagery layers in Cesium.
 * Handles Helsinki WMS services and proxy configuration for cross-origin requests.
 *
 * @class Wms
 * @see {@link https://www.ogc.org/standards/wms|OGC WMS Specification}
 */
export default class Wms {
	/**
	 * Creates a WMS service instance
	 */
	constructor() {}

	/**
	 * Creates a CesiumJS imagery layer from Helsinki WMS service
	 * Configures Web Map Service provider with proxy for Helsinki map layers.
	 * Supports various HSY (Helsinki Region Environmental Services) WMS layers.
	 *
	 * Performance optimizations:
	 * - Uses 512x512px tiles (default: 256x256) to reduce request count by ~75%
	 * - Limits maximum zoom level to 18 to prevent excessive tile requests
	 * - Uses GeographicTilingScheme for EPSG:4326 coordinate system
	 *
	 * Tile Size Rationale (512px vs alternatives):
	 * - 256px (default): Results in ~600 requests on page load (N+1 issue)
	 * - 512px (selected): Reduces to ~150 requests (75% reduction)
	 *   - Balances request reduction with tile download size
	 *   - Each tile is 4x larger in pixels (2x width × 2x height)
	 *   - Modern browsers and HTTP/2 handle this well
	 *   - Memory impact is acceptable on target devices
	 * - 1024px: Would reduce to ~40 requests but:
	 *   - 16x larger tiles may cause memory issues on mobile devices
	 *   - Slower initial tile load impacts perceived performance
	 *   - Single slow tile blocks larger viewport area
	 *
	 * Zoom Level Rationale (maximumLevel: 18):
	 * - Level 18 provides ~0.6m resolution at equator
	 * - Sufficient detail for building-level visualization (primary use case)
	 * - Prevents excessive tile generation at extreme zoom levels
	 * - Building detail view operates effectively at levels 16-18
	 * - Tested with building-specific features and confirmed adequate
	 *
	 * Why not WMTS?
	 * - Helsinki WMTS only supports Finnish coordinate systems (ETRS-TM35FIN, ETRS-GK25)
	 * - CesiumJS only supports EPSG:4326 (WGS84) and EPSG:3857 (Web Mercator)
	 * - Client-side reprojection would be more expensive than current WMS optimization
	 *
	 * Mobile & Performance Considerations:
	 * - Configuration tested on desktop and tablet viewports
	 * - Larger tiles increase memory usage by ~4x per tile
	 * - Mobile device testing recommended in development/staging environments
	 * - Monitor Sentry for memory-related issues post-deployment
	 *
	 * @param {string} layerName - WMS layer identifier (e.g., 'avoindata:Rakennukset_alue_rekisteritiedot')
	 * @returns {Cesium.ImageryLayer} Configured imagery layer ready to be added to viewer
	 *
	 * @example
	 * const layer = wmsService.createHelsinkiImageryLayer('avoindata:Rakennukset_alue');
	 * viewer.imageryLayers.add(layer);
	 *
	 * @see {@link https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/339|Issue #339 - N+1 API Call Optimization}
	 */
	createHelsinkiImageryLayer(layerName) {
		const urlStore = useURLStore();
		const provider = new Cesium.WebMapServiceImageryProvider({
			url: urlStore.helsinkiWMS,
			layers: layerName,
			// Performance optimization: Use larger tiles to reduce request count
			// 512x512 tiles reduce requests by ~75% compared to default 256x256
			tileWidth: 512,
			tileHeight: 512,
			// Limit zoom levels to prevent excessive tile loading
			minimumLevel: 0,
			maximumLevel: 18,
			// Use geographic tiling scheme for EPSG:4326 (WGS84)
			tilingScheme: new Cesium.GeographicTilingScheme(),
		});

		return new Cesium.ImageryLayer(provider);
	}
}
