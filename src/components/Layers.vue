<template>
	<!-- Add Filters Title -->
	<div
		class="slider-container"
		style="width: 100%"
	>
		<h3 class="filter-title">
Layers
</h3>
		<div
			v-if="helsinkiView"
			class="switch-container"
		>
			<label class="switch">
				<input
					v-model="showVegetation"
					type="checkbox"
					@change="loadVegetation"
				>
				<span class="slider round" />
			</label>
			<label
				for="showVegetation"
				class="label"
				>Vegetation</label>
		</div>

		<div
			v-if="helsinkiView"
			class="switch-container"
		>
			<label class="switch">
				<input
					v-model="showOtherNature"
					type="checkbox"
					@change="loadOtherNature"
				>
				<span class="slider round" />
			</label>
			<label
				for="showOtherNature"
				class="label"
				>Other Nature</label>
		</div>

		<div
			v-if="view !== 'grid' && postalCode"
			class="switch-container"
		>
			<label class="switch">
				<input
					v-model="showTrees"
					type="checkbox"
					@change="loadTrees"
				>
				<span class="slider round" />
			</label>
			<label
				for="showTrees"
				class="label"
				>Trees</label>
		</div>

		<div
			v-if="!helsinkiView"
			class="switch-container"
		>
			<label class="switch">
				<input
					v-model="landCover"
					type="checkbox"
					@change="addLandCover"
				>
				<span class="slider round" />
			</label>
			<label
				for="landCover"
				class="label"
				>HSY Land Cover</label>
		</div>

		<div class="switch-container">
			<label class="switch">
				<input
					v-model="ndvi"
					type="checkbox"
					@change="toggleNDVI"
				>
				<span class="slider round" />
			</label>
			<label
				for="ndvi"
				class="label"
				>NDVI</label>
		</div>
	</div>
</template>

<script>
/**
 * @component Layers
 * @description Legacy layer management interface with custom switch styling.
 *
 * **DEPRECATION NOTE:** This component is largely superseded by MapControls.vue which provides
 * the same functionality with modern Vuetify components, enhanced features (progress indicators,
 * caching, conflict resolution), and better accessibility. This component is maintained for
 * backward compatibility but new features should be added to MapControls.vue.
 *
 * Provides basic toggles for environmental and vegetation layers:
 * - Trees (by height categories)
 * - Vegetation areas (Helsinki only)
 * - Other Nature (Helsinki only)
 * - HSY Land Cover (Capital Region)
 * - NDVI satellite imagery
 *
 * **Features:**
 * - Custom switch styling (vs Vuetify v-switch in MapControls)
 * - View-specific layer visibility
 * - Layer conflict handling (NDVI vs Land Cover)
 * - State persistence via toggleStore
 *
 * **Differences from MapControls.vue:**
 * - No loading indicators or progress tracking
 * - No cache status indicators
 * - No building filters
 * - No tooltips or descriptions
 * - Custom CSS switches instead of Vuetify components
 * - Less comprehensive error handling
 *
 * **Store Integration:**
 * - `toggleStore` - Layer toggle states
 * - `globalStore` - View state, postal code, cesium viewer reference
 *
 * **Service Integration:**
 * - `Datasource` - Data source visibility management
 * - `Building` - Entity reset when toggling trees
 * - `Tree` - Tree data loading
 * - `Vegetation` - Vegetation area loading
 * - `Othernature` - Natural area loading
 * - `Populationgrid` - 250m grid management (commented out)
 * - `Wms` - WMS layer management
 * - `landcover` - HSY land cover layer management
 * - `tiffImagery` - NDVI GeoTIFF layer management
 *
 * **Event Emissions:**
 * - Listens: None
 * - Emits: 'addNDVI' (via eventBus) - When NDVI layer is enabled
 *
 * **Migration Path:**
 * Consider migrating users to MapControls.vue for:
 * - Better accessibility (ARIA labels, keyboard navigation)
 * - Visual feedback (loading states, progress indicators)
 * - Enhanced UX (tooltips, conflict warnings, cache indicators)
 * - Building filters integration
 *
 * @example
 * <Layers />
 */

import { ref, computed, onMounted, watch } from 'vue';
import { useToggleStore } from '../stores/toggleStore';
import { useGlobalStore } from '../stores/globalStore';
import { eventBus } from '../services/eventEmitter.js';
import Datasource from '../services/datasource.js';
import Building from '../services/building.js';
import { createHSYImageryLayer, removeLandcover } from '../services/landcover';
import Tree from '../services/tree.js';
import Othernature from '../services/othernature.js';
import Vegetation from '../services/vegetation';
import Populationgrid from '../services/populationgrid.js';
import Wms from '../services/wms.js';
import { changeTIFF, removeTIFF } from '../services/tiffImagery.js';

export default {
	setup() {
		const toggleStore = useToggleStore();
		const store = useGlobalStore();

		/**
		 * Reactive state for layer toggles
		 * Synchronized with toggleStore for persistence
		 */
		const showVegetation = ref(toggleStore.showVegetation);
		const showOtherNature = ref(toggleStore.showOtherNature);
		const showTrees = ref(toggleStore.showTrees);
		const landCover = ref(toggleStore.landCover);
		const grid250m = ref(toggleStore.grid250m);
		const ndvi = ref(toggleStore.ndvi);

		/**
		 * Computed properties for view-specific features
		 */
		const helsinkiView = computed(() => toggleStore.helsinkiView);
		const view = computed(() => store.view);
		const postalCode = computed(() => store.postalcode);

		// Services
		let buildingService = null;
		let dataSourceService = null;

		/**
		 * Toggles land cover state in store
		 * (Unused - placeholder for future functionality)
		 *
		 * @returns {void}
		 */
		const toggleLandCover = () => {
			toggleStore.setLandCover(landCover.value);
		};

		/**
		 * Synchronizes local landCover state with store changes
		 *
		 * Ensures the UI stays in sync with store state when changed externally.
		 */
		watch(
			() => toggleStore.landCover,
			(newValue) => {
				landCover.value = newValue;
			},
			{ immediate: true }
		);

		/**
		 * Synchronizes local grid250m state with store changes
		 *
		 * Watches for external changes to the 250m grid toggle state.
		 */
		watch(
			() => toggleStore.grid250m,
			(newVal) => {
				grid250m.value = newVal;
			},
			{ immediate: true }
		);

		/**
		 * Activates 250m socioeconomic grid view
		 *
		 * **COMMENTED OUT IN CURRENT VERSION:**
		 * This feature is not currently active but the infrastructure remains
		 * for potential future use of 250m resolution socioeconomic data grids.
		 *
		 * @async
		 * @returns {Promise<void>}
		 */
		const activate250mGrid = async () => {
			toggleStore.setGrid250m(grid250m.value);
			store.setView('grid');
			if (!grid250m.value) {
				await new Populationgrid().createPopulationGrid();
			}
		};

		/**
		 * Loads or toggles vegetation layer visibility
		 *
		 * For Helsinki view only. Loads vegetation areas for the current postal code
		 * on first activation, then toggles visibility on subsequent activations.
		 *
		 * @returns {void}
		 */
		const loadVegetation = () => {
			// Get the current state of the toggle button for showing nature areas.
			toggleStore.setShowVegetation(showVegetation.value);

			if (showVegetation.value) {
				// If the toggle button is checked, enable the toggle button for showing the nature area heat map.
				//document.getElementById("showVegetationHeatToggle").disabled = false;

				// If there is a postal code available, load the nature areas for that area.
				if (store.postalcode && !dataSourceService.getDataSourceByName('Vegetation')) {
					const vegetationService = new Vegetation();
					vegetationService.loadVegetation(store.postalcode).catch(console.error);
				} else {
					dataSourceService.changeDataSourceShowByName('Vegetation', true);
				}
			} else {
				dataSourceService.changeDataSourceShowByName('Vegetation', false);
			}
		};

		/**
		 * Loads or toggles tree layer visibility
		 *
		 * Loads individual tree entities categorized by height on first activation,
		 * then toggles visibility on subsequent activations. Resets building entities
		 * when trees are hidden.
		 *
		 * @returns {void}
		 */
		const loadTrees = () => {
			toggleStore.setShowTrees(showTrees.value);
			const treeService = new Tree();

			if (showTrees.value) {
				if (store.postalcode && !dataSourceService.getDataSourceByName('Trees')) {
					treeService.loadTrees().catch(console.error);
				} else {
					dataSourceService.changeDataSourceShowByName('Trees', true);
				}
			} else {
				dataSourceService.changeDataSourceShowByName('Trees', false);
				buildingService.resetBuildingEntities();
			}
		};

		/**
		 * Disables conflicting layer when a new layer is activated
		 *
		 * NDVI and Land Cover layers cannot be active simultaneously. This function
		 * ensures only one is active at a time by disabling the conflicting layer
		 * and cleaning up its imagery.
		 *
		 * @param {'ndvi' | 'landcover'} layer - The layer being activated
		 * @returns {void}
		 */
		const disableOtherLayer = (layer) => {
			if (layer === 'ndvi') {
				landCover.value = false;
				toggleStore.setLandCover(false);
				removeLandcover(store.landcoverLayers, store.cesiumViewer);
			} else if (layer === 'landcover') {
				ndvi.value = false;
				toggleStore.setNDVI(false);
				store.cesiumViewer.imageryLayers.removeAll();
				store.cesiumViewer.imageryLayers.add(
					new Wms().createHelsinkiImageryLayer('avoindata:Karttasarja_PKS')
				);
			}
		};

		/**
		 * Toggles HSY land cover layer
		 *
		 * For Capital Region view. Shows land use classification with different
		 * surface types. Automatically disables NDVI if active (conflict resolution).
		 *
		 * @returns {void}
		 */
		const addLandCover = () => {
			if (landCover.value && ndvi.value) disableOtherLayer('landcover');

			toggleStore.setLandCover(landCover.value);
			if (landCover.value) {
				void createHSYImageryLayer();
			} else {
				removeLandcover();
			}
		};

		/**
		 * Toggles NDVI satellite imagery layer
		 *
		 * Normalized Difference Vegetation Index shows vegetation density from satellite data.
		 * Automatically disables Land Cover if active (conflict resolution).
		 *
		 * @fires eventBus#addNDVI
		 * @returns {void}
		 */
		const toggleNDVI = () => {
			if (ndvi.value && landCover.value) disableOtherLayer('ndvi');

			toggleStore.setNDVI(ndvi.value);

			if (ndvi.value) {
				void changeTIFF();
				eventBus.emit('addNDVI');
			} else {
				void removeTIFF();
			}
		};

		/**
		 * Loads or toggles other nature layer visibility
		 *
		 * For Helsinki view only. Loads parks, forests, and other natural areas
		 * for the current postal code on first activation.
		 *
		 * @returns {void}
		 */
		const loadOtherNature = () => {
			// Get the current state of the toggle button for showing nature areas.
			toggleStore.setShowOtherNature(showOtherNature.value);

			if (showOtherNature.value) {
				// If the toggle button is checked, enable the toggle button for showing the nature area heat map.
				//document.getElementById("showloadOtherNature").disabled = false;

				// If there is a postal code available, load the nature areas for that area.
				if (store.postalcode && !dataSourceService.getDataSourceByName('OtherNature')) {
					const otherNatureService = new Othernature();
					void otherNatureService.loadOtherNature();
				} else {
					void dataSourceService.changeDataSourceShowByName('OtherNature', true);
				}
			} else {
				void dataSourceService.changeDataSourceShowByName('OtherNature', false);
			}
		};

		// REMOVED: resetLayers watcher that was clearing layer state on view changes
		// Layer state should persist across view changes for better user experience
		// View-specific layer visibility is already handled by v-if conditions in the template

		onMounted(() => {
			buildingService = new Building();
			dataSourceService = new Datasource();
		});

		return {
			showVegetation,
			showOtherNature,
			showTrees,
			landCover,
			helsinkiView,
			view,
			grid250m,
			activate250mGrid,
			loadVegetation,
			loadOtherNature,
			toggleNDVI,
			addLandCover,
			loadTrees,
			toggleLandCover,
			postalCode,
			ndvi,
		};
	},
};
</script>

<style scoped>
.filter-title {
	font-size: 1.2em;
	margin-bottom: 10px;
	font-family: sans-serif;
}

.slider-container {
	display: flex;
	flex-direction: column;
	background-color: white;
	border: 1px solid #ccc;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Align switch and label horizontally */
.switch-container {
	display: flex;
	align-items: center;
	margin-bottom: 10px;
}

.switch {
	position: relative;
	display: inline-block;
	width: 47px;
	height: 20px;
}

/* The slider input */
.switch input {
	opacity: 0;
	width: 0;
	height: 0;
}

/* The slider */
.slider {
	position: absolute;
	cursor: pointer;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: #ccc;
	transition: 0.4s;
}

.slider:before {
	position: absolute;
	content: '';
	height: 16px;
	width: 16px;
	left: 2px;
	bottom: 2px;
	background-color: white;
	transition: 0.4s;
}

input:checked + .slider {
	background-color: #2196f3;
}

input:checked + .slider:before {
	transform: translateX(26px);
}

.slider.round {
	border-radius: 34px;
}

.slider.round:before {
	border-radius: 50%;
}

/* Align label to the right of the slider */
.label {
	margin-left: 10px;
	font-size: 14px;
	font-family: Arial, sans-serif;
}
</style>
