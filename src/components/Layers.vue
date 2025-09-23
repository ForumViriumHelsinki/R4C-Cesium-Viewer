<template>
  <!-- Add Filters Title -->
  <div
class="slider-container"
style="width: 100%;"
>
    <h3 class="filter-title">
Layers
</h3>
    <div
v-if="helsinkiView"
class="switch-container"
>
      <label class="switch">
        <input
v-model="showVegetation"
type="checkbox"
@change="loadVegetation"
>
        <span class="slider round"/>
      </label>
      <label
for="showVegetation"
class="label"
>Vegetation</label>
    </div>

    <div
v-if="helsinkiView"
class="switch-container"
>
      <label class="switch">
        <input
v-model="showOtherNature"
type="checkbox"
@change="loadOtherNature"
>
        <span class="slider round"/>
      </label>
      <label
for="showOtherNature"
class="label"
>Other Nature</label>
    </div>

    <div
v-if="view !== 'grid' && postalCode"
class="switch-container"
>
      <label class="switch">
        <input
v-model="showTrees"
type="checkbox"
@change="loadTrees"
>
        <span class="slider round"/>
      </label>
      <label
for="showTrees"
class="label"
>Trees</label>
    </div>

    <div
v-if="!helsinkiView"
class="switch-container"
>
      <label class="switch">
        <input
v-model="landCover"
type="checkbox"
@change="addLandCover"
>
        <span class="slider round"/>
      </label>
      <label
for="landCover"
class="label"
>HSY Land Cover</label>
    </div>

    <div
class="switch-container"
>
      <label class="switch">
        <input
v-model="ndvi"
type="checkbox"
@change="toggleNDVI"
>
        <span class="slider round"/>
      </label>
      <label
for="ndvi"
class="label"
>NDVI</label>
    </div>    
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useToggleStore } from '../stores/toggleStore';
import { useGlobalStore } from '../stores/globalStore';
import { eventBus } from '../services/eventEmitter.js';
import Datasource from '../services/datasource.js';
import Building from '../services/building.js';
import { createHSYImageryLayer, removeLandcover } from '../services/landcover';
import Tree from '../services/tree.js';
import Othernature from '../services/othernature.js';
import Vegetation from '../services/vegetation';
import Populationgrid from '../services/populationgrid.js';
import Wms from '../services/wms.js';
import { changeTIFF, removeTIFF } from '../services/tiffImagery.js';

export default {
  setup() {
    const toggleStore = useToggleStore();
    const store = useGlobalStore();

    const showVegetation = ref(toggleStore.showVegetation);
    const showOtherNature = ref(toggleStore.showOtherNature);
    const showTrees = ref(toggleStore.showTrees);
    const landCover = ref(toggleStore.landCover);
    const grid250m = ref(toggleStore.grid250m);
    const ndvi = ref(toggleStore.ndvi);

    const helsinkiView = computed( () => toggleStore.helsinkiView );
    const view = computed( () => store.view );
    const postalCode = computed( () => store.postalcode );

    let buildingService = null;
    let dataSourceService = null;

    const toggleLandCover = () => {
      toggleStore.setLandCover(landCover.value);
    };

    // Synchronize checkbox with global store value
    watch(
      () => toggleStore.landCover,
      (newValue) => {
        landCover.value = newValue;
      },
      { immediate: true }
    );

            // Watch to synchronize landcover state with the store's landCover value
    watch(
      () => toggleStore.grid250m,
      (newVal) => {
        grid250m.value = newVal;
      },
      { immediate: true }
    );

		/**
    * This function handles the toggle event for activing 250m sos eco grid
    */
		const activate250mGrid = async () => {

		  toggleStore.setGrid250m( grid250m.value );
      store.setView('grid');
      !grid250m.value && (new Populationgrid().createPopulationGrid());

		}

    /**
    * This function handles the toggle event for showing or hiding the vegetation layer on the map.
    *
    */
	const loadVegetation = () =>  {

		// Get the current state of the toggle button for showing nature areas.
		toggleStore.setShowVegetation( showVegetation.value );

		if ( showVegetation.value ) {

			// If the toggle button is checked, enable the toggle button for showing the nature area heat map.
			//document.getElementById("showVegetationHeatToggle").disabled = false;

			// If there is a postal code available, load the nature areas for that area.
			if ( store.postalcode && !dataSourceService.getDataSourceByName( 'Vegetation' ) ) {

				const vegetationService = new Vegetation( );         
				vegetationService.loadVegetation( store.postalcode );

			} else {
            
				dataSourceService.changeDataSourceShowByName( 'Vegetation', true );

			}

		} else {

			dataSourceService.changeDataSourceShowByName( 'Vegetation', false );

		}
	}

    /**
    * This function shows or hides tree entities on the map based on the toggle button state
    *
    */
	const loadTrees = () =>  {

		toggleStore.setShowTrees( showTrees.value );
		const treeService = new Tree();

		showTrees.value 
    		? ( store.postalcode && !dataSourceService.getDataSourceByName( 'Trees' ) 
        	? treeService.loadTrees( )
        	: ( dataSourceService.changeDataSourceShowByName( 'Trees', true ) ) )
    		: ( dataSourceService.changeDataSourceShowByName( 'Trees', false ), buildingService.resetBuildingEntities() );

	}

const disableOtherLayer = (layer) => {
  if (layer === 'ndvi') {
    landCover.value = false;
    toggleStore.setLandCover(false);
    removeLandcover( store.landcoverLayers, store.cesiumViewer );
  } else if (layer === 'landcover') {
    ndvi.value = false;
    toggleStore.setNDVI(false);
    store.cesiumViewer.imageryLayers.removeAll();
    store.cesiumViewer.imageryLayers.add(
      new Wms().createHelsinkiImageryLayer('avoindata:Karttasarja_PKS')
    );
  }
};

const addLandCover = () => {
  if (landCover.value && ndvi.value) disableOtherLayer('landcover');

    toggleStore.setLandCover(landCover.value);
    landCover.value ? createHSYImageryLayer( ) : removeLandcover( );

};

const toggleNDVI = () => {
  if (ndvi.value && landCover.value) disableOtherLayer('ndvi');

  toggleStore.setNDVI(ndvi.value);

  if (ndvi.value) {
    changeTIFF( );
    eventBus.emit('addNDVI');
  } else {
    removeTIFF( );
  }
};


	/**
    * This function handles the toggle event for showing or hiding the nature areas layer on the map.
    *
    */
	const loadOtherNature = () =>  {

		// Get the current state of the toggle button for showing nature areas.
		toggleStore.setShowOtherNature( showOtherNature.value );

		if ( showOtherNature.value ) {

			// If the toggle button is checked, enable the toggle button for showing the nature area heat map.
			//document.getElementById("showloadOtherNature").disabled = false;

			// If there is a postal code available, load the nature areas for that area.
			if ( store.postalcode && !dataSourceService.getDataSourceByName( 'OtherNature' ) ) {

				const otherNatureService = new Othernature();        
				otherNatureService.loadOtherNature( );

			} else {
            
				dataSourceService.changeDataSourceShowByName( 'OtherNature', true );
			}


			} else {

				dataSourceService.changeDataSourceShowByName( 'OtherNature', false );

		}
    }

    // Added this new reset function inside the script block
  const resetLayers = () => {
    showVegetation.value = false;
    showOtherNature.value = false;
    showTrees.value = false;
    landCover.value = false;
    grid250m.value = false;
  };

  // Watch for view mode changes and reset layers
  watch(() => store.view, resetLayers);
		      

    onMounted(() => {
        buildingService = new Building();
        dataSourceService = new Datasource();
    });

    return {
      showVegetation,
      showOtherNature,
      showTrees,
      landCover,
      helsinkiView,
      view,
      grid250m,
      activate250mGrid,
      loadVegetation,
      loadOtherNature,
      toggleNDVI,
      addLandCover,
      loadTrees,
      toggleLandCover,
      postalCode,
      ndvi,
    };
  },
};
</script>

<style scoped>
.filter-title {
  font-size: 1.2em;
  margin-bottom: 10px;
  font-family: sans-serif;
}

.slider-container {
  display: flex;
  flex-direction: column;
  background-color: white;
  border: 1px solid #ccc;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Align switch and label horizontally */
.switch-container {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 47px;
  height: 20px;
}

/* The slider input */
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
  transition: 0.4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.4s;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}

/* Align label to the right of the slider */
.label {
  margin-left: 10px;
  font-size: 14px;
  font-family: Arial, sans-serif;
}
</style>
