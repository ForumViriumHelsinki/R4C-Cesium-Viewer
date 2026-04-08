<template>
	<v-app>
		<!-- Top Bar -->
		<v-app-bar
			:elevation="2"
			height="56"
			color="surface"
		>
			<!-- Left: App Title -->
			<AppTitle class="ml-2 ml-sm-4 mr-2" />

			<!-- Location context chip (hidden on mobile) -->
			<v-chip
				v-if="locationLabel"
				size="small"
				variant="tonal"
				color="primary"
				class="d-none d-sm-flex mx-1"
				prepend-icon="mdi-map-marker"
			>
				<span
					class="text-truncate"
					style="max-width: 160px"
				>{{ locationLabel }}</span>
			</v-chip>

			<v-spacer />

			<!-- Right: Search shortcut + User menu -->
			<v-btn
				icon
				variant="text"
				size="small"
				aria-label="Open search"
				class="d-none d-sm-flex"
				@click="toggleStore.toggleSidebar('search')"
			>
				<v-icon>mdi-magnify</v-icon>
			</v-btn>

			<!-- Mobile hamburger -->
			<v-btn
				icon
				variant="text"
				size="small"
				aria-label="Toggle sidebar"
				class="d-sm-none"
				@click="toggleMobileSidebar"
			>
				<v-icon>mdi-menu</v-icon>
			</v-btn>

			<!-- User menu -->
			<v-menu>
				<template #activator="{ props }">
					<v-btn
						v-bind="props"
						icon
						variant="text"
						size="small"
						aria-label="User menu"
						class="mr-2"
					>
						<v-icon>mdi-account-circle</v-icon>
					</v-btn>
				</template>
				<v-list density="compact">
					<v-list-item
						v-if="currentLevel !== 'start'"
						prepend-icon="mdi-home"
						title="Reset to start"
						@click="smartReset"
					/>
					<v-list-item
						prepend-icon="mdi-logout"
						title="Sign out"
						@click="signOut"
					/>
				</v-list>
			</v-menu>
		</v-app-bar>

		<!-- Sidebar with Rail + Tabs -->
		<ControlPanel />

		<v-main>
			<CesiumViewer />
			<SosEco250mGrid v-if="grid250m" />

			<!-- Map Overlay Controls (right side) -->
			<!-- MapOverlayControls provides zoom/compass controls. -->
			<!-- Safe to use: all Cesium built-in navigation widgets are disabled in -->
			<!-- useViewerInitialization.js to prevent duplicate affordances. -->
			<MapOverlayControls />

			<!-- Bottom Timeline Bar -->
			<v-slide-y-reverse-transition>
				<div
					v-if="showTimeline"
					class="timeline-bottom-bar"
					:style="timelineLeftStyle"
				>
					<TimelineCompact />
				</div>
			</v-slide-y-reverse-transition>

			<!-- Loading Indicator -->
			<LoadingIndicator
				mode="both"
				:show-performance-info="false"
				@retry-layer="handleRetryLayer"
			/>

			<!-- Data Source Status Badge - bottom right -->
			<DataSourceStatusBadge
				class="status-badge-overlay"
				@source-retry="handleSourceRetry"
				@cache-cleared="handleCacheCleared"
			/>

			<!-- Minimal disclaimer -->
			<div class="minimal-disclaimer" :style="disclaimerLeftStyle">
				<span class="disclaimer-text"> Data: HSY &bull; Statistics Finland </span>
			</div>
		</v-main>
	</v-app>
</template>

<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted } from 'vue'
import { useSidebarOffset } from './composables/useSidebarOffset'

// Lazy-loaded components
const TimelineCompact = defineAsyncComponent(() => import('./components/TimelineCompact.vue'))
const SosEco250mGrid = defineAsyncComponent(() => import('./components/SosEco250mGrid.vue'))
const ControlPanel = defineAsyncComponent(() => import('./pages/ControlPanel.vue'))
const MapOverlayControls = defineAsyncComponent(() => import('./components/MapOverlayControls.vue'))

import CesiumViewer from './pages/CesiumViewer.vue'
import { initializeFeatureFlags } from './services/featureFlagProvider'
import { useFeatureFlagStore } from './stores/featureFlagStore'
import { useGlobalStore } from './stores/globalStore.js'
import { useLoadingStore } from './stores/loadingStore.js'
import { useToggleStore } from './stores/toggleStore.js'
import { useUserStore } from './stores/userStore'
import logger from './utils/logger.js'

const toggleStore = useToggleStore()
const globalStore = useGlobalStore()
const loadingStore = useLoadingStore()
const featureFlagStore = useFeatureFlagStore()
const userStore = useUserStore()

const { sidebarOffset: timelineOffset } = useSidebarOffset(0)
const { sidebarOffset: disclaimerOffset } = useSidebarOffset(12)

const timelineLeftStyle = computed(() => ({ left: `${timelineOffset.value}px` }))
const disclaimerLeftStyle = computed(() => ({ left: `${disclaimerOffset.value}px` }))

const grid250m = computed(() => toggleStore.grid250m)
const currentLevel = computed(() => globalStore.level)
const showTimeline = computed(
	() => currentLevel.value === 'postalCode' || currentLevel.value === 'building'
)

const postalCode = computed(() => globalStore.postalCode)
const nameOfZone = computed(() => globalStore.nameOfZone)
const buildingAddress = computed(() => globalStore.buildingAddress)

const locationLabel = computed(() => {
	if (currentLevel.value === 'building') return buildingAddress.value || 'Building'
	if (currentLevel.value === 'postalCode')
		return nameOfZone.value ? `${postalCode.value} ${nameOfZone.value}` : postalCode.value
	return null
})

const toggleMobileSidebar = () => {
	toggleStore.setSidebarMode(toggleStore.sidebarMode === 'hidden' ? 'expanded' : 'hidden')
}

// Navigation functions
const signOut = () => {
	window.location.href = '/oauth2/sign_out'
}

const smartReset = async () => {
	const { default: Building } = await import('./services/building')
	const buildingService = new Building()
	buildingService.cancelCurrentLoad()

	const { useBuildingStore } = await import('./stores/buildingStore.js')
	const buildingStore = useBuildingStore()
	buildingStore.clearBuildingFeatures()

	toggleStore.onExitPostalCode()

	globalStore.setLevel('start')
	globalStore.setPostalCode(null)
	globalStore.setNameOfZone(null)
	globalStore.setView('capitalRegion')

	toggleStore.setShowTrees(false)
	toggleStore.setShowPlot(true)
	toggleStore.setGridView(false)
	toggleStore.setHelsinkiView(false)

	const { default: Camera } = await import('./services/camera')
	const camera = new Camera()
	camera.init()

	const tooltip = document.querySelector('.tooltip')
	if (tooltip) tooltip.style.display = 'none'
}

// Handle retry layer events from LoadingIndicator
const handleRetryLayer = (layerName) => {
	loadingStore.retryLayerLoading(layerName)
	logger.debug(`Retrying layer: ${layerName}`)
}

const handleSourceRetry = (sourceId) => {
	logger.debug(`Retrying data source: ${sourceId}`)
}

const handleCacheCleared = (sourceId) => {
	logger.debug(`Cache cleared for: ${sourceId}`)
	if (sourceId === 'all') {
		Object.keys(loadingStore.cacheStatus).forEach((layer) => {
			loadingStore.checkLayerCache(layer).catch((error) => {
				logger.error(`Failed to check layer cache for ${layer}:`, error)
			})
		})
	}
}

// Initialize services on mount
onMounted(async () => {
	try {
		await userStore.fetchUserInfo()
		await initializeFeatureFlags(userStore)

		featureFlagStore.loadOverrides()
		featureFlagStore.refreshFlags()

		if (featureFlagStore.isEnabled('backgroundPreload')) {
			const { default: backgroundPreloader } = await import('./services/backgroundPreloader.js')
			await backgroundPreloader.init()
			logger.debug('Background preloader initialized')
		}

		Object.keys(loadingStore.cacheStatus).forEach((layer) => {
			loadingStore.checkLayerCache(layer).catch((error) => {
				logger.error(`Failed to check layer cache for ${layer}:`, error)
			})
		})

		loadingStore.startStaleCleanupTimer()
	} catch (error) {
		logger.warn('Failed to initialize caching services:', error)
	}
})

onBeforeUnmount(async () => {
	loadingStore.stopStaleCleanupTimer()

	if (featureFlagStore.isEnabled('backgroundPreload')) {
		const { default: backgroundPreloader } = await import('./services/backgroundPreloader.js')
		backgroundPreloader.destroy()
	}
})
</script>

<style scoped>
.timeline-bottom-bar {
	position: fixed;
	bottom: 0;
	/* left is set dynamically via :style binding (useSidebarOffset) */
	right: 0;
	height: 48px;
	z-index: 1100;
	background: rgba(var(--v-theme-surface), 0.95);
	backdrop-filter: blur(8px);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 16px;
	box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.1);
	transition: left 0.2s ease;
}

.status-badge-overlay {
	position: fixed;
	bottom: 56px;
	right: 16px;
	z-index: 1100;
}

.minimal-disclaimer {
	position: fixed;
	bottom: 8px;
	/* left is set dynamically via :style binding (useSidebarOffset) */
	z-index: 1100;
	pointer-events: none;
	opacity: 0.7;
	transition: opacity 0.2s ease, left 0.2s ease;
}

.minimal-disclaimer:hover {
	opacity: 0.9;
}

.disclaimer-text {
	font-size: 0.6rem;
	color: rgba(var(--v-theme-on-surface), 0.7);
	background-color: rgba(var(--v-theme-surface), 0.8);
	padding: 2px 6px;
	border-radius: 3px;
	backdrop-filter: blur(4px);
	font-weight: 500;
}

/* Remove default spacing */
.v-main {
	padding: 0 !important;
}

.v-main > .v-main__wrap {
	padding: 0 !important;
}

/* Touch targets for WCAG 2.5.5 */
.v-app-bar .v-btn--icon {
	min-width: 44px;
	min-height: 44px;
}

/* Focus visible styles */
.v-btn:focus-visible {
	outline: 2px solid rgb(var(--v-theme-primary));
	outline-offset: 2px;
}

/* Touch optimization */
.v-btn,
.v-slider,
.v-checkbox,
.v-switch,
.v-radio,
button,
a {
	touch-action: manipulation;
}

.cesium-viewer,
.cesium-widget {
	touch-action: pan-x pan-y pinch-zoom;
}

/* Mobile responsive */
@media (max-width: 768px) {
	/* left is handled by useSidebarOffset (returns margin-only on mobile) */

	.minimal-disclaimer {
		bottom: 56px;
	}

	.disclaimer-text {
		font-size: 0.55rem;
		padding: 1px 4px;
	}

	.status-badge-overlay {
		bottom: 56px;
		right: 8px;
	}
}
</style>
