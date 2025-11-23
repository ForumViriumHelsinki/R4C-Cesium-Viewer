<template>
	<div class="postal-code-picker">
		<div class="picker-header">
			<h4 class="picker-title">
				<v-icon class="mr-2"> mdi-map-marker </v-icon>
				Select Area to Analyze
			</h4>
			<p class="picker-subtitle">Choose a postal code area to explore climate data</p>
		</div>

		<!-- Search Filter -->
		<div class="search-section">
			<v-text-field
				v-model="searchQuery"
				placeholder="Filter areas by name or postal code..."
				prepend-inner-icon="mdi-magnify"
				variant="outlined"
				density="compact"
				clearable
				hide-details
				class="mb-3"
			/>
		</div>

		<!-- View Mode Info -->
		<div class="view-info">
			<v-chip
				:color="currentView === 'helsinki' ? 'blue' : 'green'"
				size="small"
				class="mb-3"
			>
				{{ currentView === 'helsinki' ? 'Helsinki Only' : 'Capital Region' }}
				({{ filteredPostalCodes.length }} areas)
			</v-chip>
		</div>

		<!-- Postal Code List -->
		<div class="postal-codes-list">
			<v-virtual-scroll
				:items="filteredPostalCodes"
				height="300"
				item-height="60"
			>
				<template #default="{ item }">
					<v-list-item
						:key="item.posno"
						:class="{ selected: item.posno === currentPostalCode }"
						class="postal-code-item"
						@click="selectPostalCode(item)"
					>
						<template #prepend>
							<v-avatar
								:color="item.posno === currentPostalCode ? 'primary' : 'grey-lighten-1'"
								size="32"
							>
								<span class="text-caption font-weight-bold">
									{{ item.posno }}
								</span>
							</v-avatar>
						</template>

						<v-list-item-title class="area-name">
							{{ item.nimi }}
						</v-list-item-title>

						<v-list-item-subtitle class="area-details">
							<div class="postal-code-badge">
								{{ item.posno }}
							</div>
							<div class="municipality">
								{{ item.kunta }}
							</div>
						</v-list-item-subtitle>

						<template #append>
							<div class="area-stats">
								<v-tooltip location="top">
									<template #activator="{ props }">
										<v-chip
											v-bind="props"
											size="x-small"
											:color="getVegetationColor(item.vegetation_percentage)"
											class="mr-1"
										>
											{{ Math.round(item.vegetation_percentage || 0) }}%
										</v-chip>
									</template>
									<span>Vegetation Coverage</span>
								</v-tooltip>

								<v-icon
									v-if="item.posno === currentPostalCode"
									color="primary"
									size="small"
								>
									mdi-check-circle
								</v-icon>
							</div>
						</template>
					</v-list-item>
				</template>
			</v-virtual-scroll>
		</div>

		<!-- Loading State -->
		<div
			v-if="isLoading"
			class="loading-state"
		>
			<v-progress-circular
				indeterminate
				size="24"
			/>
			<span class="ml-2">Loading postal code areas...</span>
		</div>

		<!-- No Results -->
		<div
			v-if="!isLoading && filteredPostalCodes.length === 0"
			class="no-results"
		>
			<v-icon class="mb-2"> mdi-map-search </v-icon>
			<p class="text-body-2">No areas found matching "{{ searchQuery }}"</p>
			<v-btn
				variant="text"
				size="small"
				@click="searchQuery = ''"
			>
				Clear Search
			</v-btn>
		</div>

		<!-- Quick Actions -->
		<div class="quick-actions">
			<v-btn
				v-if="currentPostalCode"
				block
				variant="outlined"
				prepend-icon="mdi-target"
				class="mb-2"
				@click="focusOnCurrentArea"
			>
				Focus on {{ currentAreaName }}
			</v-btn>

			<v-btn
				block
				variant="text"
				prepend-icon="mdi-refresh"
				size="small"
				@click="resetSelection"
			>
				Reset Selection
			</v-btn>
		</div>
	</div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useGlobalStore } from '../stores/globalStore';
import { usePropsStore } from '../stores/propsStore';
import Camera from '../services/camera';
import Featurepicker from '../services/featurepicker';

export default {
	name: 'PostalCodePicker',
	setup() {
		const globalStore = useGlobalStore();
		const propsStore = usePropsStore();

		const searchQuery = ref('');
		const isLoading = ref(false);

		const currentView = computed(() => globalStore.view);
		const currentPostalCode = computed(() => globalStore.postalcode);
		const currentAreaName = computed(() => globalStore.nameOfZone);

		// Get postal code data from the loaded data source
		const postalCodeData = computed(() => {
			const data = propsStore.postalCodeData;
			if (!data || !data.entities) return [];

			const entities = data.entities.values;
			return entities
				.map((entity) => {
					const properties = entity.properties;
					return {
						posno: properties.posno?.getValue() || '',
						nimi: properties.nimi?.getValue() || '',
						kunta: properties.kunta?.getValue() || '',
						vegetation_percentage: properties.vegetation_percentage?.getValue() || 0,
						// Add other useful properties
						trees_percentage: properties.trees_percentage?.getValue() || 0,
						building_percentage: properties.building_percentage?.getValue() || 0,
					};
				})
				.filter((item) => item.posno && item.nimi);
		});

		// Filter postal codes based on search query
		const filteredPostalCodes = computed(() => {
			if (!searchQuery.value) return postalCodeData.value;

			const query = searchQuery.value.toLowerCase();
			return postalCodeData.value.filter(
				(item) =>
					item.nimi.toLowerCase().includes(query) ||
					item.posno.includes(query) ||
					item.kunta.toLowerCase().includes(query)
			);
		});

		// Get vegetation color based on percentage
		const getVegetationColor = (percentage) => {
			if (percentage >= 50) return 'green';
			if (percentage >= 30) return 'orange';
			return 'red';
		};

		// Select a postal code
		const selectPostalCode = async (item) => {
			isLoading.value = true;

			try {
				// Update global store
				globalStore.setPostalCode(item.posno);
				globalStore.setNameOfZone(item.nimi);

				// Use featurepicker to load the postal code (this handles map updates)
				const featurepicker = new Featurepicker();
				await featurepicker.loadPostalCode();

				// Focus camera on the selected area
				await focusOnCurrentArea();
			} catch (error) {
				console.error('Error selecting postal code:', error);
			} finally {
				isLoading.value = false;
			}
		};

		// Focus camera on current area
		const focusOnCurrentArea = async () => {
			if (!currentPostalCode.value) return;

			try {
				const camera = new Camera();

				// Find the selected postal code in the data
				const selectedArea = postalCodeData.value.find(
					(item) => item.posno === currentPostalCode.value
				);

				if (selectedArea) {
					// Use the camera service to focus on the area
					// This may need adjustment based on how the Camera service works
					await camera.focusOnPostalCode(currentPostalCode.value);
				}
			} catch (error) {
				console.error('Error focusing on area:', error);
			}
		};

		// Reset selection
		const resetSelection = () => {
			globalStore.setPostalCode(null);
			globalStore.setNameOfZone(null);
			globalStore.setLevel('start');
			searchQuery.value = '';

			// Reset camera to initial position
			const camera = new Camera();
			camera.init();
		};

		// Watch for view changes to update data
		watch(currentView, () => {
			// Data will be updated by the parent component when view changes
			searchQuery.value = '';
		});

		onMounted(() => {
			// Data should already be loaded by the time this component mounts
		});

		return {
			searchQuery,
			isLoading,
			currentView,
			currentPostalCode,
			currentAreaName,
			postalCodeData,
			filteredPostalCodes,
			getVegetationColor,
			selectPostalCode,
			focusOnCurrentArea,
			resetSelection,
		};
	},
};
</script>

<style scoped>
.postal-code-picker {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.picker-header {
	margin-bottom: 16px;
}

.picker-title {
	font-size: 1rem;
	font-weight: 600;
	margin-bottom: 4px;
	color: rgba(0, 0, 0, 0.87);
	display: flex;
	align-items: center;
}

.picker-subtitle {
	font-size: 0.875rem;
	color: rgba(0, 0, 0, 0.6);
	margin: 0;
}

.search-section {
	margin-bottom: 8px;
}

.view-info {
	display: flex;
	justify-content: center;
}

.postal-codes-list {
	flex: 1;
	overflow: hidden;
	border: 1px solid rgba(0, 0, 0, 0.12);
	border-radius: 4px;
	margin-bottom: 16px;
}

.postal-code-item {
	border-bottom: 1px solid rgba(0, 0, 0, 0.06);
	cursor: pointer;
	transition: background-color 0.2s;
}

.postal-code-item:hover {
	background-color: rgba(0, 0, 0, 0.04);
}

.postal-code-item.selected {
	background-color: rgba(25, 118, 210, 0.08);
	border-left: 3px solid #1976d2;
}

.area-name {
	font-weight: 500;
	font-size: 0.9rem;
}

.area-details {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-top: 2px;
}

.postal-code-badge {
	background: rgba(0, 0, 0, 0.1);
	padding: 2px 6px;
	border-radius: 3px;
	font-size: 0.75rem;
	font-weight: 600;
}

.municipality {
	font-size: 0.75rem;
	color: rgba(0, 0, 0, 0.6);
}

.area-stats {
	display: flex;
	align-items: center;
	gap: 4px;
}

.loading-state,
.no-results {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 32px 16px;
	text-align: center;
	color: rgba(0, 0, 0, 0.6);
}

.quick-actions {
	padding-top: 8px;
	border-top: 1px solid rgba(0, 0, 0, 0.06);
}

/* Responsive adjustments */
@media (max-width: 768px) {
	.picker-title {
		font-size: 0.9rem;
	}

	.picker-subtitle {
		font-size: 0.8rem;
	}

	.postal-codes-list {
		height: 250px;
	}
}
</style>
