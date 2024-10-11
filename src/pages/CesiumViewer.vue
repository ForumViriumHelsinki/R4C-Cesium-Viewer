<template>
  <v-container fluid class="d-flex flex-column pa-0 ma-0">
    <!-- Cesium Container -->
    <div id="cesiumContainer"></div>

    <!-- Control Panel with event listener -->
    <ControlPanel v-if="store.view !== 'grid'" />

    <!-- Loading Component -->
    <Loading v-if="store.isLoading" />
  	<BuildingInformation v-if="buildingStore.buildingFeatures && !store.isLoading" />

    <!-- Disclaimer Popup -->
    <DisclaimerPopup class="disclaimer-popup" />
  </v-container>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import * as Cesium from 'cesium';
import 'cesium/Source/Widgets/widgets.css';
import Datasource from '../services/datasource.js'; 
import WMS from '../services/wms.js'; 
import Featurepicker from '../services/featurepicker.js'; 
import { useGlobalStore } from '../stores/globalStore.js';
import { useSocioEconomicsStore } from '../stores/socioEconomicsStore.js';
import { useHeatExposureStore } from '../stores/heatExposureStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import { useBuildingStore } from '../stores/buildingStore.js';

import DisclaimerPopup from '../components/DisclaimerPopup.vue';
import ControlPanel from './ControlPanel.vue';
import Loading from '../components/Loading.vue';
import BuildingInformation from '../components/BuildingInformation.vue';

export default {
	components: {
		DisclaimerPopup,
		ControlPanel,
		BuildingInformation,
		Loading
	},
	setup() {
		const store = useGlobalStore();
		const propsStore = usePropsStore();
		const socioEconomicsStore = useSocioEconomicsStore();
		const heatExposureStore = useHeatExposureStore();
		const buildingStore = useBuildingStore();

		const viewer = ref( null );
		const view = computed( () => store.view );

		const initViewer = () => {
			viewer.value = new Cesium.Viewer( 'cesiumContainer', {
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
			} );

			viewer.value.imageryLayers.add(
				new WMS().createHelsinkiImageryLayer( 'avoindata:Karttasarja_PKS' )
			);

			viewer.value.camera.setView( {
				destination: Cesium.Cartesian3.fromDegrees( 24.931745, 60.190464, 35000 ),
				orientation: {
					heading: Cesium.Math.toRadians( 0.0 ),
					pitch: Cesium.Math.toRadians( -85.0 ),
					roll: 0.0,
				},
			} );

			store.setCesiumViewer( viewer.value );
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

			const dataSource = await dataSourceService.getDataSourceByName( 'PostCodes' );
			propsStore.setPostalCodeData( dataSource );

		};

		const addFeaturePicker = () => {
			const cesiumContainer = document.getElementById( 'cesiumContainer' );
			const featurepicker = new Featurepicker();
			cesiumContainer.addEventListener( 'click', ( event ) => {
				featurepicker.processClick( event );
			} );
		};

		onMounted( () => {
			initViewer();
			socioEconomicsStore.loadPaavo();
			heatExposureStore.loadHeatExposure();
		} );

		return {
			store,
			buildingStore,
			viewer,
			view,
		};
	},
};
</script>

<style scoped>
#cesiumContainer {
  width: 100%;
  height: 100%;
}
</style>
