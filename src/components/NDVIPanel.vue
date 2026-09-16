<template>
	<div
		class="analysis-panel-body"
		role="region"
		aria-label="NDVI vegetation distribution"
	>
		<v-select
			v-model="selectedDate"
			:items="availableDates"
			:disabled="!ndvi"
			label="Date"
			density="compact"
			variant="underlined"
			hide-details
			@update:model-value="updateImage"
		/>
		<NDVIChart :selected-date="selectedDate" />
	</div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { AVAILABLE_NDVI_DATES, DEFAULT_NDVI_DATE } from '../constants/ndviDates.js'
import { eventBus } from '../services/eventEmitter.js'
import { changeTIFF } from '../services/tiffImagery.js'
import { useBackgroundMapStore } from '../stores/backgroundMapStore.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import logger from '../utils/logger.js'
import NDVIChart from './NDVIChart.vue'

const toggleStore = useToggleStore()
const backgroundMapStore = useBackgroundMapStore()
const globalStore = useGlobalStore()

const { ndvi } = storeToRefs(toggleStore)

const selectedDate = ref(DEFAULT_NDVI_DATE)
const availableDates = AVAILABLE_NDVI_DATES

const updateImage = async () => {
	backgroundMapStore.setNdviDate(selectedDate.value)
	changeTIFF().catch((error) => {
		logger.error('[NDVIPanel] Failed to load NDVI imagery:', error)
		globalStore.showError(
			'Unable to load NDVI vegetation data. Please try again.',
			`TIFF imagery load failed: ${error.message}`
		)
	})
}

onMounted(async () => {
	eventBus.on('addNDVI', updateImage)
	if (ndvi.value) {
		await updateImage()
	}
})

onBeforeUnmount(() => {
	eventBus.off('addNDVI', updateImage)
})
</script>
