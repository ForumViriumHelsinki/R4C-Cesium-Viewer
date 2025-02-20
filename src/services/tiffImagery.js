import TIFFImageryProvider from "tiff-imagery-provider";

export const changeTIFF = async ( selectedDate, tiffLayers, viewer ) => {

      try {

        const tiffUrl = `./assets/images/ndvi_${selectedDate}.tiff`;

        const provider = await TIFFImageryProvider.fromUrl(tiffUrl, {
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