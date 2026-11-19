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
import { useLoadingStore } from '../stores/loadingStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import logger from '../utils/logger.js'

export default {
	setup() {
		const backgroundMapStore = useBackgroundMapStore()
		const toggleStore = useToggleStore()
		const loadingStore = useLoadingStore()
		const yearOptions = [2024, 2022, 2020, 2018, 2016]
		const selectedYear = ref(2024)

		// The imagery follows the Land Cover toggle (#967). With it off, a year
		// change updates only the year and the pie chart. A failure is reported the
		// way the Layers tab and the land cover switch report it (#1152); the Retry
		// re-reads the toggle, so it does nothing once land cover is off.
		const reloadImagery = () => {
			if (!toggleStore.landCover) return
			removeLandcover()
			createHSYImageryLayer().catch((error) => {
				logger.error('Failed to create HSY landcover layer:', error)
				loadingStore.reportLayerFailure('landcover', error, { retry: reloadImagery })
			})
		}

		watch(
			() => selectedYear.value,
			(newValue) => {
				backgroundMapStore.setHSYYear(newValue)
				reloadImagery()
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
