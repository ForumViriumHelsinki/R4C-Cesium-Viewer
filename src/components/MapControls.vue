<template>
	<div class="map-controls">
		<!-- Data Layers -->
		<DataLayersControl
			v-model:show-trees="showTrees"
			v-model:show-vegetation="showVegetation"
			v-model:show-other-nature="showOtherNature"
			:land-cover="landCover"
			:ndvi="ndvi"
			:helsinki-view="helsinkiView"
			:view="view"
			:postal-code="postalCode"
			@update:show-trees="loadTrees"
			@update:show-vegetation="loadVegetation"
			@update:show-other-nature="loadOtherNature"
			@reset:layers="resetLayers"
		/>

		<!-- Building Filters -->
		<BuildingFiltersControl
			v-model:hide-non-sote="hideNonSote"
			v-model:hide-new-buildings="hideNewBuildings"
			v-model:hide-low="hideLow"
			:helsinki-view="helsinkiView"
			:view="view"
			@update:hide-non-sote="filterBuildings"
			@update:hide-new-buildings="filterBuildings"
			@update:hide-low="filterBuildings"
			@reset:filters="resetFilters"
		/>

		<!-- Layer Conflict Warning -->
		<LayerConflictAlert :has-conflict="hasLayerConflict" />
	</div>
</template>

<script setup>
/**
 * @component MapControls
 * @description Comprehensive map layer and building filter controls component.
 *
 * Provides an organized interface for toggling various data layers (trees, vegetation, land cover, NDVI)
 * and applying building filters (public buildings, age, height). Includes intelligent layer conflict
 * detection and resolution, progressive loading indicators, and caching support.
 *
 * **Features:**
 * - Data layer toggles (Trees, Vegetation, Other Nature, Land Cover, NDVI)
 * - Building filters (Public/Social, Age, Height)
 * - Layer conflict detection and auto-resolution (NDVI vs Land Cover)
 * - Progressive loading indicators with progress tracking
 * - Cache status indicators for faster subsequent loads
 * - View-specific layer visibility (Helsinki vs Capital Region)
 * - Tooltips with detailed descriptions
 * - Responsive design with mobile support
 * - High contrast accessibility support
 *
 * **Data Layers:**
 * - **Trees**: Individual tree entities by height categories (postal code level)
 * - **Vegetation**: Vegetation areas and green spaces (Helsinki only)
 * - **Other Nature**: Parks, forests, natural areas (Helsinki only)
 * - **Land Cover**: HSY land cover classification (Capital Region)
 * - **NDVI**: Normalized Difference Vegetation Index satellite imagery
 *
 * **Building Filters:**
 * - **Public/Social**: Filter for public buildings or social/healthcare facilities
 * - **Pre-2018**: Show only buildings constructed before summer 2018 (Helsinki only)
 * - **Tall Buildings**: Filter out low-rise structures
 *
 * **Store Integration:**
 * - `toggleStore` - Layer and filter toggle states
 * - `globalStore` - View state, postal code, cesium viewer reference
 * - `loadingStore` - Layer loading state, progress, cache status
 *
 * **Service Integration:**
 * - `Datasource` - Data source visibility management
 * - `Building` - Building filtering and entity management
 * - `Tree` - Tree data loading and visualization
 * - `Vegetation` - Vegetation area loading
 * - `Othernature` - Natural area loading
 * - `landcover` - HSY land cover layer removal on reset
 * - `tiffImagery` - NDVI GeoTIFF layer removal on reset
 * - `backgroundPreloader` - Layer usage tracking for preloading
 *
 * **Event Emissions:**
 * - Listens: None
 * - Emits: 'updateScatterPlot' (via eventBus) - When building filters change
 *
 * **Layer Conflicts:**
 * NDVI and Land Cover layers cannot be active simultaneously. When one is enabled,
 * the other is automatically disabled with proper cleanup. Both are switched by
 * LayerSwitch (controls/layerToggles.js), the control their Analysis panels show
 * too (#1155).
 *
 * **Caching:**
 * Tree and vegetation data are cached per postal code for faster subsequent loads.
 * Cache indicators show when cached data is available.
 *
 * @example
 * <MapControls />
 */

import { storeToRefs } from 'pinia'
import { computed, onMounted, watch } from 'vue'
import backgroundPreloader from '../services/backgroundPreloader.js'
import Building from '../services/building.js'
import Datasource from '../services/datasource.js'
import { eventBus } from '../services/eventEmitter.js'
import { removeLandcover } from '../services/landcover'
import Othernature from '../services/othernature.js'
import { removeTIFF } from '../services/tiffImagery.js'
import Tree from '../services/tree.js'
import Vegetation from '../services/vegetation'
import { useGlobalStore } from '../stores/globalStore'
import { useLoadingStore } from '../stores/loadingStore.js'
import { useToggleStore } from '../stores/toggleStore'
import logger from '../utils/logger.js'
import BuildingFiltersControl from './controls/BuildingFiltersControl.vue'
import DataLayersControl from './controls/DataLayersControl.vue'
import LayerConflictAlert from './controls/LayerConflictAlert.vue'

// Stores
const toggleStore = useToggleStore()
const store = useGlobalStore()
const loadingStore = useLoadingStore()

/**
 * Layer toggles and building filters, bound to toggleStore in both directions.
 * The switches write the store, and writes from elsewhere (smartReset, goHome,
 * the Land Cover analysis panel) reach the switches (#967). Land cover and NDVI
 * are read here only for the conflict alert and the reset button: LayerSwitch
 * switches them.
 */
const {
	showVegetation,
	showOtherNature,
	showTrees,
	landCover,
	ndvi,
	hideNonSote,
	hideNewBuildings,
	hideLow,
} = storeToRefs(toggleStore)

/**
 * Computed properties for view-specific features
 */
const helsinkiView = computed(() => toggleStore.helsinkiView)
const view = computed(() => store.view)
const postalCode = computed(() => store.postalcode ?? undefined)

/**
 * Detects if NDVI and Land Cover are both active
 * @type {import('vue').ComputedRef<boolean>}
 */
const hasLayerConflict = computed(() => {
	return landCover.value && ndvi.value
})

// Services
let buildingService = null
let dataSourceService = null

/**
 * Loads or toggles vegetation layer visibility
 *
 * For Helsinki view only. Loads vegetation areas for the current postal code
 * on first activation, then toggles visibility on subsequent activations.
 * Includes cache support and loading indicators.
 *
 * @async
 * @returns {Promise<void>}
 */
const loadVegetation = async () => {
	toggleStore.setShowVegetation(showVegetation.value)

	if (showVegetation.value) {
		if (store.postalcode && !dataSourceService.getDataSourceByName('Vegetation')) {
			loadingStore.startLayerLoading('vegetation', {
				message: 'Loading vegetation areas...',
				total: 1,
			})

			try {
				const vegetationService = new Vegetation()
				// loadVegetation() reads postalcode from the global store internally; no arg needed.
				await vegetationService.loadVegetation()
				loadingStore.completeLayerLoading('vegetation', true)
			} catch (error) {
				loadingStore.reportLayerFailure('vegetation', error, { retry: loadVegetation })
			}
		} else {
			dataSourceService.changeDataSourceShowByName('Vegetation', true)
		}
	} else {
		dataSourceService.changeDataSourceShowByName('Vegetation', false)
	}
}

/**
 * Loads or toggles tree layer visibility
 *
 * Loads individual tree entities categorized by height (4 categories: 221-224)
 * on first activation, then toggles visibility on subsequent activations.
 * Includes progressive loading indicators, cache support, and background preloading tracking.
 *
 * **Tree Height Categories:**
 * - 221: Very short trees
 * - 222: Short trees
 * - 223: Medium trees
 * - 224: Tall trees
 *
 * @async
 * @returns {Promise<void>}
 */
const loadTrees = async () => {
	toggleStore.setShowTrees(showTrees.value)

	if (showTrees.value) {
		if (store.postalcode && !dataSourceService.getDataSourceByName('Trees')) {
			// Check cache first, then load if needed
			const cacheKey = `trees-${store.postalcode}`
			const cached = await loadingStore.startLayerLoadingWithCache('trees', {
				message: 'Loading trees by height categories...',
				total: 4, // 4 height categories
				postalCode: store.postalcode,
				cacheKey,
			})

			if (cached) {
				// Use cached data - data source service would need to be updated to accept cached data
				logger.debug('Using cached tree data')
				return
			}

			// Use enhanced loading methods with progress tracking
			loadingStore.startLayerLoading('trees', {
				message: 'Loading trees by height categories...',
				total: 4, // 4 height categories
			})

			try {
				const treeService = new Tree()
				const categories = [221, 222, 223, 224]

				// Progress messages per height category. They are cosmetic: the tree
				// service has no progress callback, so completion and failure come from
				// the awaited loadTrees() below. Before #1152 the load ran un-awaited
				// inside a Promise that resolved on these timers, so a failure never
				// reached the catch and the layer was reported as loaded.
				const progressTimers = categories.map((category, index) =>
					setTimeout(
						() => {
							loadingStore.updateLayerProgress(
								'trees',
								index + 1,
								// FLAG: loadingStore.updateLayerProgress's `message = null` default makes
								// its param infer as `null`; passing a real string message requires a cast
								// until the store's type is widened to `string | null` (store edits are out of scope here).
								/** @type {any} */ (`Loading trees: category ${category} (${index + 1}/4)`)
							)
						},
						(index + 1) * 500
					)
				)

				try {
					await treeService.loadTrees()
				} finally {
					progressTimers.forEach(clearTimeout)
				}
				const treeData = { categories, postalCode: store.postalcode }

				// Cache the loaded data
				await loadingStore.cacheLayerData('trees', treeData, {
					postalCode: store.postalcode,
					cacheKey,
					ttl: 60 * 60 * 1000, // 1 hour for tree data
				})

				loadingStore.completeLayerLoading('trees', true)

				// Track usage for background preloader
				backgroundPreloader.trackLayerUsage('trees')
			} catch (error) {
				loadingStore.reportLayerFailure('trees', error, { retry: loadTrees })
			}
		} else {
			dataSourceService.changeDataSourceShowByName('Trees', true)
		}
	} else {
		dataSourceService.changeDataSourceShowByName('Trees', false)
		buildingService.resetBuildingEntities()
	}
}

/**
 * Loads or toggles other nature layer visibility
 *
 * For Helsinki view only. Loads parks, forests, and other natural areas
 * for the current postal code on first activation.
 *
 * @returns {void}
 */
const loadOtherNature = () => {
	toggleStore.setShowOtherNature(showOtherNature.value)

	const logFailure = (error) => {
		logger.error('Failed to update other nature layer:', error)
	}

	if (showOtherNature.value) {
		if (store.postalcode && !dataSourceService.getDataSourceByName('OtherNature')) {
			const otherNatureService = new Othernature()
			otherNatureService.loadOtherNature().catch((error) => {
				logFailure(error)
				loadingStore.reportLayerFailure('otherNature', error, { retry: loadOtherNature })
			})
		} else {
			dataSourceService.changeDataSourceShowByName('OtherNature', true).catch(logFailure)
		}
	} else {
		dataSourceService.changeDataSourceShowByName('OtherNature', false).catch(logFailure)
	}
}

/**
 * Applies building filters to the current postal code
 *
 * Filters buildings based on active filter criteria:
 * - Public/Social buildings (SOTE)
 * - Building age (Pre-2018)
 * - Building height (Tall buildings)
 *
 * Updates scatter plot after filtering.
 *
 * @fires eventBus#updateScatterPlot
 * @returns {void}
 */
const filterBuildings = () => {
	toggleStore.setHideNonSote(hideNonSote.value)
	toggleStore.setHideNewBuildings(hideNewBuildings.value)
	toggleStore.setHideLow(hideLow.value)

	const buildingsDataSource = store?.cesiumViewer?.dataSources?.getByName(
		`Buildings ${store.postalcode}`
	)[0]

	if (buildingsDataSource) {
		if (hideNonSote.value || hideNewBuildings.value || hideLow.value) {
			// Fire-and-forget async call - filter uses batch processing to yield to main thread
			buildingService.filterBuildings(buildingsDataSource).catch((error) => {
				logger.error('[MapControls] Failed to filter buildings:', error)
			})
		} else {
			buildingService.showAllBuildings(buildingsDataSource)
		}
		eventBus.emit('updateScatterPlot')
	}
}

/**
 * Resets all data layers to off and cleans up loaded data
 *
 * @returns {void}
 */
const resetLayers = () => {
	showTrees.value = false
	showVegetation.value = false
	showOtherNature.value = false
	landCover.value = false
	ndvi.value = false
	toggleStore.resetLayers()

	// Clean up loaded layers
	if (dataSourceService) {
		dataSourceService.changeDataSourceShowByName('Trees', false)
		dataSourceService.changeDataSourceShowByName('Vegetation', false)
		dataSourceService.changeDataSourceShowByName('OtherNature', false)
	}
	removeLandcover()
	removeTIFF().catch(logger.error)
}

/**
 * Resets all building filters to default (all visible)
 *
 * @returns {void}
 */
const resetFilters = () => {
	hideNonSote.value = false
	hideNewBuildings.value = false
	hideLow.value = false
	filterBuildings()
}

/**
 * Watches for view changes and resets building filters
 *
 * Layer states are preserved across view changes - only building filters are reset.
 * View-specific layer visibility is handled by v-if directives in the template.
 */
watch(
	() => store.view,
	() => {
		resetFilters()
	}
)

onMounted(() => {
	buildingService = new Building()
	dataSourceService = new Datasource()
})
</script>

<style scoped>
.map-controls {
	display: flex;
	flex-direction: column;
	gap: 16px;
	width: 100%;
}
</style>
