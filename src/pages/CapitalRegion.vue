<template>
	<!-- Layout on top of Cesium -->
	<v-container
		v-if="showComponents"
		fluid
		class="d-flex flex-column pa-0 ma-0"
		style="position: relative; z-index: 10"
	>
		<!-- Row 7 -->
		<v-row no-gutters class="pa-0 ma-0">
			<v-col class="d-flex flex-column pa-0 ma-0" style="z-index: 20" />
			<v-col
				v-if="store.postalcode !== '00230'"
				class="d-flex align-end pa-0 ma-0"
				style="z-index: 20"
			>
				<SocioEconomics />
			</v-col>
		</v-row>

		<v-spacer />

		<!-- Row 6 -->
		<v-row v-if="showLandcover" no-gutters class="pa-0 ma-0">
			<v-col class="d-flex align-start pa-0 ma-0" style="z-index: 20">
				<Landcover />
			</v-col>
		</v-row>

		<v-spacer />

		<!-- Row 1 -->
		<v-row no-gutters class="pa-0 ma-0">
			<v-col class="d-flex flex-column pa-0 ma-0" style="z-index: 20">
				<BuildingScatterPlot />
			</v-col>
		</v-row>
		<!-- Conditionally render BuildingInformation when there is buildings to be shown -->
	</v-container>

	<BuildingInformation v-if="buildingStore.buildingFeatures && !store.isLoading" />
	<Loading v-if="store.isLoading" />
	<!-- Use showHSYWMS to control the visibility of the HSYWMS component -->
	<HSYWMS v-if="showComponents && showHSYWMS" style="z-index: 20" />
</template>

<script>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { eventBus } from '../services/eventEmitter.js';
import { useGlobalStore } from '../stores/globalStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import { useBuildingStore } from '../stores/buildingStore.js';
import HeatHistogram from '../components/HeatHistogram.vue';
import BuildingInformation from '../components/BuildingInformation.vue';
import BuildingScatterPlot from '../views/BuildingScatterPlot.vue';
import SocioEconomics from '../views/SocioEconomics.vue';
import Landcover from '../views/Landcover.vue';
import Loading from '../components/Loading.vue';
import HSYWMS from '../components/HSYWMS.vue';

export default {
	components: {
		HeatHistogram,
		BuildingScatterPlot,
		SocioEconomics,
		Landcover,
		BuildingInformation,
		Loading,
		HSYWMS,
	},
	setup() {
		const showComponents = ref(false);
		const showLandcover = ref(false);
		const showHSYWMS = ref(false);
		const store = useGlobalStore();
		const toggleStore = useToggleStore();
		const buildingStore = useBuildingStore();

		onMounted(() => {
			eventBus.on('showCapitalRegion', () => {
				showComponents.value = true;
			});

			eventBus.on('hideCapitalRegion', () => {
				showComponents.value = false;
			});
		});

		onBeforeUnmount(() => {
			eventBus.off('showCapitalRegion');
			eventBus.off('hideCapitalRegion');
		});

		// Watch landCover toggle to control mutual exclusivity
		watch(
			() => toggleStore.landCover,
			(newValue) => {
				showLandcover.value = toggleStore.helsinkiView ? showLandcover.value : !!newValue;
				showHSYWMS.value = !showLandcover.value;
			}
		);

		// Separate control for HSYWMS based on postalcode and landcover visibility
		watch(
			() => store.postalcode,
			(newPostalCode) => {
				!showLandcover.value && newPostalCode && (showHSYWMS.value = true);
			}
		);

		return {
			showComponents,
			showLandcover,
			showHSYWMS, // Return showHSYWMS to be used in the template
			store,
			buildingStore,
			toggleStore,
		};
	},
};
</script>

<style scoped></style>
