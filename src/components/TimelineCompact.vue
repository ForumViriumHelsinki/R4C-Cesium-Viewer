<template>
	<div class="timeline-compact">
		<v-chip
			size="x-small"
			color="primary"
			variant="flat"
			class="date-chip"
		>
			{{ formatYear(selectedDate) }}
		</v-chip>

		<div class="slider-wrapper">
			<v-slider
				v-model="currentPropertyIndex"
				:max="timelineLength - 1"
				:step="1"
				:ticks="tickLabels"
				show-ticks="always"
				tick-size="4"
				hide-details
				color="primary"
				track-color="grey-lighten-2"
				thumb-size="12"
				class="compact-slider"
				density="compact"
			/>
		</div>
	</div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';
import Datasource from '../services/datasource.js';
import Building from '../services/building.js';
import { eventBus } from '../services/eventEmitter.js';
import { cesiumEntityManager } from '../services/cesiumEntityManager.js';

const globalStore = useGlobalStore();
const dataSourceService = new Datasource();
const buildingService = new Building();

const dates = [
	'2015-07-03',
	'2016-06-03',
	'2018-07-27',
	'2019-06-05',
	'2020-06-23',
	'2021-07-12',
	'2022-06-28',
	'2023-06-23',
	'2024-06-26',
	'2025-07-14',
];

const selectedDate = ref('2022-06-28');
const currentPropertyIndex = ref(dates.indexOf(selectedDate.value));
const timelineLength = ref(dates.length);

// Create tick labels (years only)
const tickLabels = computed(() => {
	return dates.reduce((acc, date, index) => {
		acc[index] = '';
		return acc;
	}, {});
});

const formatYear = (dateString) => {
	return new Date(dateString).getFullYear().toString();
};

const updateViewAndPlots = () => {
	const buildingsDataSource = dataSourceService.getDataSourceByName(
		'Buildings ' + globalStore.postalcode
	);

	if (!buildingsDataSource) return;

	const entities = buildingsDataSource.entities.values;
	buildingService.setHeatExposureToBuildings(entities);
	buildingService.updateHeatHistogramDataAfterFilter(entities);
	// Register entities with cesiumEntityManager for non-reactive entity management
	cesiumEntityManager.registerBuildingEntities(entities);
	eventBus.emit('updateScatterPlot');
};

watch(currentPropertyIndex, (newIndex) => {
	globalStore.setShowBuildingInfo(false);
	selectedDate.value = dates[newIndex];
	globalStore.setHeatDataDate(selectedDate.value);
	updateViewAndPlots();
	globalStore.setShowBuildingInfo(true);
});

onMounted(() => {
	timelineLength.value = dates.length;
});
</script>

<style scoped>
.timeline-compact {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 0 8px;
	min-width: 200px;
	max-width: 250px;
}

.date-chip {
	font-weight: 600;
	font-size: 0.75rem;
	flex-shrink: 0;
	min-width: 45px;
	justify-content: center;
}

.slider-wrapper {
	flex: 1;
	min-width: 0;
}

.compact-slider {
	margin: 0;
	padding: 0;
}

.compact-slider :deep(.v-slider-track__background),
.compact-slider :deep(.v-slider-track__fill) {
	height: 3px;
}

.compact-slider :deep(.v-slider__tick) {
	width: 2px;
	height: 4px;
	background-color: rgba(0, 0, 0, 0.3);
}

/* Responsive adjustments */
@media (max-width: 960px) {
	.timeline-compact {
		min-width: 150px;
		max-width: 180px;
		gap: 8px;
	}

	.date-chip {
		font-size: 0.7rem;
		min-width: 40px;
	}
}

@media (max-width: 600px) {
	.timeline-compact {
		min-width: 120px;
		max-width: 140px;
		gap: 6px;
	}

	.date-chip {
		font-size: 0.65rem;
		min-width: 35px;
	}
}
</style>
