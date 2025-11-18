<template>
	<v-app>
		<!-- Top Navigation Bar -->
		<v-app-bar
app
elevation="2"
class="top-nav"
>
			<v-container
fluid
class="d-flex align-center py-0"
>
				<div class="navigation-buttons">
					<v-btn
						v-if="currentLevel === 'building'"
						icon
						aria-label="Return to postal code level"
						@click="returnToPostalCode"
					>
						<v-icon>mdi-arrow-left</v-icon>
					</v-btn>

					<v-btn
						icon
						aria-label="Sign out"
						@click="signOut"
					>
						<v-icon>mdi-logout</v-icon>
					</v-btn>

					<v-btn
						v-if="currentLevel !== 'start'"
						icon
						aria-label="Rotate camera view 180 degrees"
						@click="rotateCamera"
					>
						<v-icon>mdi-compass</v-icon>
					</v-btn>

					<!-- Feature Flags Panel -->
					<FeatureFlagsPanel />
				</div>

				<v-spacer />

				<!-- View Mode Selector -->
				<ViewModeCompact />

				<v-spacer />

				<!-- Control Panel Toggle -->
				<v-btn
					variant="outlined"
					aria-label="Toggle control panel"
					prepend-icon="mdi-tune"
					class="control-panel-toggle"
					@click="sidebarVisible = !sidebarVisible"
				>
					<span class="d-none d-sm-inline">{{ sidebarVisible ? 'Hide' : 'Show' }} Controls</span>
					<span class="d-inline d-sm-none">{{ sidebarVisible ? 'Hide' : 'Show' }}</span>
				</v-btn>
			</v-container>
		</v-app-bar>

		<!-- Enhanced Control Panel -->
		<ControlPanel v-model="sidebarVisible" />

		<v-main>
			<CesiumViewer />
			<SosEco250mGrid v-if="grid250m" />

			<!-- Loading Indicator -->
			<LoadingIndicator
				mode="both"
				:show-performance-info="false"
				@retry-layer="handleRetryLayer"
			/>

			<!-- Data Source Status - Bottom Right Corner -->
			<div
				class="status-indicator-container"
				:class="{ 'sidebar-open': sidebarVisible }"
			>
				<DataSourceStatusCompact
					@source-retry="handleSourceRetry"
					@cache-cleared="handleCacheCleared"
				/>
			</div>

			<!-- Minimal disclaimer -->
			<div class="minimal-disclaimer">
				<span class="disclaimer-text">
					Data: HSY • Statistics Finland
				</span>
			</div>
		</v-main>
	</v-app>
</template>

<script setup>
import ControlPanel from './pages/ControlPanel.vue';
import CesiumViewer from './pages/CesiumViewer.vue';
import SosEco250mGrid from './components/SosEco250mGrid.vue';
import LoadingIndicator from './components/LoadingIndicator.vue';
import DataSourceStatusCompact from './components/DataSourceStatusCompact.vue';
import ViewModeCompact from './components/ViewModeCompact.vue';
import FeatureFlagsPanel from './components/FeatureFlagsPanel.vue';
import { useToggleStore } from './stores/toggleStore.js';
import { useGlobalStore } from './stores/globalStore.js';
import { useFeatureFlagStore } from './stores/featureFlagStore';
import { computed, ref, onMounted } from 'vue';
import Tree from './services/tree';
import Featurepicker from './services/featurepicker';
import Camera from './services/camera';
import { useLoadingStore } from './stores/loadingStore.js';
import backgroundPreloader from './services/backgroundPreloader.js';

const toggleStore = useToggleStore();
const globalStore = useGlobalStore();
const loadingStore = useLoadingStore();
const featureFlagStore = useFeatureFlagStore();

const grid250m = computed(() => toggleStore.grid250m);
const currentLevel = computed(() => globalStore.level);

// UI state
const sidebarVisible = ref(true); // Show sidebar by default for better discoverability

// Navigation functions
const signOut = () => {
	window.location.href = '/oauth2/sign_out';
};

const smartReset = () => {
	// Reset application state without page reload
	globalStore.setLevel('start');
	globalStore.setPostalCode(null);
	globalStore.setNameOfZone(null);
	globalStore.setView('capitalRegion');

	// Reset toggle states
	toggleStore.setShowTrees(false);
	toggleStore.setShowPlot(true);
	toggleStore.setGridView(false);
	toggleStore.setHelsinkiView(false);

	// Reset camera to initial position
	const camera = new Camera();
	camera.init();

	// Hide tooltip
	hideTooltip();
};

const returnToPostalCode = () => {
	const featurepicker = new Featurepicker();
	const treeService = new Tree();
	hideTooltip();
	featurepicker.loadPostalCode();
	toggleStore.showTrees && treeService.loadTrees();
};

const hideTooltip = () => {
	const tooltip = document.querySelector('.tooltip');
	if (tooltip) {
		tooltip.style.display = 'none';
	}
};

const rotateCamera = () => {
	const camera = new Camera();
	camera.rotate180Degrees();
};

// Handle retry layer events from LoadingIndicator
const handleRetryLayer = (layerName) => {
	// Clear the error and attempt to reload the layer
	loadingStore.retryLayerLoading(layerName);

	// You would implement the actual retry logic here
	// For now, we'll just log it
	console.log(`Retrying layer: ${layerName}`);
};

// Handle data source retry events
const handleSourceRetry = (sourceId) => {
	console.log(`Retrying data source: ${sourceId}`);
	// Could trigger health checks or reconnection attempts
};

// Handle cache clearing events
const handleCacheCleared = (sourceId) => {
	console.log(`Cache cleared for: ${sourceId}`);
	if (sourceId === 'all') {
		// Refresh cache status for all layers
		Object.keys(loadingStore.cacheStatus).forEach(layer => {
			loadingStore.checkLayerCache(layer);
		});
	}
};

// Handle data preloading requests
const handleDataPreload = (sourceId) => {
	console.log(`Preloading requested for: ${sourceId}`);
	// Could trigger specific preloading for the source
};

// Initialize services on mount
onMounted(async () => {
	try {
		// Load feature flag overrides from localStorage
		featureFlagStore.loadOverrides();

		// Initialize background preloader
		await backgroundPreloader.init();
		console.log('Background preloader initialized');

		// Check cache status for all layers on app start
		Object.keys(loadingStore.cacheStatus).forEach(layer => {
			loadingStore.checkLayerCache(layer);
		});

	} catch (error) {
		console.warn('Failed to initialize caching services:', error);
	}
});
</script>

<style scoped>
.top-nav {
	height: 64px;
	background: white;
	border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.navigation-buttons {
	display: flex;
	gap: 8px;
	align-items: center;
}

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

/* Status indicator positioning */
.status-indicator-container {
	position: fixed;
	bottom: 16px; /* No longer need to be above footer */
	right: 16px;
	z-index: 2010; /* Above sidebar (which is typically z-index 2000-2005) */
	max-width: 300px;
	transition: right 0.3s ease;
}

/* Adjust position when sidebar is open */
.status-indicator-container.sidebar-open {
	right: 296px; /* 280px sidebar width + 16px margin */
}

/* Navigation buttons - ensure touch targets meet WCAG 2.5.5 */
.navigation-buttons {
	display: flex;
	align-items: center;
	gap: 4px;
}

.navigation-buttons .v-btn {
	/* Default Vuetify icon button is 40px, which is close to 44px minimum */
	min-width: 44px;
	min-height: 44px;
}

.control-panel-toggle {
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

	.status-indicator-container {
		bottom: 8px;
		right: 8px;
		max-width: 250px;
	}

	/* On mobile, sidebar covers full screen so keep indicator on right */
	.status-indicator-container.sidebar-open {
		right: 8px;
	}

	/* Reduce gap on mobile for space efficiency */
	.navigation-buttons {
		gap: 2px;
	}

	/* Ensure control panel toggle is touch-friendly */
	.control-panel-toggle {
		min-width: 44px;
		padding-left: 8px;
		padding-right: 8px;
	}
}

/* Very small mobile - further optimize */
@media (max-width: 480px) {
	.top-nav {
		padding: 0 4px;
	}

	/* Keep 44px minimum for WCAG 2.5.5 compliance even on very small screens */
	.navigation-buttons .v-btn {
		min-width: 44px;
		min-height: 44px;
	}
}
</style>
