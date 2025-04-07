<template><div/></template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import DataSource from '../services/datasource.js';
import * as Cesium from 'cesium';
import Camera from '../services/camera.js'; 
import { usePropsStore } from '../stores/propsStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import { useMitigationStore } from '../stores/mitigationStore';

// Reactive variables
const propsStore = usePropsStore();
const toggleStore = useToggleStore();
const mitigationStore = useMitigationStore();
const dataSourceService = new DataSource();

const coolingCenters = computed(() => mitigationStore.coolingCenters );
const { reachability, maxReduction, minReduction } = mitigationStore;
const statsIndex = computed( () => propsStore.statsIndex );
const ndviActive = computed( () => toggleStore.ndvi );
const baseAlpha = computed( () => ndviActive.value ? 0.4 : 0.8 );

// Watchers to update grid colors when NDVI or statsIndex changes
watch([statsIndex, ndviActive], () => {
  updateGridColors(statsIndex.value);
});

watch(coolingCenters, () => {
  if (statsIndex.value === 'heat_index') {
    mitigationStore.impact = 0;
    updateGridColors('heat_index');
  }
}, { deep: true });

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

// Function to load the GeoJSON data source
const loadGrid = async () => {
	dataSourceService.removeDataSourcesAndEntities();
	await dataSourceService.loadGeoJsonDataSource(
		0.8,
		'./assets/data/r4c_stats_grid_index.json',
		'250m_grid'
	);
};

const prepareMigitation = ( ) => {
    const dataSource = dataSourceService.getDataSourceByName('250m_grid');
    mitigationStore.setGridCells( dataSource ); 
    mitigationStore.preCalculateGridImpacts();
}

const handleMissingValues = (entity, selectedIndex) => {
    const isMissingValues = entity.properties['missing_values']?.getValue();
    if (isMissingValues && selectedIndex !== 'flood_exposure' && selectedIndex !== 'avgheatexposure' && selectedIndex !== 'green') {
        entity.polygon.material = Cesium.Color.fromCssColorString('#A9A9A9').withAlpha( baseAlpha.value );
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
        entity.polygon.material = Cesium.Color.WHITE.withAlpha( baseAlpha.value );
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
        entity.polygon.material = Cesium.Color.WHITE.withAlpha( baseAlpha.value );
    }
};

const handleOtherIndices = (entity, selectedIndex) => {

    if ( selectedIndex === 'heat_index' ) {
        heatIndex( entity );
    } else {
    const dataAvailable = isDataAvailable(selectedIndex);
    const indexValue = dataAvailable ? entity.properties[selectedIndex]?.getValue() : undefined;
    const color = indexValue
        ? getColorForIndex(indexValue, selectedIndex)
        : Cesium.Color.WHITE.withAlpha( baseAlpha.value );
    entity.polygon.material = color;
    }
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

const heatIndex = ( entity ) => {

    let heatIndexValue = entity.properties['heat_index']?.getValue();
    if ( heatIndexValue !== undefined && heatIndexValue !== null ) {
        const euref_x = entity.properties[ 'euref_x' ]?.getValue();
        const euref_y = entity.properties[ 'euref_y' ]?.getValue();
                
        let reduction = 0; 
        const coolingCentersList = coolingCenters.value
                
        for ( let i = 0; i < coolingCentersList.length; i++ ) {

            const center = coolingCentersList[ i ];

            // **Euclidean Distance Formula**
            const distance = Math.sqrt(
                Math.pow( center.euref_x - euref_x, 2 ) + Math.pow( center.euref_y - euref_y, 2)
            );

            const currentReduction = getReductionValue( distance );
            
            if ( currentReduction > 0 ) {
                reduction += currentReduction;
                mitigationStore.addCell( entity.properties[ 'grid_id' ]?.getValue() );
                mitigationStore.addImpact( currentReduction );

            }
        }

        heatIndexValue = Math.max( 0, heatIndexValue - reduction );
        entity.polygon.material = getColorForIndex( heatIndexValue, 'heat_index' );

    }
}

const getReductionValue = (distance) => {
    if ( distance > reachability ) return 0;

    return maxReduction - ( distance / reachability ) * ( maxReduction - minReduction );
};

const updateGridColors = async (selectedIndex) => {
    const dataSourceService = new DataSource();
    const dataSource = dataSourceService.getDataSourceByName('250m_grid');

    if (!dataSource) return;

    const entities = dataSource.entities.values;

    for (const entity of entities) {
		entity.polygon.extrudedHeight = 0; 
		entity.polygon.material = Cesium.Color.WHITE.withAlpha( baseAlpha.value );  // Default color for missing data

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
        evenColor: floodColor,
        oddColor: heatColor,
        repeat: 10, // Adjust the repeat value to control stripe thickness
        orientation: Cesium.StripeOrientation.HORIZONTAL // You can change to VERTICAL if preferred
    });
};

// Function to determine the color based on the index value
const getColorForIndex = ( indexValue, indexType ) => {
	const colorScheme = indexToColorScheme[indexType] || heatColors; // Default to heat colors
	if ( indexValue < 0.2 ) return Cesium.Color.fromCssColorString( colorScheme[0].color ).withAlpha( baseAlpha.value );
	if ( indexValue < 0.4 ) return Cesium.Color.fromCssColorString( colorScheme[1].color ).withAlpha( baseAlpha.value );
	if ( indexValue < 0.6 ) return Cesium.Color.fromCssColorString( colorScheme[2].color ).withAlpha( baseAlpha.value );
	if ( indexValue < 0.8 ) return Cesium.Color.fromCssColorString( colorScheme[3].color ).withAlpha( baseAlpha.value );
	return Cesium.Color.fromCssColorString( colorScheme[4].color ).withAlpha( baseAlpha.value );
};

onMounted(async () => {
    const cameraService = new Camera();
    cameraService.switchTo3DGrid();
    try {
        await loadGrid(); // Wait for loadGrid to complete
        await updateGridColors( propsStore.statsIndex ); // Initial color update
        prepareMigitation();
    } catch (error) {
        console.error('Error loading grid:', error);
    }
});

// Placeholder implementation for checking data availability
const isDataAvailable = ( selectedIndex ) => {
	return Object.keys( indexToColorScheme ).includes( selectedIndex );
};
</script>
