<template>
	<v-container>
		<v-row>
			<!-- Left: Radio Buttons -->
			<v-col cols="4">
				<v-radio-group
					v-model="selectedDate"
					dense
					:disabled="!ndvi"
					@change="updateImage"
				>
					<v-radio
						v-for="date in availableDates"
						:key="date"
						:label="date"
						:value="date"
						class="small-radio"
					/>
				</v-radio-group>
			</v-col>

			<!-- Right: NDVI Chart -->
			<v-col cols="8">
				<NDVIChart :selected-date="selectedDate" />
			</v-col>
		</v-row>
	</v-container>
</template>

<script>
import { storeToRefs } from 'pinia'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { AVAILABLE_NDVI_DATES, DEFAULT_NDVI_DATE } from '../constants/ndviDates.js'
import { eventBus } from '../services/eventEmitter.js'
import { changeTIFF } from '../services/tiffImagery.js'
import { useBackgroundMapStore } from '../stores/backgroundMapStore.js'
import { useToggleStore } from '../stores/toggleStore.js'

export default {
	setup() {
		const toggleStore = useToggleStore()
		const backgroundMapStore = useBackgroundMapStore()

		// Make ndvi reactive
		const { ndvi } = storeToRefs(toggleStore)

		const selectedDate = ref(DEFAULT_NDVI_DATE)
		const availableDates = AVAILABLE_NDVI_DATES

		const updateImage = async () => {
			backgroundMapStore.setNdviDate(selectedDate.value)
			changeTIFF().catch(console.error)
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

		return { selectedDate, availableDates, updateImage, ndvi }
	},
}
</script>

<style scoped>
/* Small radio buttons */
.small-radio {
	font-size: 12px;
	margin-right: 5px;
}
</style>
