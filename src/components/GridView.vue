<template>

    <div id="gridviewContainer">
        <p class="header">R4C Urban Heat risk demonstrator</p>
        <p class="uiButton" @click="reset" style="color: red; float:right; cursor: pointer;">Reset</p>
        
        <label class="switch">
            <input type="checkbox" id="postalCodeToggle" value="postalCode">
            <span class="slider round"></span>
        </label>
        <label for="postalCodeToggle" class="label" id="postalCodeLabel">Postalcode view</label> 

          <!--  natureGrid-->
        <label class="switch" id = "natureGridSwitch" >
            <input type="checkbox" id="natureGridToggle" value="natureGrid" >
            <span class="slider round"></span>
        </label>
        <label for="natureGrid" class="label" id="natureGridLabel">Nature grid</label>

        <!--  travelTime-->
        <label class="switch" id = "travelTimeSwitch" >
            <input type="checkbox" id="travelTimeToggle" value="travelTime" >
            <span class="slider round"></span>
        </label>
        <label for="travelTime" class="label" id="travelTimeLabel">Travel time grid</label> 

        <!--  resetGrid-->
        <label class="switch" id = "resetGridwitch" >
            <input type="checkbox" id="resetGridToggle" value="resetGrid" >
            <span class="slider round"></span>
        </label>
        <label for="resetGrid" class="label" id="resetGridLabel">Reset grid</label> 
    </div>

</template>
  
<script>

import EventEmitter from "../services/eventEmitter.js"
import { eventBus } from '../services/eventEmitter.js';
import { useGlobalStore } from '../stores/globalStore.js';
import Datasource from "../services/datasource.js"; 
import Populationgrid from "../services/populationgrid.js"; 

export default {
    data() {
      return {
        viewer: null,
      };
    },
    mounted() {
      this.unsubscribe = eventBus.$on('createPopulationGrid', this.createPopulationGrid);
      this.store = useGlobalStore( );
      this.eventEmitterService = new EventEmitter( );
      this.addEventListeners();

    },
    beforeUnmount() {
      this.unsubscribe();
    },    
    methods: {
        reset(){
            location.reload();
        },
        async createPopulationGrid( viewer ) {
            this.viewer = viewer;
            const populationgridService = new Populationgrid( this.viewer );
            populationgridService.createPopulationGrid();

        },
        /**
        * Add EventListeners 
        */
        addEventListeners() {
            
            document.getElementById('postalCodeToggle').addEventListener('change', this.postalCodeViewEvent.bind(this));
            document.getElementById('travelTimeToggle').addEventListener('change', this.travelTimeEvent.bind(this));
            document.getElementById('natureGridToggle').addEventListener('change', this.natureGridEvent.bind(this));
            document.getElementById('resetGridToggle').addEventListener('change', this.resetGridViewEvent.bind(this));

        },

        /**
        * This function handles the toggle event for switching to postal code view
        */
        postalCodeViewEvent( ) {

            const postalView = document.getElementById( "postalCodeToggle" ).checked;

            if ( postalView ) {

              this.store.view = 'helsinki';
              this.reset();
        
            } 

        },

        /**
        * This function resets grid view
        */
        resetGridViewEvent( ) {

            const resetGrid = document.getElementById( "resetGridToggle" ).checked;

            if ( resetGrid ) {

              const populationgridService = new Populationgrid( this.viewer );
              populationgridService.createPopulationGrid();        
            } 

        },        

        /**
        * This function to switch between population grid and travel time grid view
        *
        */
        async travelTimeEvent( ) {

            const datasourceService = new Datasource(this.viewer);

            // Check if viewer is initialized
            if (!this.viewer) {
                console.error("Viewer is not initialized.");
                return; // Exit the function if viewer is not initialized
            }

            try {
                const travelTime = document.getElementById("travelTimeToggle").checked;
                datasourceService.removeDataSourcesByNamePrefix('TravelLabel');
                datasourceService.removeDataSourcesByNamePrefix('PopulationGrid');

                if (travelTime) {
                   
                   // await datasourceService.removeDataSourcesByNamePrefix('PopulationGrid');
                    await datasourceService.loadGeoJsonDataSource(0.1, 'assets/data/travel_time_grid.json', 'TravelTimeGrid');
                } else {
                    await datasourceService.removeDataSourcesByNamePrefix('TravelTimeGrid');
                    await datasourceService.removeDataSourcesByNamePrefix('TravelLabel');
                    this.createPopulationGrid(this.viewer); // Pass this.viewer
                }
            } catch (error) {
                console.error("Error in travelTimeEvent:", error);
            }
        },

        /**
        * This function to switch between population grid and nature grid view
        *
        */
        natureGridEvent( ) {

            const datasourceService = new Datasource( this.viewer );
            const natureGrid = document.getElementById( "natureGridToggle" ).checked;
            datasourceService.removeDataSourcesByNamePrefix( 'TravelTimeGrid' );

            if ( natureGrid ) {

                const dataSource = datasourceService.getDataSourceByName( 'PopulationGrid' );

            if ( !dataSource ) {
                console.error(`Data source with name PopulationGrid not found.`);
                return [];
            }

            // Get the entities of the data source
            const entities = dataSource.entities.values;
            const populationgridService = new Populationgrid( this.viewer );

            for ( let i = 0; i < entities.length; i++ ) {

                let entity = entities[ i ];
                populationgridService.setGridEntityPolygonToGreen( entity );

            }

            document.getElementById( "travelTimeToggle" ).checked = false;

            } else { 

                datasourceService.removeDataSourcesByNamePrefix( 'PopulationGrid' );
                this.createPopulationGrid( this.viewer );

            }


        },
    },
}

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

#gridviewContainer{
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