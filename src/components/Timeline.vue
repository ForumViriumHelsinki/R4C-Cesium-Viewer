<template>
	<div
		id="heatTimeseriesContainer"
		class="timeline-overlay"
	>
		<div class="timeline-card">
			<div class="timeline-header">
				<div class="timeline-title">
					<v-icon
						class="mr-2"
						size="16"
					>
						mdi-clock-outline
					</v-icon>
					<span>Heat Timeline</span>
				</div>
				<v-chip
					size="small"
					color="primary"
					variant="tonal"
				>
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
					<v-icon
						size="14"
						class="mr-1"
						>mdi-information-outline</v-icon
					>
					Use the slider to explore heat data across different time periods
				</span>
			</div>
		</div>
	</div>
</template>

<script>
import { onMounted, ref, watch } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';
import Datasource from '../services/datasource.js';
import Building from '../services/building.js';
import { eventBus } from '../services/eventEmitter.js';
import { cesiumEntityManager } from '../services/cesiumEntityManager.js';

/**
 * @component Timeline
 * @description Temporal data selection component with glassmorphism design for exploring heat data across different time periods.
 *
 * Provides an interactive slider interface to navigate through historical heat exposure data from 2015 to 2025,
 * with one projected future date (2025-07-14). Updates building heat visualizations and histograms when the
 * selected date changes.
 *
 * **Features:**
 * - Interactive timeline slider with visual date indicators
 * - Glassmorphism card design for modern UI aesthetic
 * - Real-time synchronization with building heat data
 * - Automatic histogram and scatter plot updates
 * - Responsive design with mobile support
 * - High contrast accessibility support
 *
 * **Store Integration:**
 * - `globalStore` - Heat data date management, postal code, view state
 *
 * **Service Integration:**
 * - `Datasource` - Building data source management
 * - `Building` - Heat exposure calculations and histogram updates
 * - `cesiumEntityManager` - Entity registration for non-reactive management
 *
 * **Event Emissions:**
 * - Listens: None
 * - Emits: 'updateScatterPlot' (via eventBus) - Triggers scatter plot refresh
 *
 * **Available Dates:**
 * Historical satellite data from Landsat Collection 2:
 * - 2015-07-03 through 2024-06-26 (summer heat events)
 * - 2025-07-14 (projected/future scenario)
 *
 * @example
 * <Timeline />
 */

export default {
	setup() {
		const globalStore = useGlobalStore();
		const dataSourceService = new Datasource();
		const buildingService = new Building();

		/**
		 * Current selected date for heat data visualization
		 * @type {import('vue').Ref<string>}
		 * @default '2022-06-28'
		 */
		const selectedDate = ref('2022-06-28'); // Set default date

		/**
		 * Total number of available time points in the timeline
		 * @type {import('vue').Ref<number>}
		 */
		const timelineLength = ref(0);

		/**
		 * Available heat data dates from historical satellite imagery
		 * @type {string[]}
		 * @const
		 */
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

		/**
		 * Current selected index in the dates array
		 * @type {import('vue').Ref<number>}
		 */
		const currentPropertyIndex = ref(dates.indexOf(selectedDate.value)); // Set default index

		/**
		 * Formats ISO date string to localized short format
		 *
		 * @param {string} dateString - ISO date string (YYYY-MM-DD)
		 * @returns {string} Formatted date (e.g., "Jun '22")
		 *
		 * @example
		 * formatDate('2022-06-28') // Returns "Jun '22"
		 */
		const formatDate = (dateString) => {
			const date = new Date(dateString);
			return date.toLocaleDateString('en-US', {
				year: '2-digit',
				month: 'short',
			});
		};

		/**
		 * Updates building heat exposure visualization and related plots
		 *
		 * Retrieves the current building data source, applies heat exposure calculations,
		 * updates the heat histogram, registers entities with the entity manager, and
		 * triggers scatter plot updates.
		 *
		 * @fires eventBus#updateScatterPlot
		 *
		 * @returns {void}
		 */
		const updateViewAndPlots = () => {
			const buildingsDataSource = dataSourceService.getDataSourceByName(
				'Buildings ' + globalStore.postalcode
			);

			if (!buildingsDataSource) return;

			const entities = buildingsDataSource.entities.values;
			void buildingService.setHeatExposureToBuildings(entities);
			buildingService.updateHeatHistogramDataAfterFilter(entities);
			// Register entities with cesiumEntityManager for non-reactive entity management
			cesiumEntityManager.registerBuildingEntities(entities);
			eventBus.emit('updateScatterPlot');
		};

		onMounted(() => {
			timelineLength.value = dates.length; // Set the timeline length when mounted
		});

		/**
		 * Watches for changes in timeline slider position
		 *
		 * When the user changes the timeline position:
		 * 1. Hides building info panel temporarily
		 * 2. Updates the selected date in global store
		 * 3. Refreshes building visualizations and plots
		 * 4. Restores building info panel
		 *
		 * @listens currentPropertyIndex
		 */
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
