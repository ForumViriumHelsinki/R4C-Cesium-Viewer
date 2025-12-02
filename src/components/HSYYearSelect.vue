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
import { ref, watch } from 'vue';
import { useBackgroundMapStore } from '../stores/backgroundMapStore.js';
import { useGlobalStore } from '../stores/globalStore.js';
import { eventBus } from '../services/eventEmitter.js';
import { createHSYImageryLayer, removeLandcover } from '../services/landcover';

export default {
	setup() {
		const backgroundMapStore = useBackgroundMapStore();
		const store = useGlobalStore();
		const yearOptions = [2024, 2022, 2020, 2018, 2016];
		const selectedYear = ref(2024);

		watch(
			() => selectedYear.value,
			(newValue) => {
				backgroundMapStore.setHSYYear(newValue);
				removeLandcover(store.landcoverLayers, store.cesiumViewer);
				void createHSYImageryLayer();
				eventBus.emit('recreate piechart');
			}
		);

		return {
			selectedYear,
			yearOptions,
		};
	},
};
</script>
