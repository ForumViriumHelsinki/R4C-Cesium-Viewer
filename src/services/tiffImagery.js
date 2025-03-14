import TIFFImageryProvider from "tiff-imagery-provider";
import { useGlobalStore } from '../stores/globalStore.js';
import { useBackgroundMapStore } from '../stores/backgroundMapStore.js';
import { useURLStore } from '../stores/urlStore.js';

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