import { computed } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import * as Cesium from 'cesium';

// --- CENTRALIZED STYLING CONSTANTS ---
export const heatColors = [
    { color: '#ffffff', range: 'Incomplete data' },
    { color: '#A9A9A9', range: 'Missing values' },
    { color: '#ffffcc', range: '< 0.2' },
    { color: '#ffeda0', range: '0.2 - 0.4' },
    { color: '#feb24c', range: '0.4 - 0.6' },
    { color: '#f03b20', range: '0.6 - 0.8' },
    { color: '#bd0026', range: '> 0.8' },
];

export const partialHeatColors = heatColors.slice(2);

export const floodColors = [
    { color: '#ffffff', range: 'Incomplete data' },
    { color: '#A9A9A9', range: 'Missing values' },
    { color: '#c6dbef', range: '< 0.2' },
    { color: '#9ecae1', range: '0.2 - 0.4' },
    { color: '#6baed6', range: '0.4 - 0.6' },
    { color: '#3182bd', range: '0.6 - 0.8' },
    { color: '#08519c', range: '> 0.8' },
];

export const partialFloodColors = floodColors.slice(2);

export const greenSpaceColors = [
    { color: '#006d2c', range: '< 0.2' },
    { color: '#31a354', range: '0.2 - 0.4' },
    { color: '#74c476', range: '0.4 - 0.6' },
    { color: '#a1d99b', range: '0.6 - 0.8' },
    { color: '#e5f5e0', range: '> 0.8' },
];

export const bothColors = [
    { color: '#ffffff', range: 'Incomplete data' },
    { color: '#A9A9A9', range: 'Missing values' },
];

export const indexToColorScheme = {
    partialHeat: partialHeatColors,
    partialFlood: partialFloodColors,
    heat_index: heatColors,
    flood_index: floodColors,
    sensitivity: heatColors,
    flood_exposure: greenSpaceColors,
    flood_prepare: floodColors,
    flood_respond: floodColors,
    flood_recover: floodColors,
    heat_exposure: heatColors,
    heat_prepare: heatColors,
    heat_respond: heatColors,
    age: heatColors,
    income: heatColors,
    info: heatColors,
    tenure: heatColors,
    green: greenSpaceColors,
    social_networks: floodColors,
    overcrowding: floodColors,
    combined_heat_flood: heatColors,
    combined_flood_heat: floodColors,
    combined_heatindex_avgheatexposure: heatColors,
    combined_heat_flood_green: heatColors,
    both: bothColors,
};


/**
 * Composable that centralizes all logic for styling the main statistical grid.
 */
export function useGridStyling() {
    // --- STATE MANAGEMENT ---
    const globalStore = useGlobalStore();
    const propsStore = usePropsStore();
    const toggleStore = useToggleStore();
    
    const viewer = computed(() => globalStore.cesiumViewer);
    const ndviActive = computed(() => toggleStore.ndvi);
    const baseAlpha = computed(() => ndviActive.value ? 0.4 : 0.8);

    // --- HELPER FUNCTIONS ---
    const handleMissingValues = (entity, selectedIndex) => {
        const isMissingValues = entity.properties['missing_values']?.getValue();
        if (isMissingValues && selectedIndex !== 'flood_exposure' && selectedIndex !== 'avgheatexposure' && selectedIndex !== 'green') {
            if (entity.polygon) entity.polygon.material = Cesium.Color.fromCssColorString('#A9A9A9').withAlpha(baseAlpha.value);
        }
        return isMissingValues;
    };

    const getColorForIndex = (indexValue, indexType) => {
        const colorScheme = indexToColorScheme[indexType] || heatColors;
        // Find the correct color object based on the index value, ignoring the first two "missing data" entries
        const colorEntry = colorScheme.slice(2).find((entry, i, arr) => {
            const lowerBound = i * 0.2;
            return indexValue < lowerBound + 0.2;
        });
        const colorString = colorEntry ? colorEntry.color : colorScheme[colorScheme.length - 1].color;
        return Cesium.Color.fromCssColorString(colorString).withAlpha(baseAlpha.value);
    };
    
    // --- MAIN EXPOSED FUNCTION ---
    const updateGridColors = (selectedIndex) => {
        if (!viewer.value) return;
        const dataSource = viewer.value.dataSources.getByName('250m_grid')[0];
        if (!dataSource) return;

        console.log(`Updating grid colors based on index: '${selectedIndex}'`);

        for (const entity of dataSource.entities.values) {
            entity.show = true;

            if (entity.polygon) {
                entity.polygon.material = Cesium.Color.WHITE.withAlpha(baseAlpha.value);
            }

            if (handleMissingValues(entity, selectedIndex)) continue;

            // Note: This is a simplified restoration. The full implementation would require
            // porting all the complex `handleCombined...` logic into this composable.
            const indexValue = entity.properties[selectedIndex]?.getValue();
            if (indexValue !== undefined && indexValue !== null && entity.polygon) {
                entity.polygon.material = getColorForIndex(indexValue, selectedIndex);
            }
        }
    };

    return {
        updateGridColors
    };
}