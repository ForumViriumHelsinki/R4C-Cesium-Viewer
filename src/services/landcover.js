/**
 * @file landcover.js
 * @module services/landcover
 * @description HSY landcover WMS layer management utilities.
 * Provides functions for adding and removing HSY (Helsinki Region Environmental Services)
 * landcover imagery layers from the CesiumJS viewer. Supports multi-year landcover data
 * with 13 different land classification types.
 *
 * Landcover classification types:
 * - Open rock surfaces (avokalliot)
 * - Sea area (merialue)
 * - Other open low vegetation (muu_avoin_matala_kasvillisuus)
 * - Other impermeable surface (muu_vetta_lapaisematon_pinta)
 * - Unpaved roads (paallystamaton_tie)
 * - Paved roads (paallystetty_tie)
 * - Bare soil (paljas_maa)
 * - Fields (pellot)
 * - Trees 2-10m, 10-15m, 15-20m, >20m (puusto height categories)
 * - Water (vesi)
 */

import { useGlobalStore } from '../stores/globalStore.js';
import * as Cesium from 'cesium';
import { useBackgroundMapStore } from '../stores/backgroundMapStore.js';
import { useURLStore } from '../stores/urlStore.js';

/**
 * Creates and adds HSY landcover WMS imagery layer to the Cesium viewer
 * Loads multi-layer landcover data from HSY WMS with year-specific layer names.
 * Supports custom layer lists or auto-generates all 13 landcover types.
 *
 * @async
 * @param {string} [newLayers] - Optional comma-separated WMS layer names. If not provided, loads all landcover layers for selected year.
 * @returns {Promise<void>}
 * @throws {Error} If WMS provider initialization fails
 *
 * @example
 * // Load default landcover layers for the year in backgroundMapStore
 * await createHSYImageryLayer();
 *
 * @example
 * // Load specific layers
 * await createHSYImageryLayer('asuminen_ja_maankaytto:maanpeite_vesi_2023');
 */
export const createHSYImageryLayer = async ( newLayers ) => {
  const store = useGlobalStore();
  const urlStore = useURLStore();

  const backgroundMapStore = useBackgroundMapStore();
  const layersList = newLayers ? newLayers : createLayersForHsyLandcover( backgroundMapStore );

  const provider = new Cesium.WebMapServiceImageryProvider({
    url: urlStore.wmsProxy,
    layers: layersList,
  });

  await provider.readyPromise;

  // Add the new layer and update store
  const addedLayer = store.cesiumViewer.imageryLayers.addImageryProvider( provider );
  backgroundMapStore.landcoverLayers.push( addedLayer );

};

/**
 * Removes all HSY landcover layers from the Cesium viewer
 * Safely removes all tracked landcover imagery layers and clears the layer store.
 * Handles cleanup gracefully even if layers are already removed.
 *
 * @returns {void}
 *
 * @example
 * removeLandcover(); // Removes all HSY landcover layers
 */
export const removeLandcover = () => {
  const store = useGlobalStore();
  const backgroundMapStore = useBackgroundMapStore();

  try {
    if (Array.isArray(backgroundMapStore.landcoverLayers) && backgroundMapStore.landcoverLayers.length > 0) {
      // Remove each layer from the viewer
      backgroundMapStore.landcoverLayers.forEach((layer) => {
        if (store.cesiumViewer.imageryLayers.contains(layer)) {
          store.cesiumViewer.imageryLayers.remove(layer);
        }
      });

      // Clear the tracking array
      backgroundMapStore.landcoverLayers = [];
    }
  } catch (error) {
    console.error("Error removing landcover:", error);
  }
};

/**
 * Generates comma-separated WMS layer names for all HSY landcover types
 * Creates year-suffixed layer names for all 13 landcover classification types.
 * Uses year from backgroundMapStore to select appropriate historical data.
 *
 * @private
 * @param {Object} backgroundMapStore - Background map store containing hsyYear
 * @returns {string} Comma-separated WMS layer names with year suffixes
 *
 * @example
 * // Returns: "asuminen_ja_maankaytto:maanpeite_avokalliot_2023,..."
 * const layers = createLayersForHsyLandcover(backgroundMapStore);
 */
const createLayersForHsyLandcover = ( backgroundMapStore ) => {
  const year = backgroundMapStore.hsyYear;
  const layerNames = [
    'asuminen_ja_maankaytto:maanpeite_avokalliot',
    'asuminen_ja_maankaytto:maanpeite_merialue',
    'asuminen_ja_maankaytto:maanpeite_muu_avoin_matala_kasvillisuus',
    'asuminen_ja_maankaytto:maanpeite_muu_vetta_lapaisematon_pinta',
    'asuminen_ja_maankaytto:maanpeite_paallystamaton_tie',
    'asuminen_ja_maankaytto:maanpeite_paallystetty_tie',
    'asuminen_ja_maankaytto:maanpeite_paljas_maa',
    'asuminen_ja_maankaytto:maanpeite_pellot',
    'asuminen_ja_maankaytto:maanpeite_puusto_10_15m',
    'asuminen_ja_maankaytto:maanpeite_puusto_15_20m',
    'asuminen_ja_maankaytto:maanpeite_puusto_2_10m',
    'asuminen_ja_maankaytto:maanpeite_puusto_yli20m',
    'asuminen_ja_maankaytto:maanpeite_vesi'
  ];

  return layerNames.map(name => `${name}_${year}`).join(',');
};
