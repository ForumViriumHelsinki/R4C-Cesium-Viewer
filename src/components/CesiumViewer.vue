<template>
  <v-container fluid class="d-flex flex-column pa-0 ma-0">
    <!-- Cesium Container -->
    <div id="cesiumContainer"></div>

    <!-- Layout on top of Cesium -->
    <v-container fluid class="d-flex flex-column pa-0 ma-0" style="position: relative; z-index: 10;">
      <!-- Row 7 -->
      <v-row no-gutters class="pa-0 ma-0">
        <v-col cols="6" class="d-flex flex-column pa-0 ma-0" style="z-index: 20;">
          <HeatHistogram />
          <BuildingComponent />
        </v-col>
        <v-col cols="6" class="d-flex align-end pa-0 ma-0" style="z-index: 20;">
          <SocioEconomics />
        </v-col>
      </v-row>

      <v-spacer></v-spacer>

      <!-- Row 6 -->
      <v-row no-gutters class="pa-0 ma-0">
        <v-col cols="6" class="d-flex align-start pa-0 ma-0" style="z-index: 20;">
        </v-col>
      </v-row>

      <v-spacer></v-spacer>

      <!-- Row 1 -->
      <v-row no-gutters class="pa-0 ma-0">
        <v-col cols="6" class="d-flex flex-column pa-0 ma-0" style="z-index: 20;">
          <Scatterplot />
          <BuildingScatterPlot />
          <NearbyTreeArea />
        </v-col>
      </v-row>
    </v-container>

    <!-- Disclaimer Popup -->
    <DisclaimerPopup class="disclaimer-popup" />
  </v-container>
</template>

<script>
import * as Cesium from 'cesium';
import 'cesium/Source/Widgets/widgets.css';
import Datasource from '../services/datasource.js'; 
import Tree from '../services/tree.js'; 
import WMS from '../services/wms.js'; 
import Building from '../services/building.js'; 
import Featurepicker from '../services/featurepicker.js'; 
import Geocoding from '../services/geocoding.js';
import EventEmitter from '../services/eventEmitter.js';
import HeatHistogram from './HeatHistogram.vue';
import SocioEconomics from './SocioEconomics.vue';
import Scatterplot from './Scatterplot.vue';
import BuildingComponent from './Building.vue';
import Landcover from './Landcover.vue';
import NearbyTreeArea from './NearbyTreeArea.vue';
import DisclaimerPopup from './DisclaimerPopup.vue';
import { useGlobalStore } from '../stores/globalStore.js';
import { useSocioEconomicsStore } from '../stores/socioEconomicsStore.js';
import { useHeatExposureStore } from '../stores/heatExposureStore.js';
import BuildingScatterPlot from './BuildingScatterPlot.vue';

export default {
	data() {
		return {
			viewer: null,
		};
	},
	mounted() {
		this.store = useGlobalStore();
		this.socioEconomicsStore = useSocioEconomicsStore();
		this.heatExposureStore = useHeatExposureStore();
		this.eventEmitterService = new EventEmitter();
		this.wmsService = new WMS ();
		Cesium.Ion.defaultAccessToken = null;
		this.initViewer();
		this.socioEconomicsStore.loadPaavo();
		this.heatExposureStore.loadHeatExposure();

	},
	components: {
		HeatHistogram,
		SocioEconomics,
		Scatterplot,
		BuildingScatterPlot,
		BuildingComponent,
		NearbyTreeArea,
		Landcover,
		DisclaimerPopup
	},  
	methods: {
		initViewer() {
			// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
			let viewer = new Cesium.Viewer( 'cesiumContainer', {
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
				homeButton: false

				// Add other options...
			} );

			// Other initialization logic...

			// For example, add a placeholder imagery layer
			viewer.imageryLayers.add(
				this.wmsService.createHelsinkiImageryLayer( 'avoindata:Karttasarja_PKS' )
			);

			viewer.camera.setView( {
				destination: Cesium.Cartesian3.fromDegrees(
					24.931745,
					60.190464,
					35000
				),
				orientation: {
					heading: Cesium.Math.toRadians( 0.0 ),
					pitch: Cesium.Math.toRadians( -85.0 ),
					roll : 0.0
				}
			} );

			this.store.setCesiumViewer( viewer );

			addPostalCodes( );
			addFeaturePicker( );

			const geocoding = new Geocoding( );
			geocoding.addGeocodingEventListeners( );

			this.addAttribution( );
			setupBearingSwitches( this.store.postalcode );

			this.$nextTick( () => {
				this.eventEmitterService.emitPostalCodeViewEvent( );
			} );

		},

		addAttribution() {
            
			const hriCredit = new Cesium.Credit( '<a href="https://hri.fi/data/fi/dataset" target="_blank"><img src="assets/images/hero_logo_50x25.png" title="assets/images/Helsinki Region Infoshare"/></a>' );
			const statsCredit = new Cesium.Credit( '<a href="https://www.stat.fi/org/avoindata/paikkatietoaineistot_en.html" target="_blank"><img src="assets/images/tilastokeskus_en_75x25.png" title="Statistics Finland"/></a>' );
			const hsyCredit = new Cesium.Credit( '<a href="https://www.hsy.fi/en/air-quality-and-climate/geographic-information/open-geographic-information-interfaces/" target="_blank"><img src="assets/images/hsy-logo_41x25px.png" title="Helsingin Seudun Ympäristöpalvelut"/></a>' );
			const sentinelHubCredit = new Cesium.Credit( '<a href="https://www.sentinel-hub.com/index.html" target="_blank"><img src="assets/images/sentinel_hub_small.png" title="Sentinel Hub"/></a>' );
			this.store.cesiumViewer.creditDisplay.addStaticCredit( hriCredit );
			this.store.cesiumViewer.creditDisplay.addStaticCredit( statsCredit );
			this.store.cesiumViewer.creditDisplay.addStaticCredit( hsyCredit );
			this.store.cesiumViewer.creditDisplay.addStaticCredit( sentinelHubCredit );

		},
 
	},
};

const addPostalCodes = ( ) => {
	const dataSourceService = new Datasource( );
	dataSourceService.loadGeoJsonDataSource(
		0.2,
		'./assets/data/hki_po_clipped.json',
		'PostCodes'
	);
};

const addFeaturePicker = ( ) => {
	// Add click event listener to the viewer container
	const cesiumContainer = document.getElementById( 'cesiumContainer' );
	const featurepicker = new Featurepicker(  );
	cesiumContainer.addEventListener( 'click', function( event ) { 
		featurepicker.processClick( event ); // Assuming processClick is defined later
	} );
};

const setupBearingSwitches = ( postalcode ) => {
	const switches = [ 'All', 'South', 'West', 'East', 'North' ];
  
	for ( const currentDirection of switches ) {

		const switchContainer = document.getElementById( `bearing${ currentDirection }SwitchContainer` );
		const toggle = switchContainer.querySelector( `#bearing${ currentDirection }Toggle` );
      
		toggle.addEventListener( 'click', () => {
					
			updateBearingSwitches( switches, currentDirection );
			const treeService = new Tree( );
			const buildingService = new Building( );
			buildingService.resetBuildingEntities();
			treeService.resetTreeEntities();
			treeService.fetchAndAddTreeDistanceData( postalcode );

		} );
  
		// Set the 'All' switch to checked by default
		if ( currentDirection === 'All' ) {
			toggle.checked = true;
		}
	}
};

const updateBearingSwitches = ( switches, currentDirection ) => {  // Use an arrow function with const
	for ( const otherDirection of switches ) {
    
		if ( currentDirection !== otherDirection ) {

			const otherSwitchContainer = document.getElementById( `bearing${ otherDirection }SwitchContainer` );
			const otherToggle = otherSwitchContainer.querySelector( `#bearing${ otherDirection }Toggle` );
			otherToggle.checked = false;

		}
	}
};

const updateBuildingsAndTrees = ( ) => { 

};

</script>

<style>
#cesiumContainer {
	width: 100%;
	height: 100%;
}
</style>