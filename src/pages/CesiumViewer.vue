<template>
    <!-- Cesium Container -->
    <div id="cesiumContainer">
		<!-- Camera Controls -->
		<CameraControls />
	    <!-- Loading Component -->
    	<Loading v-if="store.isLoading" />
		<Timeline v-if="store.level === 'postalCode' || store.level === 'building' "/>
    	<!-- Disclaimer Popup -->
    	<DisclaimerPopup class="disclaimer-popup" />
    	<BuildingInformation
      		v-if="shouldShowBuildingInformation"
    	/>
		<!-- Error Snackbar -->
		<v-snackbar
			v-model="errorSnackbar"
			:timeout="-1"
			color="error"
			location="top"
			multi-line
		>
			<div class="d-flex align-center">
				<v-icon class="mr-2">mdi-alert-circle</v-icon>
				<div>
					<div class="font-weight-bold">Failed to Load Map Viewer</div>
					<div class="text-caption">{{ errorMessage }}</div>
				</div>
			</div>
			<template v-slot:actions>
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
	</div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';

import DisclaimerPopup from '../components/DisclaimerPopup.vue';
import Loading from '../components/Loading.vue';
import BuildingInformation from '../components/BuildingInformation.vue';
import Timeline from '../components/Timeline.vue';
import CameraControls from '../components/CameraControls.vue';

import { useGlobalStore } from '../stores/globalStore.js';
import { useSocioEconomicsStore } from '../stores/socioEconomicsStore.js';
import { useHeatExposureStore } from '../stores/heatExposureStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import { useBuildingStore } from '../stores/buildingStore.js';
import { useGraphicsStore } from '../stores/graphicsStore.js';

export default {
	components: {
		DisclaimerPopup,
		CameraControls,
		BuildingInformation,
		Loading,
		Timeline,
	},
	setup() {
		const store = useGlobalStore();
		const propsStore = usePropsStore();
		const toggleStore = useToggleStore();  // Access the toggle store
		const socioEconomicsStore = useSocioEconomicsStore();
		const heatExposureStore = useHeatExposureStore();
		const buildingStore = useBuildingStore();
		const graphicsStore = useGraphicsStore();
    	const shouldShowBuildingInformation = computed(() => {
      		return store.showBuildingInfo && buildingStore.buildingFeatures && !store.isLoading;
    	});
		const viewer = ref(null);
		const errorSnackbar = ref(false);
		const errorMessage = ref('');
		let lastPickTime = 0;
		let Cesium = null;
		let Datasource = null;
		let WMS = null;
		let Featurepicker = null;
		let Camera = null;
		let Graphics = null;

		const initViewer = async () => {
			// Dynamically import Cesium and its dependencies to avoid blocking initial render
			if (!Cesium) {
				try {
					// Load Cesium module and CSS in parallel
					const [cesiumModule] = await Promise.all([
						import('cesium'),
						import('cesium/Source/Widgets/widgets.css')
					]);
					Cesium = cesiumModule;

					// Load service modules that depend on Cesium
					const [DatasourceModule, WMSModule, FeaturepickerModule, CameraModule, GraphicsModule] = await Promise.all([
						import('../services/datasource.js'),
						import('../services/wms.js'),
						import('../services/featurepicker.js'),
						import('../services/camera.js'),
						import('../services/graphics.js')
					]);

					Datasource = DatasourceModule.default;
					WMS = WMSModule.default;
					Featurepicker = FeaturepickerModule.default;
					Camera = CameraModule.default;
					Graphics = GraphicsModule.default;
				} catch (error) {
					console.error('Failed to load Cesium library:', error);
					errorMessage.value = 'Unable to load the 3D map viewer. Please check your internet connection and try again.';
					errorSnackbar.value = true;
					store.setIsLoading(false);
					return;
				}
			}

			// Set Ion token after loading
			Cesium.Ion.defaultAccessToken = null;

			// Detect E2E test environment
			const isE2ETest = import.meta.env.VITE_E2E_TEST === 'true';

			// Create offscreen element for hiding credits in test mode
			let offscreenCreditContainer;
			if (isE2ETest) {
				offscreenCreditContainer = document.createElement('div');
				offscreenCreditContainer.style.display = 'none';
				document.body.appendChild(offscreenCreditContainer);
			}

			// Create viewer with enhanced graphics options
			const viewerOptions = {
				terrainProvider: new Cesium.EllipsoidTerrainProvider(),
				imageryProvider: false, // Disable default imagery to prevent Ion API calls
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
			};

			// Add request render mode if enabled for performance OR in test mode
			if (graphicsStore.requestRenderMode || isE2ETest) {
				viewerOptions.requestRenderMode = true;
				viewerOptions.maximumRenderTimeChange = Infinity;
			}

			// Test mode: disable camera inertia for deterministic behavior
			if (isE2ETest) {
				viewerOptions.screenSpaceCameraController = {
					inertiaSpin: 0,
					inertiaZoom: 0,
					inertiaTranslate: 0,
				};
			}

			viewer.value = new Cesium.Viewer('cesiumContainer', viewerOptions);

			store.setCesiumViewer(viewer.value);

			// Expose viewer to E2E test harness
			if (isE2ETest) {
				window.__viewer = viewer.value;
				window.__cesium = Cesium;
				console.log('[CesiumViewer] 🧪 Test mode enabled - viewer exposed to window');
			}

			// Initialize graphics quality settings
			const graphics = new Graphics();
			graphics.init(viewer.value);

			viewer.value.imageryLayers.add(
				new WMS().createHelsinkiImageryLayer( 'avoindata:Karttasarja_PKS' )
			);

			const camera = new Camera();
			camera.init();

			addPostalCodes();
			addFeaturePicker();
			addAttribution();
		};

		const addAttribution = () => {
			const hriCredit = new Cesium.Credit(
				'<a href="https://hri.fi/data/fi/dataset" target="_blank"><img src="assets/images/hero_logo_50x25.png" title="assets/images/Helsinki Region Infoshare"/></a>'
			);
			const statsCredit = new Cesium.Credit(
				'<a href="https://www.stat.fi/org/avoindata/paikkatietoaineistot_en.html" target="_blank"><img src="assets/images/tilastokeskus_en_75x25.png" title="Statistics Finland"/></a>'
			);
			store.cesiumViewer.creditDisplay.addStaticCredit( hriCredit );
			store.cesiumViewer.creditDisplay.addStaticCredit( statsCredit );
		};

		const addPostalCodes = async () => {
			console.log('[CesiumViewer] 📮 Loading postal codes...');
			const dataSourceService = new Datasource();
			await dataSourceService.loadGeoJsonDataSource(
				0.2,
				'./assets/data/hsy_po.json',
				'PostCodes'
			);

			const dataSource = await dataSourceService.getDataSourceByName('PostCodes');
			console.log('[CesiumViewer] ✅ Postal codes loaded, entities count:', dataSource?._entityCollection?._entities?._array?.length || 0);
			propsStore.setPostalCodeData(dataSource);
		};

		const addFeaturePicker = () => {
			const cesiumContainer = document.getElementById('cesiumContainer');
			const featurepicker = new Featurepicker();
			console.log('[CesiumViewer] ✅ FeaturePicker click handler added');

			cesiumContainer.addEventListener('click', (event) => {
  				const controlPanelElement = document.querySelector('.control-panel-main');
				const timeSeriesElement = document.querySelector('#heatTimeseriesContainer');
  				const isClickOnControlPanel = controlPanelElement && controlPanelElement.contains(event.target);
				const isClickOnTimeSeries = timeSeriesElement && timeSeriesElement.contains(event.target);
    			const currentTime = Date.now();

				console.log('[CesiumViewer] 🖱️ Cesium click detected');
				console.log('[CesiumViewer] Click on control panel:', isClickOnControlPanel);
				console.log('[CesiumViewer] Click on time series:', isClickOnTimeSeries);
				console.log('[CesiumViewer] Time since last pick:', currentTime - lastPickTime);

    			if ( !isClickOnControlPanel && !isClickOnTimeSeries && ( currentTime - lastPickTime ) > 500) {
					console.log('[CesiumViewer] ✅ Processing click through FeaturePicker');
      				store.setShowBuildingInfo( false );
      				!store.showBuildingInfo && featurepicker.processClick( event );
      				lastPickTime = currentTime; // Update the last pick time
      				setTimeout( () => {
						store.setShowBuildingInfo( true );
      				}, 1000 );
    			} else {
					console.log('[CesiumViewer] ⚠️ Click ignored due to conditions');
				}
  			});
		};

		const retryInit = async () => {
			errorSnackbar.value = false;
			errorMessage.value = '';
			store.setIsLoading(true);
			await initViewer();
			if (!errorSnackbar.value) {
				socioEconomicsStore.loadPaavo();
				heatExposureStore.loadHeatExposure();
			}
			store.setIsLoading(false);
		};

		onMounted(async () => {
			await initViewer();
			socioEconomicsStore.loadPaavo();
			heatExposureStore.loadHeatExposure();
		});

		return {
			store,
			toggleStore,
			buildingStore,
			viewer,
			shouldShowBuildingInformation,
			errorSnackbar,
			errorMessage,
			retryInit
		};
	},
};
</script>
