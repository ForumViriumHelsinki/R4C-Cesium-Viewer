<template>
	<div
		class="analysis-panel-body"
		role="region"
		aria-label="NDVI vegetation distribution"
	>
		<!-- The Layers tab switch itself (#1155), so the date select below is never
		     disabled with no way to enable it. -->
		<LayerSwitch layer="ndvi" />
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
import { computed, onMounted } from 'vue'
import { AVAILABLE_NDVI_DATES } from '../constants/ndviDates.js'
import { useBackgroundMapStore } from '../stores/backgroundMapStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import LayerSwitch from './controls/LayerSwitch.vue'
import { addNdviImagery } from './controls/layerToggles.js'
import NDVIChart from './NDVIChart.vue'

const toggleStore = useToggleStore()
const backgroundMapStore = useBackgroundMapStore()

const { ndvi } = storeToRefs(toggleStore)

/**
 * The date the NDVI imagery shows. Bound to the store, so the switch (from this
 * panel or the Layers tab) loads the date selected here.
 */
const selectedDate = computed({
	get: () => backgroundMapStore.ndviDate,
	set: (date) => backgroundMapStore.setNdviDate(date),
})
const availableDates = AVAILABLE_NDVI_DATES

// A failure is reported the way the Layers tab reports it (#1152).
const updateImage = () => {
	addNdviImagery()
}

onMounted(() => {
	if (ndvi.value) updateImage()
})
</script>
