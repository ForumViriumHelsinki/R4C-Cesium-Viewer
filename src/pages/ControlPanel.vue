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

				<!-- Tab bar -->
			<v-tabs
				v-model="activeTab"
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

			<!-- Tab content: inert until the Cesium viewer exists (#951) -->
			<div
				v-if="!viewerReady"
				class="viewer-loading-hint"
				role="status"
			>
				<v-progress-circular
					indeterminate
					size="14"
					width="2"
				/>
				<span>Loading map…</span>
			</div>
			<div
				class="sidebar-content"
				:class="{ 'sidebar-content--waiting': !viewerReady }"
				:inert="!viewerReady"
			>
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
							<!-- Map tools for the current view (Climate Adaptation, Grid Options) -->
							<AnalysisEntryList
								v-if="layersTabEntries.length > 0"
								class="mb-3"
								:entries="layersTabEntries"
								:inline-entry="inlineEntry?.tab === 'layers' ? inlineEntry : null"
								:view="currentView"
								@open="openAnalysis"
								@close-inline="inlineAnalysis = null"
							/>
							<MapControls />
							<template v-if="featureFlagStore.isEnabled('vttFloodSimulation')">
								<v-divider class="my-3" />
								<p class="section-heading">VTT Flood Simulation</p>
								<v-btn
									block
									variant="outlined"
									prepend-icon="mdi-water"
									:active="vttFloodOpen"
									@click="toggleVttFlood"
								>
									{{ vttFloodOpen ? 'Hide Flood Simulation' : 'Flood Simulation (VTT)' }}
								</v-btn>
								<FloodSimulationPanel
									v-if="vttFloodOpen"
									class="mt-2"
									@close="closeVttFlood"
								/>
							</template>
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
								<!-- Entries come from src/constants/analysisRegistry.js.
								     Buttons gate on flags only; data loads on click (#712). -->
								<AnalysisEntryList
									:entries="analysisTabEntries"
									:inline-entry="inlineEntry?.tab === 'analysis' ? inlineEntry : null"
									:view="currentView"
									@open="openAnalysis"
									@close-inline="inlineAnalysis = null"
								/>

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
							<p
								v-if="currentLevel !== 'start'"
								class="section-heading"
							>
								{{ currentLevel === 'building' ? 'Building Properties' : 'Area Properties' }}
							</p>
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
	/>
</template>

<script setup>
import { computed, defineAsyncComponent, ref } from 'vue'
import { useDisplay } from 'vuetify'
import AnalysisEntryList from '../components/AnalysisEntryList.vue'
import AreaProperties from '../components/AreaProperties.vue'
import BackgroundMapBrowser from '../components/BackgroundMapBrowser.vue'
import MapControls from '../components/MapControls.vue'
import UnifiedSearch from '../components/UnifiedSearch.vue'
import ViewModeCompact from '../components/ViewModeCompact.vue'
import { useSidebarNavigation } from '../composables/useSidebarNavigation.js'
import { ANALYSES, findAnalysis, isAnalysisAvailable } from '../constants/analysisRegistry.js'
import { LAYOUT } from '../constants/layout.js'
import { LAAJASALO_CAMERA } from '../constants/vttFlood'
import { cesiumProvider, getCesium } from '../services/cesiumProvider.js'

// Store and Service Imports
import { useFeatureFlagStore } from '../stores/featureFlagStore'
import { useGlobalStore } from '../stores/globalStore'
import { useHeatExposureStore } from '../stores/heatExposureStore'
import { usePropsStore } from '../stores/propsStore'
import { useSocioEconomicsStore } from '../stores/socioEconomicsStore'
import { useToggleStore } from '../stores/toggleStore'

// Lazy-loaded VTT flood-simulation panel (only mounted when the gated layer is opened)
const FloodSimulationPanel = defineAsyncComponent(
	() => import('../components/FloodSimulationPanel.vue')
)

// Lazy-loaded right-hand drawer for drawer-placed analyses
const AnalysisPanel = defineAsyncComponent(() => import('../components/AnalysisPanel.vue'))

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

/**
 * The sidebar mounts in the same tick as CesiumViewer, but its controls call
 * getCesium() and read globalStore.cesiumViewer, which exist only once the lazy
 * Cesium chunk has loaded and the viewer is built. The tab content stays inert
 * until then (#951). A non-null viewer implies the Cesium module is loaded, so this
 * one gate covers both the "module not loaded" and the "viewer still null" window.
 */
const viewerReady = computed(() => Boolean(globalStore.cesiumViewer))
/** @type {readonly ('search' | 'layers' | 'analysis' | 'details')[]} */
const SIDEBAR_TABS = ['search', 'layers', 'analysis', 'details']

/**
 * Type guard narrowing an arbitrary tab value to the known sidebar tab union.
 * @param {string} val
 * @returns {val is 'search' | 'layers' | 'analysis' | 'details'}
 */
const isSidebarTab = (val) => /** @type {readonly string[]} */ (SIDEBAR_TABS).includes(val)

const activeTab = computed({
	get: () => toggleStore.activeTab,
	set: (val) => {
		if (isSidebarTab(val)) {
			toggleStore.setActiveTab(val)
		}
	},
})

const isRail = computed(() => toggleStore.sidebarMode === 'rail')
const isVisible = computed(() => toggleStore.sidebarMode !== 'hidden')

const drawerWidth = computed(() => {
	if (isMobile.value) {
		return Math.min(
			window.innerWidth * LAYOUT.SIDEBAR_MOBILE_VIEWPORT_FRACTION,
			LAYOUT.SIDEBAR_EXPANDED_WIDTH
		)
	}
	return LAYOUT.SIDEBAR_EXPANDED_WIDTH
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

/** @type {import('vue').ComputedRef<import('../constants/analysisRegistry.js').AnalysisContext>} */
const analysisContext = computed(() => ({
	level: globalStore.level,
	view: globalStore.view,
	isEnabled: (flag) => featureFlagStore.isEnabled(flag),
	statsIndex: propsStore.statsIndex,
	socioEconomicsReady: Boolean(socioEconomicsStore.data && heatExposureStore.data),
}))

const availableAnalyses = computed(() =>
	ANALYSES.filter((entry) => isAnalysisAvailable(entry, analysisContext.value))
)

const analysisTabEntries = computed(() =>
	availableAnalyses.value.filter((entry) => entry.tab === 'analysis')
)
const layersTabEntries = computed(() =>
	availableAnalyses.value.filter((entry) => entry.tab === 'layers')
)
const hasAvailableAnalysis = computed(() => analysisTabEntries.value.length > 0)

// Inline analysis (card rendered in the sidebar), by registry id
const inlineAnalysis = ref(/** @type {string | null} */ (null))
const inlineEntry = computed(() =>
	inlineAnalysis.value ? (findAnalysis(inlineAnalysis.value) ?? null) : null
)
// Right panel analysis (drawer), by registry id
const rightPanelOpen = ref(false)
const rightPanelAnalysis = ref('')

const showDetailsBadge = computed(
	() => currentLevel.value === 'building' && activeTab.value !== 'details'
)

/** @param {import('../constants/analysisRegistry.js').AnalysisEntry} entry */
const openAnalysis = (entry) => {
	if (entry.placement === 'inline') {
		inlineAnalysis.value = entry.id
		rightPanelOpen.value = false
	} else {
		inlineAnalysis.value = null
		rightPanelAnalysis.value = entry.id
		rightPanelOpen.value = true
		// Auto-collapse left sidebar on narrow viewports to prevent map tunnel
		if (!isMobile.value && window.innerWidth < LAYOUT.ANALYSIS_PANEL_COLLAPSE_SIDEBAR_BELOW) {
			toggleStore.setSidebarMode('rail')
		}
	}
}

const handleDrawerUpdate = (val) => {
	if (!val && isMobile.value) {
		toggleStore.setSidebarMode('hidden')
	}
}

// --- VTT Flood Simulation panel toggle ---
const vttFloodOpen = ref(false)
const vttFloodFlownTo = ref(false)

const flyCameraToLaajasalo = () => {
	const viewer = globalStore.cesiumViewer
	if (!viewer || viewer.isDestroyed?.()) return
	if (!cesiumProvider.isInitialized()) return
	const Cesium = getCesium()
	viewer.camera.flyTo({
		destination: Cesium.Cartesian3.fromDegrees(
			LAAJASALO_CAMERA.longitude,
			LAAJASALO_CAMERA.latitude,
			LAAJASALO_CAMERA.height
		),
		orientation: {
			heading: Cesium.Math.toRadians(LAAJASALO_CAMERA.heading),
			pitch: Cesium.Math.toRadians(LAAJASALO_CAMERA.pitch),
			roll: 0.0,
		},
		duration: 1.2,
	})
}

const toggleVttFlood = () => {
	vttFloodOpen.value = !vttFloodOpen.value
	if (vttFloodOpen.value && !vttFloodFlownTo.value) {
		flyCameraToLaajasalo()
		vttFloodFlownTo.value = true
	}
}

const closeVttFlood = () => {
	vttFloodOpen.value = false
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
	padding: 4px 8px;
}

.tab-label {
	font-size: 0.7rem;
	margin-top: 2px;
}

.sidebar-content {
	flex: 1;
	overflow-y: auto;
}

.sidebar-content--waiting {
	opacity: 0.6;
}

.viewer-loading-hint {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 16px 0;
	font-size: 0.75rem;
	color: rgba(var(--v-theme-on-surface), 0.6);
}
.control-section {
	padding: 16px;
	border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}
.control-section:last-child {
	border-bottom: none;
}
.section-subtitle {
	font-size: 1rem;
	font-weight: 600;
	margin-bottom: 12px;
	color: rgba(var(--v-theme-on-surface), 0.87);
	display: flex;
	align-items: center;
}
.subsection-title {
	font-size: 0.9rem;
	font-weight: 500;
	margin-bottom: 8px;
	color: rgba(var(--v-theme-on-surface), 0.7);
}

.tab-window {
	height: 100%;
}

.tab-content {
	padding: 12px 16px;
}

.section-description {
	font-size: 0.8rem;
	color: rgba(var(--v-theme-on-surface), 0.6);
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
	color: rgba(var(--v-theme-on-surface), 0.6);
}

.rail-nav {
	padding-top: 8px;
}

.rail-toggle {
	display: flex;
	justify-content: center;
	padding: 8px;
}

.v-btn:focus-visible {
	outline: 2px solid rgb(var(--v-theme-primary));
	outline-offset: 2px;
}
</style>
