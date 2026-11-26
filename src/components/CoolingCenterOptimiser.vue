<template>
	<AdaptationToolSection
		class="cooling-center-optimisation"
		title="Optimize locations"
		description="Place a set of cooling centers automatically in the grid cells with the highest heat. Replaces any centers already placed."
	>
		<div class="d-flex align-center justify-space-between mb-1">
			<span
				id="optimiser-count-label"
				class="text-caption"
			>
				Number of centers
			</span>
			<span class="text-caption font-weight-medium">{{ numCoolingCenters }}</span>
		</div>
		<v-slider
			v-model="numCoolingCenters"
			min="1"
			max="50"
			step="1"
			color="primary"
			density="compact"
			hide-details
			aria-labelledby="optimiser-count-label"
		/>
		<div class="d-flex justify-space-between text-caption text-medium-emphasis mb-3">
			<span>1</span>
			<span>50</span>
		</div>

		<v-btn
			block
			color="primary"
			prepend-icon="mdi-auto-fix"
			class="text-none"
			@click="findOptimalCoolingCenters"
		>
			Optimize locations
		</v-btn>
	</AdaptationToolSection>
</template>

<script setup>
import * as turf from '@turf/turf'
import { ref } from 'vue'
import { getCesium } from '../services/cesiumProvider.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { useMitigationStore } from '../stores/mitigationStore'
import logger from '../utils/logger.js'
import AdaptationToolSection from './AdaptationToolSection.vue'

const numCoolingCenters = ref(25)
const mitigationStore = useMitigationStore()
const globalStore = useGlobalStore()
const { optimalEffect } = mitigationStore

let coolingCentersDataSource = globalStore.cesiumViewer.dataSources?.getByName('cooling_centers')[0]

/**
 * Builds a Map of grid_id → live Cesium entity from the `250m_grid` datasource.
 *
 * The mitigation store intentionally does NOT keep Cesium entity references on
 * its grid cells (see `setGridCells` — storing entities triggers `DataCloneError`
 * when Pinia state is cloned for the Cesium workers). The optimiser therefore
 * resolves the entity for a chosen cell from the live datasource at the moment
 * it's needed, keyed by the cell's `grid_id`.
 *
 * @returns {Map<string, import('cesium').Entity>} grid_id → entity lookup
 */
const buildGridEntityMap = () => {
	/** @type {Map<string, import('cesium').Entity>} */
	const entityMap = new Map()
	// cesiumViewer is null until the viewer finishes loading (globalStore inits
	// it to null); the optional chain lets this helper degrade gracefully to the
	// empty-map + warn path below instead of throwing if called too early.
	const gridDataSource = globalStore.cesiumViewer?.dataSources?.getByName('250m_grid')?.[0]
	if (!gridDataSource) {
		logger.warn(
			'[CoolingCenterOptimiser] "250m_grid" datasource not found; cannot resolve grid entities for cooling centers.'
		)
		return entityMap
	}
	for (const entity of gridDataSource.entities.values) {
		const gridId = entity.properties?.grid_id?.getValue()
		if (gridId != null) {
			entityMap.set(String(gridId), entity)
		}
	}
	return entityMap
}

const shuffleArray = (array) => {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[array[i], array[j]] = [array[j], array[i]]
	}
}

const removeOldData = async () => {
	const Cesium = getCesium()
	mitigationStore.resetStore()
	if (coolingCentersDataSource) {
		globalStore.cesiumViewer.dataSources.remove(coolingCentersDataSource, true)
	}
	coolingCentersDataSource = new Cesium.CustomDataSource('cooling_centers')
	globalStore.cesiumViewer.dataSources.add(coolingCentersDataSource)
}

const findOptimalCoolingCenters = async () => {
	await removeOldData()
	mitigationStore.setOptimised(true)
	// Resolve grid entities from the live datasource (the store cells don't carry
	// entity references — see buildGridEntityMap). Built once per run, not per cell.
	const gridEntityMap = buildGridEntityMap()
	const highImpactGrids = mitigationStore.gridCells.filter(
		(cell) => mitigationStore.getGridImpact(cell.id) > 4
	)
	const availableGrids = [...highImpactGrids]
	shuffleArray(availableGrids)

	for (let i = 0; i < numCoolingCenters.value; i++) {
		/** @type {import('../stores/mitigationStore.js').GridCell | null} */
		let bestCell = null
		let highestTotalReduction = -Infinity

		availableGrids.forEach((cell) => {
			const totalReduction = mitigationStore.getGridImpact(cell.id)
			if (totalReduction > highestTotalReduction) {
				highestTotalReduction = totalReduction
				bestCell = cell
			}
			if (totalReduction >= optimalEffect) return
		})

		if (bestCell) {
			// TS narrows `bestCell` to `never` here because its only visible assignment
			// happens inside the forEach closure (opaque to control-flow analysis), so
			// re-widen via the declared GridCell type before reading members.
			const selectedCell = /** @type {import('../stores/mitigationStore.js').GridCell} */ (bestCell)
			if (!isCoolingCenterTooClose(selectedCell)) {
				// Resolve the Cesium entity for this cell from the live datasource by
				// grid_id (the store does not keep entity references — see
				// buildGridEntityMap). Skip cells whose entity can't be found rather
				// than calling addCoolingCenter(undefined), which would throw.
				const entity = gridEntityMap.get(String(selectedCell.id))
				if (entity) {
					addCoolingCenter(entity)
				} else {
					logger.warn(
						`[CoolingCenterOptimiser] No grid entity found for cell "${selectedCell.id}"; skipping cooling center placement.`
					)
				}
				availableGrids.splice(availableGrids.indexOf(selectedCell), 1)
			} else {
				availableGrids.splice(availableGrids.indexOf(bestCell), 1)
				i--
			}
		}
	}
}

const isCoolingCenterTooClose = (newCell) => {
	for (const center of mitigationStore.coolingCenters) {
		const distance = Math.sqrt(
			(newCell.x - center.euref_x) ** 2 + (newCell.y - center.euref_y) ** 2
		)
		if (distance <= 500) return true
	}
	return false
}

// This function now correctly receives a full Cesium entity
const getEntityCentroid = (entity) => {
	if (!entity.polygon) return null
	const Cesium = getCesium()
	const polygonPositions = entity.polygon.hierarchy.getValue().positions
	const coordinates = polygonPositions.map((pos) => {
		const cartographic = Cesium.Cartographic.fromCartesian(pos)
		return [
			Cesium.Math.toDegrees(cartographic.longitude),
			Cesium.Math.toDegrees(cartographic.latitude),
		]
	})

	// Ensure the polygon is closed for turf.js
	if (
		coordinates.length > 0 &&
		(coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
			coordinates[0][1] !== coordinates[coordinates.length - 1][1])
	) {
		coordinates.push(coordinates[0])
	}

	const polygon = turf.polygon([coordinates])
	const centroid = turf.centroid(polygon)
	const [longitude, latitude] = centroid.geometry.coordinates
	return Cesium.Cartesian3.fromDegrees(longitude, latitude)
}

const addCoolingCenter = (entity) => {
	const Cesium = getCesium()
	const gridId = entity.properties.grid_id?.getValue()
	const euref_x = entity.properties.euref_x?.getValue()
	const euref_y = entity.properties.euref_y?.getValue()
	const entityId = `cooling_${gridId}_${mitigationStore.getCoolingCenterCount(gridId) + 1}`
	mitigationStore.addCoolingCenter({ grid_id: gridId, euref_x, euref_y, capacity: 1000, entityId })

	const cartesianPosition = getEntityCentroid(entity)
	if (!cartesianPosition) return // Stop if centroid could not be calculated

	const dimension = 160 // Simplified
	coolingCentersDataSource.entities.add({
		id: entityId,
		position: cartesianPosition,
		box: {
			dimensions: new Cesium.Cartesian3(dimension, dimension, dimension),
			material: Cesium.Color.BLUE.withAlpha(0.8),
		},
		// label removed for simplicity during debugging, can be added back
	})
}
</script>
