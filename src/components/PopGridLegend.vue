<template>
  <div id="legend" v-if="legendData.length > 0">
    <div>
      <h3>{{ title }}</h3>
      <div class="swatch" v-for="item in legendData" :key="item.range">
        <div class="color-box" :style="{ backgroundColor: item.color }"></div>
        <span>{{ item.range }}</span>
      </div>
    </div>
    <v-select
      v-model="localSelectedIndex"
      :items="indexOptions"
      item-title="text"
      item-value="value"
      label="Select Index"
      @update:modelValue="handleSelectionChange"
      style="max-width: 300px;"
    ></v-select>
    <div class="source-note">
      Socioeconomic source data by<br>
      <a href="https://stat.fi/index_en.html" target="_blank">Statistics Finland</a>
      <br>
      <a href="https://www.hsy.fi/globalassets/ilmanlaatu-ja-ilmasto/tiedostot/social-vulnerability-to-climate-change-helsinki-metropolitan-area_2016.pdf" target="_blank">Methodology for Assessing Social Vulnerability</a>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { defineEmits } from 'vue';

// Define index options with their corresponding colors
const indexOptions = [
  { text: 'Heat Vulnerability', value: 'heat_index' },
  { text: 'Flood Vulnerability', value: 'flood_index' },
  { text: 'Sensitivity', value: 'sensitivity' },  // Add new indices as needed
  { text: 'Flood Exposure', value: 'flood_exposure' },
  { text: 'Flood Preparedness', value: 'flood_prepare' },
  { text: 'Flood Response', value: 'flood_respond' },
  { text: 'Flood Recovery', value: 'flood_recover' },
  { text: 'Heat Exposure', value: 'heat_exposure' },
  { text: 'Heat Preparedness', value: 'heat_prepare' },
  { text: 'Heat Response', value: 'heat_respond' },
  { text: 'Age', value: 'age' },
  { text: 'Income', value: 'income' },
  { text: 'Information', value: 'info' },
  { text: 'Tenure', value: 'tenure' },
  { text: 'Green Space', value: 'green' },
  { text: 'Social Networks', value: 'social_networks' },
  { text: 'Overcrowding', value: 'overcrowding' },
];

// Define heat vulnerability colors
const heatColors = [
  { color: '#ffffff', range: 'Incomplete data' },
  { color: '#A9A9A9', range: 'Missing values' },
  { color: '#ffffcc', range: '< 0.2' },
  { color: '#ffeda0', range: '0.2 - 0.4' },
  { color: '#feb24c', range: '0.4 - 0.6' },
  { color: '#f03b20', range: '0.6 - 0.8' },
  { color: '#bd0026', range: '> 0.8' },
];

// Define flood vulnerability colors
const floodColors = [
  { color: '#ffffff', range: 'Incomplete data' },
  { color: '#A9A9A9', range: 'Missing values' },
  { color: '#eff3ff', range: '< 0.2' },
  { color: '#bdd7e7', range: '0.2 - 0.4' },
  { color: '#6baed6', range: '0.4 - 0.6' },
  { color: '#3182bd', range: '0.6 - 0.8' },
  { color: '#08519c', range: '> 0.8' },
];

// Define green space vulnerability colors with the desired gradient
const greenSpaceColors = [
  { color: '#006d2c', range: '< 0.2' },           // Darkest green for < 0.2
  { color: '#31a354', range: '0.2 - 0.4' },       // Dark green for 0.2 - 0.4
  { color: '#74c476', range: '0.4 - 0.6' },       // Medium green for 0.4 - 0.6
  { color: '#a1d99b', range: '0.6 - 0.8' },       // Light green for 0.6 - 0.8
  { color: '#e5f5e0', range: '> 0.8' },           // Very light green for > 0.8
];

// Define a mapping of indices to their corresponding color schemes
const indexToColorScheme = {
  heat_index: heatColors,
  flood_index: floodColors,
  sensitivity: heatColors, // Sensitivity uses heat coloring
  flood_exposure: greenSpaceColors,
  flood_prepare: floodColors,
  flood_respond: floodColors,
  flood_recover: floodColors,
  heat_exposure: heatColors,
  heat_prepare: heatColors,
  heat_respond: heatColors,
  age: heatColors, // Age uses heat coloring
  income: heatColors, // Income uses heat coloring
  info: heatColors, // Info uses heat coloring
  tenure: heatColors, // Tenure uses heat coloring
  green: greenSpaceColors,
  social_networks: floodColors, // Social networks use flood coloring
  overcrowding: floodColors, // Overcrowding uses flood coloring
};

// Local state to bind to v-select
const localSelectedIndex = ref('heat_index');

// Compute legend data based on the selected index and the color scheme mapping
const legendData = computed(() => indexToColorScheme[localSelectedIndex.value] || heatColors);

const emit = defineEmits(['onIndexChange']);

// Handle selection change and emit event
const handleSelectionChange = (value) => {
  emit('onIndexChange', value);
};

// Compute the title based on the selected index
const title = computed(() => {
  const selectedOption = indexOptions.find(option => option.value === localSelectedIndex.value);
  return selectedOption ? selectedOption.text : 'Heat Vulnerability';
});
</script>

<style scoped>
#legend {
  position: absolute;
  top: 100px;
  right: 10px;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  padding: 10px;
  z-index: 10;
  border: 1px solid black;
  box-shadow: 3px 5px 5px black;
}

.swatch {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.color-box {
  width: 20px;
  height: 20px;
  border: 1px solid black;
  margin-right: 5px;
}

.source-note {
  margin-top: -12px;
  font-size: 8px;
}

.source-note a {
  color: #0066cc;
  text-decoration: none;
}

.source-note a:hover {
  text-decoration: underline;
}
</style>
