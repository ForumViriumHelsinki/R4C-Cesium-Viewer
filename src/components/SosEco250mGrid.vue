<template>
  <div v-if="showGrid">
    <PopGridLegend
      :legendData="legendData"
      :indexOptions="indexOptions"
      :selectedIndex="localSelectedIndex"
      @onIndexChange="updateGridColors"
    />
  </div>
  <v-dialog v-model="showPasswordDialog" persistent max-width="400">
    <v-card>
      <v-card-title class="headline">Enter Password</v-card-title>
      <v-card-text>
        <v-text-field v-model="enteredPassword" label="Password" type="password"></v-text-field>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="checkPassword">Submit</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
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
const localSelectedIndex = ref('heat_index');

const indexOptions = [
  { text: 'Heat Index', value: 'heat_index' },
  { text: 'Flood Index', value: 'flood_index' },
];

// Compute legend data based on the selected index
const legendData = computed(() => {
  return localSelectedIndex.value === 'heat_index'
    ? [
        { color: '#ffffcc', range: '< 0.2' },
        { color: '#ffeda0', range: '0.2 - 0.4' },
        { color: '#feb24c', range: '0.4 - 0.6' },
        { color: '#f03b20', range: '0.6 - 0.8' },
        { color: '#bd0026', range: '> 0.8' },
      ]
    : [
        { color: '#eff3ff', range: '< 0.2' },
        { color: '#bdd7e7', range: '0.2 - 0.4' },
        { color: '#6baed6', range: '0.4 - 0.6' },
        { color: '#3182bd', range: '0.6 - 0.8' },
        { color: '#08519c', range: '> 0.8' },
      ];
});

// Watcher to load or remove grid data source based on `showGrid` state
watch(showGrid, async (newValue) => {
  if (newValue) {
    await loadGrid();
    updateGridColors(localSelectedIndex.value); // Initial color update
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
    '/assets/data/r4c_stats_grid.json',
    '250m_grid'
  );
};

// Function to update the colors of the grid based on the selected index
const updateGridColors = async (selectedIndex) => {
  const dataSourceService = new DataSource();
  const dataSource = dataSourceService.getDataSourceByName('250m_grid');
  if (!dataSource) return;

  const entities = dataSource.entities.values;
  for (const entity of entities) {
    const indexValue = entity.properties[selectedIndex]?.getValue();
    if (indexValue !== undefined) {
      const color = getColorForIndex(indexValue, selectedIndex);
      entity.polygon.material = color;
    }
  }
};

// Function to determine the color based on the index value
const getColorForIndex = (indexValue, indexType) => {
  if (indexType === 'heat_index') {
    if (indexValue < 0.2) return Cesium.Color.fromCssColorString('#ffffcc').withAlpha(0.8);
    if (indexValue < 0.4) return Cesium.Color.fromCssColorString('#ffeda0').withAlpha(0.8);
    if (indexValue < 0.6) return Cesium.Color.fromCssColorString('#feb24c').withAlpha(0.8);
    if (indexValue < 0.8) return Cesium.Color.fromCssColorString('#f03b20').withAlpha(0.8);
    return Cesium.Color.fromCssColorString('#bd0026').withAlpha(0.8);
  } else if (indexType === 'flood_index') {
    if (indexValue < 0.2) return Cesium.Color.fromCssColorString('#eff3ff').withAlpha(0.8);
    if (indexValue < 0.4) return Cesium.Color.fromCssColorString('#bdd7e7').withAlpha(0.8);
    if (indexValue < 0.6) return Cesium.Color.fromCssColorString('#6baed6').withAlpha(0.8);
    if (indexValue < 8) return Cesium.Color.fromCssColorString('#3182bd').withAlpha(0.8);
    return Cesium.Color.fromCssColorString('#08519c').withAlpha(0.8);
  }
};

// Event listener to show the password dialog when the event is triggered
eventBus.$on('create250mGrid', () => {
  console.log("event works");
  showPasswordDialog.value = true;
});
</script>
