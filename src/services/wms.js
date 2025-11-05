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
   * @param {string} layerName - WMS layer identifier (e.g., 'avoindata:Rakennukset_alue_rekisteritiedot')
   * @returns {Cesium.ImageryLayer} Configured imagery layer ready to be added to viewer
   *
   * @example
   * const layer = wmsService.createHelsinkiImageryLayer('avoindata:Rakennukset_alue');
   * viewer.imageryLayers.add(layer);
   */
  createHelsinkiImageryLayer(layerName) {
    const urlStore = useURLStore();
    const provider = new Cesium.WebMapServiceImageryProvider({
      url: urlStore.helsinkiWMS,
      layers: layerName,
    });

    return new Cesium.ImageryLayer(provider);
  }
}
