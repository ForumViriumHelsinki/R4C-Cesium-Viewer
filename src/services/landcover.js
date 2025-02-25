import { useGlobalStore } from '../stores/globalStore.js';
import * as Cesium from 'cesium';
import { useBackgroundMapStore } from '../stores/backgroundMapStore.js';
import { useURLStore } from '../stores/urlStore.js';

export const createHSYImageryLayer = async ( newLayers ) => {
  const store = useGlobalStore();
  const urlStore = useURLStore();

  const backgroundMapStore = useBackgroundMapStore();
  const viewer = store.cesiumViewer;

  const layersList = newLayers ? newLayers : createLayersForHsyLandcover( backgroundMapStore );

  const provider = new Cesium.WebMapServiceImageryProvider({
    url: urlStore.wmsProxy,
    layers: layersList,
  });

  await provider.readyPromise;

  // Add the new layer and update store
  const addedLayer = viewer.imageryLayers.addImageryProvider(provider);
  backgroundMapStore.landcoverLayers.push(addedLayer);

};

export const removeLandcover = () => {
  const store = useGlobalStore();
  const backgroundMapStore = useBackgroundMapStore();
  const viewer = store.cesiumViewer;

  try {
    if (Array.isArray(backgroundMapStore.landcoverLayers) && backgroundMapStore.landcoverLayers.length > 0) {
      // Remove each layer from the viewer and store
      backgroundMapStore.landcoverLayers.forEach((layer) => {
        if (viewer.imageryLayers.contains(layer)) {
          viewer.imageryLayers.remove(layer);
        }
      });

      // Clear the array
      backgroundMapStore.landcoverLayers = [];
    }
  } catch (error) {
    console.error("Error removing landcover:", error);
  }
};

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
