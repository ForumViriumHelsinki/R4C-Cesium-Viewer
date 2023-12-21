<template>
  <div id="cesiumContainer"></div>
</template>

<script>
import * as Cesium from "cesium"
import "cesium/Source/Widgets/widgets.css";
import Datasource from "../services/datasource.js"; 
import Tree from "../services/tree.js"; 
import Building from "../services/building.js"; 
import Featurepicker from "../services/featurepicker.js"; 
import Geocoding from "../services/geocoding.js";
import EventEmitter from "../services/eventEmitter.js"
import GridView from "../services/gridview.js"
import { useGlobalStore } from '../store.js';

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
    this.store = useGlobalStore( );
    this.eventEmitterService = new EventEmitter( );
    Cesium.Ion.defaultAccessToken = null;
    this.initViewer();

  },
  methods: {
    initViewer() {
      // Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
      this.viewer = new Cesium.Viewer('cesiumContainer', {
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
      });

      // Other initialization logic...

      // For example, add a placeholder imagery layer
      this.viewer.imageryLayers.add(
        this.createImageryLayer( 'avoindata:Karttasarja_PKS' )
      );

      // Fly to a specific location
      this.viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          24.931745,
          60.190464,
          35000
        ),
        orientation: {
          heading: Cesium.Math.toRadians( 0.0 ),
          pitch: Cesium.Math.toRadians( -85.0 ),
        },
      });

      this.dataSourceService = new Datasource(this.viewer);

      this.dataSourceService.loadGeoJsonDataSource(
        0.2,
        './assets/data/hki_po_clipped.json',
        'PostCodes'
      );

       // Add click event listener to the viewer container
      const cesiumContainer = document.getElementById( "cesiumContainer" );
      const featurepicker = new Featurepicker( this.viewer );
      cesiumContainer.addEventListener( "click", function( event ) { 
        featurepicker.processClick( event ); // Assuming processClick is defined later
      });

      const geocoding = new Geocoding( this.viewer );
      geocoding.addGeocodingEventListeners( );

      const gridview = new GridView( );
      gridview.setGridElementsDisplay( 'none' );

    this.treeService = new Tree( this.viewer );
    this.buildingService = new Building( this.viewer  );
    this.setupBearingSwitches( this.viewer );

    this.$nextTick(() => {
      this.eventEmitterService.emitPostalCodeViewEvent(this.viewer);
    });

    },
    createImageryLayer( layerName ) {
      const provider = new Cesium.WebMapServiceImageryProvider({
        url : 'https://kartta.hel.fi/ws/geoserver/avoindata/ows?SERVICE=WMS&',
        layers : layerName,
        proxy: new Cesium.DefaultProxy( '/proxy/' )
      });
      
      return new Cesium.ImageryLayer( provider );
    },

    setupBearingSwitches( ) {

    const switches = [ 'All', 'South', 'West', 'East', 'North' ];
  
    for ( const direction of switches ) {

      const switchContainer = document.getElementById( `bearing${ direction }SwitchContainer` );
      const toggle = switchContainer.querySelector( `#bearing${ direction }Toggle` );
      
      toggle.addEventListener( 'click', () => {

        for ( const otherDirection of switches) {
    
          if ( direction !== otherDirection ) {

            const otherSwitchContainer = document.getElementById( `bearing${ otherDirection }SwitchContainer` );
            const otherToggle = otherSwitchContainer.querySelector( `#bearing${ otherDirection }Toggle` );
            otherToggle.checked = false;

          }
        }

        this.buildingService.resetBuildingEntites( );
        this.treeService.resetTreeEntites( );
        this.treeService.fetchAndAddTreeDistanceData( this.store.postalcode );

      });
  
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
</style>