/**
 * @module composables/useViewerInitialization
 * Handles Cesium viewer initialization with dynamic module loading.
 * Provides lazy loading of Cesium library and service dependencies.
 */

import { ref } from 'vue'
import { cesiumProvider, getCesium } from '../services/cesiumProvider.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { useGraphicsStore } from '../stores/graphicsStore.js'
import { usePropsStore } from '../stores/propsStore.js'
import logger from '../utils/logger.js'

/**
 * Vue 3 composable for Cesium viewer initialization
 * Handles lazy loading, viewer creation, terrain/imagery setup, and error handling.
 *
 * @returns {{
 *   viewer: import('vue').Ref<any>,
 *   errorSnackbar: import('vue').Ref<boolean>,
 *   errorMessage: import('vue').Ref<string>,
 *   Cesium: any,
 *   Datasource: any,
 *   WMS: any,
 *   Featurepicker: any,
 *   Camera: any,
 *   Graphics: any,
 *   initViewer: () => Promise<void>,
 *   addPostalCodes: () => Promise<void>,
 *   addAttribution: () => void,
 *   retryInit: () => Promise<void>
 * }} Viewer initialization state and functions
 *
 * @example
 * import { useViewerInitialization } from '@/composables/useViewerInitialization';
 * const { viewer, initViewer, errorSnackbar } = useViewerInitialization();
 * await initViewer();
 */
export function useViewerInitialization() {
	const store = useGlobalStore()
	const graphicsStore = useGraphicsStore()
	const propsStore = usePropsStore()

	const viewer = ref(null)
	const errorSnackbar = ref(false)
	const errorMessage = ref('')

	// Module references (loaded dynamically)
	let Cesium = null
	let Datasource = null
	let WMS = null
	let Featurepicker = null
	let Camera = null
	let Graphics = null

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
		// Initialize Cesium via centralized provider to avoid blocking initial render
		if (!Cesium) {
			try {
				// Initialize Cesium module via provider (handles CSS loading too)
				await cesiumProvider.initialize()
				Cesium = getCesium()

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
				logger.error('Failed to load Cesium library:', error)
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
			logger.debug('[useViewerInitialization] 🧪 Test mode enabled - viewer exposed to window')
		}

		// Initialize graphics quality settings
		const graphics = new Graphics()
		graphics.init(viewer.value)

		viewer.value.imageryLayers.add(
			new WMS().createHelsinkiImageryLayer('avoindata:Karttasarja_PKS')
		)

		const camera = new Camera()
		camera.init()

		// Optimize CPU usage: pause rendering when tab is hidden
		document.addEventListener('visibilitychange', () => {
			if (!viewer.value) return

			if (document.hidden) {
				viewer.value.scene.requestRenderMode = true
				logger.debug('[useViewerInitialization] ⏸ Rendering paused (tab hidden)')
			} else {
				viewer.value.scene.requestRenderMode = false
				viewer.value.scene.requestRender()
				logger.debug('[useViewerInitialization] ▶ Rendering resumed (tab visible)')
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
		if (!Cesium) {
			logger.warn('[useViewerInitialization] Cannot add attribution - Cesium not loaded')
			return
		}

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
		if (!Datasource) {
			logger.warn('[useViewerInitialization] Cannot add postal codes - Datasource not loaded')
			return
		}

		logger.debug('[useViewerInitialization] 📮 Loading postal codes...')
		const dataSourceService = new Datasource()
		await dataSourceService.loadGeoJsonDataSource(0.2, './assets/data/hsy_po.json', 'PostCodes')

		const dataSource = await dataSourceService.getDataSourceByName('PostCodes')
		logger.debug(
			'[useViewerInitialization] ✅ Postal codes loaded, entities count:',
			dataSource?._entityCollection?._entities?._array?.length || 0
		)
		propsStore.setPostalCodeData(dataSource)
	}

	/**
	 * Retries viewer initialization after an error.
	 * Clears error state and reloads Cesium viewer.
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	const retryInit = async () => {
		errorSnackbar.value = false
		errorMessage.value = ''
		store.setIsLoading(true)
		await initViewer()
		store.setIsLoading(false)
	}

	return {
		viewer,
		errorSnackbar,
		errorMessage,
		// Expose module references for access by other composables
		get Cesium() {
			return Cesium
		},
		get Datasource() {
			return Datasource
		},
		get WMS() {
			return WMS
		},
		get Featurepicker() {
			return Featurepicker
		},
		get Camera() {
			return Camera
		},
		get Graphics() {
			return Graphics
		},
		initViewer,
		addPostalCodes,
		addAttribution,
		retryInit,
	}
}
