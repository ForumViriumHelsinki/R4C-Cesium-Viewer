<template>
  <v-container class="cooling-center">
    <v-card
elevation="2"
class="pa-4"
>
      <v-card-title>Cooling Centers</v-card-title>

      <!-- Reset Button as Vuetify Button -->
      <v-btn
color="error"
class="mt-2"
@click="resetCoolingCenters"
>
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
        />

        <!-- Add Cooling Center Button -->
        <v-btn
color="primary"
:class="{ 'active-btn': selectingGrid }"
@click="toggleGridSelection"
>
          {{ selectingGrid ? 'Click on Grid to Select' : 'Add Cooling Center' }}
        </v-btn>

        <!-- List of Cooling Centers -->
        <div
v-if="coolingCenters.length"
class="mt-4"
>
            <!-- Estimated Impacts Section -->
            <v-divider class="my-4"/>
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
import * as turf from '@turf/turf';

const globalStore = useGlobalStore();
const mitigationStore = useMitigationStore();
const coolingCenters = computed(() => mitigationStore.coolingCenters);
const affectedCells = computed(() => mitigationStore.affected); // Get affected cells
const viewer = computed(() => globalStore.cesiumViewer);
const selectingGrid = ref(false);
const selectedCapacity = ref(500); // Default capacity for slider
const coolingCentersDataSource = new Cesium.CustomDataSource("cooling_centers");

const toggleGridSelection = () => {
  selectingGrid.value = !selectingGrid.value;
};

// Reset function
const resetCoolingCenters = () => {
    mitigationStore.resetStore();
    coolingCentersDataSource.entities.removeAll(); // Clear cooling center points
};

const handleMapClick = (clickEvent) => {
  if (!selectingGrid.value) return;

  const scene = viewer.value.scene;
  const pickedObject = scene.pick(clickEvent.position);

  if (Cesium.defined(pickedObject) && pickedObject.id) {
    const entity = pickedObject.id;
    entity._properties && addCoolingCenter( entity );
    selectingGrid.value = false;

  }
};

const getEntityCentroid = (entity) => {
    // Get the polygon coordinates in WGS84
    const polygonPositions = entity.polygon.hierarchy.getValue().positions;

    // Convert Cesium Cartesian3 positions to GeoJSON format (Lng/Lat)
    const coordinates = polygonPositions.map((pos) => {
        const cartographic = Cesium.Cartographic.fromCartesian(pos);
        return [Cesium.Math.toDegrees(cartographic.longitude), Cesium.Math.toDegrees(cartographic.latitude)];
    });

    // Create a Turf.js polygon
    const polygon = turf.polygon([coordinates]);

    // Get the centroid
    const centroid = turf.centroid(polygon);
    const [longitude, latitude] = centroid.geometry.coordinates;

    // Convert centroid to Cesium Cartesian3 position
    return Cesium.Cartesian3.fromDegrees(longitude, latitude);
};

const addCoolingCenter = (entity) => {
  const gridId = entity.properties.grid_id?.getValue();
  if (mitigationStore.getCoolingCenterCount(gridId) >= 5) {
    alert("Maximum 5 cooling centers per grid reached!");
    return;
  }

  const euref_x = entity.properties.euref_x?.getValue();
  const euref_y = entity.properties.euref_y?.getValue();
  mitigationStore.addCoolingCenter({ grid_id: gridId, euref_x, euref_y, capacity: selectedCapacity.value });

  const cartesianPosition = getEntityCentroid(entity);
  const coolingCentersCount = mitigationStore.getCoolingCenterCount(gridId);
  const offsets = [
    [0, 0],
    [-100, 80],
    [-100, -80],
    [100, 80],
    [100, -80]
  ];
  
  const offset = offsets[coolingCentersCount - 1];
  const newPosition = Cesium.Cartesian3.fromDegrees(
    Cesium.Math.toDegrees(Cesium.Cartographic.fromCartesian(cartesianPosition).longitude) + offset[0] / 111320,
    Cesium.Math.toDegrees(Cesium.Cartographic.fromCartesian(cartesianPosition).latitude) + offset[1] / 111320
  );

  const dimension = ( selectedCapacity.value - 0 ) / ( 1000 - 100 );

  coolingCentersDataSource.entities.add({
    id: `cooling_${gridId}_${coolingCentersCount}`,
    position: newPosition,
    box: {
      dimensions: new Cesium.Cartesian3(dimension * 80, dimension * 80, dimension * 80),
      material: Cesium.Color.BLUE.withAlpha(0.8),
    },
    label: {
      text: `Capacity: ${selectedCapacity.value}`,
      font: "12px sans-serif",
      fillColor: Cesium.Color.BLACK,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 1,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -40)
    },
    allowPicking: false 
  });
};

onMounted(() => {
  if (!viewer.value) {
    console.error("Cesium viewer is not initialized.");
    return;
  }
  
  viewer.value.dataSources.add(coolingCentersDataSource);

  viewer.value.screenSpaceEventHandler.setInputAction(
    handleMapClick,
    Cesium.ScreenSpaceEventType.LEFT_CLICK
  );
});

onUnmounted(() => {
  if ( viewer.value && viewer.value.screenSpaceEventHandler ) {
    viewer.value.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }
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
