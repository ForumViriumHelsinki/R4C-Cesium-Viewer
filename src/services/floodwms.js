import { useGlobalStore } from '../stores/globalStore.js';
import * as Cesium from 'cesium';
import { useBackgroundMapStore } from '../stores/backgroundMapStore.js';

export const createFloodImageryLayer = async (url, layerName) => {
  const store = useGlobalStore();
  const backgroundMapStore = useBackgroundMapStore();
  const viewer = store.cesiumViewer;

  try {
    const provider = new Cesium.WebMapServiceImageryProvider({
      url: `${url}&format=image/png&transparent=true`,
      layers: layerName,
      proxy: new Cesium.DefaultProxy('/proxy/'),
    });

    await provider.readyPromise;
    const addedLayer = viewer.imageryLayers.addImageryProvider(provider);
    addedLayer.alpha = 1;
    backgroundMapStore.floodLayers.push( addedLayer );
  
  } catch (error) {
    console.error("Error creating WMS layer:", error);
  }
};

export const removeFloodLayers = () => {
  const store = useGlobalStore();
  const backgroundMapStore = useBackgroundMapStore();
  const viewer = store.cesiumViewer;

  try {
    if (Array.isArray(backgroundMapStore.floodLayers) && backgroundMapStore.floodLayers.length > 0) {
    
    // Remove each layer from the Cesium viewer
    backgroundMapStore.floodLayers.forEach(layer => {
      if (viewer.imageryLayers.contains(layer)) {
         viewer.imageryLayers.remove(layer);
      }
    });

    backgroundMapStore.floodLayers = [ ];

    }
  } catch (error) {
    console.error("Error removing floodlayer:", error);
  }
  
};