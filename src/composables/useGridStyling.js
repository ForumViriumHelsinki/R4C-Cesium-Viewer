/**
 * @module composables/useGridStyling
 * Handles heat vulnerability, flood vulnerability, social indices, and combined visualizations
 * with dynamic color schemes and 3D extrusion based on selected indices.
 */

import * as Cesium from 'cesium'
import { computed } from 'vue'
import { useGlobalStore } from '../stores/globalStore.js'
import { useMitigationStore } from '../stores/mitigationStore.js'
import { usePropsStore } from '../stores/propsStore.js'
import { useToggleStore } from '../stores/toggleStore.js'

/**
 * Heat vulnerability color scale (white → dark red)
 */
export const heatColors = [
	{ color: '#ffffff', range: 'Incomplete data' },
	{ color: '#A9A9A9', range: 'Missing values' },
	{ color: '#ffffcc', range: '< 0.2' },
	{ color: '#ffeda0', range: '0.2 - 0.4' },
	{ color: '#feb24c', range: '0.4 - 0.6' },
	{ color: '#f03b20', range: '0.6 - 0.8' },
	{ color: '#bd0026', range: '> 0.8' },
]
export const partialHeatColors = heatColors.slice(2)
export const floodColors = [
	{ color: '#ffffff', range: 'Incomplete data' },
	{ color: '#A9A9A9', range: 'Missing values' },
	{ color: '#c6dbef', range: '< 0.2' },
	{ color: '#9ecae1', range: '0.2 - 0.4' },
	{ color: '#6baed6', range: '0.4 - 0.6' },
	{ color: '#3182bd', range: '0.6 - 0.8' },
	{ color: '#08519c', range: '> 0.8' },
]
export const partialFloodColors = floodColors.slice(2)
export const greenSpaceColors = [
	{ color: '#006d2c', range: '< 0.2' },
	{ color: '#31a354', range: '0.2 - 0.4' },
	{ color: '#74c476', range: '0.4 - 0.6' },
	{ color: '#a1d99b', range: '0.6 - 0.8' },
	{ color: '#e5f5e0', range: '> 0.8' },
]
export const bothColors = [
	{ color: '#ffffff', range: 'Incomplete data' },
	{ color: '#A9A9A9', range: 'Missing values' },
]

// ** THE FIX IS HERE: The map is now complete **
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
	avgheatexposure: [{ color: 'gradient', range: 'Heat Exposure' }],
	combined_avgheatexposure: [{ color: 'gradient', range: 'Combined Heat Exposure' }],
}

/**
 * Vue 3 composable for 250m statistical grid visualization styling
 * Centralizes all color scheme logic, index-based styling, and 3D extrusion.
 * Supports heat/flood vulnerability indices, social vulnerability factors,
 * combined visualizations, and mitigation impact calculations.
 *
 * Features:
 * - 17+ vulnerability index types
 * - Dynamic color schemes per index
 * - 3D extrusion for combined visualizations
 * - NDVI-aware opacity adjustment
 * - Missing data handling
 * - Mitigation impact integration
 * - Gradient and stripe material patterns
 *
 * @returns {{updateGridColors: (selectedIndex: string) => void}} Grid styling functions
 *
 * @example
 * import { useGridStyling } from '@/composables/useGridStyling';
 * const { updateGridColors } = useGridStyling();
 * updateGridColors('heat_index'); // Apply heat vulnerability colors
 */
export function useGridStyling() {
	// --- STATE MANAGEMENT ---
	const globalStore = useGlobalStore()
	const _propsStore = usePropsStore()
	const toggleStore = useToggleStore()
	const mitigationStore = useMitigationStore()

	const viewer = computed(() => globalStore.cesiumViewer)
	const ndviActive = computed(() => toggleStore.ndvi)
	const baseAlpha = computed(() => (ndviActive.value ? 0.4 : 0.8))

	// --- HELPER FUNCTIONS ---
	const handleMissingValues = (entity, selectedIndex) => {
		const isMissingValues = entity.properties.missing_values?.getValue()
		if (
			isMissingValues &&
			selectedIndex !== 'flood_exposure' &&
			selectedIndex !== 'avgheatexposure' &&
			selectedIndex !== 'green'
		) {
			if (entity.polygon)
				entity.polygon.material = Cesium.Color.fromCssColorString('#A9A9A9').withAlpha(
					baseAlpha.value
				)
		}
		return isMissingValues
	}

	const getColorForIndex = (indexValue, indexType) => {
		const colorScheme = indexToColorScheme[indexType] || heatColors
		// Find the correct color object based on the index value, ignoring the first two "missing data" entries
		const colorEntry = colorScheme.slice(2).find((_entry, i, _arr) => {
			const lowerBound = i * 0.2
			return indexValue < lowerBound + 0.2
		})
		const colorString = colorEntry ? colorEntry.color : colorScheme[colorScheme.length - 1].color
		return Cesium.Color.fromCssColorString(colorString).withAlpha(baseAlpha.value)
	}

	// --- MAIN EXPOSED FUNCTION ---
	const updateGridColors = (selectedIndex) => {
		if (!viewer.value) return
		const dataSource = viewer.value.dataSources.getByName('250m_grid')[0]
		if (!dataSource) return

		for (const entity of dataSource.entities.values) {
			// Reset state for each entity
			entity.polygon.extrudedHeight = 0
			entity.polygon.material = Cesium.Color.WHITE.withAlpha(baseAlpha.value)

			if (handleMissingValues(entity, selectedIndex)) continue

			if (selectedIndex === 'heat_index') {
				const originalHeatIndex = entity.properties.heat_index?.getValue()
				if (originalHeatIndex != null) {
					const reduction = mitigationStore.calculateTotalReductionForCell(entity)
					const newHeatIndex = Math.max(0, originalHeatIndex - reduction)

					if (reduction > 0) {
						// Correctly update the global state
						mitigationStore.addImpact(reduction)
						mitigationStore.addCell(entity.properties.grid_id.getValue())
					}

					if (entity.polygon) {
						entity.polygon.material = getColorForIndex(newHeatIndex, 'heat_index')
					}
				}
			} else if (selectedIndex === 'combined_heat_flood_green') {
				const heat = entity.properties.heat_index?.getValue()
				const flood = entity.properties.flood_index?.getValue()
				const green = entity.properties.green?.getValue()
				if (heat != null && flood != null && green != null) {
					entity.polygon.material = new Cesium.StripeMaterialProperty({
						evenColor: getColorForIndex(flood, 'flood_index'),
						oddColor: getColorForIndex(heat, 'heat_index'),
						repeat: 10,
					})
					entity.polygon.extrudedHeight = green * 250
				}
			} else if (selectedIndex === 'avgheatexposure') {
				const avgHeat = entity.properties.final_avg_conditional?.getValue()
				if (avgHeat != null) {
					entity.polygon.material = new Cesium.Color(1, 1 - avgHeat, 0, avgHeat)
				}
			} else if (selectedIndex === 'combined_avgheatexposure') {
				const avgHeat = entity.properties.final_avg_conditional?.getValue()
				const heatIndex = entity.properties.heat_index?.getValue()
				if (avgHeat != null && heatIndex != null) {
					entity.polygon.material = new Cesium.Color(1, 1 - avgHeat, 0, avgHeat)
					entity.polygon.extrudedHeight = heatIndex * 250
				}
			} else if (selectedIndex === 'combined_heatindex_avgheatexposure') {
				const avgHeat = entity.properties.final_avg_conditional?.getValue()
				const heatIndex = entity.properties.heat_index?.getValue()
				if (avgHeat != null && heatIndex != null) {
					entity.polygon.material = getColorForIndex(heatIndex, 'heat_index')
					entity.polygon.extrudedHeight = avgHeat * 250
				}
			} else if (
				selectedIndex === 'combined_heat_flood' ||
				selectedIndex === 'combined_flood_heat'
			) {
				const heat = entity.properties.heat_index?.getValue()
				const flood = entity.properties.flood_index?.getValue()
				if (heat != null && flood != null) {
					if (selectedIndex === 'combined_heat_flood') {
						entity.polygon.material = getColorForIndex(heat, 'heat_index')
						entity.polygon.extrudedHeight = flood * 250
					} else {
						entity.polygon.material = getColorForIndex(flood, 'flood_index')
						entity.polygon.extrudedHeight = heat * 250
					}
				}
			} else {
				// Handle all other simple indices
				const indexValue = entity.properties[selectedIndex]?.getValue()
				if (indexValue !== undefined && indexValue !== null && entity.polygon) {
					entity.polygon.material = getColorForIndex(indexValue, selectedIndex)
				}
			}
		}
	}

	return {
		updateGridColors,
	}
}
