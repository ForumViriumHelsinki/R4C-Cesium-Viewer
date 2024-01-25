<template>
  <div v-if="showPostalCodeView" id="postalCodeViewContainer">
  <p class="header">R4C Urban Heat risk demonstrator</p>
  <p class="uiButton" @click="reset" style="color: red; float:right; cursor: pointer;">Reset</p>
  <!-- showPlotSwitch-->

<label class="switch">
  <input type="checkbox" id="gridViewToggle" value="gridView">
  <span class="slider round"></span>
</label>
<label for="gridViewToggle" class="label" id="gridViewLabel">Grid view</label>  

<label class="switch">
  <input type="checkbox" id="showPlotToggle" value="showPlot" checked>
  <span class="slider round"></span>
</label>
<label for="showPlotToggle" class="label">Display plot</label>

  <!-- showPrintSwitch-->
<label class="switch">
  <input type="checkbox" id="printToggle" value="print" checked>
  <span class="slider round"></span>
</label>
<label for="printToggle" class="label">Object details</label>

  <!-- showVegetationSwitch-->
<label class="switch" id="showVegetationSwitch">
	<input type="checkbox" id="showVegetationToggle" value="showVegetation" >
	<span class="slider round"></span>
</label>
<label for="showVegetationToggle" class="label" id="showVegetationLabel">Vegetation</label>

  <!-- showOtherNatureSwitch-->
<label class="switch" id="showOtherNatureSwitch">
  <input type="checkbox" id="showOtherNatureToggle" value="showOtherNature" >
  <span class="slider round"></span>
</label>
<label for="showOtherNatureToggle" class="label" id="showOtherNatureLabel">Other nature</label>

  <!-- hideNewBuildingsSwitch-->
<label class="switch" id = "hideNewBuildingsSwitch">
  <input type="checkbox" id="hideNewBuildingsToggle" value="filterBuildings" >
  <span class="slider round"></span>
</label>
<label for="hideNewBuildings" class="label" id="hideNewBuildingsLabel">Built before summer 2018</label>

  <!-- hideNonSoteSwitch-->
<label class="switch" id = "hideNonSoteSwitch">
	<input type="checkbox" id="hideNonSoteToggle" value="filterBuildings" >
	<span class="slider round"></span>
</label>
<label for="hideNonSote" class="label" id="hideNonSoteLabel">Only sote buildings</label>

  <!--  hideLowSwitch-->
<label class="switch" id = "hideLowSwitch" >
  <input type="checkbox" id="hideLowToggle" value="filterBuildings" >
  <span class="slider round"></span>
</label>
<label for="hideLow" class="label" id="hideLowLabel">Only tall buildings</label>

  <!--  showTrees-->
<label class="switch" id = "showTreesSwitch" >
  <input type="checkbox" id="showTreesToggle" value="showTrees" >
  <span class="slider round"></span>
</label>
<label for="showTrees" class="label" id="showTreesLabel">Trees</label>

  <!--  switchFlood-->
<label class="switch" id = "floodSwitch" style="display:none;">
  <input type="checkbox" id="floodToggle" value="switchFlood" >
  <span class="slider round"></span>
</label>
<label for="switchFlood" class="label" id="floodLabel" style="display:none;">Flood data</label>

  <!--  switchView-->
<label class="switch" id = "switchViewSwitch" style="display:none;">
  <input type="checkbox" id="switchViewToggle" value="switchView" >
  <span class="slider round"></span>
</label>
<label for="switchView" class="label" id="switchViewLabel" style="display:none;">2D view</label>

  <!--  showSensorData-->
<label class="switch" id = "showSensorDataSwitch" >
  <input type="checkbox" id="showSensorDataToggle" value="showSensorData" >
  <span class="slider round"></span>
</label>
<label for="showSensorData" class="label">Sensor data</label>

</div>
</template>

<script>

import Datasource from "../services/datasource.js"; 
import Tree from "../services/tree.js"; 
import Building from "../services/building.js"; 
import EventEmitter from "../services/eventEmitter.js"
import Flood from "../services/flood.js"
import Sensor from "../services/sensor.js"
import Vegetation from "../services/vegetation.js"
import Othernature from "../services/othernature.js"
import Plot from "../services/plot.js"
import View from "../services/view.js"
import { useGlobalStore } from '../store.js';
import { eventBus } from '../services/eventEmitter.js';

export default {
  data() {
    return {
      viewer: null,
      dataSourceService: null,
      treeService: null,
      showPostalCodeView: true
    };
  },
    mounted() {
      this.unsubscribe = eventBus.$on('initPostalCodeView', this.initPostalCodeView);
      this.store = useGlobalStore( );
      this.eventEmitterService = new EventEmitter( );
    },
    beforeUnmount() {
      this.unsubscribe();
    },    
    methods: {
      reset(){
            location.reload();
        },
      initPostalCodeView( viewer ) {
        this.viewer = viewer;
        this.dataSourceService = new Datasource( this.viewer );
        this.treeService = new Tree( this.viewer );
        this.buildingService = new Building ( this.viewer );
        this.plotService = new Plot( );
        this.addEventListeners();

      },
/**
 * Add EventListeners 
 */
addEventListeners() {
    document.getElementById( 'hideNewBuildingsToggle' ).addEventListener('change', this.filterBuildingsEvent);
    document.getElementById( 'hideNonSoteToggle' ).addEventListener('change', this.filterBuildingsEvent);
    document.getElementById( 'hideLowToggle' ).addEventListener('change', this.filterBuildingsEvent);
    document.getElementById( 'showVegetationToggle' ).addEventListener('change', this.loadVegetationEvent);
    document.getElementById( 'showOtherNatureToggle' ).addEventListener('change', this.loadOtherNatureEvent);
    document.getElementById( 'showSensorDataToggle' ).addEventListener('change', this.loadSensorDataEvent);
    document.getElementById( 'switchViewToggle' ).addEventListener('change', this.switchViewEvent);
    document.getElementById( 'showTreesToggle' ).addEventListener('change', this.loadTreesEvent);
    document.getElementById( 'printToggle' ).addEventListener('change', this.printEvent);
    document.getElementById( 'showPlotToggle' ).addEventListener('change', this.showPlotEvent);
    document.getElementById( 'floodToggle').addEventListener('change', this.loadFloodEvent);
    document.getElementById( 'gridViewToggle').addEventListener('change', this.gridViewEvent);

},

/**
 * This function handles the toggle event for switching to grid view
 */
gridViewEvent( ) {

    const gridView = document.getElementById( "gridViewToggle" ).checked;

    if ( gridView ) {

      this.showPostalCodeView = false;
      this.eventEmitterService.emitGridViewEvent( this.viewer );


    } 

},

/**
 * This function handles the toggle event for showing or hiding the flood layer on the map.
 *
 */
loadFloodEvent( ) {

    // Get the current state of the toggle button for showing flood.
    const showFlood = document.getElementById( "floodToggle" ).checked;

    if ( showFlood ) {

        // If the toggle button is checked, enable the toggle button for showing the flood heat map.
        //document.getElementById("showloadOtherNature").disabled = false;

        // If there is a postal code available, load the flood for that area.
        if ( this.store.postalcode && !this.dataSourceService.getDataSourceByName( "Flood" ) ) {

          const floodService = new Flood( this.viewer );
          floodService.loadFlood( this.store.postalcode );

        } else {
            
            this.dataSourceService.changeDataSourceShowByName( "Flood", true );
        }


    } else {

        this.dataSourceService.changeDataSourceShowByName( "Flood", false );

    }

},

/**
 * This function is called when the "Display Plot" toggle button is clicked
 *
 */
showPlotEvent( ) {

    // Get the value of the "Show Plot" toggle button
    const showPlots = document.getElementById( "showPlotToggle" ).checked;
    
    // Hide the plot and its controls if the toggle button is unchecked
    if ( !showPlots ) {

      this.plotService.hideAllPlots( );

    } else { // Otherwise, show the plot and its controls if the toggle button is checked and the plot is already loaded

      this.plotService.showAllPlots( );

    }

},

/**
 * This function is called when the Object details button is clicked
 *
 */
printEvent( ) {

    const print = document.getElementById( "printToggle" ).checked;

    // If print is not selected, hide the print container, search container, georeference container, and search button
    if ( !print ) {

        document.getElementById( 'printContainer' ).style.visibility = 'hidden';
        document.getElementById( 'searchcontainer' ).style.visibility = 'hidden';
        document.getElementById( 'georefContainer' ).style.visibility = 'hidden';
        document.getElementById( 'searchbutton' ).style.visibility = 'hidden';

    } else { // Otherwise, make the print container visible
    
    document.getElementById( 'printContainer' ).style.visibility = 'visible';
    document.getElementById( 'searchcontainer' ).style.visibility = 'visible';
    document.getElementById( 'georefContainer' ).style.visibility = 'visible';
    document.getElementById( 'searchbutton' ).style.visibility = 'visible';

    }

},


/**
 * This function to show or hide sensordata entities on the map based on the toggle button state
 *
 */
loadSensorDataEvent( ) {

    // Get the state of the showSensorData toggle button
    const showSensorData = document.getElementById( "showSensorDataToggle" ).checked;

    // If showSensorData toggle is on
    if ( showSensorData ) {
        
        const sensorService = new Sensor( this.viewer ); 
        sensorService.loadSensorData( );
        
    } else { 
        
        this.dataSourceService.changeDataSourceShowByName( "SensorData", false );

    }

},

/**
 * This function to show or hide tree entities on the map based on the toggle button state
 *
 */
loadTreesEvent( ) {

    // Get the state of the showTrees toggle button
    const showTrees = document.getElementById( "showTreesToggle" ).checked;

    // If showTrees toggle is on
    if ( showTrees ) {

        // If a postal code is available, load trees for that postal code
        if ( this.store.postalcode  && !this.dataSourceService.getDataSourceByName( "Trees" )  ) {

            this.treeService.loadTrees( this.store.postalcode );

        } else {

            this.dataSourceService.changeDataSourceShowByName( "Trees", true );
            this.plotService.updateTreeElements( 'visible' );

        }

    } else { // If showTrees toggle is off

        this.dataSourceService.changeDataSourceShowByName( "Trees", false );
        this.plotService.updateTreeElements( 'hidden' );
        this.plotService.showAllPlots( );
        this.buildingService.resetBuildingEntites( );

    }

},

/**
 * This function handles the toggle event for showing or hiding the nature areas layer on the map.
 *
 */
loadOtherNatureEvent( ) {

    // Get the current state of the toggle button for showing nature areas.
    const showloadOtherNature = document.getElementById( "showOtherNatureToggle" ).checked;

    if ( showloadOtherNature ) {

        // If the toggle button is checked, enable the toggle button for showing the nature area heat map.
        //document.getElementById("showloadOtherNature").disabled = false;

        // If there is a postal code available, load the nature areas for that area.
        if ( this.store.postalcode && !this.dataSourceService.getDataSourceByName( "OtherNature" ) ) {

          const otherNatureService = new Othernature( this.viewer );        
          otherNatureService.loadOtherNature( this.store.postalcode );

        } else {
            
            this.dataSourceService.changeDataSourceShowByName( "OtherNature", true );
        }


    } else {

        this.dataSourceService.changeDataSourceShowByName( "OtherNature", false );

    }

},

/**
 * This function handles the toggle event for showing or hiding the vegetation layer on the map.
 *
 */
loadVegetationEvent( ) {

    // Get the current state of the toggle button for showing nature areas.
    const showVegetation = document.getElementById( "showVegetationToggle" ).checked;

    if ( showVegetation ) {

        // If the toggle button is checked, enable the toggle button for showing the nature area heat map.
        //document.getElementById("showVegetationHeatToggle").disabled = false;

        // If there is a postal code available, load the nature areas for that area.
        if ( this.store.postalcode && !this.dataSourceService.getDataSourceByName("Vegetation") ) {

          const vegetationService = new Vegetation( this.viewer );         
          vegetationService.loadVegetation( this.store.postalcode );

        } else {
            
            this.dataSourceService.changeDataSourceShowByName( "Vegetation", true );

        }

    } else {

        this.dataSourceService.changeDataSourceShowByName( "Vegetation", false );

    }

},

filterBuildingsEvent() {

    const hideNonSote = document.getElementById( "hideNonSoteToggle" ).checked;
    const hideNewBuildings = document.getElementById( "hideNewBuildingsToggle" ).checked;
    const hideLow = document.getElementById( "hideLowToggle" ).checked;

  if ( this.dataSourceService ) {

    const buildingsDataSource = this.dataSourceService.getDataSourceByName("Buildings");

    if ( buildingsDataSource ) {

      if ( hideNonSote || hideNewBuildings || hideLow ) {

        this.buildingService.filterBuildings( buildingsDataSource );

      } else {

        this.buildingService.showAllBuildings( buildingsDataSource );

    }
    }
    }

},

/**
 * This function is called when the user clicks on the "switch view" toggle button.
 *
 */
switchViewEvent( ) {

    // Get the status of the "switch view" toggle button.
    const switchView = document.getElementById( "switchViewToggle" ).checked;
    const viewService = new View( this.viewer );        
    // If the "switch view" toggle button is checked.
    if ( switchView ) {

      viewService.switchTo2DView( );

    // If the "switch view"" toggle button is not checked.
    } else {

      viewService.switchTo3DView( );

    }

}
  },
};
</script>

<style>
.uiButton {
	background-color: white;
	border: 0px solid black; 

	font-family: sans-serif;
	font-size: small;
	text-align: middle;
	padding: 5px;
	margin: 5px;
	
	float: left;
	
	text-decoration: underline;
}

.uiButton:hover {
	color: rgb(150,150,150);
}

.label {
	background-color: white;
	border: 0px solid black; 

	font-family: sans-serif;
	text-align: middle;
	
	text-decoration: none;
	font-size: small;
}

#postalCodeViewContainer{
	top: 10px; 
	left: 0px; 

	position: fixed; 
	border: 1px solid black; 
	box-shadow: 3px 5px 5px black; 
	visibility: visible;
	
	background: white;
	padding: 5px;
	
	min-height: 25px;
	
	width: 100%;
}

/* The switch - the box around the slider */
.switch {
  position: relative;
  display: inline-block;
  width: 47px;
  height: 20px;
}

/* Hide default HTML checkbox */
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

/* The slider */
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: .4s;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196F3;
}

input:checked + .slider:before {
  -webkit-transform: translateX(26px);
  -ms-transform: translateX(26px);
  transform: translateX(26px);
}

/* Rounded sliders */
.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}
</style>