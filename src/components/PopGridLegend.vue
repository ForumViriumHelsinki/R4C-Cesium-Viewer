<template>
  <div id="legend" v-if="legendData.length > 0">
    <div>
      <h3>{{ title }}</h3>
      <div class="swatch" v-for="item in legendData" :key="item.range">
        <div class="color-box" :style="{ backgroundColor: item.color }"></div>
        <span>{{ item.range }}</span>
      </div>
    </div>

    <!-- Tooltip wrapping the v-select -->
    <v-tooltip
      v-if="selectedIndexDescription"  
      :text="selectedIndexDescription" 
      bottom
    >
      <template v-slot:activator="{ props }">
        <v-select
          v-bind="props"
          v-model="localSelectedIndex"
          :items="indexOptions"
          item-title="text"
          item-value="value"
          label="Select Index"
          @update:modelValue="handleSelectionChange"
          style="max-width: 300px;"
        ></v-select>
      </template>
    </v-tooltip>

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

// Define index options with their corresponding colors and descriptions
const indexOptions = [
  { text: 'Heat Vulnerability', value: 'heat_index', description: 'Total social vulnerability to high temperatures. Includes factors like age, income, and housing conditions.' },
  { text: 'Flood Vulnerability', value: 'flood_index', description: 'Total social vulnerability to flooding. Considers factors such as age, income, overcrowding, and green space.' },
  { text: 'Sensitivity', value: 'sensitivity', description: 'Sensitivity to flooding and high temperatures. Calculated from the percentage of people over 75 years old and the percentage of children aged 0-6 years.' },
  { text: 'Flood Exposure', value: 'flood_exposure', description: 'Enhanced exposure to flooding. Based on green space coverage in the area.' },
  { text: 'Flood Preparedness', value: 'flood_prepare', description: 'Ability to prepare for flooding. Includes indicators such as income, employment, social networks, and housing tenure.' },
  { text: 'Flood Response', value: 'flood_respond', description: 'Ability to respond to flooding. Includes access to emergency services, information, and economic stability.' },
  { text: 'Flood Recovery', value: 'flood_recover', description: 'Ability to recover after flooding. Takes into account economic factors, housing conditions, and social support networks.' },
  { text: 'Heat Exposure', value: 'heat_exposure', description: 'Enhanced exposure to high temperatures. Based on factors like housing conditions and the amount of vegetation.' },
  { text: 'Heat Preparedness', value: 'heat_prepare', description: 'Ability to prepare for high temperatures. Considers economic and social factors, as well as housing conditions.' },
  { text: 'Heat Response', value: 'heat_respond', description: 'Ability to respond to high temperatures. Similar factors as preparedness, focusing on response capabilities.' },
  { text: 'Age', value: 'age', description: 'Age-based vulnerability. Combines the percentage of young children (0-6 years old) and elderly people (over 75 years old).' },
  { text: 'Income', value: 'income', description: 'Income-based vulnerability. Includes unemployment, economic inactivity, long-term unemployment, and median household income.' },
  { text: 'Information', value: 'info', description: 'Information-based vulnerability. Calculated from the percentage of people with only basic education.' },
  { text: 'Tenure', value: 'tenure', description: 'Tenure-based vulnerability. Includes the percentage of rented households and those rented from ARA (The Housing Finance and Development Centre of Finland).' },
  { text: 'Green Space', value: 'green', description: 'Greenspace availability. Considers the percentage of water area, green space, low vegetation, and tree coverage in the land area.' },
  { text: 'Social Networks', value: 'social_networks', description: 'Social network-based vulnerability. Includes the percentage of students, single-person households, and school-age children in the population.' },
  { text: 'Overcrowding', value: 'overcrowding', description: 'Overcrowding vulnerability. Based on the occupancy rate and the percentage of households with seven or more people.' },
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
  { color: '#c6dbef', range: '< 0.2' },  // More saturated light blue
  { color: '#9ecae1', range: '0.2 - 0.4' },  // Slightly darker blue
  { color: '#6baed6', range: '0.4 - 0.6' },  // Mid-tone blue
  { color: '#3182bd', range: '0.6 - 0.8' },  // Darker blue
  { color: '#08519c', range: '> 0.8' },  // Deep blue
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

// Compute the description of the selected index for the tooltip
const selectedIndexDescription = computed(() => {
  const selectedOption = indexOptions.find(option => option.value === localSelectedIndex.value);
  return selectedOption ? selectedOption.description : '';
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
