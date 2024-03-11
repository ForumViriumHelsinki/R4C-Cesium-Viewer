<template>
  <div id="cesiumContainer"></div>
  <HeatHistogram />
  <SocioEconomics />
  <Scatterplot />
  <HSYScatterplot />
  <BuildingComponent />
  <NearbyTreeArea />
  <DisclaimerPopup />
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
import HSYScatterplot from './HSYScatterplot.vue';
import BuildingComponent from './Building.vue';
import NearbyTreeArea from './NearbyTreeArea.vue';
import DisclaimerPopup from './DisclaimerPopup.vue';
import { useGlobalStore } from '../stores/globalStore.js';
import { useSocioEconomicsStore } from '../stores/socioEconomicsStore.js';
import { useHeatExposureStore } from '../stores/heatExposureStore.js';

export default {
	data() {
		return {
			viewer: null,
			datasourceService: null,
			treeService: null,
			buildingService: null
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
		ScatterPlot,
		HSYScatterPlot,
		BuildingComponent,
		NearbyTreeArea,
		DisclaimerPopup,
	},  
	methods: {
		initViewer() {
			// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
			this.store.cesiumViewer = new Cesium.Viewer( 'cesiumContainer', {
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
			this.store.cesiumViewer.imageryLayers.add(
				this.wmsService.createHelsinkiImageryLayer( 'avoindata:Karttasarja_PKS' )
			);

			this.store.cesiumViewer.camera.setView( {
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

			this.dataSourceService = new Datasource( );
			this.dataSourceService.loadGeoJsonDataSource(
				0.2,
				'./assets/data/hki_po_clipped.json',
				'PostCodes'
			);

			// Add click event listener to the viewer container
			const cesiumContainer = document.getElementById( 'cesiumContainer' );
			const featurepicker = new Featurepicker(  );
			cesiumContainer.addEventListener( 'click', function( event ) { 
				featurepicker.processClick( event ); // Assuming processClick is defined later
			} );

			const geocoding = new Geocoding( );
			geocoding.addGeocodingEventListeners();

			this.treeService = new Tree( );
			this.buildingService = new Building( );
			this.setupBearingSwitches();

			this.$nextTick( () => {
				this.eventEmitterService.emitPostalCodeViewEvent( );
			} );

		},

		setupBearingSwitches() {

			const switches = [ 'All', 'South', 'West', 'East', 'North' ];
  
			for ( const direction of switches ) {

				const switchContainer = document.getElementById( `bearing${ direction }SwitchContainer` );
				const toggle = switchContainer.querySelector( `#bearing${ direction }Toggle` );
      
				toggle.addEventListener( 'click', () => {

					for ( const otherDirection of switches ) {
    
						if ( direction !== otherDirection ) {

							const otherSwitchContainer = document.getElementById( `bearing${ otherDirection }SwitchContainer` );
							const otherToggle = otherSwitchContainer.querySelector( `#bearing${ otherDirection }Toggle` );
							otherToggle.checked = false;

						}
					}

					this.buildingService.resetBuildingEntites();
					this.treeService.resetTreeEntites();
					this.treeService.fetchAndAddTreeDistanceData( this.store.postalcode );

				} );
  
				// Set the 'All' switch to checked by default
				if ( direction === 'All' ) {
					toggle.checked = true;
				}
			}
		},
 
	},
};
</script>

<style>
#cesiumContainer {
	width: 100%;
	height: 100%;
}
</style>./Scatterplot.vue./HSYScatterplot.vue