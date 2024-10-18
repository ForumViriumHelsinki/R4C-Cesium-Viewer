<template>
    <!-- Cesium Container -->
    <div id="cesiumContainer">

		    <!-- Control Panel with event listener -->
		<ControlPanel v-if="store.view !== 'grid'" />
	    <!-- Loading Component -->
    	<Loading v-if="store.isLoading" />

    	<!-- Disclaimer Popup -->
    	<DisclaimerPopup class="disclaimer-popup" />
  		<BuildingInformation v-if="buildingStore.buildingFeatures && !store.isLoading" />
		
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

export default {
	components: {
		DisclaimerPopup,
		ControlPanel,
		BuildingInformation,
		Loading,
		Floods,
	},
	setup() {
		const store = useGlobalStore();
		const propsStore = usePropsStore();
		const toggleStore = useToggleStore();  // Access the toggle store
		const socioEconomicsStore = useSocioEconomicsStore();
		const heatExposureStore = useHeatExposureStore();
		const buildingStore = useBuildingStore();

		// Computed value to track flood layer toggle from toggleStore
		const floodsEnabled = computed( () => toggleStore.floods )
		const viewer = ref(null);
		const view = computed( () => store.view );

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
				featurepicker.processClick(event);
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
			view,
			floodsEnabled,  // Expose this variable to toggle the Floods component visibility
		};
	},
};
</script>

<style scoped>

#cesiumContainer {
	position: relative;
}

</style>
