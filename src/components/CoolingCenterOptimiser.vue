<template>
  <v-container class="cooling-center-optimisation">
    <v-card
      elevation="2"
      class="pa-4"
    >
      <v-card-title>Cooling Center <br> Optimization</v-card-title>
      
      <v-label class="mb-2">
        Number of Cooling Centers
      </v-label>
      <br><br>
      <v-slider 
        v-model="numCoolingCenters"
        min="1"
        max="50"
        step="1"
        thumb-label="always"
        class="mt-2"
      />  
    
      <v-col cols="12">    
        <v-btn
          color="success"
          class="mt-2"
          @click="findOptimalCoolingCenters"
        >
          Optimise Locations
        </v-btn>
      </v-col>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { useMitigationStore } from '../stores/mitigationStore';
import * as Cesium from 'cesium';
import * as turf from '@turf/turf';
import { useGlobalStore } from '../stores/globalStore.js';
import DataSource from '../services/datasource.js';

const numCoolingCenters = ref(25);
const mitigationStore = useMitigationStore();
const globalStore = useGlobalStore();
const { optimalEffect } = mitigationStore;

let coolingCentersDataSource = globalStore.cesiumViewer.dataSources?.getByName('cooling_centers')[0];

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};

const removeOldData = async () => {
    mitigationStore.resetStore();
    if (coolingCentersDataSource) {
        globalStore.cesiumViewer.dataSources.remove(coolingCentersDataSource, true);
    }
    coolingCentersDataSource = new Cesium.CustomDataSource('cooling_centers');
    globalStore.cesiumViewer.dataSources.add(coolingCentersDataSource);
};

const findOptimalCoolingCenters = async () => {
    await removeOldData();
    mitigationStore.optimised = true;
    const highImpactGrids = mitigationStore.gridCells.filter(cell => mitigationStore.getGridImpact(cell.id) > 4);
    const availableGrids = [...highImpactGrids];
    shuffleArray(availableGrids);

    for (let i = 0; i < numCoolingCenters.value; i++) {
        let bestCell = null;
        let highestTotalReduction = -Infinity;

        availableGrids.forEach(cell => {
            const totalReduction = mitigationStore.getGridImpact(cell.id);
            if (totalReduction > highestTotalReduction) {
                highestTotalReduction = totalReduction;
                bestCell = cell;
            }
            if (totalReduction >= optimalEffect) return;
        });

        if (bestCell) {
            if (!isCoolingCenterTooClose(bestCell)) {
                addCoolingCenter(bestCell.entity); 
                availableGrids.splice(availableGrids.indexOf(bestCell), 1);
            } else {
                availableGrids.splice(availableGrids.indexOf(bestCell), 1);
                i--;
            }
        }
    }
};

const isCoolingCenterTooClose = (newCell) => {
    for (const center of mitigationStore.coolingCenters) {
        const distance = Math.sqrt(Math.pow(newCell.x - center.euref_x, 2) + Math.pow(newCell.y - center.euref_y, 2));
        if (distance <= 500) return true;
    }
    return false;
};

// This function now correctly receives a full Cesium entity
const getEntityCentroid = (entity) => {
    if (!entity.polygon) return null;
    const polygonPositions = entity.polygon.hierarchy.getValue().positions;
    const coordinates = polygonPositions.map((pos) => {
        const cartographic = Cesium.Cartographic.fromCartesian(pos);
        return [Cesium.Math.toDegrees(cartographic.longitude), Cesium.Math.toDegrees(cartographic.latitude)];
    });

    // Ensure the polygon is closed for turf.js
    if (coordinates.length > 0 && (coordinates[0][0] !== coordinates[coordinates.length - 1][0] || coordinates[0][1] !== coordinates[coordinates.length - 1][1])) {
        coordinates.push(coordinates[0]);
    }
    
    const polygon = turf.polygon([coordinates]);
    const centroid = turf.centroid(polygon);
    const [longitude, latitude] = centroid.geometry.coordinates;
    return Cesium.Cartesian3.fromDegrees(longitude, latitude);
};

const addCoolingCenter = (entity) => {
    const gridId = entity.properties.grid_id?.getValue();
    const euref_x = entity.properties.euref_x?.getValue();
    const euref_y = entity.properties.euref_y?.getValue();
    mitigationStore.addCoolingCenter({ grid_id: gridId, euref_x, euref_y, capacity: 1000 });

    const cartesianPosition = getEntityCentroid(entity);
    if (!cartesianPosition) return; // Stop if centroid could not be calculated

    const dimension = 160; // Simplified
    coolingCentersDataSource.entities.add({
        id: `cooling_${gridId}_${mitigationStore.getCoolingCenterCount(gridId)}`,
        position: cartesianPosition,
        box: {
            dimensions: new Cesium.Cartesian3(dimension, dimension, dimension),
            material: Cesium.Color.BLUE.withAlpha(0.8),
        },
        // label removed for simplicity during debugging, can be added back
    });
};
</script>