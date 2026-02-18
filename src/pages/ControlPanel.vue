<template>
	<v-navigation-drawer
		:model-value="isVisible"
		:rail="isRail"
		:width="drawerWidth"
		:permanent="!isMobile"
		:temporary="isMobile"
		eager
		role="navigation"
		aria-label="Analysis tools and data exploration"
		class="control-panel"
		location="left"
		@update:model-value="handleDrawerUpdate"
	>
		<!-- Rail icons -->
		<v-list
			v-if="isRail"
			density="compact"
			nav
			class="rail-nav"
		>
			<v-list-item
				v-for="tab in tabs"
				:key="tab.value"
				:active="activeTab === tab.value"
				:title="tab.label"
				@click="toggleStore.openTab(tab.value)"
			>
				<template #prepend>
					<v-badge
						v-if="tab.value === 'details'"
						:model-value="showDetailsBadge"
						dot
						color="primary"
						floating
					>
						<v-icon>{{ tab.icon }}</v-icon>
					</v-badge>
					<v-icon v-else>{{ tab.icon }}</v-icon>
				</template>
			</v-list-item>
		</v-list>

		<!-- Expanded content -->
		<template v-if="!isRail">
			<!-- Breadcrumb header -->
			<div class="sidebar-header">
				<v-btn
					v-if="canGoBack"
					icon
					variant="text"
					size="small"
					aria-label="Go back"
					@click="goBack"
				>
					<v-icon>mdi-arrow-left</v-icon>
				</v-btn>
				<v-breadcrumbs
					:items="breadcrumbItems"
					density="compact"
					class="sidebar-breadcrumbs"
				>
					<template #divider>
						<v-icon size="x-small">mdi-chevron-right</v-icon>
					</template>
				</v-breadcrumbs>
			</div>

			<v-divider />

			<!-- Tab bar -->
			<v-tabs
				v-model="activeTab"
				density="compact"
				grow
				class="sidebar-tabs"
			>
				<v-tab
					v-for="tab in tabs"
					:key="tab.value"
					:value="tab.value"
					:stacked="true"
					size="small"
					class="text-none"
				>
					<v-badge
						v-if="tab.value === 'details'"
						:model-value="showDetailsBadge"
						dot
						color="primary"
						floating
					>
						<v-icon size="small">{{ tab.icon }}</v-icon>
					</v-badge>
					<v-icon
						v-else
						size="small"
					>{{ tab.icon }}</v-icon>
					<span class="tab-label">{{ tab.label }}</span>
				</v-tab>
			</v-tabs>

			<v-divider />

			<!-- Tab content -->
			<div class="sidebar-content">
				<v-window
					v-model="activeTab"
					class="tab-window"
				>
					<!-- Search Tab -->
					<v-window-item value="search">
						<div class="tab-content">
							<p class="section-description">Find locations by address, postal code, or area name</p>
							<UnifiedSearch />
						</div>
					</v-window-item>

					<!-- Layers Tab -->
					<v-window-item value="layers">
						<div class="tab-content">
							<ViewModeCompact class="mb-3" />
							<MapControls />
							<v-divider class="my-3" />
							<p class="section-heading">Background Maps</p>
							<BackgroundMapBrowser />
						</div>
					</v-window-item>

					<!-- Analysis Tab -->
					<v-window-item value="analysis">
						<div class="tab-content">
							<p class="section-description">
								{{
									currentLevel === 'start'
										? 'Select a postal code to unlock analysis tools'
										: 'Charts and statistical analysis for the selected area'
								}}
							</p>
							<div class="analysis-buttons">
								<template v-if="currentLevel === 'postalCode'">
									<v-btn
										v-if="heatHistogramData && heatHistogramData.length > 0 && featureFlagStore.isEnabled('heatHistogram')"
										block
										variant="outlined"
										prepend-icon="mdi-chart-histogram"
										@click="openAnalysis('heat-histogram', 'small')"
									>
										Heat Distribution
									</v-btn>
									<v-btn
										v-if="showSosEco && featureFlagStore.isEnabled('socioeconomicViz')"
										block
										variant="outlined"
										prepend-icon="mdi-account-group"
										@click="openAnalysis('socioeconomics', 'large')"
									>
										Socioeconomics
									</v-btn>
									<v-btn
										v-if="currentView !== 'helsinki' && featureFlagStore.isEnabled('landCover')"
										block
										variant="outlined"
										prepend-icon="mdi-leaf"
										@click="openAnalysis('landcover', 'small')"
									>
										Land Cover
									</v-btn>
									<v-btn
										v-if="featureFlagStore.isEnabled('buildingScatterPlot')"
										block
										variant="outlined"
										prepend-icon="mdi-chart-scatter-plot"
										@click="openAnalysis('scatter-plot', 'large')"
									>
										Building Analysis
									</v-btn>
									<v-btn
										v-if="hasNDVIData && featureFlagStore.isEnabled('ndviAnalysis')"
										block
										variant="outlined"
										prepend-icon="mdi-leaf"
										@click="openAnalysis('ndvi-analysis', 'large')"
									>
										NDVI Vegetation
									</v-btn>
								</template>
								<template v-if="currentLevel === 'building'">
									<v-btn
										block
										variant="outlined"
										prepend-icon="mdi-thermometer"
										@click="openAnalysis('building-heat', 'small')"
									>
										Building Heat Data
									</v-btn>
								</template>

								<template v-if="currentView === 'grid'">
									<v-expansion-panels
										v-if="statsIndex === 'heat_index' && featureFlagStore.isEnabled('coolingOptimizer')"
										class="expansion-outlined"
									>
										<v-expansion-panel>
											<v-expansion-panel-title>
												<v-icon class="mr-2">mdi-shield-sun</v-icon>
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
										@click="openAnalysis('grid-options', 'small')"
									>
										Grid Options
									</v-btn>
								</template>

								<!-- Inline small charts -->
								<div
									v-if="inlineAnalysis"
									class="inline-chart mt-3"
								>
									<div class="d-flex align-center mb-2">
										<v-icon
											size="small"
											class="mr-2"
										>
											{{ analysisConfig[inlineAnalysis]?.icon }}
										</v-icon>
										<span class="text-subtitle-2">{{ analysisConfig[inlineAnalysis]?.title }}</span>
										<v-spacer />
										<v-btn
											icon
											variant="text"
											size="x-small"
											@click="inlineAnalysis = null"
										>
											<v-icon size="small">mdi-close</v-icon>
										</v-btn>
									</div>
									<component :is="analysisComponents[inlineAnalysis]" />
								</div>

								<div
									v-if="!hasAvailableAnalysis"
									class="no-analysis-message"
								>
									<v-icon class="mb-2">mdi-information-outline</v-icon>
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
					</v-window-item>

					<!-- Details Tab -->
					<v-window-item value="details">
						<div class="tab-content">
							<p class="section-description">
								{{ currentLevel === 'building' ? 'Building details and attributes' : currentLevel !== 'start' ? 'Area statistics and demographics' : 'Select an area to view properties' }}
							</p>
							<AreaProperties v-if="currentLevel !== 'start'" />
						</div>
					</v-window-item>
				</v-window>
			</div>
		</template>

		<!-- Rail footer with collapse/expand hint -->
		<template #append>
			<div
				v-if="!isMobile"
				class="rail-toggle"
			>
	<v-dialog
		v-model="analysisDialog"
		eager
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
					variant="text"
					size="small"
					:aria-label="isRail ? 'Expand sidebar' : 'Collapse sidebar'"
					@click="toggleStore.setSidebarMode(isRail ? 'expanded' : 'rail')"
				>
					<v-icon>{{ isRail ? 'mdi-chevron-right' : 'mdi-chevron-left' }}</v-icon>
				</v-btn>
			</div>
		</template>
	</v-navigation-drawer>

	<!-- Right-side Analysis Panel for large charts -->
	<AnalysisPanel
		v-model="rightPanelOpen"
		:analysis-type="rightPanelAnalysis"
		:analysis-config="analysisConfig"
	/>
</template>

<script setup>
import { computed, defineAsyncComponent, ref } from 'vue'
import { useDisplay } from 'vuetify'
import AreaProperties from '../components/AreaProperties.vue'
import BackgroundMapBrowser from '../components/BackgroundMapBrowser.vue'
import MapControls from '../components/MapControls.vue'
import UnifiedSearch from '../components/UnifiedSearch.vue'
import ViewModeCompact from '../components/ViewModeCompact.vue'
import { useSidebarNavigation } from '../composables/useSidebarNavigation.js'

// Store and Service Imports
import { useFeatureFlagStore } from '../stores/featureFlagStore'
import { useGlobalStore } from '../stores/globalStore'
import { useHeatExposureStore } from '../stores/heatExposureStore'
import { usePropsStore } from '../stores/propsStore'
import { useSocioEconomicsStore } from '../stores/socioEconomicsStore'
import { useToggleStore } from '../stores/toggleStore'

// Lazy-loaded analysis components
const AnalysisPanel = defineAsyncComponent(() => import('../components/AnalysisPanel.vue'))
const BuildingGridChart = defineAsyncComponent(() => import('../components/BuildingGridChart.vue'))
const BuildingHeatChart = defineAsyncComponent(() => import('../components/BuildingHeatChart.vue'))
const HeatHistogram = defineAsyncComponent(() => import('../components/HeatHistogram.vue'))
const HSYBuildingHeatChart = defineAsyncComponent(
	() => import('../components/HSYBuildingHeatChart.vue')
)
const StatisticalGridOptions = defineAsyncComponent(
	() => import('../components/StatisticalGridOptions.vue')
)
const BuildingScatterPlot = defineAsyncComponent(() => import('../views/BuildingScatterPlot.vue'))
const Landcover = defineAsyncComponent(() => import('../views/Landcover.vue'))
const PostalCodeNDVI = defineAsyncComponent(() => import('../views/PostalCodeNDVI.vue'))
const SocioEconomics = defineAsyncComponent(() => import('../views/SocioEconomics.vue'))

// Lazy-loaded climate adaptation components
const CoolingCenter = defineAsyncComponent(() => import('../components/CoolingCenter.vue'))
const CoolingCenterOptimiser = defineAsyncComponent(
	() => import('../components/CoolingCenterOptimiser.vue')
)
const EstimatedImpacts = defineAsyncComponent(() => import('../components/EstimatedImpacts.vue'))
const LandcoverToParks = defineAsyncComponent(() => import('../components/LandcoverToParks.vue'))

const { smAndDown: isMobile } = useDisplay()

const toggleStore = useToggleStore()
const globalStore = useGlobalStore()
const propsStore = usePropsStore()
const heatExposureStore = useHeatExposureStore()
const socioEconomicsStore = useSocioEconomicsStore()
const featureFlagStore = useFeatureFlagStore()

const { breadcrumbs, canGoBack, goBack } = useSidebarNavigation()

const currentLevel = computed(() => globalStore.level)
const currentView = computed(() => globalStore.view)
const activeTab = computed({
	get: () => toggleStore.activeTab,
	set: (val) => toggleStore.setActiveTab(val),
})

const isRail = computed(() => toggleStore.sidebarMode === 'rail')
const isVisible = computed(() => toggleStore.sidebarMode !== 'hidden')

const drawerWidth = computed(() => {
	if (isMobile.value) return Math.min(window.innerWidth * 0.9, 360)
	return 360
})

const tabs = [
	{ value: 'search', icon: 'mdi-magnify', label: 'Search' },
	{ value: 'layers', icon: 'mdi-layers', label: 'Layers' },
	{ value: 'analysis', icon: 'mdi-chart-line', label: 'Analysis' },
	{ value: 'details', icon: 'mdi-information', label: 'Details' },
]

const breadcrumbItems = computed(() =>
	breadcrumbs.value.map((b) => ({ title: b.label, disabled: b.level === currentLevel.value }))
)

const adaptationTab = ref('centers')

const heatHistogramData = computed(() => propsStore.heatHistogramData)
const statsIndex = computed(() => propsStore.statsIndex)
const showSosEco = computed(() => socioEconomicsStore.data && heatExposureStore.data)
const hasNDVIData = computed(() => toggleStore.ndvi)

const hasAvailableAnalysis = computed(() => {
	if (currentLevel.value === 'start') return false
	if (currentLevel.value === 'postalCode' && currentView.value !== 'grid') return true
	if (currentLevel.value === 'building') return true
	if (currentView.value === 'grid') return true
	return false
})

// Analysis configuration
const analysisConfig = {
	'heat-histogram': { title: 'Heat Distribution', icon: 'mdi-chart-histogram' },
	socioeconomics: { title: 'Socioeconomic Analysis', icon: 'mdi-account-group' },
	landcover: { title: 'Land Cover', icon: 'mdi-leaf' },
	'scatter-plot': { title: 'Building Analysis', icon: 'mdi-chart-scatter-plot' },
	'building-heat': { title: 'Building Heat Data', icon: 'mdi-thermometer' },
	'grid-options': { title: 'Grid Options', icon: 'mdi-grid' },
	'ndvi-analysis': { title: 'NDVI Vegetation', icon: 'mdi-leaf' },
}

// Map analysis types to their components for inline rendering
const analysisComponents = computed(() => ({
	'heat-histogram': HeatHistogram,
	landcover: Landcover,
	'building-heat':
		currentView.value === 'grid'
			? BuildingGridChart
			: currentView.value === 'helsinki'
				? BuildingHeatChart
				: HSYBuildingHeatChart,
	'grid-options': StatisticalGridOptions,
}))

// Inline analysis (small charts rendered in sidebar)
const inlineAnalysis = ref(null)
// Right panel analysis (large charts)
const rightPanelOpen = ref(false)
const rightPanelAnalysis = ref('')

const showDetailsBadge = computed(
	() => currentLevel.value === 'building' && activeTab.value !== 'details'
)

const openAnalysis = (type, size) => {
	if (size === 'small') {
		inlineAnalysis.value = type
		rightPanelOpen.value = false
	} else {
		inlineAnalysis.value = null
		rightPanelAnalysis.value = type
		rightPanelOpen.value = true
		// Auto-collapse left sidebar on narrow viewports to prevent map tunnel
		if (!isMobile.value && window.innerWidth < 1400) {
			toggleStore.setSidebarMode('rail')
		}
	}
}

const handleDrawerUpdate = (val) => {
	if (!val && isMobile.value) {
		toggleStore.setSidebarMode('hidden')
	}
}
</script>

<style scoped>
.control-panel {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.sidebar-header {
	display: flex;
	align-items: center;
	padding: 4px 8px;
	min-height: 40px;
}

.sidebar-breadcrumbs {
	padding: 0;
	flex: 1;
	min-width: 0;
}

.sidebar-breadcrumbs :deep(.v-breadcrumbs-item) {
	font-size: 0.8rem;
}

.sidebar-tabs :deep(.v-tab) {
	min-width: 0;
	padding: 0 8px;
}

.tab-label {
	font-size: 0.65rem;
	margin-top: 2px;
}

.sidebar-content {
	flex: 1;
	overflow-y: auto;
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

.tab-window {
	height: 100%;
}

.tab-content {
	padding: 12px 16px;
}

.section-description {
	font-size: 0.8rem;
	color: rgba(0, 0, 0, 0.6);
	margin-bottom: 8px;
}

.section-heading {
	font-size: 0.85rem;
	font-weight: 600;
	margin-bottom: 8px;
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

.inline-chart {
	border: 1px solid rgba(0, 0, 0, 0.12);
	border-radius: 8px;
	padding: 12px;
}

.rail-nav {
	padding-top: 8px;
}

.rail-toggle {
	display: flex;
	justify-content: center;
	padding: 8px;
}

.expansion-outlined :deep(.v-expansion-panel) {
	border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
	background: transparent;
}

.v-btn:focus-visible {
	outline: 2px solid #1976d2;
	outline-offset: 2px;
}
</style>
