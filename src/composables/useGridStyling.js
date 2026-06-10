/**
 * @module composables/useGridStyling
 * Handles heat vulnerability, flood vulnerability, social indices, and combined visualizations
 * with dynamic color schemes and 3D extrusion based on selected indices.
 */

import { computed, watch } from 'vue'
import { getCesium } from '../services/cesiumProvider.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { useMitigationStore } from '../stores/mitigationStore.js'
import { usePropsStore } from '../stores/propsStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import { processBatchAdaptive } from '../utils/batchProcessor.js'
// Color scheme constants + the value→hex threshold mapping are the single
// source of truth in utils/gridColorMapping.js so the deck.gl renderer spike
// (components/DeckGlGridView.vue) shares the exact same palette without forking.
// Re-exported here to preserve the existing import surface for consumers
// (e.g. StatisticalGridOptions.vue imports `indexToColorScheme` from this module).
import { getGridColorString } from '../utils/gridColorMapping.js'

export {
	bothColors,
	floodColors,
	greenSpaceColors,
	heatColors,
	indexToColorScheme,
	partialFloodColors,
	partialHeatColors,
} from '../utils/gridColorMapping.js'

/**
 * A 250m grid entity as loaded from GeoJSON.
 *
 * The entity always has a `polygon` graphics object and a `properties` bag in
 * this code path (grid features are guaranteed to be polygons with attributes),
 * but Cesium's typings mark both as optional and type `material`/`extrudedHeight`
 * as `Property`. At runtime Cesium coerces a raw `Color`/`number` assignment into
 * the corresponding `ConstantProperty`/material, so the writable shape below
 * reflects what is actually assignable. Guards still narrow the optional members.
 *
 * @typedef {Object} GridPolygon
 * @property {*} material - Accepts a Cesium.Color or MaterialProperty (coerced at runtime)
 * @property {number} extrudedHeight - Accepts a raw number (coerced at runtime)
 *
 * @typedef {Object} GridEntity
 * @property {GridPolygon} [polygon]
 * @property {Object<string, { getValue: () => * }>} [properties]
 * @property {boolean} [show]
 */

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
 * - Batch processing for UI responsiveness
 *
 * @returns {{updateGridColors: (selectedIndex: string) => Promise<void>}} Grid styling functions
 *
 * @example
 * import { useGridStyling } from '@/composables/useGridStyling';
 * const { updateGridColors } = useGridStyling();
 * await updateGridColors('heat_index'); // Apply heat vulnerability colors
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

	// --- COLOR CACHE ---
	// Cache Cesium.Color objects keyed by "colorString-alpha" to reduce GC pressure
	const colorCache = new Map()

	const getCachedColor = (colorString, alpha) => {
		const Cesium = getCesium()
		const key = `${colorString}-${alpha.toFixed(2)}`
		if (!colorCache.has(key)) {
			colorCache.set(key, Cesium.Color.fromCssColorString(colorString).withAlpha(alpha))
		}
		return colorCache.get(key)
	}

	// Clear cache when baseAlpha changes (NDVI toggle)
	watch(baseAlpha, () => {
		colorCache.clear()
	})

	// --- HELPER FUNCTIONS ---
	const handleMissingValues = (entity, selectedIndex) => {
		const isMissingValues = entity.properties.missing_values?.getValue()
		if (
			isMissingValues &&
			selectedIndex !== 'flood_exposure' &&
			selectedIndex !== 'avgheatexposure' &&
			selectedIndex !== 'green'
		) {
			if (entity.polygon) entity.polygon.material = getCachedColor('#A9A9A9', baseAlpha.value)
		}
		return isMissingValues
	}

	/**
	 * Gets the color for a given index value using threshold-based lookup.
	 * Uses direct threshold comparison instead of slice().find() to avoid array allocation.
	 *
	 * @param {number} indexValue - The index value (0-1 range)
	 * @param {string} indexType - The index type key for color scheme lookup
	 * @returns {Cesium.Color} Cached color for the value
	 */
	const getColorForIndex = (indexValue, indexType) => {
		// Shared threshold→hex mapping (utils/gridColorMapping.js); wrap the
		// returned hex in a cached Cesium.Color to reduce GC pressure.
		return getCachedColor(getGridColorString(indexValue, indexType), baseAlpha.value)
	}

	// --- ENTITY STYLING FUNCTION ---
	/**
	 * Styles a single grid entity based on the selected index.
	 * Extracted from updateGridColors loop body for batch processing.
	 *
	 * @param {GridEntity} entity - The entity to style
	 * @param {string} selectedIndex - The selected vulnerability index
	 */
	const styleGridEntity = (entity, selectedIndex) => {
		// Grid features always have a polygon + properties; guard for the type system.
		if (!entity.polygon || !entity.properties) return

		// Reset state for each entity
		entity.polygon.extrudedHeight = 0
		entity.polygon.material = getCachedColor('#FFFFFF', baseAlpha.value)

		if (handleMissingValues(entity, selectedIndex)) return

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
			const Cesium = getCesium()
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
			const Cesium = getCesium()
			const avgHeat = entity.properties.final_avg_conditional?.getValue()
			if (avgHeat != null) {
				entity.polygon.material = new Cesium.Color(1, 1 - avgHeat, 0, avgHeat)
			}
		} else if (selectedIndex === 'combined_avgheatexposure') {
			const Cesium = getCesium()
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
		} else if (selectedIndex === 'combined_heat_flood' || selectedIndex === 'combined_flood_heat') {
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

	// --- MAIN EXPOSED FUNCTION ---
	/**
	 * Updates grid entity colors based on the selected vulnerability index.
	 * Uses adaptive batch processing to maintain UI responsiveness.
	 *
	 * @param {string} selectedIndex - The selected vulnerability index
	 * @returns {Promise<void>}
	 */
	const updateGridColors = async (selectedIndex) => {
		if (!viewer.value) return
		const dataSource = viewer.value.dataSources.getByName('250m_grid')[0]
		if (!dataSource) return

		const entities = dataSource.entities.values

		await processBatchAdaptive(entities, (entity) => styleGridEntity(entity, selectedIndex), {
			processorName: 'gridStyling',
		})
	}

	return {
		updateGridColors,
	}
}
