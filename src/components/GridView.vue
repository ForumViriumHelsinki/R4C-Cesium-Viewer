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
    </div>

</template>
  
<script>

import { eventBus } from '../services/eventEmitter.js';
import { useGlobalStore } from '../store.js';
import Datasource from "../services/datasource.js"; 
import Viewercamera from "../services/viewercamera.js"; 
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
            const datasourceService = new Datasource( this.viewer );
            datasourceService.loadGeoJsonDataSource(
                0.2,
                './assets/data/hki_po_clipped.json',
                'PostCodes'
            );

            datasourceService.removeDataSourcesByNamePrefix( 'TravelTimeGrid' );
            //setPostalCodeElementsDisplay( 'none' );
            //setGridElementsDisplay( 'inline-block' );
            datasourceService.removeDataSourcesByNamePrefix( 'PostCodes' );
            const cameraService = new Viewercamera( this.viewer );
            cameraService.flyCamera3D( 24.991745, 60.045, 12000 );

            try {

                const populationgridService = new Populationgrid( this.viewer );
                const entities = await datasourceService.loadGeoJsonDataSource(
                    0.1,
                    'assets/data/populationgrid.json',
                    'PopulationGrid'
                );
                
                populationgridService.setHeatExposureToGrid(entities);

                if ( !document.getElementById( "travelTimeToggle" ).checked ) {
            
                    populationgridService.setGridHeight( entities );

                } else {

                    document.getElementById( "travelTimeToggle" ).checked = false;
        
                }

            } catch (error) {
                
                console.error(error);
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