<template>
  <div v-if="showGrid">
    <PopGridLegend @onIndexChange="updateGridColors" />
  </div>
  <v-dialog v-model="showPasswordDialog" persistent max-width="400">
    <v-card>
      <v-card-title class="headline">Enter Password</v-card-title>
      <v-card-text>
        <v-text-field v-model="enteredPassword" label="Password" type="password" />
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="checkPassword">Submit</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';
import DataSource from '../services/datasource.js';
import * as Cesium from 'cesium';
import { eventBus } from '../services/eventEmitter.js';
import PopGridLegend from './PopGridLegend.vue';

// Reactive variables
const showPasswordDialog = ref(false);
const enteredPassword = ref('');
const showGrid = ref(false);

// Access the password from the environment variables
const correctPassword = import.meta.env.VITE_250_PASSWORD;

const heatColors = [
  { color: '#ffffcc', range: '< 0.2' },
  { color: '#ffeda0', range: '0.2 - 0.4' },
  { color: '#feb24c', range: '0.4 - 0.6' },
  { color: '#f03b20', range: '0.6 - 0.8' },
  { color: '#bd0026', range: '> 0.8' },
];

const floodColors = [
  { color: '#c6dbef', range: '< 0.2' },  // More saturated light blue
  { color: '#9ecae1', range: '0.2 - 0.4' },  // Slightly darker blue
  { color: '#6baed6', range: '0.4 - 0.6' },  // Mid-tone blue
  { color: '#3182bd', range: '0.6 - 0.8' },  // Darker blue
  { color: '#08519c', range: '> 0.8' },  // Deep blue
];

// Define green space vulnerability colors with reversed logic
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
  green: greenSpaceColors, // Green areas use heat coloring
  social_networks: floodColors, // Social networks use flood coloring
  overcrowding: floodColors, // Overcrowding uses flood coloring
};

// Watcher to load or remove grid data source based on `showGrid` state
watch(showGrid, async (newValue) => {
  if (newValue) {
    await loadGrid();
    updateGridColors('heat_index'); // Initial color update
  } else {
    const dataSourceService = new DataSource();
    await dataSourceService.removeDataSourcesByNamePrefix('250m_grid');
  }
});

// Function to check password and show grid if correct
const checkPassword = () => {
  if (enteredPassword.value === correctPassword) {
    showPasswordDialog.value = false;
    showGrid.value = true;
  } else {
    console.error('Incorrect password');
  }
};

// Function to load the GeoJSON data source
const loadGrid = async () => {
  const dataSourceService = new DataSource();
  await dataSourceService.loadGeoJsonDataSource(
    0.8,
    './assets/data/r4c_stats_grid_index.json',
    '250m_grid'
  );
};

// Function to update grid colors based on the selected index
const updateGridColors = async (selectedIndex) => {
  const dataSourceService = new DataSource();
  const dataSource = dataSourceService.getDataSourceByName('250m_grid');
  if (!dataSource) return;

  const entities = dataSource.entities.values;
  const dataAvailable = isDataAvailable(selectedIndex);

  for (const entity of entities) {
    const isMissingValues = entity.properties['missing_values']?.getValue();

    if (isMissingValues && selectedIndex !== 'flood_exposure' && selectedIndex !== 'avgheatexposure' && selectedIndex !== 'green') {
      entity.polygon.material = Cesium.Color.fromCssColorString('#A9A9A9').withAlpha(0.8);
    } else {
      if (selectedIndex === 'avgheatexposure') {
        // Custom color scheme for avgheatexposure
        const avgHeatExposureValue = entity.properties[selectedIndex]?.getValue();
        if (avgHeatExposureValue !== undefined) {
          entity.polygon.material = new Cesium.Color(
            1, // Red component fixed at 1
            1 - avgHeatExposureValue, // Green component decreases as avgheatexposure increases
            0, // Blue component fixed at 0
            avgHeatExposureValue // Alpha (opacity) is set to avgheatexposure value
          );
        } else {
          entity.polygon.material = Cesium.Color.WHITE.withAlpha(0.8); // Default color if no value
        }
      } else {
        // Generic color assignment for other indices
        const indexValue = dataAvailable ? entity.properties[selectedIndex]?.getValue() : undefined;
        const color = indexValue !== undefined 
          ? getColorForIndex(indexValue, selectedIndex) 
          : Cesium.Color.WHITE.withAlpha(0.8);
        entity.polygon.material = color;
      }
    }
  }
};

// Function to determine the color based on the index value
const getColorForIndex = (indexValue, indexType) => {
  const colorScheme = indexToColorScheme[indexType] || heatColors; // Default to heat colors
  if (indexValue < 0.2) return Cesium.Color.fromCssColorString(colorScheme[0].color).withAlpha(0.8);
  if (indexValue < 0.4) return Cesium.Color.fromCssColorString(colorScheme[1].color).withAlpha(0.8);
  if (indexValue < 0.6) return Cesium.Color.fromCssColorString(colorScheme[2].color).withAlpha(0.8);
  if (indexValue < 0.8) return Cesium.Color.fromCssColorString(colorScheme[3].color).withAlpha(0.8);
  return Cesium.Color.fromCssColorString(colorScheme[4].color).withAlpha(0.8);
};

// Event listener to show the password dialog when the event is triggered
eventBus.$on('create250mGrid', () => {
  showPasswordDialog.value = true;
});

// Placeholder implementation for checking data availability
const isDataAvailable = (selectedIndex) => {
  return Object.keys(indexToColorScheme).includes(selectedIndex);
};
</script>
