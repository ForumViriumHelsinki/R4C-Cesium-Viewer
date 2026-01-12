<template>
	<!-- Layout on top of Cesium -->
	<v-container
		v-if="showComponents"
		fluid
		class="d-flex flex-column pa-0 ma-0"
		style="position: relative; z-index: 10; height: 100vh"
	>
		<!-- Row 7 -->
		<v-row
			no-gutters
			class="pa-0 ma-0"
		>
			<v-col
				class="d-flex flex-column pa-0 ma-0"
				style="z-index: 20"
			>
				<HeatHistogram v-if="propsStore.heatHistogramData && featureFlagStore.isEnabled('heatHistogram')" />
			</v-col>
			<v-col
				v-if="store.postalcode !== '00230' && featureFlagStore.isEnabled('socioeconomicViz')"
				class="d-flex align-end pa-0 ma-0"
				style="z-index: 20"
			>
				<SocioEconomics />
			</v-col>
		</v-row>

		<v-spacer />

		<!-- Row 6 -->
		<v-row
			no-gutters
			class="pa-0 ma-0"
		>
			<v-col
				class="d-flex align-start pa-0 ma-0"
				style="z-index: 20"
			/>
		</v-row>

		<v-spacer />
		<!-- Conditionally render BuildingInformation when there is buildings to be shown -->

		<!-- Row 1 -->
		<v-row
			no-gutters
			class="pa-0 ma-0"
		>
			<v-col
				class="d-flex flex-column pa-0 ma-0"
				style="z-index: 20"
			>
				<Scatterplot v-if="featureFlagStore.isEnabled('buildingScatterPlot')" />
				<NearbyTreeArea v-if="featureFlagStore.isEnabled('treeCoverage')" />
			</v-col>
		</v-row>
	</v-container>
</template>

<script>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import HeatHistogram from '../components/HeatHistogram.vue'
import NearbyTreeArea from '../components/NearbyTreeArea.vue'
import Scatterplot from '../components/Scatterplot.vue'
import { eventBus } from '../services/eventEmitter.js'
import { useFeatureFlagStore } from '../stores/featureFlagStore'
import { useGlobalStore } from '../stores/globalStore.js'
import { usePropsStore } from '../stores/propsStore.js'
import SocioEconomics from '../views/SocioEconomics.vue'

export default {
	components: {
		HeatHistogram,
		SocioEconomics,
		Scatterplot,
		NearbyTreeArea,
	},
	setup() {
		const showComponents = ref(false)
		const store = useGlobalStore() // Access the store
		const propsStore = usePropsStore()
		const featureFlagStore = useFeatureFlagStore()

		onMounted(() => {
			eventBus.on('showHelsinki', () => {
				showComponents.value = true
			})

			eventBus.on('hideHelsinki', () => {
				showComponents.value = false
			})
		})

		onBeforeUnmount(() => {
			eventBus.off('showHelsinki')
			eventBus.off('hideHelsinki')
		})

		return {
			showComponents,
			propsStore,
			store, // Return the store to access postalCode in the template
			featureFlagStore,
		}
	},
}
</script>

<style scoped></style>
