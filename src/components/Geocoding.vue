<template>
  <div v-if="showGeocoding" id="georefContainer">
    <!-- Close button 'X' to hide the component -->
    <div class="close-button" @click="hideGeocoding">x</div>
    
    <div id="searchcontainer" class="container-fluid">
      <form role="search">
        <div class="form-group">
          <div class="input-group">
            <div class="input-group-addon">
              <span class="glyphicon glyphicon-search"></span>
            </div>
            <input
              type="search"
              class="form-control"
              placeholder="enter place or address"
              id="searchInput"
              autocomplete="off"
            />
          </div>
        </div>
      </form>
    </div>

    <div id="searchbutton">
      <v-btn block color="primary" id="searchButton" size="x-small" @click="moveToTarget">Move to target</v-btn>
    </div>

    <div id="searchresultscontainer" class="container-fluid hidden">
      <div class="panel-group" id="searchresults" role="tablist"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useGlobalStore } from '../stores/globalStore';

// State for geocoding visibility
const showGeocoding = ref( true );

// Accessing global store
const globalStore = useGlobalStore();

// Computed property to determine if geocoding should be shown
const shouldShowGeocoding = computed( () => {
	const view = globalStore.view.toLowerCase(); // Ensure comparison is case-insensitive
	return view === 'helsinki' || view === 'capitalregion';
} );

// Watch for changes in computed property and toggle visibility
watch( shouldShowGeocoding, ( newVal ) => {
	showGeocoding.value = newVal;
} );

// Method to hide geocoding panel
const hideGeocoding = () => {
	showGeocoding.value = false;
};

// Placeholder method for moving to the target
const moveToTarget = () => {
	// Implement actual move logic here
	console.log( 'Move to target' );
};
</script>

<style scoped>
#georefContainer {
  top: 0px;
  left: 0px;
  width: 530px;
  height: 40px;
  position: relative;
  border: 1px solid black;
  box-shadow: 3px 5px 5px black;
  background: white;
  visibility: visible;
  font-size: smaller;
  font-family: sans-serif;
  padding: 10px;
}

#searchcontainer {
  visibility: visible;
  float: left;
  z-index: 1000;
}

#searchbutton {
  float: left;
}

#searchresultscontainer {
  bottom: 5.5%;
  right: 176px;
  width: 250px;
  height: 30px;
  position: fixed;
  background: white;
  visibility: hidden;
  z-index: 1000;
}

.close-button {
  position: absolute;
  top: 5px;
  right: 10px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
}
</style>