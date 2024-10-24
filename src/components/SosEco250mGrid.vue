<template>
  <div v-if="grid250m && showGrid">
    <PopGridLegend @onIndexChange="updateGridColors" />
  </div>
  <v-dialog v-model="showPasswordDialog" persistent max-width="400">
    <v-card>
      <v-card-title class="headline">Enter Password</v-card-title>
      <v-card-text>
        <v-text-field v-model="enteredPassword" label="Password" type="password" />
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="checkPassword">Submit</v-btn>
		<v-btn color="secondary" @click="cancelPassword">Cancel</v-btn> <!-- Cancel Button -->
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import DataSource from '../services/datasource.js';
import * as Cesium from 'cesium';
import PopGridLegend from './PopGridLegend.vue';
import { useToggleStore } from '../stores/toggleStore';

// Reactive variables
const showPasswordDialog = ref( false );
const enteredPassword = ref( '' );
const showGrid = ref( false );
const grid250m = computed( () => toggleStore.grid250m );
const toggleStore = useToggleStore();

// Access the password from the environment variables
const correctPassword = import.meta.env.VITE_250_PASSWORD;

const heatColors = [
	{ color: '#ffffcc', range: '< 0.2' },
	{ color: '#ffeda0', range: '0.2 - 0.4' },
	{ color: '#feb24c', range: '0.4 - 0.6' },
	{ color: '#f03b20', range: '0.6 - 0.8' },
	{ color: '#bd0026', range: '> 0.8' },
];

const floodColors = [
	{ color: '#c6dbef', range: '< 0.2' },  // More saturated light blue
	{ color: '#9ecae1', range: '0.2 - 0.4' },  // Slightly darker blue
	{ color: '#6baed6', range: '0.4 - 0.6' },  // Mid-tone blue
	{ color: '#3182bd', range: '0.6 - 0.8' },  // Darker blue
	{ color: '#08519c', range: '> 0.8' },  // Deep blue
];

// Define green space vulnerability colors with reversed logic
const greenSpaceColors = [
	{ color: '#006d2c', range: '< 0.2' },           // Darkest green for < 0.2
	{ color: '#31a354', range: '0.2 - 0.4' },       // Dark green for 0.2 - 0.4
	{ color: '#74c476', range: '0.4 - 0.6' },       // Medium green for 0.4 - 0.6
	{ color: '#a1d99b', range: '0.6 - 0.8' },       // Light green for 0.6 - 0.8
	{ color: '#e5f5e0', range: '> 0.8' },           // Very light green for > 0.8
];

// Define a mapping of indices to their corresponding color schemes
const indexToColorScheme = {
	heat_index: heatColors,
	flood_index: floodColors,
	sensitivity: heatColors, // Sensitivity uses heat coloring
	flood_exposure: greenSpaceColors,
	flood_prepare: floodColors,
	flood_respond: floodColors,
	flood_recover: floodColors,
	heat_exposure: heatColors,
	heat_prepare: heatColors,
	heat_respond: heatColors,
	age: heatColors, // Age uses heat coloring
	income: heatColors, // Income uses heat coloring
	info: heatColors, // Info uses heat coloring
	tenure: heatColors, // Tenure uses heat coloring
	green: greenSpaceColors, // Green areas use heat coloring
	social_networks: floodColors, // Social networks use flood coloring
	overcrowding: floodColors, // Overcrowding uses flood coloring
};

// Watcher to load or remove grid data source based on `showGrid` state
watch( showGrid, async ( newValue ) => {
	if ( newValue ) {
		updateGridColors( 'heat_index' ); // Initial color update
	}
} );

// Function to check password and show grid if correct
const checkPassword = async () => {
	if ( enteredPassword.value === correctPassword ) {
		showPasswordDialog.value = false;
		showGrid.value = true;
		await loadGrid();
	} else {
		console.error( 'Incorrect password' );
	}
};

// Function to load the GeoJSON data source
const loadGrid = async () => {
	const dataSourceService = new DataSource();
	dataSourceService.changeDataSourceShowByName( 'PopulationGrid', false );
	await dataSourceService.loadGeoJsonDataSource(
		0.8,
		'./assets/data/r4c_stats_grid_index.json',
		'250m_grid'
	);
	updateGridColors( 'heat_index' ); // Initial color update

};

const handleMissingValues = (entity, selectedIndex) => {
    const isMissingValues = entity.properties['missing_values']?.getValue();
    if (isMissingValues && selectedIndex !== 'flood_exposure' && selectedIndex !== 'avgheatexposure' && selectedIndex !== 'green') {
        entity.polygon.material = Cesium.Color.fromCssColorString('#A9A9A9').withAlpha(0.8);
    }
    return isMissingValues;
};

const handleAvgHeatExposure = (entity, selectedIndex) => {
	if ( selectedIndex === 'combined_avgheatexposure' ) {
		handleCombinedAvgHeatExposure( entity );
	} else {
    	const avgHeatExposureValue = entity.properties['avgheatexposure']?.getValue();
    	if (avgHeatExposureValue !== undefined) {
        	entity.polygon.material = new Cesium.Color(
            	1,
            	1 - avgHeatExposureValue,
            	0,
            	avgHeatExposureValue
        	);
    	} 	
	}
};

const handleCombinedAvgHeatExposure = (entity) => {
    const avgHeatExposureValue = entity.properties['avgheatexposure']?.getValue();
    if (avgHeatExposureValue !== undefined) {
        entity.polygon.material = new Cesium.Color(
            1,
            1 - avgHeatExposureValue,
            0,
            avgHeatExposureValue
        );
        const heat_index = entity.properties['heat_index']?.getValue();
        if (heat_index !== undefined) {
            entity.polygon.extrudedHeight = heat_index * 250;
        }
    }
};

const handleCombinedHeatIndexAndAvgHeatExposure = (entity) => {
    const avgHeatExposureValue = entity.properties['avgheatexposure']?.getValue();
    const heatIndexValue = entity.properties['heat_index']?.getValue();

    if (avgHeatExposureValue !== undefined && heatIndexValue !== undefined && heatIndexValue !== null) {
        entity.polygon.material = getColorForIndex(heatIndexValue, 'heat_index');
        entity.polygon.extrudedHeight = avgHeatExposureValue * 250;
    } else {
        entity.polygon.material = Cesium.Color.WHITE.withAlpha(0.8);
    }
};

const handleCombinedIndices = (entity, selectedIndex) => {
    const heatIndexValue = entity.properties['heat_index']?.getValue();
    const floodIndexValue = entity.properties['flood_index']?.getValue();

    if (heatIndexValue !== undefined && floodIndexValue !== undefined && heatIndexValue !== null && floodIndexValue !== null) {
        if (selectedIndex === 'combined_heat_flood') {
            entity.polygon.material = getColorForIndex(heatIndexValue, 'heat_index');
            entity.polygon.extrudedHeight = floodIndexValue * 250;
        } else {
            entity.polygon.material = getColorForIndex(floodIndexValue, 'flood_index');
            entity.polygon.extrudedHeight = heatIndexValue * 250;
        }
    } else {
        entity.polygon.material = Cesium.Color.WHITE.withAlpha(0.8);
    }
};

const handleOtherIndices = (entity, selectedIndex) => {
    const dataAvailable = isDataAvailable(selectedIndex);
    const indexValue = dataAvailable ? entity.properties[selectedIndex]?.getValue() : undefined;
    const color = indexValue
        ? getColorForIndex(indexValue, selectedIndex)
        : Cesium.Color.WHITE.withAlpha(0.8);
    entity.polygon.material = color;
};

const handleCombinedHeatFloodGreen = (entity) => {
    const heatIndexValue = entity.properties['heat_index']?.getValue();
    const floodIndexValue = entity.properties['flood_index']?.getValue();
    const greenSpaceValue = entity.properties['green']?.getValue();


    if (heatIndexValue !== null && floodIndexValue !== null && greenSpaceValue !== null 
        && heatIndexValue !== undefined && floodIndexValue !== undefined 
        && greenSpaceValue !== undefined) {
	    // Set the polygon color based on the heat index
        entity.polygon.material = createStripedMaterial(heatIndexValue, floodIndexValue);
        
        // Extrude based on the green space index
        entity.polygon.extrudedHeight = greenSpaceValue * 250;
    } 
};

const updateGridColors = async (selectedIndex) => {
    const dataSourceService = new DataSource();
    const dataSource = dataSourceService.getDataSourceByName('250m_grid');
    if (!dataSource) return;

    const entities = dataSource.entities.values;

    for (const entity of entities) {
		entity.polygon.extrudedHeight = 0; 
		entity.polygon.material = Cesium.Color.WHITE.withAlpha(0.8);  // Default color for missing data

        if (handleMissingValues(entity, selectedIndex)) continue;

        if (selectedIndex === 'combined_heat_flood_green') {
            handleCombinedHeatFloodGreen(entity);  // Handle combined heat, flood, and green space
        } else if (selectedIndex === 'avgheatexposure') {
            handleAvgHeatExposure(entity, selectedIndex);
        } else if (selectedIndex === 'combined_avgheatexposure') {
            handleCombinedAvgHeatExposure(entity);
        } else if (selectedIndex === 'combined_heatindex_avgheatexposure') {
            handleCombinedHeatIndexAndAvgHeatExposure(entity);
        } else if (selectedIndex === 'combined_heat_flood' || selectedIndex === 'combined_flood_heat') {
            handleCombinedIndices(entity, selectedIndex);
        } else {
            handleOtherIndices(entity, selectedIndex);
        }
    }
};

// Function to create a striped pattern for heat (red) and flood (blue) indices
const createStripedMaterial = (heatIndex, floodIndex) => {
    const heatColor = getColorForIndex(heatIndex, 'heat_index');
    const floodColor = getColorForIndex(floodIndex, 'flood_index');

    return new Cesium.StripeMaterialProperty({
        evenColor: heatColor,
        oddColor: floodColor,
        repeat: 10, // Adjust the repeat value to control stripe thickness
        orientation: Cesium.StripeOrientation.HORIZONTAL // You can change to VERTICAL if preferred
    });
};

// Function to determine the color based on the index value
const getColorForIndex = ( indexValue, indexType ) => {
	const colorScheme = indexToColorScheme[indexType] || heatColors; // Default to heat colors
	if ( indexValue < 0.2 ) return Cesium.Color.fromCssColorString( colorScheme[0].color ).withAlpha( 0.8 );
	if ( indexValue < 0.4 ) return Cesium.Color.fromCssColorString( colorScheme[1].color ).withAlpha( 0.8 );
	if ( indexValue < 0.6 ) return Cesium.Color.fromCssColorString( colorScheme[2].color ).withAlpha( 0.8 );
	if ( indexValue < 0.8 ) return Cesium.Color.fromCssColorString( colorScheme[3].color ).withAlpha( 0.8 );
	return Cesium.Color.fromCssColorString( colorScheme[4].color ).withAlpha( 0.8 );
};

// On mount, show the password dialog
onMounted(() => {
  showPasswordDialog.value = true;
});

// Placeholder implementation for checking data availability
const isDataAvailable = ( selectedIndex ) => {
	return Object.keys( indexToColorScheme ).includes( selectedIndex );
};

// Function to cancel the password input and hide the grid
const cancelPassword = () => {
  	showPasswordDialog.value = false;
  	showGrid.value = false; // Ensure the grid is not shown
  	enteredPassword.value = ''; // Clear the entered password
  	toggleStore.setGrid250m( false );

};
</script>
