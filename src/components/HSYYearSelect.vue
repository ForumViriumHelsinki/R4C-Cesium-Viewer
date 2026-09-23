<template>
	<v-select
		v-model="selectedYear"
		:items="yearOptions"
		label="Select Year"
		density="compact"
		variant="underlined"
	/>
</template>

<script>
import { ref, watch } from 'vue'
import { eventBus } from '../services/eventEmitter.js'
import { createHSYImageryLayer, removeLandcover } from '../services/landcover'
import { useBackgroundMapStore } from '../stores/backgroundMapStore.js'
import logger from '../utils/logger.js'

export default {
	setup() {
		const backgroundMapStore = useBackgroundMapStore()
		const yearOptions = [2024, 2022, 2020, 2018, 2016]
		const selectedYear = ref(2024)

		watch(
			() => selectedYear.value,
			(newValue) => {
				backgroundMapStore.setHSYYear(newValue)
				// removeLandcover() resolves the stores internally and takes no
				// arguments; the previous call passed stale args (and read a
				// nonexistent `landcoverLayers` off globalStore — it lives on
				// backgroundMapStore). Both were silently ignored.
				removeLandcover()
				createHSYImageryLayer().catch((error) => {
					logger.error('Failed to create HSY landcover layer:', error)
				})
				eventBus.emit('recreate piechart')
			}
		)

		return {
			selectedYear,
			yearOptions,
		}
	},
}
</script>
