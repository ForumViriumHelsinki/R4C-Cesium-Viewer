<template>
  <v-container class="cooling-center-optimisation">
    <v-card elevation="2" class="pa-4">
      <v-card-title>  Cooling Center <br> Optimization</v-card-title>
      
      <v-label class="mb-2">Number of Cooling Centers</v-label>
      <br><br>
      <v-slider 
        v-model="numCoolingCenters"
        min="1"
        max="10"
        step="1"
        thumb-label="always"
        class="mt-2"
      />      
      <v-btn color="success" class="mt-2" @click="findOptimalCoolingCenters">
        Optimize Locations
      </v-btn>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import DataSource from '../services/datasource.js';
import { useMitigationStore } from '../stores/mitigationStore';
import * as Cesium from 'cesium';
import * as turf from '@turf/turf';
import { useGlobalStore } from '../stores/globalStore.js';

const numCoolingCenters = ref(5);
const gridCells = ref([]);
const mitigationStore = useMitigationStore();
const globalStore = useGlobalStore();
const { optimalEffect } = mitigationStore;

let coolingCentersDataSource = globalStore.cesiumViewer.dataSources?.getByName('cooling_centers')[0];

// Load grid data on mount
onMounted(async () => {
  const dataSourceService = new DataSource();
  const dataSource = dataSourceService.getDataSourceByName('250m_grid');
  
  if (!dataSource) {
    console.error("Grid data source not found!");
    return;
  }
  
  gridCells.value = dataSource.entities.values
    .filter(entity => entity.properties?.heat_index?.getValue())
    .map(entity => ({
      grid_id: entity.properties.grid_id.getValue(),
      euref_x: entity.properties.euref_x.getValue(),
      euref_y: entity.properties.euref_y.getValue(),
      heat_index: entity.properties.heat_index.getValue(),
      polygon: entity.polygon ? entity.polygon.hierarchy.getValue().positions : null
    }));

});

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // Random index
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
};

const removeOldData = async () => {
    mitigationStore.resetStore();
    globalStore.cesiumViewer.dataSources.remove(coolingCentersDataSource);
    coolingCentersDataSource = new Cesium.CustomDataSource('cooling_centers');
    globalStore.cesiumViewer.dataSources.add(coolingCentersDataSource);
}

// Optimization logic
const findOptimalCoolingCenters = async () => {

    await removeOldData()
    
    const availableGrids = [...gridCells.value];
    mitigationStore.resetStore();

    // Shuffle the availableGrids array
  shuffleArray(availableGrids);
  // Remove all entities in the cooling centers data source

  
for (let i = 0; i < numCoolingCenters.value; i++) {
  let bestCell = null;
  let highestTotalReduction = -Infinity;

  availableGrids.forEach(cell => {
    const totalReduction = calculateImpact(cell);

    if (totalReduction > 3 && totalReduction > highestTotalReduction) { // Select max reduction
      highestTotalReduction = totalReduction;
      bestCell = cell;
    }

    if ( totalReduction >= optimalEffect ) {
        return;
    }
  });

    if (bestCell) {

      // Add cooling center to mitigation store & Cesium
      addCoolingCenter(bestCell);

      // Remove the selected grid from available options
      availableGrids.splice(availableGrids.indexOf(bestCell), 1);
    }
}
};

// Heat index impact calculation
const calculateImpact = (center) => {
  let totalReduction = 0;

  gridCells.value.forEach(grid => {
    const distance = Math.sqrt(
      Math.pow(center.euref_x - grid.euref_x, 2) +
      Math.pow(center.euref_y - grid.euref_y, 2)
    );
    totalReduction += getReductionValue(distance);
  });

  return totalReduction;
};

// Reduction formula
const getReductionValue = (distance) => {
  const reachability = 1000;
  const maxReduction = 0.20;
  const minReduction = 0.04;
  
  return distance > reachability ? 0 : maxReduction - (distance / reachability) * (maxReduction - minReduction);
};

const getEntityCentroid = (entity) => {
    if ( !entity.polygon ) return;
    // Get the polygon coordinates in WGS84
    // Convert Cesium Cartesian3 positions to GeoJSON format (Lng/Lat)
    const coordinates = entity.polygon.map((pos) => {
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
    const gridId = entity.gridId;
    mitigationStore.addCoolingCenter({ grid_id: gridId, euref_x: entity.euref_x, euref_y: entity.euref_y, capacity: 1000 });

    const cartesianPosition = getEntityCentroid(entity);
    const coolingCentersCount = mitigationStore.getCoolingCenterCount(gridId);
    const newPosition = Cesium.Cartesian3.fromDegrees(
        Cesium.Math.toDegrees(Cesium.Cartographic.fromCartesian(cartesianPosition).longitude) + 0 / 111320,
        Cesium.Math.toDegrees(Cesium.Cartographic.fromCartesian(cartesianPosition).latitude) + 0 / 111320
    );

    const dimension =  2000 / 1000 * 80;

    coolingCentersDataSource.entities.add({
        id: `cooling_${gridId}_${coolingCentersCount}`,
        position: newPosition,
        box: {
            dimensions: new Cesium.Cartesian3( dimension, dimension, dimension ),
            material: Cesium.Color.BLUE.withAlpha( 0.8 ),
        },
        label: {
            text: `Capacity: ${1000}`,
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
</script>