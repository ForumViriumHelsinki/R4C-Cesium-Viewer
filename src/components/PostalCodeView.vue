<template>
  <div
v-if="showPostalCodeView"
id="postalCodeViewContainer"
>
  <p class="header">
R4C Urban Heat risk demonstrator
</p>
  <v-btn
v-if="showReturn"
icon
class="uiButton"
style="color: red; float:right; cursor: pointer;"
@click="returnToPostalCode"
> 
    <v-icon>mdi-arrow-left</v-icon>
  </v-btn>

  <v-btn
icon
class="uiButton"
style="color: red; float:right; cursor: pointer;"
@click="reset"
>
    <v-icon>mdi-refresh</v-icon>
  </v-btn>
  <!-- showPlotSwitch-->

<label class="switch">
  <input
id="showPlotToggle"
type="checkbox"
value="showPlot"
checked
>
  <span class="slider round"/>
</label>
<label
for="showPlotToggle"
class="label"
>Display plot</label>

<label
id="gridViewSwitch"
class="switch"
>
  <input
id="gridViewToggle"
type="checkbox"
value="gridView"
>
  <span class="slider round"/>
</label>
<label
id="gridViewLabel"
for="gridViewToggle"
class="label"
>Grid view</label>  

<label
id="capitalRegionSwitch"
class="switch"
>
  <input
id="capitalRegionViewToggle"
type="checkbox"
value="capitalRegionView"
>
  <span class="slider round"/>
</label>
<label
id="capitalRegionViewLabel"
for="capitalRegionViewToggle"
class="label"
>Helsinki view</label>  

  <!-- showVegetationSwitch-->
<label
id="showVegetationSwitch"
class="switch"
style="display:none;"
>
	<input
id="showVegetationToggle"
type="checkbox"
value="showVegetation"
>
	<span class="slider round"/>
</label>
<label
id="showVegetationLabel"
for="showVegetationToggle"
class="label"
style="display:none;"
>Vegetation</label>

  <!-- showOtherNatureSwitch-->
<label
id="showOtherNatureSwitch"
class="switch"
style="display:none;"
>
  <input
id="showOtherNatureToggle"
type="checkbox"
value="showOtherNature"
>
  <span class="slider round"/>
</label>
<label
id="showOtherNatureLabel"
for="showOtherNatureToggle"
class="label"
style="display:none;"
>Other nature</label>

  <!-- hideNewBuildingsSwitch-->
<label
id="hideNewBuildingsSwitch"
class="switch"
style="display:none;"
>
  <input
id="hideNewBuildingsToggle"
type="checkbox"
value="filterBuildings"
>
  <span class="slider round"/>
</label>
<label
id="hideNewBuildingsLabel"
for="hideNewBuildings"
class="label"
style="display:none;"
>Built before summer 2018</label>

  <!-- hideNonSoteSwitch-->
<label
id="hideNonSoteSwitch"
class="switch"
style="display:none;"
>
	<input
id="hideNonSoteToggle"
type="checkbox"
value="filterBuildings"
>
	<span class="slider round"/>
</label>
<label
id="hideNonSoteLabel"
for="hideNonSote"
class="label"
style="display:none;"
>Only sote buildings</label>

  <!--  hideLowSwitch-->
<label
id="hideLowSwitch"
class="switch"
style="display:none;"
>
  <input
id="hideLowToggle"
type="checkbox"
value="filterBuildings"
>
  <span class="slider round"/>
</label>
<label
id="hideLowLabel"
for="hideLow"
class="label"
style="display:none;"
>Only tall buildings</label>

  <!--  showTrees-->
<label
id="showTreesSwitch"
class="switch"
style="display:none;"
>
  <input
id="showTreesToggle"
type="checkbox"
value="showTrees"
>
  <span class="slider round"/>
</label>
<label
id="showTreesLabel"
for="showTrees"
class="label"
style="display:none;"
>Trees</label>

<!--  showLandCover-->
<label
id="landCoverSwitch"
class="switch"
>
  <input
id="landCoverToggle"
type="checkbox"
value="getLandCover"
>
  <span class="slider round"/>
</label>
<label
id="landCoverLabel"
for="getLandCover"
class="label"
>HSY land cover</label>

  <!--  switchView-->
<label
id="switchViewSwitch"
class="switch"
style="display:none;"
>
  <input
id="switchViewToggle"
type="checkbox"
value="switchView"
>
  <span class="slider round"/>
</label>
<label
id="switchViewLabel"
for="switchView"
class="label"
style="display:none;"
>2D view</label>

  <!-- hideColdAreasSwitch-->
<label
id="hideColdAreasSwitch"
class="switch"
style="display:none;"
>
	<input
id="hideColdAreasToggle"
type="checkbox"
value="hideColdAreas"
>
	<span class="slider round"/>
</label>
<label
id="hideColdAreasLabel"
for="hideColdAreas"
class="label"
style="display:none;"
>Hide cold areas</label>

  <!-- CapitalRegionColdSwitch-->
<label
id="capitalRegionColdSwitch"
class="switch"
>
	<input
id="capitalRegionColdToggle"
type="checkbox"
value="capitalRegionCold"
>
	<span class="slider round"/>
</label>
<label
id="capitalRegionColdLabel"
for="capitalRegionCold"
class="label"
>Capital Region Cold</label>

  <!--  sensor map Link-->
  <a
id="sensorMapLink"
href="https://bri3.fvh.io/opendata/r4c/r4c_all.html"
class="label"
target="_blank"
rel="noopener noreferrer"
> Sensor map </a>

  <!--  sensor dashboard-->
  <a
id="sensorDashboardLink"
href="https://iot.fvh.fi/grafana/d/aduw70oqqdon4c/r4c-laajasalo-and-koivukyla?orgId=6&refresh=30m"
class="label"
target="_blank"
rel="noopener noreferrer"
> Sensor Dashboard </a>

  <!--  flood Link-->
  <a
id="floodLink"
href="https://geo.fvh.fi/r4c/6fkgOUqn3/"
class="label"
target="_blank"
rel="noopener noreferrer"
style="display:none;"
> Experimental flood simulations </a>


</div>
</template>

<script>

import Datasource from '../services/datasource.js';
import { createHSYImageryLayer, removeLandcover } from '../services/landcover';
import Tree from '../services/tree.js'; 
import Building from '../services/building.js'; 
import Vegetation from '../services/vegetation.js';
import Othernature from '../services/othernature.js';
import Plot from '../services/plot.js';
import Camera from '../services/camera.js';
import { useGlobalStore } from '../stores/globalStore.js';
import { eventBus } from '../services/eventEmitter.js';
import ElementsDisplay from '../services/elementsDisplay.js';
import { useToggleStore } from '../stores/toggleStore.js';
import Featurepicker from '../services/featurepicker.js'; 

export default {
	data() {
		return {
			viewer: null,
			dataSourceService: null,
			treeService: null,
			showPostalCodeView: true,
			showReturn: false,
		};
	}, 
	computed: {
		shouldShowReturn() {
			const store = useGlobalStore(); // Get access to the global store
			return store.level === 'building';
		}
	},
	watch: {
		shouldShowReturn( newValue ) { // Watch for changes in computed property
			this.showReturn = newValue; // Update data property if needed
		}
	},
	mounted() {
		this.unsubscribe = eventBus.on( 'initPostalCodeView', this.initPostalCodeView );
		this.store = useGlobalStore();
		this.toggleStore  = useToggleStore();
		this.viewer = this.store.cesiumViewer;
		this.elementsDisplayService = new ElementsDisplay();
	},
	beforeUnmount() {
		this.unsubscribe();
	},
	methods: {
		reset(){
			location.reload();
		},
		returnToPostalCode( ) {
			const featurepicker = new Featurepicker();
			featurepicker.loadPostalCode();
			this.toggleStore.showTrees && this.treeService.loadTrees();
			eventBus.emit( 'hideBuilding' );
		},
		initPostalCodeView( ) {
			this.dataSourceService = new Datasource();
			this.treeService = new Tree();
			this.buildingService = new Building();
			this.plotService = new Plot();
			this.addEventListeners();
		},
		/**
 * Add EventListeners 
 */
		addEventListeners() {
			document.getElementById( 'hideNewBuildingsToggle' ).addEventListener( 'change', this.filterBuildingsEvent );
			document.getElementById( 'hideNonSoteToggle' ).addEventListener( 'change', this.filterBuildingsEvent );
			document.getElementById( 'hideLowToggle' ).addEventListener( 'change', this.filterBuildingsEvent );
			document.getElementById( 'showVegetationToggle' ).addEventListener( 'change', this.loadVegetationEvent );
			document.getElementById( 'showOtherNatureToggle' ).addEventListener( 'change', this.loadOtherNatureEvent );
			document.getElementById( 'switchViewToggle' ).addEventListener( 'change', this.switchViewEvent );
			document.getElementById( 'showTreesToggle' ).addEventListener( 'change', this.loadTreesEvent );
			document.getElementById( 'showPlotToggle' ).addEventListener( 'change', this.showPlotEvent );
			document.getElementById( 'capitalRegionViewToggle' ).addEventListener( 'change', this.capitalRegionViewEvent );
			document.getElementById( 'gridViewToggle' ).addEventListener( 'change', this.gridViewEvent );
			document.getElementById( 'landCoverToggle' ).addEventListener( 'change', this.getLandCoverEvent );
			document.getElementById( 'capitalRegionColdToggle' ).addEventListener( 'change', this.toggleCold );

		},

		toggleCold() {

			// Get the value of the "Show Plot" toggle button
			const checked = document.getElementById( 'capitalRegionColdToggle' ).checked;
    		this.toggleStore.setCapitalRegionCold( checked );

			!checked && this.reset();

		},

		/**
 * This function handles the toggle event for switching to capital region view
 */
		async capitalRegionViewEvent() {

			const metropolitanView = document.getElementById( 'capitalRegionViewToggle' ).checked;
			this.toggleStore.setHelsinkiView( metropolitanView );

			if ( metropolitanView ) {

				this.store.setView( 'helsinki' );
				this.dataSourceService.removeDataSourcesByNamePrefix( 'PostCodes' );
				await this.dataSourceService.loadGeoJsonDataSource(
					0.2,
					'./assets/data/hki_po_clipped.json',
					'PostCodes'
				);

			} else {

				this.store.setView( 'capitalRegion' );
				this.reset();
  
			}

		},

		/**
 * This function handles the toggle event for switching to capital region view
 */
		getLandCoverEvent() {

			const landcover = document.getElementById( 'landCoverToggle' ).checked;
			this.toggleStore.setLandCover( landcover );

			landcover 
    			? ( this.viewer.imageryLayers.remove( 'avoindata:Karttasarja_PKS', true ), createHSYImageryLayer( ) ) 
    			: removeLandcover( );

		},

		/**
 * This function handles the toggle event for switching to grid view
 */
		gridViewEvent() {

			const gridView = document.getElementById( 'gridViewToggle' ).checked;
			this.toggleStore.setGridView( gridView );

			gridView 
    			? ( this.store.setView( 'grid' ), this.showPostalCodeView = false, eventBus.emit( 'createPopulationGrid' ) )
    			: ( this.store.setView( 'capitalRegion' ), this.reset() );

		},


		/**
 * This function is called when the "Display Plot" toggle button is clicked
 *
 */
		showPlotEvent() {

			const showPlots = document.getElementById( 'showPlotToggle' ).checked;
			this.toggleStore.setShowPlot( showPlots );

			showPlots ? this.plotService.showAllPlots() : this.plotService.hideAllPlots();

		},

		/**
 * This function to show or hide tree entities on the map based on the toggle button state
 *
 */
		loadTreesEvent() {

			// Get the state of the showTrees toggle button
			const showTrees = document.getElementById( 'showTreesToggle' ).checked;
			this.toggleStore.setShowTrees( showTrees );

			showTrees 
    			? ( this.store.postalcode && !this.dataSourceService.getDataSourceByName( 'Trees' ) 
        		? this.treeService.loadTrees( this.store.postalcode )
        		: ( this.dataSourceService.changeDataSourceShowByName( 'Trees', true ) ) )
    			: ( this.dataSourceService.changeDataSourceShowByName( 'Trees', false ), this.plotService.showAllPlots(), this.buildingService.resetBuildingEntities() );

		},

		/**
 * This function handles the toggle event for showing or hiding the nature areas layer on the map.
 *
 */
		loadOtherNatureEvent() {

			// Get the current state of the toggle button for showing nature areas.
			const showloadOtherNature = document.getElementById( 'showOtherNatureToggle' ).checked;
			this.toggleStore.setShowOtherNature( showloadOtherNature );

			if ( showloadOtherNature ) {

				// If the toggle button is checked, enable the toggle button for showing the nature area heat map.
				//document.getElementById("showloadOtherNature").disabled = false;

				// If there is a postal code available, load the nature areas for that area.
				if ( this.store.postalcode && !this.dataSourceService.getDataSourceByName( 'OtherNature' ) ) {

					const otherNatureService = new Othernature();        
					otherNatureService.loadOtherNature( this.store.postalcode );

				} else {
            
					this.dataSourceService.changeDataSourceShowByName( 'OtherNature', true );
				}


			} else {

				this.dataSourceService.changeDataSourceShowByName( 'OtherNature', false );

			}

		},

		/**
 * This function handles the toggle event for showing or hiding the vegetation layer on the map.
 *
 */
		loadVegetationEvent() {

			// Get the current state of the toggle button for showing nature areas.
			const showVegetation = document.getElementById( 'showVegetationToggle' ).checked;
			this.toggleStore.setShowVegetation( showVegetation );

			if ( showVegetation ) {

				// If the toggle button is checked, enable the toggle button for showing the nature area heat map.
				//document.getElementById("showVegetationHeatToggle").disabled = false;

				// If there is a postal code available, load the nature areas for that area.
				if ( this.store.postalcode && !this.dataSourceService.getDataSourceByName( 'Vegetation' ) ) {

					const vegetationService = new Vegetation( );         
					vegetationService.loadVegetation( this.store.postalcode );

				} else {
            
					this.dataSourceService.changeDataSourceShowByName( 'Vegetation', true );

				}

			} else {

				this.dataSourceService.changeDataSourceShowByName( 'Vegetation', false );

			}

		},

		filterBuildingsEvent() {

			const hideNonSote = document.getElementById( 'hideNonSoteToggle' ).checked;
			const hideNewBuildings = document.getElementById( 'hideNewBuildingsToggle' ).checked;
			const hideLow = document.getElementById( 'hideLowToggle' ).checked;
			this.toggleStore.setHideNonSote( hideNonSote );
			this.toggleStore.setHideNewBuildings( hideNewBuildings );
			this.toggleStore.setHideLow( hideLow );
			
			if ( this.dataSourceService ) {
    		
				const buildingsDataSource = this.dataSourceService.getDataSourceByName( `Buildings ${this.store.postalcode}` );

    			if ( buildingsDataSource ) {
        			( hideNonSote || hideNewBuildings || hideLow ) 
            			? this.buildingService.filterBuildings( buildingsDataSource ) 
            			: this.buildingService.showAllBuildings( buildingsDataSource );

        			!this.toggleStore.helsinkiView && eventBus.emit( 'updateScatterPlot' );
				
				}
			}
		},

		/**
 * This function is called when the user clicks on the "switch view" toggle button.
 *
 */
		switchViewEvent() {

			// Get the status of the "switch view" toggle button.
			const switchView = document.getElementById( 'switchViewToggle' ).checked;
			this.toggleStore.setSwitchView( switchView );
			const viewService = new Camera( );        
			// If the "switch view" toggle button is checked.
			if ( switchView ) {

				viewService.switchTo2DView();

				// If the "switch view"" toggle button is not checked.
			} else {

				viewService.switchTo3DView();

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
  height: 18px !important; /* Set a smaller height */
  width: 18px !important;  /* Set a smaller width */
  min-width: 0 !important; /* Override Vuetify's min-width */
}

.uiButton .v-btn__content {
  padding: 0 !important; /* Remove default padding */
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