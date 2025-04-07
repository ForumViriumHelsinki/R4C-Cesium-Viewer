<template>
  <v-container class="cooling-center-optimisation">
    <v-card elevation="2" class="pa-4">
      <v-card-title>  Cooling Center <br> Optimization</v-card-title>
      
      <v-label class="mb-2">Number of Cooling Centers</v-label>
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
          <v-btn color="success" class="mt-2" @click="findOptimalCoolingCenters">
            Optimise Locations
          </v-btn>
        </v-col>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMitigationStore } from '../stores/mitigationStore';
import * as Cesium from 'cesium';
import * as turf from '@turf/turf';
import { useGlobalStore } from '../stores/globalStore.js';

const numCoolingCenters = ref(25);
const mitigationStore = useMitigationStore();
const globalStore = useGlobalStore();
const { optimalEffect } = mitigationStore;

let coolingCentersDataSource = globalStore.cesiumViewer.dataSources?.getByName('cooling_centers')[0];

// Load grid data on mount
onMounted(async () => {
    // mitigationStore.preCalculateGridImpacts();
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
      // Remove all entities in the cooling centers data source

    await removeOldData()

    mitigationStore.optimised = true;
        // Filter grids with impact higher than 4
    const highImpactGrids = mitigationStore.gridCells.filter(cell => mitigationStore.getGridImpact(cell.id) > 4);

    const availableGrids = [...highImpactGrids];

    console.log( "availableGrids", availableGrids.lenght ); 

    // Shuffle the availableGrids array
    shuffleArray(availableGrids);

  
for (let i = 0; i < numCoolingCenters.value; i++) {
    let bestCell = null;
    let highestTotalReduction = -Infinity;

    availableGrids.forEach(cell => {
        const totalReduction =  mitigationStore.getGridImpact(cell.id);
        if (totalReduction > highestTotalReduction) { // Select max reduction
            highestTotalReduction = totalReduction;
            bestCell = cell;
        }

        if ( totalReduction >= optimalEffect ) {
            return;
        }
    });

        if ( bestCell ) {

            // Check for existing cooling centers within 500 units
            if (!isCoolingCenterTooClose(bestCell)) {
                addCoolingCenter(bestCell);
                availableGrids.splice(availableGrids.indexOf(bestCell), 1);
            } else {
                // If a cooling center is too close, remove this cell from consideration
                availableGrids.splice(availableGrids.indexOf(bestCell), 1);
                i--; // Decrement i to retry finding a center
            }
        }
    }
};

const isCoolingCenterTooClose = ( newCell ) => {
    for ( const center of mitigationStore.coolingCenters ) {
        const distance = Math.sqrt(Math.pow( newCell.x - center.euref_x, 2 ) + Math.pow( newCell.y - center.euref_y, 2 )) ;
        if ( distance <= 500 ) {
            return true; // Cooling center is too close
        }
    }
    return false; // No cooling centers are too close
};

const getEntityCentroid = ( entity ) => {
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
    const gridId = entity.id;
    mitigationStore.addCoolingCenter({ grid_id: gridId, euref_x: entity.x, euref_y: entity.y, capacity: 1000 });

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
            pixelOffset: new Cesium.Cartesian2(0, -30)
        },
        allowPicking: false 
    });
};
</script>