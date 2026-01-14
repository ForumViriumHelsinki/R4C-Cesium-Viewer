<template>
	<!-- Cesium Container -->
	<div id="cesiumContainer">
		<!-- Camera Controls -->
		<CameraControls />
		<!-- Loading Component -->
		<Loading v-if="store.isLoading" />
		<!-- Map Click Loading Overlay -->
		<MapClickLoadingOverlay
			@cancel="handleCancelAnimation"
			@retry="handleRetryLoading"
		/>
		<!-- Viewport-based Building Loading Indicator -->
		<ViewportLoadingIndicator
			:is-loading-buildings="isLoadingBuildings"
			:postal-codes-loading="viewportLoadingProgress.current"
			:postal-codes-total="viewportLoadingProgress.total"
			:error="viewportLoadingError"
			@retry="handleRetryViewportLoading"
		/>
		<!-- Disclaimer Popup -->
		<DisclaimerPopup class="disclaimer-popup" />
		<BuildingInformation v-if="shouldShowBuildingInformation" />
		<!--
			Initialization Error Snackbar
			Purpose: Critical Cesium library loading failures (e.g., network errors during startup)
			Behavior: Persistent (no auto-dismiss), shown at top, includes retry button
			Use case: Viewer failed to initialize, user cannot proceed without retry
		-->
		<v-snackbar
			v-model="errorSnackbar"
			:timeout="-1"
			color="error"
			location="top"
			multi-line
			role="alert"
			aria-live="assertive"
		>
			<div class="d-flex align-center">
				<v-icon class="mr-2"> mdi-alert-circle </v-icon>
				<div>
					<div class="font-weight-bold">Failed to Load Map Viewer</div>
					<div class="text-caption">
						{{ errorMessage }}
					</div>
				</div>
			</div>
			<template #actions>
				<v-btn
					variant="text"
					@click="retryInit"
				>
					Retry
				</v-btn>
				<v-btn
					variant="text"
					@click="errorSnackbar = false"
				>
					Close
				</v-btn>
			</template>
		</v-snackbar>
		<!--
			Runtime Data Loading Error Snackbar
			Purpose: Non-critical async service failures (e.g., cold areas, sensors, surveys)
			Behavior: Auto-dismisses after 6 seconds, shown at bottom
			Use case: Optional data failed to load, viewer remains functional
		-->
		<v-snackbar
			v-model="store.errorNotification.show"
			:timeout="6000"
			color="error"
			location="bottom"
			role="alert"
			aria-live="assertive"
		>
			<div class="d-flex align-center">
				<v-icon class="mr-2"> mdi-alert </v-icon>
				<div>
					{{ store.errorNotification.message }}
				</div>
			</div>
			<template #actions>
				<v-btn
					variant="text"
					@click="store.hideError()"
				>
					Close
				</v-btn>
			</template>
		</v-snackbar>
	</div>
</template>

<script>
/**
 * @component CesiumViewer
 * @description Core 3D map interface using CesiumJS for climate data visualization.
 * This is the main application entry point that initializes the Cesium viewer,
 * handles map interactions, manages data loading, and coordinates camera movements.
 *
 * Features:
 * - Lazy loading of Cesium library for better initial performance
 * - Dynamic building loading based on viewport position and zoom level
 * - Click and drag detection for map interaction
 * - Camera animation with cancellation support
 * - Viewport-based postal code detection and data loading
 * - Tile-based viewport building streaming (optional, toggleable)
 * - E2E test mode with deterministic rendering
 * - Automatic rendering optimization when tab is hidden
 *
 * @example
 * <CesiumViewer />
 *
 * Store Integration:
 * - globalStore: Main application state, viewer instance, loading states
 * - buildingStore: Building features and selection state
 * - propsStore: Postal code data and properties
 * - toggleStore: UI toggle states and layer visibility
 * - featureFlagStore: Feature flags including viewportStreaming
 * - socioEconomicsStore: Socioeconomic data
 * - heatExposureStore: Heat exposure calculations
 * - graphicsStore: Graphics quality settings
 *
 * Services Used:
 * - Datasource: GeoJSON data source management
 * - WMS: Web Map Service layer integration
 * - Featurepicker: Entity selection and picking logic
 * - Camera: Camera controls and positioning
 * - Graphics: Graphics quality initialization
 * - cacheWarmer: Background data preloading
 * - ViewportBuildingLoader: Tile-based viewport building streaming
 */
import { computed, onMounted, ref } from 'vue'
import BuildingInformation from '../components/BuildingInformation.vue'
import CameraControls from '../components/CameraControls.vue'
import DisclaimerPopup from '../components/DisclaimerPopup.vue'
import Loading from '../components/Loading.vue'
import MapClickLoadingOverlay from '../components/MapClickLoadingOverlay.vue'
import ViewportLoadingIndicator from '../components/ViewportLoadingIndicator.vue'
import { useCameraControls } from '../composables/useCameraControls.js'
import { useDataLoading } from '../composables/useDataLoading.js'
import { useEntityPicking } from '../composables/useEntityPicking.js'
import { useFogEffect } from '../composables/useFogEffect.js'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts.js'
import { useUrlState } from '../composables/useUrlState.js'
import { useViewerInitialization } from '../composables/useViewerInitialization.js'
import { useViewportLoading } from '../composables/useViewportLoading.js'
import { useBuildingStore } from '../stores/buildingStore.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import logger from '../utils/logger.js'

export default {
	components: {
		DisclaimerPopup,
		CameraControls,
		BuildingInformation,
		Loading,
		MapClickLoadingOverlay,
		ViewportLoadingIndicator,
	},
	setup() {
		const store = useGlobalStore()
		const toggleStore = useToggleStore()
		const buildingStore = useBuildingStore()

		const shouldShowBuildingInformation = computed(() => {
			return store.showBuildingInfo && buildingStore.buildingFeatures && !store.isLoading
		})

		// URL state composable for deep linking and page refresh persistence
		const { restoreStateFromUrl, updateUrlFromCamera, updateUrlFromNavigation, getUrlState } =
			useUrlState()

		// Track if we restored from URL (to skip default camera init)
		const restoredFromUrl = ref(false)

		// Viewer initialization composable
		const {
			viewer,
			errorSnackbar,
			errorMessage,
			Cesium,
			Featurepicker,
			Camera,
			initViewer,
			addPostalCodes,
			addAttribution,
			retryInit: baseRetryInit,
		} = useViewerInitialization()

		// Data loading composable (auto-loads on mount)
		const { loadExternalData, startCacheWarming } = useDataLoading(false) // Don't auto-load, we'll call it explicitly

		// Viewport loading composable
		const {
			isLoadingBuildings,
			viewportLoadingProgress,
			viewportLoadingError,
			handleCameraSettled,
			handleRetryViewportLoading,
			initViewportStreaming,
		} = useViewportLoading(viewer, Camera, Featurepicker)

		// URL update callback for camera controls
		const handleUrlUpdate = () => {
			if (viewer.value) {
				updateUrlFromCamera(viewer.value)
			}
		}

		// Camera controls composable - will be initialized in onMounted
		let cameraControlsInstance = null

		// Entity picking composable
		const { addFeaturePicker } = useEntityPicking(Featurepicker)

		// Keyboard shortcuts composable
		const { handleCancelAnimation } = useKeyboardShortcuts(Camera)

		/**
		 * Handles retry of failed postal code loading.
		 * Resets error state and re-triggers data loading through FeaturePicker.
		 *
		 * @returns {void}
		 */
		const handleRetryLoading = () => {
			logger.debug('[CesiumViewer] User requested data loading retry')

			const postalCode = store.clickProcessingState.postalCode
			if (!postalCode) {
				logger.warn('[CesiumViewer] No postal code to retry')
				return
			}

			if (!Featurepicker) {
				logger.warn('[CesiumViewer] Featurepicker module not loaded yet')
				return
			}

			// Reset error state and increment retry counter
			store.setClickProcessingState({
				error: null,
				retryCount: store.clickProcessingState.retryCount + 1,
				stage: 'loading',
			})

			// Retry loading through featurepicker
			const featurepicker = new Featurepicker()
			featurepicker.loadPostalCodeData(postalCode)
		}

		/**
		 * Retries viewer initialization after an error.
		 * Clears error state and reloads Cesium viewer and external data.
		 *
		 * @async
		 * @returns {Promise<void>}
		 */
		const retryInit = async () => {
			await baseRetryInit()
			if (!errorSnackbar.value) {
				await loadExternalData()
			}
		}

		onMounted(async () => {
			// Check if we have URL state to restore before initializing
			const urlState = getUrlState()
			if (urlState) {
				logger.debug('[CesiumViewer] URL state detected, will restore after initialization')
				restoredFromUrl.value = true
			}

			// Initialize viewer
			await initViewer()

			// Add postal codes and attribution
			await addPostalCodes()
			addAttribution()

			// Restore state from URL if present (after postal codes are loaded)
			if (restoredFromUrl.value && viewer.value && Featurepicker) {
				logger.debug('[CesiumViewer] Restoring map state from URL...')
				await restoreStateFromUrl(viewer.value, Featurepicker)
				logger.debug('[CesiumViewer] Map state restored from URL')
			}

			// Add interaction handlers
			addFeaturePicker()

			// Initialize camera controls with URL update callback
			cameraControlsInstance = useCameraControls(viewer.value, handleCameraSettled, handleUrlUpdate)
			cameraControlsInstance.addCameraMoveEndListener()

			// Initialize fog effect (visual indicator for zoom level)
			const { initFog } = useFogEffect(viewer.value)
			initFog()

			// Initialize viewport streaming if enabled
			await initViewportStreaming()

			// Load external data (Paavo, heat exposure)
			await loadExternalData()

			// Start cache warming
			startCacheWarming()
		})

		return {
			store,
			toggleStore,
			buildingStore,
			viewer,
			shouldShowBuildingInformation,
			errorSnackbar,
			errorMessage,
			retryInit,
			handleCancelAnimation,
			handleRetryLoading,
			// Viewport loading state
			isLoadingBuildings,
			viewportLoadingProgress,
			viewportLoadingError,
			handleRetryViewportLoading,
		}
	},
}
</script>

<style scoped>
#cesiumContainer {
	width: 100%;
	height: 100%;
	position: absolute;
	top: 0;
	left: 0;
	overflow: hidden;
}
</style>
