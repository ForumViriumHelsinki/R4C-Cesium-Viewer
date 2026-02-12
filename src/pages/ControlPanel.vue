<template>
	<v-navigation-drawer
		:model-value="modelValue"
		eager
		role="navigation"
		aria-label="Analysis tools and data exploration"
		class="analysis-sidebar"
		:width="drawerWidth"
		location="left"
		@update:model-value="$emit('update:modelValue', $event)"
	>
		<div class="sidebar-content">
			<v-expansion-panels
				v-model="openPanels"
				multiple
				variant="accordion"
			>
				<v-expansion-panel value="search">
					<v-expansion-panel-title>
						<v-icon class="mr-2">mdi-magnify</v-icon>
						Search & Navigate
					</v-expansion-panel-title>
					<v-expansion-panel-text>
						<p class="search-description">Find locations by address, postal code, or area name</p>
						<UnifiedSearch />
					</v-expansion-panel-text>
				</v-expansion-panel>

				<v-expansion-panel value="mapControls">
					<v-expansion-panel-title>
						<v-icon class="mr-2">mdi-layers</v-icon>
						Map Controls
					</v-expansion-panel-title>
					<v-expansion-panel-text>
						<p class="search-description">Toggle data layers and apply filters</p>
						<MapControls />
					</v-expansion-panel-text>
				</v-expansion-panel>

				<v-expansion-panel value="backgroundMaps">
					<v-expansion-panel-title>
						<v-icon class="mr-2">mdi-map-outline</v-icon>
						Background Maps
					</v-expansion-panel-title>
					<v-expansion-panel-text>
						<BackgroundMapBrowser />
					</v-expansion-panel-text>
				</v-expansion-panel>
			</v-expansion-panels>

			<div class="control-section">
				<h3 class="section-subtitle">
					<v-icon class="mr-2"> mdi-chart-line </v-icon>Analysis Tools
				</h3>
				<div class="analysis-buttons">
					<template v-if="currentLevel === 'postalCode'">
						<v-btn
							v-if="heatHistogramData && heatHistogramData.length > 0 && featureFlagStore.isEnabled('heatHistogram')"
							block
							variant="outlined"
							prepend-icon="mdi-chart-histogram"
							class="mb-2"
							@click="openAnalysisPanel('heat-histogram')"
						>
							Heat Distribution
						</v-btn>
						<v-btn
							v-if="showSosEco && featureFlagStore.isEnabled('socioeconomicViz')"
							block
							variant="outlined"
							prepend-icon="mdi-account-group"
							class="mb-2"
							@click="openAnalysisPanel('socioeconomics')"
						>
							Socioeconomics
						</v-btn>
						<v-btn
							v-if="currentView !== 'helsinki' && featureFlagStore.isEnabled('landCover')"
							block
							variant="outlined"
							prepend-icon="mdi-leaf"
							class="mb-2"
							@click="openAnalysisPanel('landcover')"
						>
							Land Cover
						</v-btn>
						<v-btn
							v-if="featureFlagStore.isEnabled('buildingScatterPlot')"
							block
							variant="outlined"
							prepend-icon="mdi-chart-scatter-plot"
							class="mb-2"
							@click="openAnalysisPanel('scatter-plot')"
						>
							Building Analysis
						</v-btn>
						<v-btn
							v-if="hasNDVIData && featureFlagStore.isEnabled('ndviAnalysis')"
							block
							variant="outlined"
							prepend-icon="mdi-leaf"
							class="mb-2"
							@click="openAnalysisPanel('ndvi-analysis')"
						>
							NDVI Vegetation
						</v-btn>
					</template>
					<template v-if="currentLevel === 'building'">
						<v-btn
							block
							variant="outlined"
							prepend-icon="mdi-thermometer"
							class="mb-2"
							@click="openAnalysisPanel('building-heat')"
						>
							Building Heat Data
						</v-btn>
					</template>

					<template v-if="currentView === 'grid'">
						<v-expansion-panels
							v-if="statsIndex === 'heat_index' && featureFlagStore.isEnabled('coolingOptimizer')"
							class="expansion-outlined mb-2"
						>
							<v-expansion-panel>
								<v-expansion-panel-title>
									<v-icon class="mr-2"> mdi-shield-sun </v-icon>
									Climate Adaptation
								</v-expansion-panel-title>
								<v-expansion-panel-text class="pa-0">
									<v-tabs
										v-model="adaptationTab"
										grow
									>
										<v-tab
											value="centers"
											:stacked="true"
											class="text-none"
										>
											Cooling Centers
										</v-tab>
										<v-tab
											value="optimizer"
											:stacked="true"
											class="text-none"
										>
											Optimizer
										</v-tab>
										<v-tab
											value="parks"
											:stacked="true"
											class="text-none"
										>
											Parks
										</v-tab>
									</v-tabs>
									<v-window v-model="adaptationTab">
										<v-window-item
											value="centers"
											class="pa-1"
										>
											<CoolingCenter />
										</v-window-item>
										<v-window-item
											value="optimizer"
											class="pa-1"
										>
											<CoolingCenterOptimiser />
										</v-window-item>
										<v-window-item
											value="parks"
											class="pa-1"
										>
											<LandcoverToParks />
										</v-window-item>
									</v-window>
									<div class="pa-2 mt-2">
										<EstimatedImpacts />
									</div>
								</v-expansion-panel-text>
							</v-expansion-panel>
						</v-expansion-panels>

						<v-btn
							block
							variant="outlined"
							prepend-icon="mdi-grid"
							class="mb-2"
							@click="openAnalysisPanel('grid-options')"
						>
							Grid Options
						</v-btn>
					</template>

					<div
						v-if="!hasAvailableAnalysis"
						class="no-analysis-message"
					>
						<v-icon class="mb-2"> mdi-information-outline </v-icon>
						<p class="text-body-2 text-center">
							{{
								currentLevel === 'start'
									? 'Select a postal code area to access analysis tools'
									: 'No analysis tools available for current selection'
							}}
						</p>
					</div>
				</div>
			</div>

			<div
				v-if="currentLevel !== 'start'"
				class="control-section"
			>
				<h3 class="section-subtitle">
					<v-icon class="mr-2"> mdi-information </v-icon
					>{{ currentLevel === 'building' ? 'Building Properties' : 'Area Properties' }}
				</h3>
				<AreaProperties />
			</div>
		</div>
	</v-navigation-drawer>

	<v-dialog
		v-model="analysisDialog"
		:width="analysisDialogWidth"
		:height="analysisDialogHeight"
		scrollable
	>
		<v-card>
			<v-card-title class="d-flex align-center">
				<v-icon class="mr-2">
					{{ currentAnalysisIcon }}
				</v-icon>
				{{ currentAnalysisTitle }}
				<v-spacer />
				<v-btn
					icon
					@click="analysisDialog = false"
				>
					<v-icon>mdi-close</v-icon>
				</v-btn>
			</v-card-title>
			<v-card-text class="analysis-content">
				<div v-if="currentAnalysis === 'heat-histogram'">
					<HeatHistogram />
				</div>
				<div v-if="currentAnalysis === 'socioeconomics'">
					<SocioEconomics />
				</div>
				<div v-if="currentAnalysis === 'landcover'">
					<Landcover />
				</div>
				<div v-if="currentAnalysis === 'scatter-plot'">
					<BuildingScatterPlot v-if="currentView !== 'helsinki'" /><Scatterplot
						v-if="currentView === 'helsinki'"
					/>
				</div>
				<div v-if="currentAnalysis === 'building-heat'">
					<HSYBuildingHeatChart
						v-if="currentView !== 'helsinki' && currentView !== 'grid'"
					/><BuildingHeatChart
						v-if="currentView === 'helsinki' && currentView !== 'grid'"
					/><BuildingGridChart v-if="currentView === 'grid'" />
				</div>
				<div v-if="currentAnalysis === 'grid-options'">
					<StatisticalGridOptions />
				</div>
				<div v-if="currentAnalysis === 'ndvi-analysis'">
					<PostalCodeNDVI />
				</div>
			</v-card-text>
		</v-card>
	</v-dialog>
</template>

<script>
/**
 * @component ControlPanel
 * @description Main navigation drawer providing access to search, map controls,
 * and analysis tools. This is the primary interface for data exploration and
 * layer management in the climate visualization application.
 *
 * Features:
 * - Unified search interface for addresses and postal codes
 * - Map layer controls and filters
 * - Background map selection
 * - Context-aware analysis tools based on current level
 * - Climate adaptation tools for statistical grid view
 * - Dynamic dialog system for analysis visualizations
 *
 * The component adapts its content based on:
 * - Current navigation level (start, postalCode, building)
 * - Current view mode (capitalRegion, helsinki, grid)
 * - Available data for the selected area
 *
 * @example
 * <ControlPanel />
 *
 * Store Integration:
 * - globalStore: Current level, view, postal code, area name
 * - propsStore: Heat histogram data, statistics index
 * - heatExposureStore: Heat exposure data availability
 * - socioEconomicsStore: Socioeconomic data availability
 * - toggleStore: NDVI and layer visibility states
 *
 * Emitted Events:
 * - Analysis dialogs are controlled via local state
 * - Service layer interactions for camera, feature picking, and tree loading
 */

import { storeToRefs } from 'pinia'
import { computed, defineAsyncComponent, ref } from 'vue'
import { useDisplay } from 'vuetify'
import AreaProperties from '../components/AreaProperties.vue'
import BackgroundMapBrowser from '../components/BackgroundMapBrowser.vue'
import MapControls from '../components/MapControls.vue'
import UnifiedSearch from '../components/UnifiedSearch.vue'

// Store and Service Imports
import { useFeatureFlagStore } from '../stores/featureFlagStore'
import { useGlobalStore } from '../stores/globalStore'
import { useHeatExposureStore } from '../stores/heatExposureStore'
import { usePropsStore } from '../stores/propsStore'
import { useSocioEconomicsStore } from '../stores/socioEconomicsStore'
import { useToggleStore } from '../stores/toggleStore'
import logger from '../utils/logger.js'

// Lazy-loaded dialog components (only needed when analysis dialog opens)
const BuildingGridChart = defineAsyncComponent(() => import('../components/BuildingGridChart.vue'))
const BuildingHeatChart = defineAsyncComponent(() => import('../components/BuildingHeatChart.vue'))
const HeatHistogram = defineAsyncComponent(() => import('../components/HeatHistogram.vue'))
const HSYBuildingHeatChart = defineAsyncComponent(
	() => import('../components/HSYBuildingHeatChart.vue')
)
const Scatterplot = defineAsyncComponent(() => import('../components/Scatterplot.vue'))
const StatisticalGridOptions = defineAsyncComponent(
	() => import('../components/StatisticalGridOptions.vue')
)
const BuildingScatterPlot = defineAsyncComponent(() => import('../views/BuildingScatterPlot.vue'))
const Landcover = defineAsyncComponent(() => import('../views/Landcover.vue'))
const PostalCodeNDVI = defineAsyncComponent(() => import('../views/PostalCodeNDVI.vue'))
const SocioEconomics = defineAsyncComponent(() => import('../views/SocioEconomics.vue'))

// Lazy-loaded climate adaptation components (only visible with feature flags + grid view)
const CoolingCenter = defineAsyncComponent(() => import('../components/CoolingCenter.vue'))
const CoolingCenterOptimiser = defineAsyncComponent(
	() => import('../components/CoolingCenterOptimiser.vue')
)
const EstimatedImpacts = defineAsyncComponent(() => import('../components/EstimatedImpacts.vue'))
const LandcoverToParks = defineAsyncComponent(() => import('../components/LandcoverToParks.vue'))

export default {
	components: {
		UnifiedSearch,
		MapControls,
		BackgroundMapBrowser,
		AreaProperties,
		HeatHistogram,
		SocioEconomics,
		Landcover,
		BuildingScatterPlot,
		Scatterplot,
		HSYBuildingHeatChart,
		BuildingHeatChart,
		BuildingGridChart,
		StatisticalGridOptions,
		PostalCodeNDVI,
		// ## NEW: Register the tools ##
		CoolingCenter,
		CoolingCenterOptimiser,
		EstimatedImpacts,
		LandcoverToParks,
	},
	props: {
		modelValue: {
			type: Boolean,
			default: true,
		},
	},
	emits: ['update:modelValue'],
	setup() {
		const { smAndDown, mdAndDown } = useDisplay()

		const drawerWidth = computed(() => {
			if (smAndDown.value) return Math.min(window.innerWidth * 0.9, 320)
			if (mdAndDown.value) return Math.min(window.innerWidth * 0.4, 350)
			return 350
		})

		// Default-open sections: Search and Map Controls
		const openPanels = ref(['search', 'mapControls'])

		// ## NEW: State for the new panel ##
		const adaptationTab = ref('centers')

		// --- Stores and existing state ---
		const globalStore = useGlobalStore()
		const propsStore = usePropsStore()
		const heatExposureStore = useHeatExposureStore()
		const socioEconomicsStore = useSocioEconomicsStore()
		const toggleStore = useToggleStore()
		const featureFlagStore = useFeatureFlagStore()

		const currentLevel = computed(() => globalStore.level)
		const currentView = computed(() => globalStore.view)
		const { ndvi } = storeToRefs(toggleStore)

		// State for the simple dialog
		const analysisDialog = ref(false)
		const currentAnalysis = ref('')

		const heatHistogramData = computed(() => propsStore.heatHistogramData)
		const statsIndex = computed(() => propsStore.statsIndex)
		const showSosEco = computed(() => socioEconomicsStore.data && heatExposureStore.data)
		const hasNDVIData = computed(() => toggleStore.ndvi)

		/**
		 * Determines if analysis tools are available for the current context.
		 * Returns true if user is at postalCode or building level with relevant data.
		 *
		 * @type {import('vue').ComputedRef<boolean>}
		 */
		const hasAvailableAnalysis = computed(() => {
			if (currentLevel.value === 'start') return false
			if (currentLevel.value === 'postalCode' && currentView.value !== 'grid') {
				return (
					(heatHistogramData.value && heatHistogramData.value.length > 0) ||
					showSosEco.value ||
					currentView.value !== 'helsinki' ||
					true
				)
			}
			if (currentLevel.value === 'building') return true
			if (currentView.value === 'grid') return true
			return false
		})

		/**
		 * Configuration for analysis dialog appearance and behavior.
		 * Maps analysis type to dialog title, icon, and dimensions.
		 *
		 * @type {Object.<string, {title: string, icon: string, width: string, height: string}>}
		 */
		const analysisConfig = {
			'heat-histogram': {
				title: 'Heat Distribution Analysis',
				icon: 'mdi-chart-histogram',
				width: '800px',
				height: '600px',
			},
			socioeconomics: {
				title: 'Socioeconomic Analysis',
				icon: 'mdi-account-group',
				width: '900px',
				height: '700px',
			},
			landcover: {
				title: 'Land Cover Analysis',
				icon: 'mdi-leaf',
				width: '800px',
				height: '600px',
			},
			'scatter-plot': {
				title: 'Building Analysis',
				icon: 'mdi-chart-scatter-plot',
				width: '1000px',
				height: '700px',
			},
			'building-heat': {
				title: 'Building Heat Data',
				icon: 'mdi-thermometer',
				width: '800px',
				height: '600px',
			},
			'grid-options': {
				title: 'Statistical Grid Options',
				icon: 'mdi-grid',
				width: '600px',
				height: '500px',
			},
			'ndvi-analysis': {
				title: 'NDVI Vegetation Analysis',
				icon: 'mdi-leaf',
				width: '900px',
				height: '600px',
			},
		}

		const currentAnalysisTitle = computed(() => analysisConfig[currentAnalysis.value]?.title || '')
		const currentAnalysisIcon = computed(
			() => analysisConfig[currentAnalysis.value]?.icon || 'mdi-chart-line'
		)
		const analysisDialogWidth = computed(
			() => analysisConfig[currentAnalysis.value]?.width || '800px'
		)
		const analysisDialogHeight = computed(
			() => analysisConfig[currentAnalysis.value]?.height || '600px'
		)

		/**
		 * Opens an analysis dialog with the specified visualization type.
		 *
		 * @param {string} analysisType - The type of analysis to display
		 * @returns {void}
		 */
		const openAnalysisPanel = (analysisType) => {
			currentAnalysis.value = analysisType
			analysisDialog.value = true
		}

		/**
		 * Handles retry request for a failed data source.
		 * Placeholder for future retry implementation.
		 *
		 * @param {string} sourceId - ID of the data source to retry
		 * @returns {void}
		 */
		const handleSourceRetry = (sourceId) => logger.debug(`Retrying data source: ${sourceId}`)

		/**
		 * Handles cache clearing for a specific data source.
		 * Placeholder for future cache management.
		 *
		 * @param {string} sourceId - ID of the data source whose cache to clear
		 * @returns {void}
		 */
		const handleCacheCleared = (sourceId) => logger.debug(`Cache cleared for: ${sourceId}`)

		/**
		 * Handles preload request for a data source.
		 * Placeholder for future preloading implementation.
		 *
		 * @param {string} sourceId - ID of the data source to preload
		 * @returns {void}
		 */
		const handleDataPreload = (sourceId) => logger.debug(`Preloading requested for: ${sourceId}`)

		/**
		 * Resets the application by reloading the page.
		 *
		 * @returns {void}
		 */
		const reset = () => location.reload()

		/**
		 * Triggers camera rotation animation.
		 *
		 * @returns {void}
		 */
		const rotateCamera = async () => {
			const { default: Camera } = await import('../services/camera')
			new Camera().rotateCamera()
		}

		/**
		 * Hides the building tooltip if present.
		 *
		 * @returns {void}
		 */
		const hideTooltip = () => {
			const tooltip = document.querySelector('.tooltip')
			if (tooltip) tooltip.style.display = 'none'
		}

		/**
		 * Returns to postal code view from building detail view.
		 * Reloads postal code data and tree layer if enabled.
		 *
		 * @returns {void}
		 */
		const returnToPostalCode = async () => {
			const [{ default: Featurepicker }, { default: Tree }] = await Promise.all([
				import('../services/featurepicker'),
				import('../services/tree'),
			])
			const featurepicker = new Featurepicker()
			const treeService = new Tree()
			hideTooltip()
			featurepicker.loadPostalCode().catch((error) => {
				logger.error('Failed to load postal code:', error)
			})
			if (toggleStore.showTrees) {
				treeService.loadTrees().catch((error) => {
					logger.error('Failed to load trees:', error)
				})
			}
		}

		return {
			// Existing returned values
			analysisDialog,
			currentAnalysis,
			currentAnalysisTitle,
			currentAnalysisIcon,
			analysisDialogWidth,
			analysisDialogHeight,
			openAnalysisPanel,
			currentLevel,
			currentView,
			heatHistogramData,
			showSosEco,
			statsIndex,
			hasAvailableAnalysis,
			hasNDVIData,
			handleSourceRetry,
			handleCacheCleared,
			handleDataPreload,
			reset,
			rotateCamera,
			returnToPostalCode,
			ndvi,
			// ## NEW: Return the new state variable ##
			adaptationTab,
			featureFlagStore,
			drawerWidth,
			openPanels,
		}
	},
}
</script>

<style scoped>
.analysis-sidebar {
	display: flex;
	flex-direction: column;
	height: 100%;
}
.sidebar-content {
	flex: 1;
	overflow-y: auto;
	padding: 0;
}
.control-section {
	padding: 16px;
	border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.control-section:last-child {
	border-bottom: none;
}
.section-subtitle {
	font-size: 1rem;
	font-weight: 600;
	margin-bottom: 12px;
	color: rgba(0, 0, 0, 0.87);
	display: flex;
	align-items: center;
}
.subsection-title {
	font-size: 0.9rem;
	font-weight: 500;
	margin-bottom: 8px;
	color: rgba(0, 0, 0, 0.7);
}

/* Expansion panels inside sidebar */
.sidebar-content :deep(.v-expansion-panel-title) {
	font-size: 1rem;
	font-weight: 600;
	min-height: 48px;
	padding: 12px 16px;
}

.sidebar-content :deep(.v-expansion-panel-text__wrapper) {
	padding: 8px 16px 16px;
}
.analysis-buttons {
	display: flex;
	flex-direction: column;
	gap: 8px;
}
.no-analysis-message {
	text-align: center;
	padding: 16px;
	color: rgba(0, 0, 0, 0.6);
}
.analysis-content {
	padding: 24px;
}
.v-btn:focus {
	outline: 2px solid #1976d2;
	outline-offset: 2px;
}

/* Outlined style for expansion panels to match v-btn variant="outlined" */
.expansion-outlined :deep(.v-expansion-panel) {
	border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
	background: transparent;
}
.mb-2 {
	margin-bottom: 8px;
}
.search-description {
	font-size: 0.8rem;
	color: rgba(0, 0, 0, 0.6);
	margin-bottom: 8px;
	margin-top: -4px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
	.control-section {
		padding: 12px;
	}
	.analysis-content {
		padding: 16px;
	}
}

/* Dialog responsive sizing */
@media (max-width: 1200px) {
	.v-dialog .v-card {
		width: 95vw !important;
		height: 90vh !important;
		max-width: none !important;
		max-height: none !important;
	}
}
</style>
