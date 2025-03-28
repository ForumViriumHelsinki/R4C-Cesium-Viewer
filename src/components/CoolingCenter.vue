<template>
  <v-container class="cooling-center">
    <v-card elevation="2" class="pa-4">
      <v-card-title>Cooling Centers</v-card-title>

      <!-- Reset Button as Vuetify Button -->
      <v-btn color="error" class="mt-2" @click="resetCoolingCenters">
        Reset Cooling Centers
      </v-btn>

      <v-card-text>

        <!-- Capacity Slider -->
        <v-slider
          v-model="selectedCapacity"
          label="Cooling Center Capacity"
          min="100"
          max="1000"
          step="1"
          thumb-label="always"
          class="mt-4"
        ></v-slider>

        <!-- Add Cooling Center Button -->
        <v-btn color="primary" :class="{ 'active-btn': selectingGrid }" @click="toggleGridSelection">
          {{ selectingGrid ? 'Click on Grid to Select' : 'Add Cooling Center' }}
        </v-btn>

        <!-- List of Cooling Centers -->
        <div v-if="coolingCenters.length" class="mt-4">
            <!-- Estimated Impacts Section -->
            <v-divider class="my-4"></v-divider>
            <h3>Estimated Impacts</h3>
            <p>Total Centers Added: {{ coolingCenters.length }}</p>
            <p>Total Cells Affected: {{ affectedCells.length }}</p>
        </div>

      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useMitigationStore } from '../stores/mitigationStore';
import { useGlobalStore } from '../stores/globalStore.js';
import * as Cesium from 'cesium';

const globalStore = useGlobalStore();
const mitigationStore = useMitigationStore();
const coolingCenters = computed(() => mitigationStore.coolingCenters);
const affectedCells = computed(() => mitigationStore.affected); // Get affected cells
const viewer = computed(() => globalStore.cesiumViewer);
const selectingGrid = ref(false);
const selectedCapacity = ref(500); // Default capacity for slider

const toggleGridSelection = () => {
  selectingGrid.value = !selectingGrid.value;
};

// Reset function
const resetCoolingCenters = () => {
    mitigationStore.resetStore();
};

const handleMapClick = (clickEvent) => {
  if (!selectingGrid.value) return;

  const scene = viewer.value.scene;
  const pickedObject = scene.pick(clickEvent.position);

  if (Cesium.defined(pickedObject) && pickedObject.id) {
    const entity = pickedObject.id;

    const gridId = entity.properties.grid_id?.getValue();
    const euref_x = entity.properties.euref_x?.getValue();
    const euref_y = entity.properties.euref_y?.getValue();

    if (gridId && euref_x !== undefined && euref_y !== undefined) {
      mitigationStore.addCoolingCenter({
        grid_id: gridId,
        euref_x,
        euref_y,
        capacity: selectedCapacity.value // Use slider value
      });

      // Simulate affecting cells
      mitigationStore.addCell(gridId); // Store affected cell

      const gridDataSource = viewer.value.dataSources._dataSources.find(ds => ds.name === '250m_grid');

      if (gridDataSource) {

        const targetEntity = gridDataSource.entities.values.find(e => e.properties.grid_id?.getValue() === gridId);

        if ( targetEntity ) {
          targetEntity._label = {
            text: `Cooling Center\nCapacity: ${selectedCapacity.value}`,
            showBackground: false,
            font: '14px sans-serif',
			horizontalOrigin : Cesium.HorizontalOrigin.CENTER,
			verticalOrigin : Cesium.VerticalOrigin.CENTER,
			pixelOffset: new Cesium.Cartesian2( 8, -8 ),
			eyeOffset: new Cesium.Cartesian3( 0, 0, -100 )

          };
        }

      }

      selectingGrid.value = false;
    } else {
      alert('Invalid grid selection. Try again.');
    }
  }
};

onMounted(() => {
  if (!viewer.value) {
    console.error("Cesium viewer is not initialized.");
    return;
  }

  viewer.value.screenSpaceEventHandler.setInputAction(
    handleMapClick,
    Cesium.ScreenSpaceEventType.LEFT_CLICK
  );
});

onUnmounted(() => {
  viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
});
</script>

<style scoped>
.cooling-center {
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
  background: #f9f9f9;
}

.active-btn {
  background-color: #ff9800;
}
</style>
