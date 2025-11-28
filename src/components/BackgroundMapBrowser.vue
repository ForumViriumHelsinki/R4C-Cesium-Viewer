<template>
	<div class="background-map-browser">
		<!-- Map Categories -->
		<div class="category-tabs">
			<v-chip-group
				v-model="selectedCategory"
				mandatory
				class="category-chips"
			>
				<v-chip
					v-for="category in categories"
					:key="category.key"
					:value="category.key"
					size="small"
					filter
				>
					<v-icon start>
						{{ category.icon }}
					</v-icon>
					{{ category.name }}
				</v-chip>
			</v-chip-group>
		</div>

		<!-- Quick Flood Risk Selection -->
		<div
			v-if="selectedCategory === 'flood'"
			class="flood-quick-select"
		>
			<h5 class="flood-title">Flood Risk Scenarios</h5>
			<p class="flood-disclaimer">
				⚠️ Map contains significant errors. Not for building-specific evaluation!
			</p>

			<div class="flood-categories">
				<!-- Stormwater Floods -->
				<div class="flood-category">
					<h6 class="flood-category-title">Stormwater Floods</h6>
					<v-btn-toggle
						v-model="selectedFloodLayer"
						mandatory
						variant="outlined"
						class="flood-buttons"
					>
						<v-btn
							value="none"
							size="small"
						>
							None
						</v-btn>
						<v-btn
							value="HulevesitulvaVesisyvyysSade52mmMallinnettuAlue"
							size="small"
						>
							52mm/hour
						</v-btn>
						<v-btn
							value="HulevesitulvaVesisyvyysSade80mmMallinnettuAlue"
							size="small"
						>
							80mm/hour
						</v-btn>
					</v-btn-toggle>
				</div>

				<!-- Coastal Floods -->
				<div class="flood-category">
					<h6 class="flood-category-title">Coastal Flood Scenarios</h6>
					<v-btn-toggle
						v-model="selectedFloodLayer"
						mandatory
						variant="outlined"
						class="flood-buttons"
					>
						<v-btn
							value="none"
							size="small"
						>
							None
						</v-btn>
						<v-btn
							value="SSP585_re_with_SSP245_with_SSP126_with_current"
							size="small"
						>
							Combined
						</v-btn>
						<v-btn
							value="coastal_flood_SSP126_2050_0020_with_protected"
							size="small"
						>
							SSP126 2050
						</v-btn>
						<v-btn
							value="coastal_flood_SSP245_2050_0020_with_protected"
							size="small"
						>
							SSP245 2050
						</v-btn>
						<v-btn
							value="coastal_flood_SSP585_2050_0020_with_protected"
							size="small"
						>
							SSP585 2050
						</v-btn>
					</v-btn-toggle>
				</div>
			</div>

			<!-- Flood Legend -->
			<div
				v-if="selectedFloodLayer && selectedFloodLayer !== 'none'"
				class="flood-legend"
			>
				<h6 class="legend-title">Legend</h6>
				<div class="legend-items">
					<div
						v-for="item in currentFloodLegend"
						:key="item.color"
						class="legend-item"
					>
						<div
							class="legend-color"
							:style="{ backgroundColor: item.color }"
						/>
						<span class="legend-text">{{ item.text }}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- HSY Environmental Maps -->
		<div
			v-else-if="selectedCategory === 'environmental'"
			class="hsy-maps"
		>
			<div class="search-section">
				<v-text-field
					v-model="hsySearchQuery"
					placeholder="Search environmental layers..."
					prepend-inner-icon="mdi-magnify"
					variant="outlined"
					density="compact"
					clearable
					hide-details
					@input="searchHSYLayers"
				/>
			</div>

			<div
				v-if="isLoadingHSY"
				class="loading-state"
			>
				<v-progress-circular
					indeterminate
					size="20"
				/>
				<span class="ml-2">Loading HSY layers...</span>
			</div>

			<div
				v-else-if="filteredHSYLayers.length > 0"
				class="hsy-layer-list"
			>
				<v-list density="compact">
					<v-list-item
						v-for="layer in filteredHSYLayers.slice(0, 10)"
						:key="layer.id"
						:class="{ selected: layer.name === selectedHSYLayer }"
						@click="selectHSYLayer(layer)"
					>
						<template #prepend>
							<v-icon :color="layer.name === selectedHSYLayer ? 'primary' : 'grey'">
								mdi-layers
							</v-icon>
						</template>

						<v-list-item-title class="layer-title">
							{{ layer.title }}
						</v-list-item-title>

						<v-list-item-subtitle class="layer-subtitle">
							Updated: {{ formatDate(layer.date_updated) }}
						</v-list-item-subtitle>
					</v-list-item>
				</v-list>

				<div
					v-if="filteredHSYLayers.length > 10"
					class="more-results"
				>
					<p class="text-caption">Showing first 10 of {{ filteredHSYLayers.length }} results</p>
				</div>
			</div>

			<div
				v-else-if="hsySearchQuery && !isLoadingHSY"
				class="no-results"
			>
				<v-icon class="mb-2"> mdi-map-search </v-icon>
				<p class="text-body-2">No layers found matching "{{ hsySearchQuery }}"</p>
			</div>
		</div>

		<!-- Basic Maps -->
		<div
			v-else-if="selectedCategory === 'basic'"
			class="basic-maps"
		>
			<v-list density="compact">
				<v-list-item
					v-for="basicMap in basicMaps"
					:key="basicMap.value"
					:class="{ selected: basicMap.value === selectedBasicMap }"
					@click="selectBasicMap(basicMap)"
				>
					<template #prepend>
						<v-icon :color="basicMap.value === selectedBasicMap ? 'primary' : 'grey'">
							{{ basicMap.icon }}
						</v-icon>
					</template>

					<v-list-item-title>{{ basicMap.title }}</v-list-item-title>
					<v-list-item-subtitle>{{ basicMap.description }}</v-list-item-subtitle>
				</v-list-item>
			</v-list>
		</div>

		<!-- Current Selection Display -->
		<div
			v-if="hasSelection"
			class="current-selection"
		>
			<v-divider class="my-3" />
			<div class="selection-info">
				<v-icon
					class="mr-2"
					color="primary"
				>
					mdi-check-circle
				</v-icon>
				<span class="selection-text">{{ currentSelectionText }}</span>
				<v-btn
					icon
					size="x-small"
					class="ml-2"
					@click="clearSelection"
				>
					<v-icon>mdi-close</v-icon>
				</v-btn>
			</div>
		</div>
	</div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { createFloodImageryLayer, removeFloodLayers } from '../services/floodwms';
import { useBackgroundMapStore } from '../stores/backgroundMapStore';
import { useURLStore } from '../stores/urlStore';

export default {
	name: 'BackgroundMapBrowser',
	setup() {
		const _backgroundMapStore = useBackgroundMapStore();
		const urlStore = useURLStore();

		// Category management
		const selectedCategory = ref('basic');
		const categories = [
			{ key: 'basic', name: 'Basic', icon: 'mdi-map' },
			{ key: 'environmental', name: 'Environmental', icon: 'mdi-leaf' },
			{ key: 'flood', name: 'Flood Risk', icon: 'mdi-water' },
		];

		// Basic maps
		const selectedBasicMap = ref('default');
		const basicMaps = [
			{
				value: 'default',
				title: 'Default Map',
				description: 'Standard base map',
				icon: 'mdi-map',
			},
			{
				value: 'satellite',
				title: 'Satellite',
				description: 'Aerial imagery',
				icon: 'mdi-satellite-variant',
			},
			{
				value: 'terrain',
				title: 'Terrain',
				description: 'Topographic map',
				icon: 'mdi-terrain',
			},
		];

		// HSY Environmental maps
		const hsySearchQuery = ref('');
		const selectedHSYLayer = ref(null);
		const hsyLayers = ref([]);
		const isLoadingHSY = ref(false);

		const filteredHSYLayers = computed(() => {
			if (!hsySearchQuery.value) {
				return hsyLayers.value.slice(0, 20); // Show top 20 by default
			}
			const query = hsySearchQuery.value.toLowerCase();
			return hsyLayers.value.filter(
				(layer) =>
					layer.title.toLowerCase().includes(query) || layer.name.toLowerCase().includes(query)
			);
		});

		// Flood risk maps
		const selectedFloodLayer = ref('none');

		const floodLegends = {
			stormwater: [
				{ color: '#82CFFF', text: 'Water/sea area' },
				{ color: '#4589FF', text: '0.1 m' },
				{ color: '#0F62FE', text: '0.3 m' },
				{ color: '#0059C9', text: '0.5 m' },
				{ color: '#002A8E', text: '1 m' },
				{ color: '#001141', text: '2+ m' },
			],
			coastal: [
				{ color: '#7ecce6', text: 'Less than 0.5 m' },
				{ color: '#5498cc', text: '0.5-1 m' },
				{ color: '#2b66b3', text: '1-2 m' },
				{ color: '#003399', text: '2-3 m' },
				{ color: '#002673', text: 'More than 3 m' },
				{ color: '#fddbc6', text: 'Flood-protected areas' },
			],
			combination: [
				{ color: '#002a8e', text: 'Current situation (2020)' },
				{ color: '#0f62fe', text: 'Year 2100, low = SSP1-2.6' },
				{ color: '#b2192b', text: 'Year 2100, medium = SSP2-4.5' },
				{ color: '#fde9dc', text: 'Year 2100, high = SSP5-8.5' },
			],
		};

		const currentFloodLegend = computed(() => {
			if (selectedFloodLayer.value?.startsWith('Hulevesitulva')) {
				return floodLegends.stormwater;
			} else if (selectedFloodLayer.value === 'SSP585_re_with_SSP245_with_SSP126_with_current') {
				return floodLegends.combination;
			} else if (selectedFloodLayer.value?.startsWith('coastal_flood')) {
				return floodLegends.coastal;
			}
			return [];
		});

		// Current selection tracking
		const hasSelection = computed(() => {
			return (
				(selectedBasicMap.value && selectedBasicMap.value !== 'default') ||
				selectedHSYLayer.value ||
				(selectedFloodLayer.value && selectedFloodLayer.value !== 'none')
			);
		});

		const currentSelectionText = computed(() => {
			if (selectedFloodLayer.value && selectedFloodLayer.value !== 'none') {
				const floodMap = selectedFloodLayer.value;
				if (floodMap.startsWith('Hulevesitulva')) {
					return floodMap.includes('52mm')
						? 'Stormwater Flood: 52mm/hour'
						: 'Stormwater Flood: 80mm/hour';
				} else if (floodMap.startsWith('coastal_flood')) {
					return 'Coastal Flood Scenario';
				} else {
					return 'Combined Flood Scenarios';
				}
			}
			if (selectedHSYLayer.value) {
				const layer = hsyLayers.value.find((l) => l.name === selectedHSYLayer.value);
				return layer ? layer.title : 'HSY Environmental Layer';
			}
			if (selectedBasicMap.value && selectedBasicMap.value !== 'default') {
				const basicMap = basicMaps.find((m) => m.value === selectedBasicMap.value);
				return basicMap ? basicMap.title : 'Basic Map';
			}
			return '';
		});

		// Methods
		const loadHSYLayers = async () => {
			isLoadingHSY.value = true;
			try {
				const response = await fetch('/hsy-action?action_route=GetHierarchicalMapLayerGroups');
				const data = await response.json();

				// Extract and flatten all layers
				const extractLayers = (groups) => {
					if (!Array.isArray(groups)) {
						console.warn('Expected groups to be an array, got:', typeof groups);
						return [];
					}

					let layers = [];
					groups.forEach((group) => {
						if (group.layers) {
							layers.push(
								...group.layers.map((layer) => ({
									id: layer.id,
									name: layer.name,
									title: layer.title || layer.name,
									date_updated: layer.date_updated,
									organization: layer.organization,
								}))
							);
						}
						if (group.children) {
							layers.push(...extractLayers(group.children));
						}
					});
					return layers;
				};

				// Handle different possible response structures
				let groupsToProcess = data;
				if (data.groups) {
					groupsToProcess = data.groups;
				} else if (data.data) {
					groupsToProcess = data.data;
				} else if (data.result) {
					groupsToProcess = data.result;
				}

				hsyLayers.value = extractLayers(groupsToProcess);
			} catch (error) {
				console.error('Failed to load HSY layers:', error);
			} finally {
				isLoadingHSY.value = false;
			}
		};

		const searchHSYLayers = () => {
			// Search is reactive via computed property
		};

		const selectHSYLayer = (layer) => {
			selectedHSYLayer.value = layer.name;
			// TODO: Implement HSY layer selection logic
			console.log('Selected HSY layer:', layer);
		};

		const selectBasicMap = (map) => {
			selectedBasicMap.value = map.value;
			// TODO: Implement basic map selection logic
			console.log('Selected basic map:', map);
		};

		const updateFloodLayer = async () => {
			removeFloodLayers();

			if (selectedFloodLayer.value && selectedFloodLayer.value !== 'none') {
				const url = urlStore.sykeFloodUrl(selectedFloodLayer.value);
				if (url) {
					await createFloodImageryLayer(url, selectedFloodLayer.value);
				}
			}
		};

		const clearSelection = () => {
			selectedBasicMap.value = 'default';
			selectedHSYLayer.value = null;
			selectedFloodLayer.value = 'none';
			removeFloodLayers();
		};

		const formatDate = (dateString) => {
			if (!dateString) return 'Unknown';
			return new Date(dateString).toLocaleDateString();
		};

		// Watchers
		watch(selectedFloodLayer, updateFloodLayer);

		// Initialize
		onMounted(() => {
			loadHSYLayers();
		});

		return {
			selectedCategory,
			categories,
			selectedBasicMap,
			basicMaps,
			hsySearchQuery,
			selectedHSYLayer,
			filteredHSYLayers,
			isLoadingHSY,
			selectedFloodLayer,
			currentFloodLegend,
			hasSelection,
			currentSelectionText,
			searchHSYLayers,
			selectHSYLayer,
			selectBasicMap,
			clearSelection,
			formatDate,
		};
	},
};
</script>

<style scoped>
.background-map-browser {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.category-tabs {
	margin-bottom: 8px;
}

.category-chips {
	justify-content: center;
}

.flood-quick-select {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.flood-title {
	font-size: 0.9rem;
	font-weight: 600;
	margin: 0;
}

.flood-disclaimer {
	font-size: 0.8rem;
	color: #d32f2f;
	font-weight: 500;
	margin: 0;
	padding: 8px;
	background-color: #ffebee;
	border-radius: 4px;
}

.flood-categories {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.flood-category-title {
	font-size: 0.8rem;
	font-weight: 500;
	margin-bottom: 6px;
	color: rgba(0, 0, 0, 0.7);
}

.flood-buttons {
	width: 100%;
}

.flood-legend {
	padding: 12px;
	background-color: rgba(0, 0, 0, 0.02);
	border-radius: 4px;
}

.legend-title {
	font-size: 0.8rem;
	font-weight: 500;
	margin-bottom: 8px;
}

.legend-items {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.legend-item {
	display: flex;
	align-items: center;
	gap: 8px;
}

.legend-color {
	width: 16px;
	height: 16px;
	border-radius: 2px;
	border: 1px solid rgba(0, 0, 0, 0.2);
}

.legend-text {
	font-size: 0.75rem;
}

.search-section {
	margin-bottom: 12px;
}

.loading-state,
.no-results {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16px;
	color: rgba(0, 0, 0, 0.6);
	font-size: 0.9rem;
}

.hsy-layer-list {
	max-height: 300px;
	overflow-y: auto;
	border: 1px solid rgba(0, 0, 0, 0.12);
	border-radius: 4px;
}

.layer-title {
	font-size: 0.85rem;
	font-weight: 500;
}

.layer-subtitle {
	font-size: 0.75rem;
}

.more-results {
	padding: 8px 16px;
	text-align: center;
	background-color: rgba(0, 0, 0, 0.02);
	border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.v-list-item.selected {
	background-color: rgba(25, 118, 210, 0.08);
	border-left: 3px solid #1976d2;
}

.current-selection {
	margin-top: 8px;
}

.selection-info {
	display: flex;
	align-items: center;
	padding: 8px;
	background-color: rgba(25, 118, 210, 0.08);
	border-radius: 4px;
}

.selection-text {
	font-size: 0.85rem;
	font-weight: 500;
	flex: 1;
}

/* Responsive adjustments */
@media (max-width: 768px) {
	.flood-buttons .v-btn {
		font-size: 0.75rem;
	}

	.category-chips {
		flex-wrap: wrap;
	}
}
</style>
