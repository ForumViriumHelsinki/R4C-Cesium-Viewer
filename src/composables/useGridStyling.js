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
	 *
	 * Styling runs as a SINGLE non-yielding pass — a plain synchronous `for`
	 * loop wrapped in `entities.suspendEvents()` / `resumeEvents()`. A bare loop
	 * is used deliberately instead of `processBatchAdaptive`: with yielding
	 * disabled the batcher adds only overhead (per-batch array slicing, promise
	 * wrapping, timing, and calibration) without changing behaviour, and the
	 * loop makes the "no intermediate frames" guarantee explicit.
	 *
	 * WO-3 measured this pass as super-linear (3,291→6,710 entities = 2.04×
	 * entities but ~7× time; ~412 ms at 6,710 on an M4 Pro). The cause was the
	 * `scheduler.yield()` between adaptive batches: each yield released an
	 * animation frame, and under requestRenderMode that frame REBUILT the
	 * polygon-material primitives dirtied by the previous batch. Across the pass
	 * that is O(N) interleaved render/rebuilds whose per-frame cost grows with
	 * the accumulated dirty set — the cliff. Dropping the per-batch yield removes
	 * every intermediate frame, so no material rebuild happens until the whole
	 * pass is done; benchmarking shows 6,710-entity styling fall from ~412 ms to
	 * ~127 ms and the 3,291→6,710 scaling fall from ~6.8× to ~2.6×.
	 *
	 * `suspendEvents()`/`resumeEvents()` additionally collapses the per-entity
	 * `collectionChanged` notifications into one on resume, and the final
	 * `requestRender()` flushes the single batched material rebuild. The
	 * end-state visual output is unchanged — only the transition stops animating
	 * colour-by-colour and snaps once at the end (a one-off ~127 ms main-thread
	 * pass for the full 6,710-cell grid, versus ~412 ms of interleaved jank).
	 *
	 * NOTE: keep the per-entity `polygon.material = <Color>` assignment as a
	 * REPLACEMENT. Reusing the existing `ColorMaterialProperty` and `setValue()`-
	 * ing its colour in place (the obvious "avoid the allocation" idea) is a
	 * Cesium antipattern here — it pegs the `StaticGeometryColorBatch` and is
	 * dramatically slower (measured: tens of seconds at 6,710) than letting
	 * Cesium swap the material property.
	 *
	 * @param {string} selectedIndex - The selected vulnerability index
	 * @returns {Promise<void>}
	 */
	const updateGridColors = async (selectedIndex) => {
		if (!viewer.value) return
		const dataSource = viewer.value.dataSources.getByName('250m_grid')[0]
		if (!dataSource) return

		const collection = dataSource.entities
		const entities = collection.values

		collection.suspendEvents()
		try {
			for (let i = 0; i < entities.length; i++) {
				styleGridEntity(entities[i], selectedIndex)
			}
		} finally {
			collection.resumeEvents()
		}

		// Flush the single batched material rebuild now that events have resumed.
		viewer.value.scene?.requestRender?.()
	}

	return {
		updateGridColors,
	}
}
