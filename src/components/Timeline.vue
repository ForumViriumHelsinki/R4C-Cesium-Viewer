<template>
	<div id="heatTimeseriesContainer" class="timeline-overlay">
		<div class="timeline-card">
			<div class="timeline-header">
				<div class="timeline-title">
					<v-icon class="mr-2" size="16"> mdi-clock-outline </v-icon>
					<span>Heat Timeline</span>
				</div>
				<v-chip size="small" color="primary" variant="tonal">
					{{ selectedDate }}
				</v-chip>
			</div>

			<div class="date-labels">
				<span
					v-for="(date, index) in dates"
					:key="index"
					class="date-label"
					:class="{ active: index === currentPropertyIndex }"
				>
					{{ formatDate(date) }}
				</span>
			</div>

			<div class="slider-container">
				<v-slider
					v-model="currentPropertyIndex"
					:max="timelineLength - 1"
					:step="1"
					:tick-size="2"
					tick-labels
					hide-details
					class="timeline-slider"
					color="primary"
					track-color="grey-lighten-3"
					thumb-color="primary"
				/>
			</div>

			<div class="timeline-info">
				<span class="info-text">
					<v-icon size="14" class="mr-1">mdi-information-outline</v-icon>
					Use the slider to explore heat data across different time periods
				</span>
			</div>
		</div>
	</div>
</template>

<script>
import { onMounted, ref, computed, watch } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import Datasource from '../services/datasource.js';
import Building from '../services/building.js';
import { eventBus } from '../services/eventEmitter.js';

export default {
	setup() {
		const globalStore = useGlobalStore();
		const propsStore = usePropsStore();
		const dataSourceService = new Datasource();
		const buildingService = new Building();

		const selectedDate = ref('2022-06-28'); // Set default date
		const timelineLength = ref(0);
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

		const currentPropertyIndex = ref(dates.indexOf(selectedDate.value)); // Set default index

		// Format date for display
		const formatDate = (dateString) => {
			const date = new Date(dateString);
			return date.toLocaleDateString('en-US', {
				year: '2-digit',
				month: 'short',
			});
		};

		const updateViewAndPlots = () => {
			const buildingsDataSource = dataSourceService.getDataSourceByName(
				'Buildings ' + globalStore.postalcode
			);

			if (!buildingsDataSource) return;

			const entities = buildingsDataSource.entities.values;
			buildingService.setHeatExposureToBuildings(entities);
			buildingService.updateHeatHistogramDataAfterFilter(entities);
			propsStore.setScatterPlotEntities(entities);
			eventBus.emit('updateScatterPlot');
		};

		onMounted(() => {
			timelineLength.value = dates.length; // Set the timeline length when mounted
		});

		// Watch for changes in currentPropertyIndex
		watch(currentPropertyIndex, (newIndex) => {
			globalStore.setShowBuildingInfo(false);

			selectedDate.value = dates[newIndex];
			globalStore.setHeatDataDate(selectedDate.value);
			updateViewAndPlots();

			globalStore.setShowBuildingInfo(true);
		});
		return {
			selectedDate,
			timelineLength,
			currentPropertyIndex,
			dates,
			formatDate,
		};
	},
};
</script>

<style scoped>
.timeline-overlay {
	position: fixed;
	bottom: 24px;
	left: 24px;
	z-index: 1000;
	pointer-events: none;
}

.timeline-card {
	background: rgba(255, 255, 255, 0.95);
	backdrop-filter: blur(12px);
	border-radius: 12px;
	padding: 16px 20px;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
	border: 1px solid rgba(0, 0, 0, 0.1);
	min-width: 400px;
	max-width: 500px;
	pointer-events: auto;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.timeline-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px;
}

.timeline-title {
	display: flex;
	align-items: center;
	font-size: 14px;
	font-weight: 600;
	margin: 0;
	color: rgba(0, 0, 0, 0.87);
}

.date-labels {
	display: flex;
	justify-content: space-between;
	margin-bottom: 8px;
	padding: 0 12px;
}

.date-label {
	font-size: 0.75rem;
	font-weight: 500;
	color: rgba(0, 0, 0, 0.6);
	transition: color 0.2s;
	cursor: pointer;
}

.date-label.active {
	color: #1976d2;
	font-weight: 600;
}

.date-label:hover {
	color: #1976d2;
}

.slider-container {
	margin: 8px 0 16px 0;
}

.timeline-slider {
	margin: 0;
}

.timeline-info {
	display: flex;
	justify-content: center;
	margin-top: 8px;
}

.info-text {
	font-size: 0.75rem;
	color: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
}

/* Responsive adjustments */
@media (max-width: 768px) {
	.timeline-overlay {
		bottom: 16px;
		left: 16px;
		right: 16px;
	}

	.timeline-card {
		min-width: auto;
		padding: 12px 16px;
	}

	.timeline-title {
		font-size: 13px;
	}

	.date-labels {
		padding: 0 8px;
	}

	.date-label {
		font-size: 0.7rem;
	}

	.info-text {
		font-size: 0.7rem;
	}
}

/* High contrast support */
@media (prefers-contrast: high) {
	.timeline-card {
		background: #ffffff;
		border: 2px solid #000000;
	}
}
</style>
