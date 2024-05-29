<template>

<div  v-if="showGeocoding" id="georefContainer">
  <div id="searchcontainer" class="container-fluid">
    <form role="search">
        <div class="form-group">
            <div class="input-group">
                <div class="input-group-addon"><span class="glyphicon glyphicon-search"></span></div>
                <input type="search" class="form-control" placeholder="enter place or address" id="searchInput" autocomplete="off" />
            </div>
          </div>
        </form>
            
    </div>
<div id="searchbutton">
  <button class="btn btn-primary btn-block" id="searchButton">Move to target</button>
</div>
</div>

		<div id="searchresultscontainer" class="container-fluid hidden">
            <div class="panel-group" id="searchresults" role="tablist"></div>
      </div>

</template>
  
<script>

import { useGlobalStore } from '../stores/globalStore.js';

export default {
	data() {
		return {
			showGeocoding: true
		};
	},
	computed: {
        shouldShowGeocoding() {
            const store = useGlobalStore(); // Get access to the global store
            const view = store.view.toLowerCase(); // Make comparison case-insensitive
            return view === 'helsinki' || view === 'capitalregion';
        }
    },
    watch: {
        shouldShowGeocoding(newValue) { // Watch for changes in computed property
            this.showGeocoding = newValue; // Update data property if needed
        }
    },
	methods: {

	},
};
</script>

<style>

#georefContainer
{
	bottom: 2px;
	right: 1px;
	width: 530px; 
	height: 30px; 
	position: fixed; 
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
	float:left;
}

#searchbutton {
    float: left;
}

#searchresultscontainer
{
	bottom: 4.5%;
	right: 100px;
	width: 276px; 
	height: 30px; 
	position: fixed;
	background: white;
	visibility: hidden;
}

</style>