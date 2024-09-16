<template>

<div id="canvasScalerDiv">
  <CesiumViewer />
  <GridView />
  <Geocoding />
	<div v-if="view !== 'grid'">
      <PrintBox />
    </div>
  <PostalCodeView />

  <!-- Add Logo -->		
	<div class="logoHolder">	
	<img src="/public/assets/images/regions4climate-black.png" id="logoR4C" alt="Regions4Climate" />
	<img src="/public/assets/images/fvh-1_musta.png" id="logoFVH" alt="Forum Virium Helsinki" />
  </div>
  
  </div>
</template>

<script setup>
import CesiumViewer from './pages/CesiumViewer.vue';
import Geocoding from './components/Geocoding.vue';
import PrintBox from './components/PrintBox.vue';
import GridView from './components/GridView.vue';
import PostalCodeView from './components/PostalCodeView.vue';
import { useGlobalStore } from './stores/globalStore.js';
import { computed } from 'vue';

const globalStore = useGlobalStore();
const view = computed(() => globalStore.view);

</script>

<style>
@charset "UTF-8";

.header
{
	font-family: sans-serif;
	font-weight: bold;
	font-size: small;
	margin: 3px;
}

.logoHolder
{
	position: fixed;
	bottom: 10px; 
	right: 5px;
}

#logoFVH {
    z-index: 1000;
    height: 40px;
	float: right;
	margin-right: 10px;
}

#logoR4C {
    z-index: 1000;
    height: 30px;
	float: right;
}

#canvasScalerDiv {
	width: 100%;
	height: 100%;
}

#app {
	font-family: Avenir, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: #2c3e50;
  }
</style>