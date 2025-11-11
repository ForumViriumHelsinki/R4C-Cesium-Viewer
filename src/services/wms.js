import * as Cesium from "cesium";
import { useURLStore } from "../stores/urlStore.js";

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
