<template>
  <div>
    <!-- Disclaimer Title -->
    <div class="disclaimer">
      The map contains significant errors. Not for building-specific evaluation!
    </div>

    <v-radio-group v-model="selectedScenario">
      <v-radio
        label="Stormwater flood map water depth 52 mm rainfall in 1 hour"
        value="HulevesitulvaVesisyvyysSade52mmMallinnettuAlue"
      ></v-radio>
      <v-radio
        label="Stormwater flood map water depth 80 mm rainfall in 1 hour"
        value="HulevesitulvaVesisyvyysSade80mmMallinnettuAlue"
      ></v-radio>              
      <v-radio
        label="Flood hazard areas under different emission scenarios (low = SSP1-2.6, medium = SSP2-4.5, high = SSP5-8.5)"
        value="SSP585_re_with_SSP245_with_SSP126_with_current"
      ></v-radio>
      <v-radio
        label="SSP585, year 2050, recurrence 1/0020 years"
        value="coastal_flood_SSP585_2050_0020_with_protected"
      ></v-radio>
      <v-radio
        label="SSP585, year 2100, recurrence 1/0020 years"
        value="coastal_flood_SSP585_2100_0020_with_protected"
      ></v-radio>
      <v-radio
        label="SSP245, year 2050, recurrence 1/0020 years"
        value="coastal_flood_SSP245_2050_0020_with_protected"
      ></v-radio>
      <v-radio
        label="SSP245, year 2100, recurrence 1/0020 years"
        value="coastal_flood_SSP245_2100_0020_with_protected"
      ></v-radio>
      <v-radio
        label="SSP126, year 2050, recurrence 1/0020 years"
        value="coastal_flood_SSP126_2050_0020_with_protected"
      ></v-radio>
      <v-radio
        label="SSP126, year 2100, recurrence 1/0020 years"
        value="coastal_flood_SSP126_2100_0020_with_protected"
      ></v-radio>
    </v-radio-group>

    <div class="legend-container">
      <div
        v-for="item in currentLegend"
      :key="item.color"
      >
        <div
          class="color-square"
        :style="{ backgroundColor: item.color }"
        />
        <span class="legend-text">{{ item.text }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import * as Cesium from 'cesium';
import { useGlobalStore } from '../stores/globalStore';
import { useToggleStore } from '../stores/toggleStore';

const globalStore = useGlobalStore();
const selectedScenario = ref(null);
const viewer = globalStore.cesiumViewer;
const toggleStore = useToggleStore();

const legendItemsCombination = ref([
  { color: '#001f3f', text: 'Current situation (2020)' },
  { color: '#0074D9', text: 'Year 2100 low' },
  { color: '#85144b', text: 'Year 2100 medium' },
  { color: '#FF4136', text: 'Year 2100 high' },
]);

const legendItemsSea = ref([
  { color: '#ADD8E6', text: 'Less than 0.5 m' },
  { color: '#87CEEB', text: '0.5-1 m' },
  { color: '#0074D9', text: '1-2 m' },
  { color: '#0056A3', text: '2-3 m' },
  { color: '#000080', text: 'More than 3 m' },
  { color: '#FFA500', text: 'Flood-protected by permanent structures' },
]);

const legendItemsStormwater = ref([
  { color: '#ADD8E6', text: '0.1 m' }, // Light blue
  { color: '#0074D9', text: '0.3 m' }, // Blue
  { color: '#0056A3', text: '0.5 m' }, // Dark blue
  { color: '#003366', text: '1 m' },   // Darker blue
  { color: '#001022', text: '2- m' },  // Almost black blue
]);

const currentLegend = computed(() => {
  if (selectedScenario.value?.startsWith('Hulevesitulva')) {
    return legendItemsStormwater.value;
  } else if (selectedScenario.value === 'SSP585_re_with_SSP245_with_SSP126_with_current') {
    return legendItemsCombination.value;
  } else if (selectedScenario.value?.startsWith('coastal_flood')) {
    return legendItemsSea.value;
  } else {
    return [];
  }
});

// https://paikkatiedot.ymparisto.fi/geoserver/tulva/ows?SERVICE=WMS&REQUEST
const wmsConfig = computed(() => {
  const urlMapping = {
    'HulevesitulvaVesisyvyysSade52mmMallinnettuAlue': 'https://paikkatiedot.ymparisto.fi/geoserver/tulva/ows?SERVICE=WMS&',
    'HulevesitulvaVesisyvyysSade80mmMallinnettuAlue': 'https://paikkatiedot.ymparisto.fi/geoserver/tulva/ows?SERVICE=WMS&',
    'SSP585_re_with_SSP245_with_SSP126_with_current': 'https://paikkatiedot.ymparisto.fi/geoserver/meritulvakartat_2022_yhdistelma/wms?SERVICE=WMS&',
    'coastal_flood_SSP585_2050_0020_with_protected': 'https://paikkatiedot.ymparisto.fi/geoserver/meritulvakartat_2022/ows?SERVICE=WMS&',
    'coastal_flood_SSP585_2100_0020_with_protected': 'https://paikkatiedot.ymparisto.fi/geoserver/meritulvakartat_2022/ows?SERVICE=WMS&',
    'coastal_flood_SSP245_2050_0020_with_protected': 'https://paikkatiedot.ymparisto.fi/geoserver/meritulvakartat_2022/ows?SERVICE=WMS&',
    'coastal_flood_SSP245_2100_0020_with_protected': 'https://paikkatiedot.ymparisto.fi/geoserver/meritulvakartat_2022/ows?SERVICE=WMS&',
    'coastal_flood_SSP126_2050_0020_with_protected': 'https://paikkatiedot.ymparisto.fi/geoserver/meritulvakartat_2022/ows?SERVICE=WMS&',
    'coastal_flood_SSP126_2100_0020_with_protected': 'https://paikkatiedot.ymparisto.fi/geoserver/meritulvakartat_2022/ows?SERVICE=WMS&',
  };

  const url = urlMapping[selectedScenario.value] || null;

  return { url, layerName: selectedScenario.value };
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
  viewer.imageryLayers.add(imageryLayer);

};

const updateWMS = async (config) => {
  if (!config || !config.layerName) return;

  const imageryLayers = viewer.imageryLayers;
  let size = toggleStore.landCover? 3: 2;
  
  // Remove the last imagery layer before adding a new one
  if (imageryLayers.length > size ) {
    const lastLayer = imageryLayers.get(imageryLayers.length - 1);
    await imageryLayers.remove(lastLayer, true); // `true` ensures the layer is destroyed
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
/* Disclaimer Styling */
.disclaimer {
  color: red;         /* Red text */
  font-weight: bold;  /* Bold font */
  font-size: 18px;    /* Large font size */
  text-align: center; /* Center the text */
  margin-bottom: 10px; /* Space below the disclaimer */
}

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