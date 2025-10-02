/**
 * @module services/tiffImagery
 * Provides utilities for loading and displaying Cloud Optimized GeoTIFF (COG) vegetation
 * index data with custom color gradients. NDVI values range from -1 to 1, where higher
 * values indicate healthier, denser vegetation.
 *
 * NDVI Color Scale:
 * - -1.0 to -0.5: Non-vegetated (dark gray) - water, urban
 * - -0.5 to 0.0: Barren (light gray to tan) - bare soil, rock
 * - 0.0 to 0.3: Low vegetation (yellow-green) - sparse grass, stressed plants
 * - 0.3 to 0.6: Moderate vegetation (darker green) - healthy grasslands, crops
 * - 0.6 to 1.0: Dense vegetation (very dark green) - forests, dense canopy
 *
 * Features:
 * - Cloud Optimized GeoTIFF (COG) support for efficient streaming
 * - Multi-date NDVI time series
 * - Maximum 2 layer cache for smooth transitions
 * - Custom color gradient visualization
 *
 * @see {@link https://github.com/hongfaqiu/TIFFImageryProvider|TIFFImageryProvider}
 */

import TIFFImageryProvider from "tiff-imagery-provider";
import { useGlobalStore } from '../stores/globalStore.js';
import { useBackgroundMapStore } from '../stores/backgroundMapStore.js';
import { useURLStore } from '../stores/urlStore.js';

/**
 * Loads and displays NDVI TIFF imagery layer with custom color gradient
 * Automatically manages layer cache to maintain only 2 most recent layers
 * for smooth temporal transitions. Uses Cloud Optimized GeoTIFF format
 * for efficient tile-based streaming.
 *
 * @returns {Promise<void>}
 * @throws {Error} If TIFF loading or provider initialization fails
 *
 * @example
 * // Load NDVI layer for currently selected date
 * await changeTIFF();
 */
export const changeTIFF = async ( ) => {
    const store = useGlobalStore();
    const urlStore = useURLStore();
    const backgroundMapStore = useBackgroundMapStore();
    const ndviDate = backgroundMapStore.ndviDate;
    const viewer = store.cesiumViewer;
    const tiffLayers = backgroundMapStore.tiffLayers;

      try {
        const provider = await TIFFImageryProvider.fromUrl(urlStore.ndviTiffUrl(ndviDate), {
          tileSize: 512,
          minimumLevel: 0,
          maximumLevel: 12,
          renderOptions: {
            single: {
              band: 1,
              type: "discrete",
              useRealValue: true,
              displayRange: [-1, 1],
              colors: [
                [-1.0, "rgb(12, 12, 12)"],
                [-0.5, "rgb(234, 234, 234)"],
                [0.0, "rgb(204, 198, 130)"],
                [0.1, "rgb(145, 191, 81)"],
                [0.2, "rgb(112, 163, 63)"],
                [0.3, "rgb(79, 137, 45)"],
                [0.4, "rgb(48, 109, 28)"],
                [0.5, "rgb(15, 84, 10)"],
                [0.6, "rgb(0, 68, 0)"],
              ],
            },
          },
        });

        await provider.readyPromise;

        if (!viewer) return;

        const layer = viewer.imageryLayers.addImageryProvider(provider);
        layer.brightness = 1;
        tiffLayers.push(layer); // Store reference to the layer

        // **Ensure only 2 layers remain**
        if (tiffLayers.length > 2) {
          const oldestLayer = tiffLayers.shift();
          if (viewer.imageryLayers.contains(oldestLayer)) {
            viewer.imageryLayers.remove(oldestLayer);
          }
        }
      } catch (error) {
        console.error("Error loading TIFF:", error);
      }
    }


/**
 * Removes all NDVI TIFF imagery layers from the Cesium viewer
 * Clears the layer cache and safely removes all tracked TIFF layers.
 * Handles cleanup gracefully even if layers are already removed.
 *
 * @returns {Promise<void>}
 *
 * @example
 * await removeTIFF(); // Removes all NDVI TIFF layers
 */
export const removeTIFF = async ( ) => {
  const store = useGlobalStore();
  const backgroundMapStore = useBackgroundMapStore();
  const viewer = store.cesiumViewer;
  const tiffLayers = backgroundMapStore.tiffLayers;

  try {
    while ( tiffLayers.length ) {
      const layer = tiffLayers.shift();
      if ( viewer.imageryLayers.contains( layer ) ) {
        viewer.imageryLayers.remove( layer );
      }
    }
  } catch (error) {
    console.error("Error removing TIFF:", error);
  }
};   