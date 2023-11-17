<template>
  <div id="cesiumContainer"></div>
</template>

<script>
import * as Cesium from "cesium"
import "cesium/Source/Widgets/widgets.css";
import Datasource from "../services/datasource.js"; 
import Featurepicker from "../services/featurepicker.js"; 
import Geocoding from "../services/geocoding.js";

export default {
  mounted() {
    Cesium.Ion.defaultAccessToken = null;
    this.initViewer();
  },
  methods: {
    initViewer() {
      // Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
      const viewer = new Cesium.Viewer('cesiumContainer', {
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
      viewer.imageryLayers.add(
        this.createImageryLayer( 'avoindata:Karttasarja_PKS' )
      );

      // Fly to a specific location
      viewer.camera.flyTo({
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

      const datasourceHandler = new Datasource( viewer );
      datasourceHandler.loadGeoJsonDataSource(
        0.2,
        'src/assets/data/hki_po_clipped.json',
        'PostCodes'
      );

       // Add click event listener to the viewer container
      const cesiumContainer = document.getElementById( "cesiumContainer" );
      const featurepicker = new Featurepicker( viewer );
      cesiumContainer.addEventListener( "click", function( event ) { 
        featurepicker.processClick( viewer, event ); // Assuming processClick is defined later
      });

      const geocoding = new Geocoding( viewer );
      geocoding.addGeocodingEventListeners( viewer );

    },
    createImageryLayer( layerName ) {
      const provider = new Cesium.WebMapServiceImageryProvider({
        url : 'https://kartta.hel.fi/ws/geoserver/avoindata/ows?SERVICE=WMS&',
        layers : layerName,
        proxy: new Cesium.DefaultProxy( '/proxy/' )
      });
      
      return new Cesium.ImageryLayer( provider );
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