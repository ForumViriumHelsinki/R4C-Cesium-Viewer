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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BuildingInformation from '../components/BuildingInformation.vue'
import CameraControls from '../components/CameraControls.vue'
import DisclaimerPopup from '../components/DisclaimerPopup.vue'
import Loading from '../components/Loading.vue'
import MapClickLoadingOverlay from '../components/MapClickLoadingOverlay.vue'
import ViewportLoadingIndicator from '../components/ViewportLoadingIndicator.vue'
import { TIMING } from '../constants/timing.js'
import { VIEWPORT } from '../constants/viewport.js'
import cacheWarmer from '../services/cacheWarmer.js'
import ViewportBuildingLoader from '../services/viewportBuildingLoader.js'
import { useBuildingStore } from '../stores/buildingStore.js'
import { useFeatureFlagStore } from '../stores/featureFlagStore'
import { useGlobalStore } from '../stores/globalStore.js'
import { useGraphicsStore } from '../stores/graphicsStore.js'
import { useHeatExposureStore } from '../stores/heatExposureStore.js'
import { usePropsStore } from '../stores/propsStore.js'
import { useSocioEconomicsStore } from '../stores/socioEconomicsStore.js'
import { useToggleStore } from '../stores/toggleStore.js'

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
		const propsStore = usePropsStore()
		const toggleStore = useToggleStore() // Access the toggle store
		const socioEconomicsStore = useSocioEconomicsStore()
		const heatExposureStore = useHeatExposureStore()
		const buildingStore = useBuildingStore()
		const graphicsStore = useGraphicsStore()
		const featureFlagStore = useFeatureFlagStore()
		const shouldShowBuildingInformation = computed(() => {
			return store.showBuildingInfo && buildingStore.buildingFeatures && !store.isLoading
		})
		const viewer = ref(null)
		const errorSnackbar = ref(false)
		const errorMessage = ref('')
		const isLoadingBuildings = ref(false)
		// Viewport loading progress tracking
		const viewportLoadingProgress = ref({ current: 0, total: 0 })
		const viewportLoadingError = ref(null)
		let lastPickTime = 0
		let Cesium = null
		let Datasource = null
		let WMS = null
		let Featurepicker = null
		let Camera = null
		let Graphics = null
		// Persistent FeaturePicker instance for viewport-based loading
		// Reusing the same instance maintains visiblePostalCodes state across camera moves
		let viewportFeaturepicker = null
		// ViewportBuildingLoader instance for tile-based building streaming
		// This is an alternative to postal code-based loading (via viewportFeaturepicker)
		let viewportBuildingLoader = null

		/**
		 * Initializes the Cesium viewer with dynamic module loading.
		 * Loads Cesium library and dependencies asynchronously to prevent blocking initial render.
		 * Sets up terrain, imagery layers, camera controls, and event handlers.
		 *
		 * Features:
		 * - Parallel loading of Cesium module and CSS
		 * - Service module loading after Cesium initialization
		 * - E2E test mode detection and configuration
		 * - Graphics quality settings integration
		 * - Request render mode for performance optimization
		 * - Visibility change detection for CPU optimization
		 *
		 * @async
		 * @returns {Promise<void>}
		 */
		const initViewer = async () => {
			// Dynamically import Cesium and its dependencies to avoid blocking initial render
			if (!Cesium) {
				try {
					// Load Cesium module and CSS in parallel
					const [cesiumModule] = await Promise.all([
						import('cesium'),
						import('cesium/Source/Widgets/widgets.css'),
					])
					Cesium = cesiumModule

					// Load service modules that depend on Cesium
					const [DatasourceModule, WMSModule, FeaturepickerModule, CameraModule, GraphicsModule] =
						await Promise.all([
							import('../services/datasource.js'),
							import('../services/wms.js'),
							import('../services/featurepicker.js'),
							import('../services/camera.js'),
							import('../services/graphics.js'),
						])

					Datasource = DatasourceModule.default
					WMS = WMSModule.default
					Featurepicker = FeaturepickerModule.default
					Camera = CameraModule.default
					Graphics = GraphicsModule.default
				} catch (error) {
					console.error('Failed to load Cesium library:', error)
					errorMessage.value =
						'Unable to load the 3D map viewer. Please check your internet connection and try again.'
					errorSnackbar.value = true
					store.setIsLoading(false)
					return
				}
			}

			// Set Ion token after loading
			Cesium.Ion.defaultAccessToken = null

			// Detect E2E test environment
			const isE2ETest = import.meta.env.VITE_E2E_TEST === 'true'

			// Create offscreen element for hiding credits in test mode
			let offscreenCreditContainer
			if (isE2ETest) {
				offscreenCreditContainer = document.createElement('div')
				offscreenCreditContainer.style.display = 'none'
				document.body.appendChild(offscreenCreditContainer)
			}

			// Create viewer with enhanced graphics options
			const viewerOptions = {
				terrainProvider: new Cesium.EllipsoidTerrainProvider(),
				imageryProvider: new Cesium.OpenStreetMapImageryProvider({
					url: 'https://tile.openstreetmap.org/',
				}), // Use OpenStreetMap as fallback to prevent gray chunks
				animation: false,
				fullscreenButton: false,
				geocoder: false,
				shadows: false,
				navigationHelpButton: false,
				timeline: false,
				sceneModePicker: false,
				baseLayerPicker: false,
				infoBox: false,
				homeButton: false,
				// Test mode: hide credit container to prevent click interception
				creditContainer: isE2ETest ? offscreenCreditContainer : undefined,
			}

			// Add request render mode if enabled for performance OR in test mode
			if (graphicsStore.requestRenderMode || isE2ETest) {
				viewerOptions.requestRenderMode = true
				viewerOptions.maximumRenderTimeChange = Infinity
			}

			// Test mode: disable camera inertia for deterministic behavior
			if (isE2ETest) {
				viewerOptions.screenSpaceCameraController = {
					inertiaSpin: 0,
					inertiaZoom: 0,
					inertiaTranslate: 0,
				}
			}

			viewer.value = new Cesium.Viewer('cesiumContainer', viewerOptions)

			store.setCesiumViewer(viewer.value)

			// Expose viewer to E2E test harness
			if (isE2ETest) {
				window.__viewer = viewer.value
				window.__cesium = Cesium
				console.log('[CesiumViewer] 🧪 Test mode enabled - viewer exposed to window')
			}

			// Initialize graphics quality settings
			const graphics = new Graphics()
			graphics.init(viewer.value)

			viewer.value.imageryLayers.add(
				new WMS().createHelsinkiImageryLayer('avoindata:Karttasarja_PKS')
			)

			const camera = new Camera()
			camera.init()

			await addPostalCodes()
			addFeaturePicker()
			addCameraMoveEndListener()
			addAttribution()

			// Initialize viewport-based building loader if viewport streaming is enabled
			// By default enabled via feature flag (viewportStreaming)
			// This uses tile-based spatial grid loading instead of postal code boundaries
			if (featureFlagStore.isEnabled('viewportStreaming')) {
				viewportBuildingLoader = new ViewportBuildingLoader()
				// Await initialization - includes retry logic for globe readiness
				await viewportBuildingLoader.initialize(viewer.value)
				console.log('[CesiumViewer] ✅ ViewportBuildingLoader initialized (tile-based mode)')
			}

			// Optimize CPU usage: pause rendering when tab is hidden
			document.addEventListener('visibilitychange', () => {
				if (!viewer.value) return

				if (document.hidden) {
					viewer.value.scene.requestRenderMode = true
					console.log('[CesiumViewer] ⏸ Rendering paused (tab hidden)')
				} else {
					viewer.value.scene.requestRenderMode = false
					viewer.value.scene.requestRender()
					console.log('[CesiumViewer] ▶ Rendering resumed (tab visible)')
				}
			})
		}

		/**
		 * Adds data source attributions to the Cesium credit display.
		 * Credits include Helsinki Region Infoshare (HRI) and Statistics Finland.
		 *
		 * @returns {void}
		 */
		const addAttribution = () => {
			const hriCredit = new Cesium.Credit(
				'<a href="https://hri.fi/data/fi/dataset" target="_blank"><img src="assets/images/hero_logo_50x25.png" title="assets/images/Helsinki Region Infoshare"/></a>'
			)
			const statsCredit = new Cesium.Credit(
				'<a href="https://www.stat.fi/org/avoindata/paikkatietoaineistot_en.html" target="_blank"><img src="assets/images/tilastokeskus_en_75x25.png" title="Statistics Finland"/></a>'
			)
			store.cesiumViewer.creditDisplay.addStaticCredit(hriCredit)
			store.cesiumViewer.creditDisplay.addStaticCredit(statsCredit)
		}

		/**
		 * Loads postal code area boundaries from GeoJSON data.
		 * Postal code polygons are rendered with 0.2 opacity.
		 *
		 * @async
		 * @returns {Promise<void>}
		 */
		const addPostalCodes = async () => {
			console.log('[CesiumViewer] 📮 Loading postal codes...')
			const dataSourceService = new Datasource()
			await dataSourceService.loadGeoJsonDataSource(0.2, './assets/data/hsy_po.json', 'PostCodes')

			const dataSource = await dataSourceService.getDataSourceByName('PostCodes')
			console.log(
				'[CesiumViewer] ✅ Postal codes loaded, entities count:',
				dataSource?._entityCollection?._entities?._array?.length || 0
			)
			propsStore.setPostalCodeData(dataSource)
		}

		/**
		 * Registers click event handler for feature picking on the map.
		 * Implements drag detection to differentiate clicks from pans.
		 * Debounces clicks to prevent rapid-fire selections.
		 *
		 * Drag Detection:
		 * - Tracks mousedown position
		 * - Calculates distance moved between mousedown and mouseup
		 * - Ignores events where movement exceeds 5px threshold
		 *
		 * Click Filtering:
		 * - Ignores clicks on control panel and time series elements
		 * - Enforces 500ms minimum interval between picks
		 * - Temporarily hides building info during processing
		 *
		 * @returns {void}
		 */
		const addFeaturePicker = () => {
			const cesiumContainer = document.getElementById('cesiumContainer')
			const featurepicker = new Featurepicker()
			console.log('[CesiumViewer] ✅ FeaturePicker click handler added')

			// Drag detection: track mouse position to differentiate clicks from drags
			let mouseDownPosition = null
			const DRAG_THRESHOLD = 5 // pixels - movement beyond this is considered a drag

			// Track mouse down position
			cesiumContainer.addEventListener('mousedown', (event) => {
				mouseDownPosition = { x: event.clientX, y: event.clientY }
			})

			cesiumContainer.addEventListener('click', (event) => {
				const controlPanelElement = document.querySelector('.control-panel-main')
				const timeSeriesElement = document.querySelector('#heatTimeseriesContainer')
				const isClickOnControlPanel = controlPanelElement?.contains(event.target)
				const isClickOnTimeSeries = timeSeriesElement?.contains(event.target)
				const currentTime = Date.now()

				console.log('[CesiumViewer] 🖱️ Cesium click detected')
				console.log('[CesiumViewer] Click on control panel:', isClickOnControlPanel)
				console.log('[CesiumViewer] Click on time series:', isClickOnTimeSeries)
				console.log('[CesiumViewer] Time since last pick:', currentTime - lastPickTime)

				// Check if this was a drag (mouse moved significantly between mousedown and mouseup)
				if (mouseDownPosition) {
					const dx = event.clientX - mouseDownPosition.x
					const dy = event.clientY - mouseDownPosition.y
					const distance = Math.sqrt(dx * dx + dy * dy)

					if (distance > DRAG_THRESHOLD) {
						console.log(
							'[CesiumViewer] ⚠️ Click ignored - detected as drag (moved',
							distance.toFixed(1),
							'px)'
						)
						mouseDownPosition = null
						return
					}
				}
				mouseDownPosition = null

				if (
					!isClickOnControlPanel &&
					!isClickOnTimeSeries &&
					currentTime - lastPickTime > TIMING.CLICK_THROTTLE_MS
				) {
					console.log('[CesiumViewer] ✅ Processing click through FeaturePicker')
					store.setShowBuildingInfo(false)
					if (!store.showBuildingInfo) {
						featurepicker.processClick(event)
					}
					lastPickTime = currentTime // Update the last pick time
					setTimeout(() => {
						store.setShowBuildingInfo(true)
					}, 1000)
				} else {
					console.log('[CesiumViewer] ⚠️ Click ignored due to conditions')
				}
			})
		}

		/**
		 * Registers camera moveEnd event listener with debouncing.
		 * Prevents rapid-fire viewport checks by waiting for camera to settle.
		 * Uses 1500ms debounce delay to avoid flickering during navigation.
		 *
		 * @returns {void}
		 */
		const addCameraMoveEndListener = () => {
			let cameraMoveTimeout = null
			const DEBOUNCE_DELAY_MS = TIMING.CAMERA_DEBOUNCE_MS // Wait 1500ms after camera stops moving to prevent blinking, see ../constants/timing.js

			viewer.value.camera.moveEnd.addEventListener(() => {
				// Clear any pending timeout
				if (cameraMoveTimeout) {
					clearTimeout(cameraMoveTimeout)
				}

				// Set new timeout
				cameraMoveTimeout = setTimeout(() => {
					console.log('[CesiumViewer] 📷 Camera movement ended, checking viewport state...')
					handleCameraSettled().catch(console.error)
				}, DEBOUNCE_DELAY_MS)
			})

			console.log(
				'[CesiumViewer] ✅ Camera moveEnd listener added with',
				DEBOUNCE_DELAY_MS,
				'ms debounce'
			)
		}

		/**
		 * Handles viewport-based building loading after camera stops moving.
		 * Only triggers at postalCode level when zoomed in sufficiently.
		 *
		 * Viewport Loading Logic:
		 * - Only active at 'postalCode' level (not 'start' or 'building')
		 * - Requires camera height below 50km threshold
		 * - Detects visible postal codes in viewport
		 * - Loads buildings for all visible postal codes
		 * - Reuses FeaturePicker instance to maintain state
		 * - Tracks loading progress and errors
		 * - Skipped when viewport streaming feature flag is enabled (tile-based loading active)
		 *
		 * @async
		 * @returns {Promise<void>}
		 */
		const handleCameraSettled = async () => {
			// Skip postal code-based viewport loading if viewport streaming is active
			if (featureFlagStore.isEnabled('viewportStreaming')) {
				console.log('[CesiumViewer] Viewport streaming active, skipping postal code-based loading')
				return
			}

			// Prevent overlapping calls to avoid visibility blinking
			// Log camera settled event for visibility debugging
			console.log(
				`%c[VISIBILITY] Camera settled - triggering viewport check`,
				'color: blue; font-weight: bold'
			)
			if (isLoadingBuildings.value) {
				console.log('[CesiumViewer] Already loading buildings, skipping...')
				return
			}

			const currentLevel = store.level

			console.log('[CesiumViewer] Current level:', currentLevel)

			// Only handle viewport-based loading at postalCode level
			// At 'start' level: user should click to select postal code
			// At 'building' level: building detail view, no automatic loading
			if (currentLevel !== 'postalCode') {
				console.log('[CesiumViewer] Not at postalCode level, skipping viewport check')
				return
			}

			// Get camera utilities
			const camera = new Camera()

			// Get viewport rectangle
			const viewportRect = camera.getViewportRectangle()
			if (!viewportRect) {
				console.warn('[CesiumViewer] Could not determine viewport rectangle')
				return
			}

			// Get camera height to determine if we should load buildings
			const cameraHeight = camera.getCameraHeight()
			const MAX_HEIGHT_FOR_BUILDING_LOAD = VIEWPORT.MAX_CAMERA_HEIGHT_FOR_BUILDINGS // 50km - only load buildings when zoomed in enough, see ../constants/viewport.js

			if (cameraHeight > MAX_HEIGHT_FOR_BUILDING_LOAD) {
				console.log('[CesiumViewer] Camera too high for building loading:', cameraHeight, 'm')
				return
			}
			console.log(
				'[CesiumViewer] Camera height:',
				cameraHeight,
				'm - proceeding with viewport-based building loading'
			)

			try {
				isLoadingBuildings.value = true
				viewportLoadingError.value = null

				// Reuse the same FeaturePicker instance to maintain visiblePostalCodes state
				if (!viewportFeaturepicker) {
					viewportFeaturepicker = new Featurepicker()
				}
				const visiblePostalCodes = viewportFeaturepicker.getVisiblePostalCodes(viewportRect)

				// Update progress tracking
				viewportLoadingProgress.value = {
					current: 0,
					total: visiblePostalCodes.length,
				}

				// Load buildings for visible postal codes
				await viewportFeaturepicker.loadBuildingsForVisiblePostalCodes(visiblePostalCodes)

				// Update to complete
				viewportLoadingProgress.value = {
					current: visiblePostalCodes.length,
					total: visiblePostalCodes.length,
				}
			} catch (error) {
				console.error('[CesiumViewer] Error loading buildings:', error?.message || error)
				viewportLoadingError.value = error?.message || 'Failed to load buildings'
			} finally {
				isLoadingBuildings.value = false
			}
		}

		/**
		 * Handles retry of viewport-based building loading after an error.
		 * Clears error state and re-triggers camera settled handler.
		 *
		 * @async
		 * @returns {Promise<void>}
		 */
		const handleRetryViewportLoading = async () => {
			console.log('[CesiumViewer] Retrying viewport building loading')
			viewportLoadingError.value = null
			await handleCameraSettled()
		}

		/**
		 * Retries viewer initialization after an error.
		 * Clears error state and reloads Cesium viewer and external data.
		 *
		 * @async
		 * @returns {Promise<void>}
		 */
		const retryInit = async () => {
			errorSnackbar.value = false
			errorMessage.value = ''
			store.setIsLoading(true)
			await initViewer()
			if (!errorSnackbar.value) {
				socioEconomicsStore.loadPaavo().catch(console.error)
				heatExposureStore.loadHeatExposure().catch(console.error)
			}
			store.setIsLoading(false)
		}

		/**
		 * Handles cancellation of camera animation via ESC key or button.
		 * Restores previous view state and resets click processing state.
		 *
		 * @returns {void}
		 */
		const handleCancelAnimation = () => {
			console.log('[CesiumViewer] User requested animation cancellation')

			if (!Camera) {
				console.warn('[CesiumViewer] Camera module not loaded yet')
				return
			}

			const camera = new Camera()
			const wasCancelled = camera.cancelFlight()

			if (wasCancelled) {
				console.log('[CesiumViewer] Animation cancelled successfully')
				// Camera service handles state restoration via callbacks
			} else {
				console.warn('[CesiumViewer] No active flight to cancel')
				// Still reset state to clear UI
				store.resetClickProcessingState()
			}
		}

		/**
		 * Handles retry of failed postal code loading.
		 * Resets error state and re-triggers data loading through FeaturePicker.
		 *
		 * @returns {void}
		 */
		const handleRetryLoading = () => {
			console.log('[CesiumViewer] User requested data loading retry')

			const postalCode = store.clickProcessingState.postalCode
			if (!postalCode) {
				console.warn('[CesiumViewer] No postal code to retry')
				return
			}

			if (!Featurepicker) {
				console.warn('[CesiumViewer] Featurepicker module not loaded yet')
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
		 * Global ESC key handler for animation cancellation.
		 * Only active when canCancel is true to avoid interfering with other ESC key uses.
		 *
		 * @param {KeyboardEvent} event - Keyboard event
		 * @returns {void}
		 */
		const handleGlobalEscKey = (event) => {
			if (event.key === 'Escape' && store.clickProcessingState.canCancel) {
				handleCancelAnimation()
			}
		}

		/**
		 * Watch for changes to viewport streaming feature flag
		 * Dynamically enables/disables tile-based viewport loading at runtime.
		 */
		watch(
			() => featureFlagStore.isEnabled('viewportStreaming'),
			async (newValue, _oldValue) => {
				if (!viewer.value) {
					console.warn('[CesiumViewer] Viewer not initialized, cannot toggle viewport streaming')
					return
				}

				if (newValue && !viewportBuildingLoader) {
					// Enable viewport streaming
					console.log('[CesiumViewer] Enabling viewport streaming (tile-based loading)')
					viewportBuildingLoader = new ViewportBuildingLoader()
					await viewportBuildingLoader.initialize(viewer.value)
				} else if (!newValue && viewportBuildingLoader) {
					// Disable viewport streaming
					console.log('[CesiumViewer] Disabling viewport streaming')
					await viewportBuildingLoader.shutdown()
					viewportBuildingLoader = null
				}
			}
		)

		onMounted(async () => {
			await initViewer()
			socioEconomicsStore.loadPaavo().catch(console.error)
			heatExposureStore.loadHeatExposure().catch(console.error)

			// Register ESC key handler for animation cancellation
			document.addEventListener('keydown', handleGlobalEscKey)
			console.log('[CesiumViewer] ⌨️ ESC key handler registered')

			// Start cache warming in background (non-blocking)
			// Uses requestIdleCallback to run during browser idle time
			if (typeof requestIdleCallback !== 'undefined') {
				requestIdleCallback(
					() => {
						void cacheWarmer.warmCriticalData()
					},
					{ timeout: 2000 }
				) // 2 second timeout
			} else {
				// Fallback for browsers without requestIdleCallback
				setTimeout(() => {
					void cacheWarmer.warmCriticalData()
				}, 1000)
			}
		})

		onBeforeUnmount(async () => {
			// Clean up ESC key handler
			document.removeEventListener('keydown', handleGlobalEscKey)
			console.log('[CesiumViewer] 🧹 ESC key handler removed')

			// Clean up viewport building loader if initialized
			if (viewportBuildingLoader) {
				await viewportBuildingLoader.shutdown()
				console.log('[CesiumViewer] 🧹 ViewportBuildingLoader shutdown complete')
			}
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
