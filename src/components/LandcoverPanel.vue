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
import { setLandcoverEnabled } from '../services/landcover'
import { useLoadingStore } from '../stores/loadingStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import logger from '../utils/logger.js'
import HSYAreaSelect from './HSYAreaSelect.vue'
import HSYYearSelect from './HSYYearSelect.vue'
import PieChart from './PieChart.vue'

const toggleStore = useToggleStore()
const loadingStore = useLoadingStore()
const { landCover: landcover } = storeToRefs(toggleStore)

// Same entry point as the Layers tab switch, so this checkbox also switches NDVI
// off (#967). The old `imageryLayers.remove('avoindata:Karttasarja_PKS')` passed a
// layer name, which ImageryLayerCollection.remove() cannot match, so it removed
// nothing and is gone.
// A failure is reported the way the Layers tab reports it (#1152).
const applyLandCover = (enabled) => {
	setLandcoverEnabled(enabled).catch((error) => {
		logger.error('[LandcoverPanel] Failed to load HSY imagery layer:', error)
		loadingStore.reportLayerFailure('landcover', error, {
			// A Retry clicked after the user flipped the switch must not flip it back.
			retry: () => {
				if (toggleStore.landCover === enabled) applyLandCover(enabled)
			},
		})
	})
}
const toggleLandCover = () => applyLandCover(landcover.value)
</script>

<style scoped>
.year-select {
	flex: 0 0 96px;
}
</style>
