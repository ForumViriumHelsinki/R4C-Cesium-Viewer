<template>
  <div v-if="showGrid">
    <v-select
      v-model="selectedIndex"
      :items="indexOptions"
      label="Select Index"
      @change="updateGridColors"
    ></v-select>

    <div id="legend" class="legend"></div>
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
import { ref, onMounted, watch } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';
import GeoJSONDataSource from '../services/GeoJSONDataSource.js'; 
import * as Cesium from 'cesium';

const store = useGlobalStore();
const geojsonDataSource = new GeoJSONDataSource();

const showPasswordDialog = ref(true);
const enteredPassword = ref('');
const showGrid = ref(false);
const selectedIndex = ref('heat_index'); // Default to heat index
const indexOptions = [
    { text: 'Heat Index', value: 'heat_index' },
    { text: 'Flood Index', value: 'flood_index' }
];

// Access the password from your .env file (assuming you've set it up correctly)
const correctPassword = import.meta.env.VITE_250_PASSWORD;

onMounted(async () => {
  eventBus.$on('create250mGrid', () => {
    showGrid.value = true;
  });
});

watch(showGrid, async (newValue) => {
  if (newValue) {
    await loadGrid();
    createLegend();
  } else {
    // Remove the grid data source when showGrid is false
    await geojsonDataSource.removeDataSourcesByNamePrefix('250m_grid');
  }
});

const checkPassword = () => {
    if (enteredPassword.value === correctPassword) {
        showPasswordDialog.value = false;
        showGrid.value = true;
    } else {
        // Handle incorrect password (e.g., show an error message)
        console.error('Incorrect password');
    }
};

const loadGrid = async () => {
  const entities = await geojsonDataSource.loadGeoJsonDataSource(
    0.8, // Opacity
    '/assets/data/r4c_stats_grid.geojson',
    '250m_grid'
  );

  updateGridColors(); // Initial color update
};

const updateGridColors = () => {
    const dataSource = geojsonDataSource.getDataSourceByName('250m_grid');
    if (!dataSource) return;

    const entities = dataSource.entities.values;
    for (const entity of entities) {
        const indexValue = entity.properties[selectedIndex.value]?.getValue();
        if (indexValue !== undefined) {
            const color = getColorForIndex(indexValue, selectedIndex.value);
            entity.polygon.material = color;
        }
    }

    createLegend(); // Update the legend
};

const getColorForIndex = (indexValue, indexType) => {
    // ... (Implement color logic based on page 26 of the PDF)

    // Example (adjust based on your actual color scheme):
    if (indexType === 'heat_index') {
        if (indexValue < 5) return Cesium.Color.GREEN.withAlpha(0.5);
        if (indexValue < 10) return Cesium.Color.YELLOW.withAlpha(0.5);
        return Cesium.Color.RED.withAlpha(0.5);
    } else { // flood_index
        // ... (Similar logic for flood index colors)
    }
};

const createLegend = () => {
    const legendContainer = document.getElementById('legend');
    if (!legendContainer) return;

    legendContainer.innerHTML = ''; // Clear previous legend

    // ... (Implement legend creation logic based on page 26 of the PDF)

    // Example (adjust based on your actual legend structure):
    const title = document.createElement('h3');
    title.textContent = selectedIndex.value === 'heat_index' ? 'Heat Index' : 'Flood Index';
    legendContainer.appendChild(title);

    const colors = [
        { color: 'Green', range: '< 5' },
        { color: 'Yellow', range: '5 - 10' },
        { color: 'Red', range: '> 10' }
    ];

    for (const { color, range } of colors) {
        const item = document.createElement('div');
        item.classList.add('legend-item');

        const colorBox = document.createElement('span');
        colorBox.classList.add('color-box');
        colorBox.style.backgroundColor = color;
        item.appendChild(colorBox);

        const rangeText = document.createElement('span');
        rangeText.textContent = range;
        item.appendChild(rangeText);

        legendContainer.appendChild(item);
    }
};
</script>

<style scoped>
/* Add your legend styling here */
.legend {
    /* ... */
}

.legend-item {
    /* ... */
}

.color-box {
    /* ... */
}
</style>