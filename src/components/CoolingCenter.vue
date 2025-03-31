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
    addCoolingCenter( entity );
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

const addCoolingCenter = ( entity ) => {

    const gridId = entity.properties.grid_id?.getValue();
    const euref_x = entity.properties.euref_x?.getValue();
    const euref_y = entity.properties.euref_y?.getValue();
        // Add cooling center to store
    mitigationStore.addCoolingCenter({
        grid_id: gridId,
        euref_x,
        euref_y,
        capacity: selectedCapacity.value
    });

    const cartesianPosition = getEntityCentroid( entity ); // Get centroid position
    // Create a blue point entity
    // Get updated capacity
    const currentCapacity = mitigationStore.getCoolingCapacity( gridId );   
    const coolingCentersCount = mitigationStore.getCoolingCenterCount( gridId ); 
        // Find existing cooling center entity for this gridId
    let existingEntity = coolingCentersDataSource.entities.getById(`cooling_${gridId}`);

    if (existingEntity) {
        // If entity exists, just update the label
        existingEntity.label.text = `${coolingCentersCount} Cooling Center(s)\nCapacity: ${currentCapacity}`;
    } else {
        // Otherwise, create a new entity
        const cartesianPosition = getEntityCentroid(entity);
        const coolingCenterEntity = coolingCentersDataSource.entities.add({
            id: `cooling_${gridId}`,  // Assign unique ID based on grid
            position: cartesianPosition,
            point: {
                pixelSize: 15,
                color: Cesium.Color.BLUE,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2
            },
            label: {
                text: `${coolingCentersCount} Cooling Center(s)\nCapacity: ${currentCapacity}`,
                font: "12px sans-serif",
                fillColor: Cesium.Color.BLACK,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 1,
                style: Cesium.LabelStyle.FILL,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -10)
            }
        });
    }
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
