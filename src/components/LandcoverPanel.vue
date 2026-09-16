<template>
	<div
		class="analysis-panel-body"
		role="region"
		aria-label="Land cover comparison"
	>
		<div class="d-flex ga-2">
			<HSYAreaSelect class="flex-grow-1" />
			<HSYYearSelect class="year-select" />
		</div>
		<v-checkbox
			v-model="landcover"
			label="Landcover as background map"
			color="success"
			density="compact"
			hide-details
			@update:model-value="toggleLandCover"
		/>
		<PieChart />
	</div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { createHSYImageryLayer, removeLandcover } from '../services/landcover'
import { useGlobalStore } from '../stores/globalStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import logger from '../utils/logger.js'
import HSYAreaSelect from './HSYAreaSelect.vue'
import HSYYearSelect from './HSYYearSelect.vue'
import PieChart from './PieChart.vue'

const toggleStore = useToggleStore()
const store = useGlobalStore()
const { landCover: landcover } = storeToRefs(toggleStore)

const toggleLandCover = () => {
	const isLandcoverChecked = landcover.value
	toggleStore.setLandCover(isLandcoverChecked)

	if (isLandcoverChecked) {
		// Remove background map and add land cover layer
		store.cesiumViewer.imageryLayers.remove('avoindata:Karttasarja_PKS', true)
		createHSYImageryLayer().catch((error) => {
			logger.error('[LandcoverPanel] Failed to load HSY imagery layer:', error)
			store.showError(
				'Unable to load land cover layer. Please try again.',
				`HSY imagery layer failed: ${error.message}`
			)
		})
	} else {
		removeLandcover()
	}
}
</script>

<style scoped>
.year-select {
	flex: 0 0 96px;
}
</style>
