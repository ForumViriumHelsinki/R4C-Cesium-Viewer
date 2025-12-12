<template>
	<v-container v-if="showComponents">
		<v-row>
			<!-- Left column for Heat charts -->
			<v-col cols="9">
				<!-- Conditionally render either HSYBuildingHeatChart or BuildingHeatChart -->
				<BuildingHeatChart v-if="toggleStore.helsinkiView" />
			</v-col>

			<!-- Right column for Tree chart -->
			<v-col cols="3">
				<BuildingTreeChart />
			</v-col>
		</v-row>
	</v-container>
</template>

<script>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import BuildingHeatChart from '../components/BuildingHeatChart.vue'
import BuildingTreeChart from '../components/BuildingTreeChart.vue'
import { eventBus } from '../services/eventEmitter.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { useToggleStore } from '../stores/toggleStore.js'

export default {
	components: {
		BuildingTreeChart,
		BuildingHeatChart,
	},
	setup() {
		const showComponents = ref(false)
		const _store = useGlobalStore()
		const toggleStore = useToggleStore()

		onMounted(() => {
			eventBus.on('showBuilding', () => {
				showComponents.value = true
			})

			eventBus.on('hideBuilding', () => {
				showComponents.value = false
			})
		})

		onBeforeUnmount(() => {
			eventBus.off('showBuilding')
			eventBus.off('hideBuilding')
		})

		return {
			showComponents,
			toggleStore,
		}
	},
}
</script>
