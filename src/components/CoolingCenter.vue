<template>
  <v-container class="cooling-center">
    <v-card elevation="2" class="pa-4">
      <v-card-title>Cooling Centers</v-card-title>
      <v-card-text>
        <v-btn color="primary" :class="{ 'active-btn': selectingGrid }" @click="toggleGridSelection">
          {{ selectingGrid ? 'Click on Grid to Select' : 'Add Cooling Center' }}
        </v-btn>

        <div v-if="coolingCenters.length" class="mt-4">
          <v-list>
            <v-list-item v-for="center in coolingCenters" :key="center.id">
<v-list-item>
  <v-list-item-title>
    Grid ID: {{ center.grid_id }} | Capacity: {{ center.capacity }}
  </v-list-item-title>
  <v-list-item-subtitle>
    Coordinates: ({{ center.euref_x }}, {{ center.euref_y }})
  </v-list-item-subtitle>
</v-list-item>
            </v-list-item>
          </v-list>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useMitigationStore } from '../stores/mitigationStore';
import { useGlobalStore } from '../stores/globalStore.js';
import DataSource from '../services/datasource.js';
import * as Cesium from 'cesium';

const globalStore = useGlobalStore();
const mitigationStore = useMitigationStore();
const coolingCenters = computed(() => mitigationStore.coolingCenters);
const viewer = computed(() => globalStore.cesiumViewer);
const selectingGrid = ref(false);

const toggleGridSelection = () => {
  selectingGrid.value = !selectingGrid.value;
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
      const capacity = parseInt(prompt('Enter capacity (100 - 1000):'), 10);

      if (capacity >= 100 && capacity <= 1000) {
        mitigationStore.addCoolingCenter({ grid_id: gridId, euref_x, euref_y, capacity });
        selectingGrid.value = false;
      } else {
        alert('Invalid input. Ensure capacity is between 100 and 1000.');
      }
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
  );});

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

button {
  margin: 0.5rem 0;
  padding: 0.5rem 1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.active-btn {
  background-color: #ff9800;
}
</style>
