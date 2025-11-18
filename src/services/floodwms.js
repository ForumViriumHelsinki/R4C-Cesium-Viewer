/**
 * @module services/floodwms
 * Provides functions for adding and removing flood hazard map layers from
 * OGC Web Map Service (WMS) endpoints. Supports visualization of flood risk
 * zones, inundation depths, and flood probability scenarios.
 *
 * Features:
 * - WMS layer integration with transparency
 * - Multiple flood scenario support
 * - Layer opacity control
 * - Automatic proxy configuration
 *
 * @see {@link https://www.ogc.org/standards/wms|OGC WMS Standard}
 */

import { useGlobalStore } from '../stores/globalStore.js';
import * as Cesium from 'cesium';
import { useBackgroundMapStore } from '../stores/backgroundMapStore.js';

/**
 * Creates and adds a flood risk WMS imagery layer to the Cesium viewer
 * Loads transparent PNG flood overlay from WMS endpoint with proxy support.
 *
 * Performance optimizations:
 * - Uses 512x512px tiles (default: 256x256) to reduce request count by ~75%
 * - Limits maximum zoom level to 18 to prevent excessive tile requests
 * - Uses GeographicTilingScheme for EPSG:4326 coordinate system
 *
 * These optimizations prevent N+1 API call issues similar to those resolved in PR #340.
 * Larger tiles (512px) balance request reduction with download size, while zoom level
 * limit (18) provides sufficient detail for flood visualization without excessive tiles.
 *
 * @param {string} url - WMS service base URL (with or without query parameters)
 * @param {string} layerName - WMS layer name to request
 * @returns {Promise<void>}
 * @throws {Error} If WMS provider initialization fails
 *
 * @example
 * await createFloodImageryLayer(
 *   'https://maps.example.com/wms?SERVICE=WMS&VERSION=1.3.0',
 *   'flood_risk_100yr'
 * );
 *
 * @see {@link https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/pull/340|PR #340 - WMS Tile Optimization}
 */
export const createFloodImageryLayer = async (url, layerName) => {
	const store = useGlobalStore();
	const backgroundMapStore = useBackgroundMapStore();
	const viewer = store.cesiumViewer;

	try {
		// Construct URL with proper query parameter handling
		const serviceUrl = new URL(url);
		serviceUrl.searchParams.set('format', 'image/png');
		serviceUrl.searchParams.set('transparent', 'true');

		const provider = new Cesium.WebMapServiceImageryProvider({
			url: serviceUrl.toString(),
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

		await provider.readyPromise;
		const addedLayer = viewer.imageryLayers.addImageryProvider(provider);
		addedLayer.alpha = 1;
		backgroundMapStore.floodLayers.push(addedLayer);
	} catch (error) {
		console.error('Error creating WMS layer:', error);
	}
};

/**
 * Removes all flood risk WMS layers from the Cesium viewer
 * Safely removes all tracked flood imagery layers and clears the layer store.
 * Handles cleanup gracefully even if layers are already removed.
 *
 * @returns {void}
 *
 * @example
 * removeFloodLayers(); // Removes all flood WMS layers
 */
export const removeFloodLayers = () => {
	const store = useGlobalStore();
	const backgroundMapStore = useBackgroundMapStore();
	const viewer = store.cesiumViewer;

	try {
		if (
			Array.isArray(backgroundMapStore.floodLayers) &&
			backgroundMapStore.floodLayers.length > 0
		) {
			// Remove each layer from the Cesium viewer
			backgroundMapStore.floodLayers.forEach((layer) => {
				if (viewer.imageryLayers.contains(layer)) {
					viewer.imageryLayers.remove(layer);
				}
			});

			backgroundMapStore.floodLayers = [];
		}
	} catch (error) {
		console.error('Error removing floodlayer:', error);
	}
};
