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

			<v-card
				v-if="hasResults"
				class="results-card"
			>
				<!-- Address Results Section -->
				<div
					v-if="addressResults.length > 0"
					class="results-section"
				>
					<v-list-subheader class="results-header">
						<v-icon
							class="mr-2"
							size="16"
						>
							mdi-map-marker
						</v-icon>
						Addresses
					</v-list-subheader>
					<v-list density="compact">
						<v-list-item
							v-for="(address, index) in addressResults.slice(0, 5)"
							:key="`address-${index}`"
							class="result-item"
							@click="selectAddress(address)"
						>
							<template #prepend>
								<v-icon
									class="result-icon"
									color="blue"
								>
									mdi-map-marker
								</v-icon>
							</template>
							<v-list-item-title>{{ address.address }}</v-list-item-title>
							<v-list-item-subtitle v-if="address.postalcode">
								{{ address.postalcode }}
							</v-list-item-subtitle>
						</v-list-item>
					</v-list>
				</div>

				<!-- Postal Code Results Section -->
				<div
					v-if="postalCodeResults.length > 0"
					class="results-section"
				>
					<v-list-subheader class="results-header">
						<v-icon
							class="mr-2"
							size="16"
						>
							mdi-post
						</v-icon>
						Postal Code Areas
					</v-list-subheader>
					<v-list density="compact">
						<v-list-item
							v-for="area in postalCodeResults.slice(0, 5)"
							:key="area.posno"
							class="result-item"
							@click="selectPostalCode(area)"
						>
							<template #prepend>
								<v-avatar
									size="28"
									:color="getVegetationColor(area.vegetation_percentage)"
								>
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
				<div
					v-if="searchQuery.length > 2 && !hasResults"
					class="no-results"
				>
					<v-icon class="mb-2">
mdi-map-search
</v-icon>
					<p class="text-body-2">
No results found for "{{ searchQuery }}"
</p>
					<p class="text-caption">
Try searching by address, postal code, or area name
</p>
				</div>

				<!-- Search Tips -->
				<div
					v-if="searchQuery.length <= 2"
					class="search-tips"
				>
					<v-icon class="mb-2">
mdi-lightbulb-outline
</v-icon>
					<p class="text-body-2">
Search examples:
</p>
					<v-chip
						size="small"
						class="ma-1"
					>
						00100
					</v-chip>
					<v-chip
						size="small"
						class="ma-1"
					>
						Keskusta
					</v-chip>
					<v-chip
						size="small"
						class="ma-1"
					>
						Helsinki Central Station
					</v-chip>
				</div>
			</v-card>
		</v-menu>

		<!-- Quick Actions -->
		<div
			v-if="currentSelection"
			class="quick-actions"
		>
			<v-btn
				variant="text"
				size="small"
				prepend-icon="mdi-target"
				@click="focusOnCurrent"
			>
				Focus on {{ currentSelection.name }}
			</v-btn>
		</div>
	</div>
</template>

<script setup>
/**
 * @component UnifiedSearch
 * @description Unified search interface with Digitransit API integration for address and postal code search.
 *
 * Provides a comprehensive search experience that handles both address geocoding via Digitransit API
 * and local postal code area search from cached data. Features intelligent search type detection,
 * real-time results, and visual indicators for vegetation coverage in postal code areas.
 *
 * **Features:**
 * - Dual search modes: Address (via Digitransit API) and Postal Code (local data)
 * - Intelligent query type detection (numeric vs text)
 * - Real-time search results with debouncing
 * - Keyboard navigation (Enter to select first result)
 * - Visual vegetation indicators for postal code areas
 * - View-specific filtering (Helsinki vs Capital Region)
 * - Quick focus action for current selection
 * - Search tips and examples
 * - No results fallback messaging
 *
 * **Search Modes:**
 * - **Address Search**: Geocodes addresses using Digitransit API, returns coordinates and postal codes
 * - **Postal Code Search**: Searches local postal code data with vegetation statistics
 * - **Area Name Search**: Searches by postal code area names (e.g., "Keskusta")
 *
 * **Digitransit Integration:**
 * Uses `/digitransit/geocoding/v1/autocomplete` endpoint for address suggestions.
 * Results are filtered based on current view (Helsinki vs Capital Region).
 *
 * **Store Integration:**
 * - `globalStore` - Postal code, zone name, view state
 * - `toggleStore` - Helsinki view flag for result filtering
 * - `propsStore` - Postal code data with vegetation statistics
 *
 * **Service Integration:**
 * - `Camera` - Camera positioning for selected locations
 * - `FeaturePicker` - Postal code data loading and selection
 *
 * **Event Emissions:**
 * - Listens: None
 * - Emits: 'geocodingPrintEvent' (via eventBus) - When address is selected
 *
 * **Vegetation Color Coding:**
 * - Green: ≥50% vegetation coverage
 * - Orange: 30-49% vegetation coverage
 * - Red: <30% vegetation coverage
 *
 * @example
 * <UnifiedSearch />
 */

import { ref, computed, watch } from 'vue';
import { useGlobalStore } from '../stores/globalStore';
import { useToggleStore } from '../stores/toggleStore';
import { usePropsStore } from '../stores/propsStore';
import Camera from '../services/camera';
import FeaturePicker from '../services/featurepicker';
import { eventBus } from '../services/eventEmitter';

/**
 * Search query state
 * @type {import('vue').Ref<string>}
 */
const searchQuery = ref('');

/**
 * Results dropdown visibility
 * @type {import('vue').Ref<boolean>}
 */
const showResults = ref(false);

/**
 * Address search results from Digitransit API
 * @type {import('vue').Ref<Array>}
 */
const addressResults = ref([]);

/**
 * Loading state for API requests
 * @type {import('vue').Ref<boolean>}
 */
const isLoading = ref(false);

// Stores and services
const globalStore = useGlobalStore();
const toggleStore = useToggleStore();
const propsStore = usePropsStore();
const cameraService = new Camera();
const featurePicker = new FeaturePicker();

/**
 * Dynamic search placeholder text
 * @type {import('vue').ComputedRef<string>}
 */
const searchPlaceholder = computed(() => {
	return 'Search by address, postal code, or area name...';
});

/**
 * Current selection summary for quick actions
 * @type {import('vue').ComputedRef<{name: string} | null>}
 */
const currentSelection = computed(() => {
	const postalCode = globalStore.postalcode;
	const areaName = globalStore.nameOfZone;
	if (postalCode && areaName) {
		return { name: `${areaName} (${postalCode})` };
	}
	return null;
});

/**
 * Extracts postal code data from store entities
 *
 * Transforms Cesium entity properties into searchable postal code objects
 * with vegetation and area statistics.
 *
 * @type {import('vue').ComputedRef<Array<{posno: string, nimi: string, kunta: string, vegetation_percentage: number, trees_percentage: number, building_percentage: number}>>}
 */
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

/**
 * Filters postal code results based on search query
 *
 * Supports numeric postal code search and text-based area name search.
 * Prioritizes postal code matches for numeric queries.
 *
 * @type {import('vue').ComputedRef<Array>}
 */
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

/**
 * Checks if any results are available
 * @type {import('vue').ComputedRef<boolean>}
 */
const hasResults = computed(() => {
	return addressResults.value.length > 0 || postalCodeResults.value.length > 0;
});

/**
 * Returns color code based on vegetation percentage
 *
 * @param {number} percentage - Vegetation coverage percentage (0-100)
 * @returns {string} Vuetify color name
 */
const getVegetationColor = (percentage) => {
	if (percentage >= 50) return 'green';
	if (percentage >= 30) return 'orange';
	return 'red';
};

/**
 * Determines if query looks like a postal code
 *
 * @param {string} query - Search query
 * @returns {boolean} True if query matches postal code pattern (4-5 digits)
 */
const isPostalCodeQuery = (query) => {
	return /^\d{4,5}$/.test(query.trim());
};

/**
 * Handles search input changes
 *
 * Routes to address search for text queries, skips API call for postal code queries.
 * Shows results dropdown when query is long enough.
 *
 * @async
 * @returns {Promise<void>}
 */
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

/**
 * Fetches address results from Digitransit geocoding API
 *
 * Makes autocomplete requests to Digitransit API with the current search query.
 * Results are filtered based on view context (Helsinki vs Capital Region).
 *
 * @async
 * @returns {Promise<void>}
 */
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

/**
 * Processes geocoding API response features
 *
 * Transforms Digitransit API results into internal format and applies
 * view-specific filtering (Helsinki only vs all regions).
 *
 * @param {Array} features - GeoJSON features from Digitransit API
 * @returns {Array<{address: string, latitude: number, longitude: number, postalcode: string}>} Processed address results
 */
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

/**
 * Handles address result selection
 *
 * Updates global store with postal code, moves camera to location,
 * and loads postal code data.
 *
 * @param {{address: string, latitude: number, longitude: number, postalcode: string}} address - Selected address object
 * @returns {void}
 * @fires eventBus#geocodingPrintEvent
 */
const selectAddress = (address) => {
	const { latitude, longitude, postalcode } = address;
	globalStore.setPostalCode(postalcode);
	moveCameraAndLoad(longitude, latitude);
	searchQuery.value = address.address;
	showResults.value = false;
};

/**
 * Handles postal code area selection
 *
 * Updates global store, loads postal code data, and focuses camera on the area.
 *
 * @async
 * @param {{posno: string, nimi: string, kunta: string}} area - Selected postal code area
 * @returns {Promise<void>}
 */
const selectPostalCode = async (area) => {
	try {
		isLoading.value = true;

		// Update global store
		globalStore.setPostalCode(area.posno);
		globalStore.setNameOfZone(area.nimi);

		// Load postal code data and focus camera
		await featurePicker.loadPostalCode();
		focusOnPostalCode(area.posno);

		searchQuery.value = `${area.nimi} (${area.posno})`;
		showResults.value = false;
	} catch (error) {
		console.error('Error selecting postal code:', error);
	} finally {
		isLoading.value = false;
	}
};

/**
 * Moves camera to coordinates and loads postal code data
 *
 * @param {number} longitude - Target longitude
 * @param {number} latitude - Target latitude
 * @returns {void}
 * @fires eventBus#geocodingPrintEvent
 */
const moveCameraAndLoad = (longitude, latitude) => {
	cameraService.setCameraView(longitude, latitude);
	eventBus.emit('geocodingPrintEvent');
	featurePicker.loadPostalCode().catch(console.error);
};

/**
 * Focuses camera on postal code area
 *
 * @param {string} postalCode - Postal code to focus on
 * @returns {void}
 */
const focusOnPostalCode = (postalCode) => {
	try {
		const camera = new Camera();

		// Verify camera has access to the viewer
		if (!camera.viewer) {
			console.warn('[UnifiedSearch] Camera viewer not initialized');
			return;
		}

		// Focus on the postal code (synchronous call)
		camera.focusOnPostalCode(postalCode);
	} catch (error) {
		console.error('Error focusing on postal code:', error);
	}
};

/**
 * Selects first available result when Enter is pressed
 *
 * Prioritizes address results over postal code results.
 *
 * @returns {void}
 */
const selectFirstResult = () => {
	if (addressResults.value.length > 0) {
		void selectAddress(addressResults.value[0]);
	} else if (postalCodeResults.value.length > 0) {
		void selectPostalCode(postalCodeResults.value[0]);
	}
};

/**
 * Focuses on currently selected area
 *
 * @returns {void}
 */
const focusOnCurrent = () => {
	if (globalStore.postalcode) {
		focusOnPostalCode(globalStore.postalcode);
	}
};

/**
 * Closes results dropdown (unused - placeholder for click-outside handler)
 *
 * @returns {void}
 */
const _handleClickOutside = () => {
	showResults.value = false;
};

/**
 * Watches for view changes and refreshes search results
 *
 * Re-executes search when view changes to apply new filtering context.
 */
watch(
	() => globalStore.view,
	() => {
		if (searchQuery.value) {
			void handleSearch();
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
