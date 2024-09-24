<template>
  <div class="wms-layer-switcher">
    <!-- Added upper margin with link to HSY map service -->
    <div class="hsy-link">
      All Background Map options can be found at 
      <a href="https://kartta.hsy.fi/" target="_blank">HSY map service</a> under 'karttatasot'.
    </div>

    <v-text-field
      append-inner-icon="mdi-magnify"
      density="compact"
      v-model="searchQuery"
      label=" Change Background Map"
      placeholder=" Search for WMS layers"
      variant="outlined"
      hide-details
      single-line
      @input="onSearch"
      @keyup.enter="onEnter"
      @click:append="onSearchClick"
    />
    <v-list v-if="filteredLayers.length > 0">
      <v-list-item
        v-for="(layer, index) in filteredLayers"
        :key="index"
        @click="selectLayer(layer.name)"
      >
        {{ layer.title }}
      </v-list-item>
    </v-list>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { usePropsStore } from '../stores/propsStore';
import wms from '../services/wms.js';
import axios from 'axios';

export default {
	setup() {
		const propsStore = usePropsStore();
		const searchQuery = ref( '' );
		const filteredLayers = ref( [] );
		const wmsService = new wms();

		// Backend URL
		const backendURL = import.meta.env.VITE_BACKEND_URL;

		// Fetch WMS layers from the backend
		const fetchLayers = async () => {
			try {
				const response = await axios.get( `${backendURL}/wms/layers` );
				propsStore.setHSYWMSLayers( response.data ); // Set layers in the store
			} catch ( error ) {
				console.error( 'Error fetching WMS layers:', error );
			}
		};

		// Filter layers based on user input
		const onSearch = () => {
			if ( searchQuery.value.length >= 3 ) {
				filteredLayers.value = propsStore.hSYWMSLayers.filter( layer =>
					layer.title.toLowerCase().includes( searchQuery.value.toLowerCase() )
				);
			} else {
				filteredLayers.value = [];
			}
		};

		// Select and switch the WMS layer
		const selectLayer = ( layerName ) => {
			wmsService.reCreateHSYImageryLayer( layerName );
			// Clear the filtered layers after selecting
			filteredLayers.value = [];
		};

		// Handle enter key press
		const onEnter = () => {
			const matchingLayer = propsStore.hSYWMSLayers.find( layer =>
				layer.title.toLowerCase() === searchQuery.value.toLowerCase()
			);
			if ( matchingLayer ) {
				selectLayer( matchingLayer.name ); // Switch to the matching layer
			}
		};

		// Handle search button click
		const onSearchClick = () => {
			onEnter(); // Trigger the same behavior as pressing enter
		};

		onMounted( () => {
			if ( !propsStore.hSYWMSLayers ) {
				fetchLayers();
			}
		} );

		return {
			searchQuery,
			filteredLayers,
			selectLayer,
			onSearch,
			onEnter,
			onSearchClick,
		};
	},
};
</script>

<style scoped>
.wms-layer-switcher {
  max-width: 400px;
  width: 400px;
  margin: 0 auto;
  top: 350px; 
  right: 1px; 
  position: fixed;
  border: 1px solid black; 
  box-shadow: 3px 5px 5px black;
  background-color: white;
}

.hsy-link {
  background-color: white;
  margin-top: 5px;
  margin-bottom: 5px;
  font-size: 10px;
  text-align: center;
}

.hsy-link a {
  color: blue;
  text-decoration: underline;
}

.v-list {
  background: white;
  max-height: 200px;
  overflow-y: auto;
}

.v-list-item {
  cursor: pointer;
  padding: 10px;
}

.v-list-item:hover {
  background-color: #f0f0f0;
}
</style>
