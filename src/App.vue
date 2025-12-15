<template>
	<v-app>
		<!-- Top Navigation Bar -->
		<v-app-bar
			:elevation="2"
			height="64"
			color="surface"
		>
			<!-- Left section: Title + Navigation -->
			<AppTitle class="ml-2 ml-sm-4 mr-2 mr-sm-4" />

			<!-- Navigation buttons - hidden on mobile, shown in menu -->
			<div class="d-none d-md-flex align-center ga-1">
				<v-btn
					v-if="currentLevel === 'building'"
					icon
					variant="text"
					aria-label="Return to postal code level"
					@click="returnToPostalCode"
				>
					<v-icon>mdi-arrow-left</v-icon>
				</v-btn>

				<v-btn
					icon
					variant="text"
					aria-label="Sign out"
					@click="signOut"
				>
					<v-icon>mdi-logout</v-icon>
				</v-btn>

				<v-btn
					v-if="currentLevel !== 'start'"
					icon
					variant="text"
					aria-label="Rotate camera view 180 degrees"
					@click="rotateCamera"
				>
					<v-icon>mdi-compass</v-icon>
				</v-btn>

				<!-- Feature Flags Panel -->
				<FeatureFlagsPanel />
			</div>

			<!-- Mobile menu for navigation buttons -->
			<v-menu class="d-md-none">
				<template #activator="{ props }">
					<v-btn
						v-bind="props"
						icon
						variant="text"
						aria-label="Navigation menu"
						class="d-md-none"
					>
						<v-icon>mdi-dots-vertical</v-icon>
					</v-btn>
				</template>
				<v-list density="compact">
					<v-list-item
						v-if="currentLevel === 'building'"
						prepend-icon="mdi-arrow-left"
						title="Back to postal code"
						@click="returnToPostalCode"
					/>
					<v-list-item
						prepend-icon="mdi-logout"
						title="Sign out"
						@click="signOut"
					/>
					<v-list-item
						v-if="currentLevel !== 'start'"
						prepend-icon="mdi-compass"
						title="Rotate camera"
						@click="rotateCamera"
					/>
				</v-list>
			</v-menu>

			<v-spacer class="d-none d-sm-flex" />

			<!-- Center section - PRIORITY: Always visible -->
			<ViewModeCompact />

			<!-- Heat Timeline - hidden on small screens -->
			<TimelineCompact
				v-if="currentLevel === 'postalCode' || currentLevel === 'building'"
				class="ml-4 d-none d-lg-flex"
			/>

			<!-- Data Source Status Badge - hidden on mobile -->
			<DataSourceStatusBadge
				class="ml-2 d-none d-md-flex"
				@source-retry="handleSourceRetry"
				@cache-cleared="handleCacheCleared"
			/>

			<v-spacer />

			<!-- Right section: Controls button -->
			<v-btn
				variant="outlined"
				aria-label="Toggle control panel"
				prepend-icon="mdi-tune"
				class="mr-2 mr-sm-4"
				size="small"
				@click="sidebarVisible = !sidebarVisible"
			>
				<span class="d-none d-sm-inline">{{ sidebarVisible ? 'Hide' : 'Show' }} Controls</span>
				<span class="d-inline d-sm-none">{{ sidebarVisible ? 'Hide' : '' }}</span>
			</v-btn>
		</v-app-bar>

		<!-- Enhanced Control Panel -->
		<ControlPanel v-model="sidebarVisible" />

		<v-main>
			<CesiumViewer />
			<SosEco250mGrid v-if="grid250m" />

			<!-- Version Badge -->
			<VersionBadge />

			<!-- Loading Indicator -->
			<LoadingIndicator
				mode="both"
				:show-performance-info="false"
				@retry-layer="handleRetryLayer"
			/>

			<!-- Minimal disclaimer -->
			<div class="minimal-disclaimer">
				<span class="disclaimer-text"> Data: HSY • Statistics Finland </span>
			</div>
		</v-main>
	</v-app>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import CesiumViewer from './pages/CesiumViewer.vue'
import backgroundPreloader from './services/backgroundPreloader.js'
import Camera from './services/camera'
import Featurepicker from './services/featurepicker'
import Tree from './services/tree'
import { useFeatureFlagStore } from './stores/featureFlagStore'
import { useGlobalStore } from './stores/globalStore.js'
import { useLoadingStore } from './stores/loadingStore.js'
import { useToggleStore } from './stores/toggleStore.js'

const toggleStore = useToggleStore()
const globalStore = useGlobalStore()
const loadingStore = useLoadingStore()
const featureFlagStore = useFeatureFlagStore()

const grid250m = computed(() => toggleStore.grid250m)
const currentLevel = computed(() => globalStore.level)

// UI state
const sidebarVisible = ref(true) // Show sidebar by default for better discoverability

// Navigation functions
const signOut = () => {
	window.location.href = '/oauth2/sign_out'
}

const smartReset = () => {
	// Reset application state without page reload
	globalStore.setLevel('start')
	globalStore.setPostalCode(null)
	globalStore.setNameOfZone(null)
	globalStore.setView('capitalRegion')

	// Reset toggle states
	toggleStore.setShowTrees(false)
	toggleStore.setShowPlot(true)
	toggleStore.setGridView(false)
	toggleStore.setHelsinkiView(false)

	// Reset camera to initial position
	const camera = new Camera()
	camera.init()

	// Hide tooltip
	hideTooltip()
}

const returnToPostalCode = () => {
	const featurepicker = new Featurepicker()
	const treeService = new Tree()
	hideTooltip()
	featurepicker.loadPostalCode().catch(console.error)
	if (toggleStore.showTrees) {
		treeService.loadTrees().catch(console.error)
	}
}

const hideTooltip = () => {
	const tooltip = document.querySelector('.tooltip')
	if (tooltip) {
		tooltip.style.display = 'none'
	}
}

const rotateCamera = () => {
	const camera = new Camera()
	camera.rotate180Degrees()
}

// Handle retry layer events from LoadingIndicator
const handleRetryLayer = (layerName) => {
	// Clear the error and attempt to reload the layer
	loadingStore.retryLayerLoading(layerName)

	// You would implement the actual retry logic here
	// For now, we'll just log it
	console.log(`Retrying layer: ${layerName}`)
}

// Handle data source retry events
const handleSourceRetry = (sourceId) => {
	console.log(`Retrying data source: ${sourceId}`)
	// Could trigger health checks or reconnection attempts
}

// Handle cache clearing events
const handleCacheCleared = (sourceId) => {
	console.log(`Cache cleared for: ${sourceId}`)
	if (sourceId === 'all') {
		// Refresh cache status for all layers
		Object.keys(loadingStore.cacheStatus).forEach((layer) => {
			void loadingStore.checkLayerCache(layer)
		})
	}
}

// Handle data preloading requests
const handleDataPreload = (sourceId) => {
	console.log(`Preloading requested for: ${sourceId}`)
	// Could trigger specific preloading for the source
}

// Initialize services on mount
onMounted(async () => {
	try {
		// Load feature flag overrides from localStorage
		featureFlagStore.loadOverrides()

		// Initialize background preloader
		await backgroundPreloader.init()
		console.log('Background preloader initialized')

		// Check cache status for all layers on app start
		Object.keys(loadingStore.cacheStatus).forEach((layer) => {
			void loadingStore.checkLayerCache(layer)
		})

		// Start automatic stale loading cleanup timer
		// This prevents loading indicators from getting stuck due to network issues
		loadingStore.startStaleCleanupTimer()
	} catch (error) {
		console.warn('Failed to initialize caching services:', error)
	}
})
</script>

<style scoped>
.minimal-disclaimer {
	position: fixed;
	bottom: 8px;
	left: 12px;
	z-index: 1100;
	pointer-events: none;
	opacity: 0.7;
	transition: opacity 0.2s ease;
}

.minimal-disclaimer:hover {
	opacity: 0.9;
}

.disclaimer-text {
	font-size: 0.6rem;
	color: rgba(0, 0, 0, 0.7);
	background-color: rgba(255, 255, 255, 0.8);
	padding: 2px 6px;
	border-radius: 3px;
	backdrop-filter: blur(4px);
	font-weight: 500;
}

/* Remove default spacing that could cause white space */
.v-main {
	padding: 0 !important;
}

.v-main > .v-main__wrap {
	padding: 0 !important;
}

/* Navigation buttons - ensure touch targets meet WCAG 2.5.5 */
.v-app-bar .v-btn--icon {
	/* Default Vuetify icon button is 40px, which is close to 44px minimum */
	min-width: 44px;
	min-height: 44px;
}

.v-app-bar .v-btn:not(.v-btn--icon) {
	min-height: 44px;
}

/* Focus visible styles for accessibility */
.v-btn:focus-visible {
	outline: 2px solid #1976d2;
	outline-offset: 2px;
}

/* Touch optimization - prevent double-tap zoom delays */
.v-btn,
.v-slider,
.v-checkbox,
.v-switch,
.v-radio,
button,
a {
	touch-action: manipulation;
}

/* Allow pinch-zoom on the map but prevent double-tap zoom */
.cesium-viewer,
.cesium-widget {
	touch-action: pan-x pan-y pinch-zoom;
}

/* Mobile responsive adjustments */
@media (max-width: 768px) {
	.minimal-disclaimer {
		bottom: 6px;
		left: 8px;
	}

	.disclaimer-text {
		font-size: 0.55rem;
		padding: 1px 4px;
	}
}

/* Very small mobile - further optimize */
@media (max-width: 480px) {
	/* Keep 44px minimum for WCAG 2.5.5 compliance even on very small screens */
	.v-app-bar .v-btn--icon {
		min-width: 44px;
		min-height: 44px;
	}
}
</style>
