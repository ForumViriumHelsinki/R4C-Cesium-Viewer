<template><div /></template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useGridStyling } from '../composables/useGridStyling.js'
import DataSource from '../services/datasource.js'
import { useLoadingStore } from '../stores/loadingStore.js'
import { useMitigationStore } from '../stores/mitigationStore.js'
import { usePropsStore } from '../stores/propsStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import logger from '../utils/logger.js'

// --- STATE MANAGEMENT ---
const propsStore = usePropsStore()
const toggleStore = useToggleStore()
const mitigationStore = useMitigationStore()
const loadingStore = useLoadingStore()
const dataSourceService = new DataSource()

// ** Instantiate the composable to get the main update function **
const { updateGridColors } = useGridStyling()

const statsIndex = computed(() => propsStore.statsIndex)
const ndviActive = computed(() => toggleStore.ndvi)

// --- WATCHERS ---
// The watchers now call the clean, centralized function from the composable.
// updateGridColors is async, so we use .catch() to handle errors properly.
watch([statsIndex, ndviActive], () => {
	updateGridColors(statsIndex.value).catch(logger.error)
})

// Watch version counter instead of deep watching the array
// This is more efficient as it only triggers when cooling centers actually change
// rather than on every array mutation check
watch(
	() => mitigationStore.coolingCentersVersion,
	() => {
		if (statsIndex.value === 'heat_index') {
			// Pre-calculate impacts BEFORE rendering (populates cache for O(1) lookups)
			mitigationStore.recalculateCoolingCenterImpacts()
			updateGridColors('heat_index').catch(logger.error)
		}
	}
)

// --- COMPONENT-SPECIFIC LOGIC ---
/**
 * Loads the statistical grid using a Web Worker for JSON parsing.
 * This moves the 500-700ms JSON parse off the main thread.
 */
const loadGrid = async () => {
	// Only remove existing grid datasource if present, preserve buildings
	await dataSourceService.removeDataSourcesByNamePrefix('250m_grid')

	// Use Web Worker to parse the large (8.9 MB) GeoJSON off main thread
	// Note: Must use absolute path because Web Workers resolve URLs from their own origin
	await dataSourceService.loadGeoJsonDataSourceWithWorker(
		0.8,
		'/assets/data/r4c_stats_grid_index.json',
		'250m_grid'
	)
}

/**
 * Prepares mitigation calculations in the background.
 * Does not block the grid rendering - runs after grid is visible.
 */
const prepareMitigation = () => {
	const dataSource = dataSourceService.getDataSourceByName('250m_grid')
	mitigationStore.setGridCells(dataSource).catch(logger.error)
	// Fire and forget - preCalculateGridImpacts is async and yields to main thread
	mitigationStore.preCalculateGridImpacts().catch(logger.error)
}

onMounted(async () => {
	// Note: Camera position is preserved - no longer calling switchTo3DGrid()
	// This avoids the performance hit of zooming out during grid transition

	loadingStore.startLayerLoading('statsGrid', {
		total: 3,
		message: 'Loading statistical grid...',
	})

	try {
		// Stage 1: Load grid data (Web Worker parses JSON off main thread)
		loadingStore.updateLayerProgress('statsGrid', 1, 'Parsing grid data...')
		await loadGrid()

		// Grid is now visible with default gray colors!
		// Continue styling in background for progressive rendering

		// Stage 2: Apply colors (batched, yields to main thread)
		loadingStore.updateLayerProgress('statsGrid', 2, 'Applying colors...')
		await updateGridColors(propsStore.statsIndex)

		// Stage 3: Pre-calculate mitigation (fire-and-forget, runs in background)
		loadingStore.updateLayerProgress('statsGrid', 3, 'Finalizing...')
		prepareMitigation() // Don't await - runs in background

		loadingStore.completeLayerLoading('statsGrid', true)
	} catch (error) {
		logger.error('Error loading grid:', error)
		loadingStore.setLayerError('statsGrid', error.message)
	}
})
</script>
