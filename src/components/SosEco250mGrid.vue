<template><div /></template>

<script setup>
import { watch, computed, onMounted } from 'vue';
import DataSource from '../services/datasource.js';
import Camera from '../services/camera.js';
import { usePropsStore } from '../stores/propsStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import { useMitigationStore } from '../stores/mitigationStore.js';
import { useGridStyling } from '../composables/useGridStyling.js'; // <-- Import the composable

// --- STATE MANAGEMENT ---
const propsStore = usePropsStore();
const toggleStore = useToggleStore();
const mitigationStore = useMitigationStore();
const dataSourceService = new DataSource();

// ** Instantiate the composable to get the main update function **
const { updateGridColors } = useGridStyling();

const coolingCenters = computed(() => mitigationStore.coolingCenters);
const statsIndex = computed(() => propsStore.statsIndex);
const ndviActive = computed(() => toggleStore.ndvi);

// --- WATCHERS ---
// The watchers now call the clean, centralized function from the composable.
watch([statsIndex, ndviActive], () => {
	updateGridColors(statsIndex.value);
});

watch(
	coolingCenters,
	() => {
		if (statsIndex.value === 'heat_index') {
			mitigationStore.resetMitigationState();
			// Note: The original code's complex `heatIndex` function with mitigation
			// would need to be moved into the composable as well to be fully DRY.
			// For now, this call restores the base colors.
			updateGridColors('heat_index');
		}
	},
	{ deep: true }
);

// --- COMPONENT-SPECIFIC LOGIC ---
const loadGrid = async () => {
	dataSourceService.removeDataSourcesAndEntities();
	await dataSourceService.loadGeoJsonDataSource(
		0.8,
		'./assets/data/r4c_stats_grid_index.json',
		'250m_grid'
	);
};

const prepareMitigation = () => {
	const dataSource = dataSourceService.getDataSourceByName('250m_grid');
	mitigationStore.setGridCells(dataSource);
	mitigationStore.preCalculateGridImpacts();
};

onMounted(async () => {
	const cameraService = new Camera();
	cameraService.switchTo3DGrid();
	try {
		await loadGrid();
		updateGridColors(propsStore.statsIndex); // Initial color update
		prepareMitigation();
	} catch (error) {
		console.error('Error loading grid:', error);
	}
});
</script>
