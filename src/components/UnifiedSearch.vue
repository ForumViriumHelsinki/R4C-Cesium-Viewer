<template>
	<div class="unified-search">
		<!-- Search Results Dropdown -->
		<v-menu
			v-model="showResults"
			:close-on-content-click="false"
			location="bottom"
			max-height="400"
			min-width="100%"
			offset="2"
		>
			<template #activator="{ props }">
				<!-- Search Input -->
				<div class="search-container">
					<v-text-field
						v-bind="props"
						v-model="searchQuery"
						:label="searchPlaceholder"
						prepend-inner-icon="mdi-magnify"
						variant="outlined"
						density="compact"
						clearable
						hide-details
						class="search-field"
						@keyup="handleSearch"
						@keydown.enter="selectFirstResult"
						@focus="showResults = true"
					>
						<template #append-inner>
							<v-btn
								v-if="searchQuery && searchQuery.length > 0"
								icon
								size="small"
								variant="text"
								@click="selectFirstResult"
							>
								<v-icon>mdi-arrow-right</v-icon>
							</v-btn>
						</template>
					</v-text-field>
				</div>
			</template>

			<v-card v-if="hasResults" class="results-card">
				<!-- Address Results Section -->
				<div v-if="addressResults.length > 0" class="results-section">
					<v-subheader class="results-header">
						<v-icon class="mr-2" size="16"> mdi-map-marker </v-icon>
						Addresses
					</v-subheader>
					<v-list density="compact">
						<v-list-item
							v-for="(address, index) in addressResults.slice(0, 5)"
							:key="`address-${index}`"
							class="result-item"
							@click="selectAddress(address)"
						>
							<template #prepend>
								<v-icon class="result-icon" color="blue"> mdi-map-marker </v-icon>
							</template>
							<v-list-item-title>{{ address.address }}</v-list-item-title>
							<v-list-item-subtitle v-if="address.postalcode">
								{{ address.postalcode }}
							</v-list-item-subtitle>
						</v-list-item>
					</v-list>
				</div>

				<!-- Postal Code Results Section -->
				<div v-if="postalCodeResults.length > 0" class="results-section">
					<v-subheader class="results-header">
						<v-icon class="mr-2" size="16"> mdi-post </v-icon>
						Postal Code Areas
					</v-subheader>
					<v-list density="compact">
						<v-list-item
							v-for="area in postalCodeResults.slice(0, 5)"
							:key="area.posno"
							class="result-item"
							@click="selectPostalCode(area)"
						>
							<template #prepend>
								<v-avatar size="28" :color="getVegetationColor(area.vegetation_percentage)">
									<span class="text-caption font-weight-bold">{{ area.posno }}</span>
								</v-avatar>
							</template>
							<v-list-item-title>{{ area.nimi }}</v-list-item-title>
							<v-list-item-subtitle>
								{{ area.posno }} • {{ area.kunta }}
								<v-chip
									v-if="area.vegetation_percentage"
									size="x-small"
									:color="getVegetationColor(area.vegetation_percentage)"
									class="ml-2"
								>
									{{ Math.round(area.vegetation_percentage) }}% green
								</v-chip>
							</v-list-item-subtitle>
						</v-list-item>
					</v-list>
				</div>

				<!-- No Results -->
				<div v-if="searchQuery.length > 2 && !hasResults" class="no-results">
					<v-icon class="mb-2"> mdi-map-search </v-icon>
					<p class="text-body-2">No results found for "{{ searchQuery }}"</p>
					<p class="text-caption">Try searching by address, postal code, or area name</p>
				</div>

				<!-- Search Tips -->
				<div v-if="searchQuery.length <= 2" class="search-tips">
					<v-icon class="mb-2"> mdi-lightbulb-outline </v-icon>
					<p class="text-body-2">Search examples:</p>
					<v-chip size="small" class="ma-1"> 00100 </v-chip>
					<v-chip size="small" class="ma-1"> Keskusta </v-chip>
					<v-chip size="small" class="ma-1"> Helsinki Central Station </v-chip>
				</div>
			</v-card>
		</v-menu>

		<!-- Quick Actions -->
		<div v-if="currentSelection" class="quick-actions">
			<v-btn variant="text" size="small" prepend-icon="mdi-target" @click="focusOnCurrent">
				Focus on {{ currentSelection.name }}
			</v-btn>
		</div>
	</div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useGlobalStore } from '../stores/globalStore';
import { useToggleStore } from '../stores/toggleStore';
import { usePropsStore } from '../stores/propsStore';
import Camera from '../services/camera';
import FeaturePicker from '../services/featurepicker';
import { eventBus } from '../services/eventEmitter';

// State
const searchQuery = ref('');
const showResults = ref(false);
const addressResults = ref([]);
const isLoading = ref(false);

// Stores and services
const globalStore = useGlobalStore();
const toggleStore = useToggleStore();
const propsStore = usePropsStore();
const cameraService = new Camera();
const featurePicker = new FeaturePicker();

// Computed properties
const searchPlaceholder = computed(() => {
	return 'Search by address, postal code, or area name...';
});

const currentSelection = computed(() => {
	const postalCode = globalStore.postalcode;
	const areaName = globalStore.nameOfZone;
	if (postalCode && areaName) {
		return { name: `${areaName} (${postalCode})` };
	}
	return null;
});

// Get postal code data from store
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
				trees_percentage: properties.trees_percentage?.getValue() || 0,
				building_percentage: properties.building_percentage?.getValue() || 0,
			};
		})
		.filter((item) => item.posno && item.nimi);
});

// Filter postal codes based on search query
const postalCodeResults = computed(() => {
	if (!searchQuery.value || searchQuery.value.length < 2) return [];

	const query = searchQuery.value.toLowerCase();

	// Check if query is numeric (postal code search)
	const isNumericSearch = /^\d+$/.test(query);

	return postalCodeData.value
		.filter((item) => {
			if (isNumericSearch) {
				// For numeric searches, prioritize postal code matches
				return item.posno.includes(query);
			} else {
				// For text searches, search in name and municipality
				return (
					item.nimi.toLowerCase().includes(query) ||
					item.kunta.toLowerCase().includes(query) ||
					item.posno.includes(query)
				);
			}
		})
		.slice(0, 10); // Limit results
});

const hasResults = computed(() => {
	return addressResults.value.length > 0 || postalCodeResults.value.length > 0;
});

// Get vegetation color for postal code avatars
const getVegetationColor = (percentage) => {
	if (percentage >= 50) return 'green';
	if (percentage >= 30) return 'orange';
	return 'red';
};

// Determine if input is likely a postal code
const isPostalCodeQuery = (query) => {
	return /^\d{4,5}$/.test(query.trim());
};

// Handle search input
const handleSearch = async () => {
	if (searchQuery.value.length < 2) {
		showResults.value = false;
		return;
	}

	showResults.value = true;

	// If it looks like a postal code, don't fetch addresses
	if (isPostalCodeQuery(searchQuery.value)) {
		addressResults.value = [];
		return;
	}

	// Fetch address results for text searches
	await fetchAddressResults();
};

// Fetch address results from geocoding API
const fetchAddressResults = async () => {
	if (searchQuery.value.length < 3) return;

	try {
		isLoading.value = true;
		const response = await fetch(
			`/digitransit/geocoding/v1/autocomplete?text=${searchQuery.value}`
		);
		const data = await response.json();

		addressResults.value = processAddressData(data.features);
	} catch (error) {
		console.error('Geocoding error:', error);
		addressResults.value = [];
	} finally {
		isLoading.value = false;
	}
};

// Process geocoding API response
const processAddressData = (features) => {
	let results = [];
	features.forEach((item) => {
		const result = {
			address: item.properties.name,
			latitude: item.geometry.coordinates[1],
			longitude: item.geometry.coordinates[0],
			postalcode: item.properties.postalcode,
		};

		// Filter results based on current view
		if (toggleStore.helsinkiView) {
			if (
				(item.properties.locality === 'Helsinki' || item.properties.localadmin === 'Helsinki') &&
				item.properties.postalcode
			) {
				results.push(result);
			}
		} else {
			results.push(result);
		}
	});

	return results.slice(0, 10); // Limit results
};

// Select address result
const selectAddress = (address) => {
	const { latitude, longitude, postalcode } = address;
	globalStore.setPostalCode(postalcode);
	moveCameraAndLoad(longitude, latitude);
	searchQuery.value = address.address;
	showResults.value = false;
};

// Select postal code result
const selectPostalCode = async (area) => {
	try {
		isLoading.value = true;

		// Update global store
		globalStore.setPostalCode(area.posno);
		globalStore.setNameOfZone(area.nimi);

		// Load postal code data and focus camera
		await featurePicker.loadPostalCode();
		await focusOnPostalCode(area.posno);

		searchQuery.value = `${area.nimi} (${area.posno})`;
		showResults.value = false;
	} catch (error) {
		console.error('Error selecting postal code:', error);
	} finally {
		isLoading.value = false;
	}
};

// Move camera and load postal code data
const moveCameraAndLoad = (longitude, latitude) => {
	cameraService.setCameraView(longitude, latitude);
	eventBus.emit('geocodingPrintEvent');
	featurePicker.loadPostalCode();
};

// Focus camera on postal code area
const focusOnPostalCode = async (postalCode) => {
	try {
		const camera = new Camera();
		// This may need adjustment based on Camera service implementation
		await camera.focusOnPostalCode(postalCode);
	} catch (error) {
		console.error('Error focusing on postal code:', error);
	}
};

// Select first result when Enter is pressed
const selectFirstResult = () => {
	if (addressResults.value.length > 0) {
		selectAddress(addressResults.value[0]);
	} else if (postalCodeResults.value.length > 0) {
		selectPostalCode(postalCodeResults.value[0]);
	}
};

// Focus on current selection
const focusOnCurrent = () => {
	if (globalStore.postalcode) {
		focusOnPostalCode(globalStore.postalcode);
	}
};

// Close results when clicking outside
const handleClickOutside = () => {
	showResults.value = false;
};

// Watch for view changes
watch(
	() => globalStore.view,
	() => {
		if (searchQuery.value) {
			handleSearch();
		}
	}
);
</script>

<style scoped>
.unified-search {
	width: 100%;
	position: relative;
}

.search-container {
	width: 100%;
}

.search-field {
	width: 100%;
}

.results-card {
	max-height: 400px;
	overflow-y: auto;
	border: 1px solid rgba(0, 0, 0, 0.12);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.results-section {
	border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.results-section:last-child {
	border-bottom: none;
}

.results-header {
	font-weight: 600;
	font-size: 0.875rem;
	color: rgba(0, 0, 0, 0.87);
	padding: 8px 16px 4px 16px;
	background-color: rgba(0, 0, 0, 0.02);
}

.result-item {
	cursor: pointer;
	transition: background-color 0.2s;
}

.result-item:hover {
	background-color: rgba(0, 0, 0, 0.04);
}

.result-icon {
	margin-right: 8px;
}

.no-results,
.search-tips {
	padding: 24px;
	text-align: center;
	color: rgba(0, 0, 0, 0.6);
}

.search-tips .v-chip {
	margin: 2px;
}

.quick-actions {
	margin-top: 8px;
	text-align: center;
}

/* Responsive adjustments */
@media (max-width: 768px) {
	.results-card {
		max-height: 300px;
	}

	.no-results,
	.search-tips {
		padding: 16px;
	}
}
</style>
