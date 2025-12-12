<template>
	<v-container class="landcover-to-parks">
		<v-card
			elevation="2"
			class="pa-4"
		>
			<v-card-title>Create Parks</v-card-title>
			<v-card-text>
				<p class="text-caption mb-4">
					Grid cells are colored by heat index (Blue = Cool, Red = Hot). Select a cell to load
					convertible landcover areas.
				</p>

				<v-row class="mt-2">
					<v-col cols="6">
						<v-btn
							color="primary"
							:loading="isLoading"
							:class="{ 'active-btn': isSelectingGrid }"
							block
							class="mt-2 text-none"
							@click="handlePrimaryButtonClick"
						>
							{{ primaryButtonText }}
						</v-btn>
					</v-col>
					<v-col cols="6">
						<v-btn
							color="error"
							block
							class="mt-2 text-none"
							@click="handleResetOrCancel"
						>
							{{ resetOrCancelButtonText }}
						</v-btn>
					</v-col>
				</v-row>

				<div
					v-if="calculationResults"
					class="mt-4"
				>
					<v-divider class="mb-3" />
					<p class="text-subtitle-2">Estimated Impact</p>
					<v-table
						density="compact"
						class="mt-2"
					>
						<tbody>
							<tr>
								<td>{{ calculationResults.selectedIndexName }} (Initial)</td>
								<td>{{ calculationResults.initialIndex }}</td>
							</tr>
							<tr>
								<td>Area Converted (This Turn)</td>
								<td>{{ calculationResults.area }} ha</td>
							</tr>
							<tr>
								<td>Neighbor Cells Cooled (This Turn)</td>
								<td>{{ calculationResults.neighborsAffected }}</td>
							</tr>
							<tr>
								<td>Heat Index Reduction (This Turn)</td>
								<td class="font-weight-bold text-green">
									-{{ calculationResults.totalReduction }}
								</td>
							</tr>
							<tr>
								<td>{{ calculationResults.selectedIndexName }} (New Cumulative)</td>
								<td class="font-weight-bold">
									{{ calculationResults.newIndex }}
								</td>
							</tr>
							<tr class="font-weight-bold">
								<td>Cumulative Cooling Area</td>
								<td>{{ calculationResults.cumulativeCoolingArea }} ha</td>
							</tr>
							<tr class="font-weight-bold text-green">
								<td>Cumulative Heat Reduction</td>
								<td>-{{ calculationResults.cumulativeHeatReduction }}</td>
							</tr>
						</tbody>
					</v-table>
				</div>
			</v-card-text>
		</v-card>
	</v-container>
</template>

<script setup>
import * as Cesium from 'cesium'
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { useGridStyling } from '../composables/useGridStyling.js'
import { useIndexData } from '../composables/useIndexData.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { useMitigationStore } from '../stores/mitigationStore.js'
import { usePropsStore } from '../stores/propsStore.js'
import { useURLStore } from '../stores/urlStore.js'

// --- STATE MANAGEMENT ---
const globalStore = useGlobalStore()
const propsStore = usePropsStore()
const urlStore = useURLStore()
const mitigationStore = useMitigationStore()
const viewer = computed(() => globalStore.cesiumViewer)
const statsIndex = computed(() => propsStore.statsIndex)
const { updateGridColors: restoreGridColoring } = useGridStyling()
const { getIndexInfo } = useIndexData()

const isSelectingGrid = ref(false)
const isLoading = ref(false)
const dataSourceName = 'landcover_for_parks'
const gridDataSourceName = '250m_grid'
const selectedGridEntity = shallowRef(null) // Cesium Entity - use shallowRef to prevent deep reactivity
const originalGridColor = ref(null)
const landcoverFeaturesLoaded = ref(false)
const loadedGeoJson = ref(null)
const loadedLandcoverDataSource = shallowRef(null) // Cesium DataSource - use shallowRef to prevent deep reactivity
const calculationResults = ref(null)
const convertedCellIds = ref([])
const modifiedHeatIndices = ref(new Map())
const convertedParkDataSources = shallowRef([]) // Array of Cesium DataSources - use shallowRef to prevent deep reactivity

// --- DYNAMIC UI ---
const primaryButtonText = computed(() => {
	if (landcoverFeaturesLoaded.value) return 'Turn to Parks'
	if (isSelectingGrid.value) return '...'
	return 'Select'
})

// ** NEW: Dynamic text for the reset/cancel button **
const resetOrCancelButtonText = computed(() => {
	return landcoverFeaturesLoaded.value ? 'Cancel' : 'Reset All'
})

const handlePrimaryButtonClick = () => {
	if (landcoverFeaturesLoaded.value) {
		turnToParks()
	} else {
		toggleSelectionMode()
	}
}

// ** NEW: Handler for the dual-purpose reset/cancel button **
const handleResetOrCancel = () => {
	if (landcoverFeaturesLoaded.value) {
		// If we are in a selection state, just clear the current selection (Cancel)
		clearCurrentSelection()
	} else {
		// Otherwise, perform a full reset of the simulation
		fullReset()
	}
}

// --- UI ACTIONS ---
const toggleSelectionMode = () => {
	isSelectingGrid.value = !isSelectingGrid.value
	if (!isSelectingGrid.value) isLoading.value = false
}

const clearCurrentSelection = () => {
	isLoading.value = false
	isSelectingGrid.value = false

	if (loadedLandcoverDataSource.value) {
		viewer.value.dataSources.remove(loadedLandcoverDataSource.value, true)
	}

	const gridDataSource = viewer.value.dataSources.getByName(gridDataSourceName)[0]
	if (selectedGridEntity.value && originalGridColor.value && gridDataSource) {
		gridDataSource.entities.collectionChanged.removeEventListener(filterGridEntities)
		selectedGridEntity.value.polygon.material = originalGridColor.value
		gridDataSource.entities.collectionChanged.addEventListener(filterGridEntities)
	}

	selectedGridEntity.value = null
	originalGridColor.value = null
	landcoverFeaturesLoaded.value = false
	loadedLandcoverDataSource.value = null
	loadedGeoJson.value = null
	calculationResults.value = null
}

const fullReset = () => {
	clearCurrentSelection()

	convertedParkDataSources.value.forEach((dataSource) => {
		viewer.value.dataSources.remove(dataSource, true)
	})
	convertedParkDataSources.value = []

	if (convertedCellIds.value.length > 0) {
		convertedCellIds.value = []
		modifiedHeatIndices.value.clear()

		const gridDataSource = viewer.value.dataSources.getByName(gridDataSourceName)[0]
		if (gridDataSource) {
			gridDataSource.entities.collectionChanged.removeEventListener(filterGridEntities)
			filterGridEntities() // Restore the blue-red heat map
			gridDataSource.entities.collectionChanged.addEventListener(filterGridEntities)
		}
	}
}

// --- CORE LOGIC ---
const handleMapClick = async (clickEvent) => {
	if (!isSelectingGrid.value) return

	const scene = viewer.value.scene
	const pickedObject = scene.pick(clickEvent.position)

	if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.properties) {
		const gridId = pickedObject.id.properties.grid_id?.getValue()

		if (convertedCellIds.value.includes(gridId)) {
			isSelectingGrid.value = false
			return
		}

		clearCurrentSelection()

		const clickedEntity = pickedObject.id
		const gridDataSource = viewer.value.dataSources.getByName(gridDataSourceName)[0]

		if (gridId && clickedEntity.polygon && gridDataSource) {
			isLoading.value = true
			isSelectingGrid.value = false

			gridDataSource.entities.collectionChanged.removeEventListener(filterGridEntities)

			selectedGridEntity.value = clickedEntity
			originalGridColor.value = clickedEntity.polygon.material
			clickedEntity.polygon.material = Cesium.Color.WHITE.withAlpha(0.75)

			gridDataSource.entities.collectionChanged.addEventListener(filterGridEntities)

			await loadLandcoverData(gridId)
			isLoading.value = false
		}
	}
}

const getHeatColor = (value) => {
	let r, g, b
	const alpha = 0.65
	const clampedValue = Math.max(0, Math.min(1, value))

	if (clampedValue < 0.5) {
		let interp = clampedValue * 2
		interp = interp * interp
		r = interp
		g = interp
		b = 1.0
	} else {
		let interp = (clampedValue - 0.5) * 2
		interp = Math.sqrt(interp)
		r = 1.0
		g = 1.0 - interp
		b = 1.0 - interp
	}
	return new Cesium.Color(r, g, b, alpha)
}

const applyDynamicStyling = (dataSource) => {
	const entities = dataSource.entities.values
	for (const entity of entities) {
		if (!entity.polygon) continue
		const koodi = entity.properties.koodi?.getValue()
		let color
		if (koodi === '130') {
			color = Cesium.Color.fromCssColorString('#857976')
		} else if (koodi === '410') {
			color = Cesium.Color.fromCssColorString('#cd853f')
		} else {
			color = Cesium.Color.LIGHTSLATEGRAY
		}
		entity.polygon.material = color.withAlpha(0.7)
	}
}

const loadLandcoverData = async (gridId) => {
	const apiUrl = urlStore.landcoverToParks(gridId)
	try {
		const response = await fetch(apiUrl)
		if (!response.ok) throw new Error(`API returned status ${response.status}`)
		const geojsonData = await response.json()

		if (geojsonData.features.length === 0) {
			alert(`No convertible landcover features found.`)
			if (selectedGridEntity.value && originalGridColor.value) {
				selectedGridEntity.value.polygon.material = originalGridColor.value
			}
			return
		}

		loadedGeoJson.value = geojsonData

		const defaultStyle = { stroke: Cesium.Color.BLACK.withAlpha(0.5), strokeWidth: 1 }
		const newDataSource = await Cesium.GeoJsonDataSource.load(geojsonData, defaultStyle)
		newDataSource.name = dataSourceName
		await viewer.value.dataSources.add(newDataSource)
		applyDynamicStyling(newDataSource)

		loadedLandcoverDataSource.value = newDataSource
		landcoverFeaturesLoaded.value = true
	} catch (error) {
		console.error('Failed to load landcover data:', error)
		alert('An error occurred while fetching landcover data.')
	}
}

const filterGridEntities = () => {
	const gridDataSource = viewer.value.dataSources.getByName(gridDataSourceName)[0]
	if (!gridDataSource) return
	for (const entity of gridDataSource.entities.values) {
		if (entity.properties?.final_avg_conditional?.getValue()) {
			entity.show = true
			const gridId = entity.properties.grid_id.getValue()
			const heatIndex = modifiedHeatIndices.value.has(gridId)
				? modifiedHeatIndices.value.get(gridId)
				: entity.properties.final_avg_conditional.getValue()

			if (entity.polygon) {
				entity.polygon.material = getHeatColor(heatIndex)
			}
		} else {
			entity.show = false
		}
	}
}

const turnToParks = () => {
	if (!loadedGeoJson.value || !selectedGridEntity.value) return

	const totalAreaConverted = loadedGeoJson.value.features.reduce((sum, feature) => {
		return sum + (feature.properties.area_m2 || 0)
	}, 0)

	const gridDataSource = viewer.value.dataSources.getByName(gridDataSourceName)[0]
	if (gridDataSource) {
		gridDataSource.entities.collectionChanged.removeEventListener(filterGridEntities)

		const currentIndexInfo = getIndexInfo(statsIndex.value)
		const sourceGridId = selectedGridEntity.value.properties.grid_id.getValue()

		const results = mitigationStore.calculateParksEffect(
			selectedGridEntity.value,
			totalAreaConverted
		)

		const entityMap = new Map()
		for (const entity of gridDataSource.entities.values) {
			const gridId = entity.properties.grid_id?.getValue()
			if (gridId) entityMap.set(gridId, entity)
		}

		let actualTotalReduction = 0

		results.heatReductions.forEach((reductionData) => {
			const entityToColor = entityMap.get(reductionData.grid_id)
			if (entityToColor) {
				const currentIndex = modifiedHeatIndices.value.has(reductionData.grid_id)
					? modifiedHeatIndices.value.get(reductionData.grid_id)
					: entityToColor.properties.final_avg_conditional.getValue()

				actualTotalReduction += reductionData.heatReduction

				const newIdx = Math.max(0, currentIndex - reductionData.heatReduction)
				modifiedHeatIndices.value.set(reductionData.grid_id, newIdx)
				const newColor = getHeatColor(newIdx)
				entityToColor.polygon.material = newColor

				if (entityToColor.id === selectedGridEntity.value.id) {
					originalGridColor.value = newColor
				}
			}
		})

		gridDataSource.entities.collectionChanged.addEventListener(filterGridEntities)

		const initialIndexForDisplay = modifiedHeatIndices.value.has(sourceGridId)
			? modifiedHeatIndices.value.get(sourceGridId) + results.sourceReduction
			: selectedGridEntity.value.properties.final_avg_conditional.getValue()

		calculationResults.value = {
			area: (totalAreaConverted / 10000).toFixed(2),
			totalCoolingArea: (results.totalCoolingArea / 10000).toFixed(2),
			neighborsAffected: results.neighborsAffected,
			totalReduction: actualTotalReduction.toFixed(3),
			selectedIndexName: currentIndexInfo ? currentIndexInfo.text : statsIndex.value,
			initialIndex: initialIndexForDisplay.toFixed(3),
			newIndex: modifiedHeatIndices.value.get(sourceGridId).toFixed(3),
			cumulativeCoolingArea: (mitigationStore.cumulativeCoolingArea / 10000).toFixed(2),
			cumulativeHeatReduction: mitigationStore.cumulativeHeatReduction.toFixed(3),
		}

		convertedCellIds.value.push(sourceGridId)
	}

	if (loadedLandcoverDataSource.value) {
		const dataSourceToConvert = loadedLandcoverDataSource.value
		for (const entity of dataSourceToConvert.entities.values) {
			if (entity.polygon) {
				entity.polygon.material = Cesium.Color.FORESTGREEN.withAlpha(0.8)
			}
		}
		convertedParkDataSources.value.push(dataSourceToConvert)
		loadedLandcoverDataSource.value = null
	}
	landcoverFeaturesLoaded.value = false
}

// --- LIFECYCLE HOOKS ---
onMounted(() => {
	if (!viewer.value) return
	viewer.value.screenSpaceEventHandler.setInputAction(
		handleMapClick,
		Cesium.ScreenSpaceEventType.LEFT_CLICK
	)
	const gridDataSource = viewer.value.dataSources.getByName(gridDataSourceName)[0]
	if (gridDataSource) {
		if (gridDataSource.entities.values.length > 0) filterGridEntities()
		gridDataSource.entities.collectionChanged.addEventListener(filterGridEntities)
	} else {
		console.warn(`Datasource '${gridDataSourceName}' not found on mount.`)
	}
})

onUnmounted(() => {
	if (viewer.value && !viewer.value.isDestroyed()) {
		viewer.value.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)

		// First, do a full reset of this component's state
		fullReset()

		// THEN, restore the main application's colors
		const gridDataSource = viewer.value.dataSources.getByName(gridDataSourceName)[0]
		if (gridDataSource) {
			gridDataSource.entities.collectionChanged.removeEventListener(filterGridEntities)
			restoreGridColoring(statsIndex.value)
		}
	}
})
</script>

<style scoped>
.landcover-to-parks {
	padding: 0;
	margin: 0;
}
.active-btn {
	background-color: #ffca28 !important;
	color: black !important;
}
.text-caption {
	line-height: 1.2;
}
</style>
