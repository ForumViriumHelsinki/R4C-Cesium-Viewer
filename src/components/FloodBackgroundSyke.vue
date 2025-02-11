<template>
  <div>
    <div class="legend-container">
      <div
        v-for="item in legendItems1"
      :key="item.color"
      >
        <div
          class="color-square"
        :style="{ backgroundColor: item.color }"
        ></div>
        <span class="legend-text">{{ item.text }}</span>
      </div>
    </div>

    <v-radio-group v-model="selectedScenario">
      <v-radio
        label="Tulvavaara-alueet eri päästöskenaarioilla (matala = SSP1-2.6, keskimääräinen = SSP2-4.5, korkea = SSP5-8.5)"
        value="meritulvakartat_2022_yhdistelma"
      ></v-radio>
      <v-radio
        label="SSO585, vuosi 2050, toistuvuus 1/0020 a"
        value="sso585_2050"
      ></v-radio>
      <v-radio
        label="SSO585, vuosi 2100, toistuvuus 1/0020 a"
        value="sso585_2100"
      ></v-radio>
      <v-radio
        label="SSO245, vuosi 2050, toistuvuus 1/0020 a"
        value="sso245_2050"
      ></v-radio>
      <v-radio
        label="SSO245, vuosi 2100, toistuvuus 1/0020 a"
        value="sso245_2100"
      ></v-radio>
      <v-radio
        label="SSO126, vuosi 2050, toistuvuus 1/0020 a"
        value="sso126_2050"
      ></v-radio>
      <v-radio
        label="SSO126, vuosi 2100, toistuvuus 1/0020 a"
        value="sso126_2100"
      ></v-radio>
    </v-radio-group>
    <div class="legend-container">
      <div
        v-for="item in legendItems2"
      :key="item.color"
      >
        <div
          class="color-square"
        :style="{ backgroundColor: item.color }"
        ></div>
        <span class="legend-text">{{ item.text }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import * as Cesium from 'cesium';
import { useGlobalStore } from '../stores/globalStore';

const globalStore = useGlobalStore();
const selectedScenario = ref(null);
let activeLayer = null; // Store reference to the currently active layer

const legendItems1 = ref([
  { color: '#001f3f', text: 'Nykytilanne (2020)' },
  { color: '#0074D9', text: 'Vuosi 2100 matala' },
  { color: '#85144b', text: 'Vuosi 2100 keskimääräinen' },
  { color: '#FF4136', text: 'Vuosi 2100 korkea' },
]);

const legendItems2 = ref([
  { color: '#ADD8E6', text: 'alle 0,5 m' },
  { color: '#87CEEB', text: '0,5-1 m' },
  { color: '#00BFFF', text: '1-2 m' },
  { color: '#1E90FF', text: '2-3 m' },
  { color: '#000080', text: 'yli 3m' },
  { color: '#FFA500', text: 'tulvasuojeltu kiinteillä rakenteilla' },
]);

const wmsConfig = computed(() => {
  if (selectedScenario.value === 'meritulvakartat_2022_yhdistelma') {
    return {
      url: 'https://paikkatiedot.ymparisto.fi/geoserver/meritulvakartat_2022_yhdistelma/wms?SERVICE=WMS&',
      layerName: 'SSP585_re_with_SSP245_with_SSP126_with_current',
    };
  }
  const layerMapping = {
    sso585_2050: 'coastal_flood_SSP585_2050_0020_with_protected',
    sso585_2100: 'coastal_flood_SSP585_2100_0020_with_protected',
    sso245_2050: 'coastal_flood_SSP245_2050_0020_with_protected',
    sso245_2100: 'coastal_flood_SSP245_2100_0020_with_protected',
    sso126_2050: 'coastal_flood_SSP126_2050_0020_with_protected',
    sso126_2100: 'coastal_flood_SSP126_2100_0020_with_protected',
  };

  return {
    url: 'https://paikkatiedot.ymparisto.fi/geoserver/meritulvakartat_2022/ows?SERVICE=WMS&',
    layerName: layerMapping[selectedScenario.value] || null,
  };
});

const createWMSImageryLayer = (url, layerName) => {
  const provider = new Cesium.WebMapServiceImageryProvider({
    url: `${url}&format=image/png&transparent=true`,
    layers: layerName,
    proxy: new Cesium.DefaultProxy('/proxy/'),
  });

  console.log('WMS Request URL:', provider.url);

  const imageryLayer = new Cesium.ImageryLayer(provider);
  imageryLayer.alpha = 1;

  activeLayer = imageryLayer;
  globalStore.cesiumViewer.imageryLayers.add(activeLayer);
};

const updateWMS = async (config) => {
  if (!config || !config.layerName) return;

  // Remove previous layer if exists
  if (activeLayer) {
    await globalStore.cesiumViewer.imageryLayers.remove(activeLayer, true);
  }

  // Create and add new layer
  createWMSImageryLayer(config.url, config.layerName);

};

watch(selectedScenario, async () => {
  await nextTick(); // Ensure updates propagate before modifying layers
  updateWMS(wmsConfig.value);
});
</script>

<style scoped>
.legend-container {
  display: flex; /* Arrange items horizontally */
  flex-direction: column; /* Stack items vertically */
  margin-top: 10px; /* Add some space above the legend */
}

.color-square {
  width: 20px;
  height: 20px;
  margin-right: 10px;
  display: inline-block; /* Make it sit side-by-side with text */
  vertical-align: middle; /* Align vertically with text */
}

.legend-text {
  display: inline-block; /* Make it sit side-by-side with color square */
  vertical-align: middle; /* Align vertically with color square */
}
</style>