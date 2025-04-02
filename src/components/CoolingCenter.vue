<template>
  <v-container class="cooling-center">
    <v-card elevation="2" class="pa-4">
      <v-card-title>Add Cooling <br> Centers</v-card-title>

      <v-card-text>
        <!-- Capacity Slider -->
        <v-label class="mb-2">Cooling Center Capacity</v-label>
        <br><br>
        <v-slider
          v-model="selectedCapacity"
          min="100"
          max="1000"
          step="1"
          thumb-label="always"
          class="mt-2"
        />

        <!-- Buttons Row: Add & Reset -->
        <v-row class="mt-4">
          <v-col cols="6">
            <v-btn color="primary" :class="{ 'active-btn': selectingGrid }" block @click="toggleGridSelection">
              {{ selectingGrid ? 'Select' : 'Add' }}
            </v-btn>
          </v-col>
          <v-col cols="6">
            <v-btn color="error" block @click="resetCoolingCenters">
              Reset
            </v-btn>
          </v-col>
        </v-row>
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
import DataSource from '../services/datasource.js';

const globalStore = useGlobalStore();
const mitigationStore = useMitigationStore();
const viewer = computed(() => globalStore.cesiumViewer);
const selectingGrid = ref(false);
const selectedCapacity = ref(1000); // Default capacity for slider
let coolingCentersDataSource = globalStore?.cesiumViewer.dataSources?.getByName('cooling_centers')[0];

const toggleGridSelection = () => {
  selectingGrid.value = !selectingGrid.value;
};

// Reset function
const resetCoolingCenters = async () => {
  const dataSourceService = new DataSource();
  await dataSourceService.removeDataSourcesByNamePrefix('cooling_centers');
  await globalStore.cesiumViewer.dataSources.remove(coolingCentersDataSource);
  mitigationStore.resetStore();
  coolingCentersDataSource = new Cesium.CustomDataSource('cooling_centers');
  globalStore.cesiumViewer.dataSources.add(coolingCentersDataSource);
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

  const dimension =  selectedCapacity.value / 1000 * 80;

  coolingCentersDataSource.entities.add({
    id: `cooling_${gridId}_${coolingCentersCount}`,
    position: newPosition,
    box: {
      dimensions: new Cesium.Cartesian3( dimension, dimension, dimension ),
      material: Cesium.Color.BLUE.withAlpha( 0.8 ),
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
  if ( !viewer.value ) {
    console.error("Cesium viewer is not initialized.");
    return;
  }

  if ( !coolingCentersDataSource ) {
    coolingCentersDataSource = new Cesium.CustomDataSource('cooling_centers');
  } 
  
  viewer.value.dataSources.add( coolingCentersDataSource );

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
