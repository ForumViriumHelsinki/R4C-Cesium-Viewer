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

import { useGlobalStore } from "../stores/globalStore.js";
import * as Cesium from "cesium";
import { useBackgroundMapStore } from "../stores/backgroundMapStore.js";

/**
 * Creates and adds a flood risk WMS imagery layer to the Cesium viewer
 * Loads transparent PNG flood overlay from WMS endpoint with proxy support.
 *
 * @param {string} url - WMS service base URL (without query parameters)
 * @param {string} layerName - WMS layer name to request
 * @returns {Promise<void>}
 * @throws {Error} If WMS provider initialization fails
 *
 * @example
 * await createFloodImageryLayer(
 *   'https://maps.example.com/wms',
 *   'flood_risk_100yr'
 * );
 */
export const createFloodImageryLayer = async (url, layerName) => {
  const store = useGlobalStore();
  const backgroundMapStore = useBackgroundMapStore();
  const viewer = store.cesiumViewer;

  try {
    const provider = new Cesium.WebMapServiceImageryProvider({
      url: `${url}&format=image/png&transparent=true`,
      layers: layerName,
      proxy: new Cesium.DefaultProxy("/proxy/"),
    });

    await provider.readyPromise;
    const addedLayer = viewer.imageryLayers.addImageryProvider(provider);
    addedLayer.alpha = 1;
    backgroundMapStore.floodLayers.push(addedLayer);
  } catch (error) {
    console.error("Error creating WMS layer:", error);
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
    console.error("Error removing floodlayer:", error);
  }
};
