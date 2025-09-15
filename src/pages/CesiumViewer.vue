<template>
    <!-- Cesium Container -->
    <div id="cesiumContainer">
		<!-- Camera Controls -->
		<CameraControls />
		<!-- Control Panel -->
		<ControlPanel ref="controlPanel" />
		<!-- Toggle Button for Control Panel -->
		<v-btn
			icon
			class="panel-toggle-button"
			@click="toggleControlPanel"
			:style="{ position: 'fixed', top: '60px', left: '10px', zIndex: 1000 }"
		>
			<v-icon>mdi-menu</v-icon>
		</v-btn>
	    <!-- Loading Component -->
    	<Loading v-if="store.isLoading" />
		<Timeline v-if="store.level === 'postalCode' || store.level === 'building' "/>
    	<!-- Disclaimer Popup -->
    	<DisclaimerPopup class="disclaimer-popup" />
    	<BuildingInformation 
      		v-if="shouldShowBuildingInformation"  
    	/>
	</div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import * as Cesium from 'cesium';
import 'cesium/Source/Widgets/widgets.css';
import Datasource from '../services/datasource.js'; 
import WMS from '../services/wms.js'; 
import Featurepicker from '../services/featurepicker.js';
import Camera from '../services/camera.js'; 
import { useGlobalStore } from '../stores/globalStore.js';
import { useSocioEconomicsStore } from '../stores/socioEconomicsStore.js';
import { useHeatExposureStore } from '../stores/heatExposureStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import { useBuildingStore } from '../stores/buildingStore.js';

import DisclaimerPopup from '../components/DisclaimerPopup.vue';
import ControlPanel from './ControlPanel.vue';
import Loading from '../components/Loading.vue';
import BuildingInformation from '../components/BuildingInformation.vue';
import Timeline from '../components/Timeline.vue';
import CameraControls from '../components/CameraControls.vue';

export default {
	components: {
		DisclaimerPopup,
		CameraControls,
		ControlPanel,
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
    	const shouldShowBuildingInformation = computed(() => {
      		return store.showBuildingInfo && buildingStore.buildingFeatures && !store.isLoading;
    	});
		const viewer = ref(null);
		const controlPanel = ref(null);
		Cesium.Ion.defaultAccessToken = null;
		let lastPickTime = 0;

		const toggleControlPanel = () => {
			if (controlPanel.value) {
				controlPanel.value.togglePanel();
			}
		};

		const initViewer = () => {
			viewer.value = new Cesium.Viewer('cesiumContainer', {
				terrainProvider: new Cesium.EllipsoidTerrainProvider(),
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
			});

			store.setCesiumViewer(viewer.value);

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
			const dataSourceService = new Datasource();
			await dataSourceService.loadGeoJsonDataSource(
				0.2,
				'./assets/data/hsy_po.json',
				'PostCodes'
			);

			const dataSource = await dataSourceService.getDataSourceByName('PostCodes');
			propsStore.setPostalCodeData(dataSource);
		};

		const addFeaturePicker = () => {
			const cesiumContainer = document.getElementById('cesiumContainer');
			const featurepicker = new Featurepicker();
			cesiumContainer.addEventListener('click', (event) => {
  				const controlPanelElement = document.querySelector('.control-panel-main');
				const timeSeriesElement = document.querySelector('#heatTimeseriesContainer');
  				const isClickOnControlPanel = controlPanelElement.contains(event.target);
				const isClickOutsideTimeSeries = timeSeriesElement && timeSeriesElement.contains(event.target);
    			const currentTime = Date.now();

    			if ( !isClickOnControlPanel && !isClickOutsideTimeSeries && ( currentTime - lastPickTime ) > 500) {
      				store.setShowBuildingInfo( false );
      				!store.showBuildingInfo && featurepicker.processClick( event );
      				lastPickTime = currentTime; // Update the last pick time
      				setTimeout( () => {
						store.setShowBuildingInfo( true );
      				}, 1000 );					
    			}
  			});
		};

		onMounted(() => {
			initViewer();
			socioEconomicsStore.loadPaavo();
			heatExposureStore.loadHeatExposure();
		});

		return {
			store,
			toggleStore,
			buildingStore,
			viewer,
			shouldShowBuildingInformation,
			controlPanel,
			toggleControlPanel
		};
	},
};
</script>
