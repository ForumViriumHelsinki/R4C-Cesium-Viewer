<template><div /></template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useGridStyling } from '../composables/useGridStyling.js' // <-- Import the composable
import Camera from '../services/camera.js'
import DataSource from '../services/datasource.js'
import { useMitigationStore } from '../stores/mitigationStore.js'
import { usePropsStore } from '../stores/propsStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import logger from '../utils/logger.js'

// --- STATE MANAGEMENT ---
const propsStore = usePropsStore()
const toggleStore = useToggleStore()
const mitigationStore = useMitigationStore()
const dataSourceService = new DataSource()

// ** Instantiate the composable to get the main update function **
const { updateGridColors } = useGridStyling()

const coolingCenters = computed(() => mitigationStore.coolingCenters)
const statsIndex = computed(() => propsStore.statsIndex)
const ndviActive = computed(() => toggleStore.ndvi)

// --- WATCHERS ---
// The watchers now call the clean, centralized function from the composable.
// updateGridColors is async, so we use .catch() to handle errors properly.
watch([statsIndex, ndviActive], () => {
	updateGridColors(statsIndex.value).catch(logger.error)
})

watch(
	coolingCenters,
	() => {
		if (statsIndex.value === 'heat_index') {
			// Pre-calculate impacts BEFORE rendering (populates cache for O(1) lookups)
			mitigationStore.recalculateCoolingCenterImpacts()
			updateGridColors('heat_index').catch(logger.error)
		}
	},
	{ deep: true }
)

// --- COMPONENT-SPECIFIC LOGIC ---
const loadGrid = async () => {
	// Only remove existing grid datasource if present, preserve buildings
	await dataSourceService.removeDataSourcesByNamePrefix('250m_grid')
	await dataSourceService.loadGeoJsonDataSource(
		0.8,
		'./assets/data/r4c_stats_grid_index.json',
		'250m_grid'
	)
}

const prepareMitigation = () => {
	const dataSource = dataSourceService.getDataSourceByName('250m_grid')
	void mitigationStore.setGridCells(dataSource)
	void mitigationStore.preCalculateGridImpacts()
}

onMounted(async () => {
	const cameraService = new Camera()
	cameraService.switchTo3DGrid()
	try {
		await loadGrid()
		await updateGridColors(propsStore.statsIndex) // Initial color update
		prepareMitigation()
	} catch (error) {
		logger.error('Error loading grid:', error)
	}
})
</script>
