<template>
  <v-app>
    <div>
    	<CesiumViewer />
	<SosEco250mGrid v-if="grid250m" />	
    </div>
    <!-- Add Logo -->		
	<div class="logoHolder">	
	<img
id="logoR4C"
src="/assets/images/regions4climate-black.png?url"
alt="Regions4Climate"
>
	<img
id="logoFVH"
src="/assets/images/fvh-1_musta.png?url"
alt="Forum Virium Helsinki"
>
    </div>
  </v-app>
</template>

<script setup>
import CesiumViewer from './pages/CesiumViewer.vue';
import SosEco250mGrid from './components/SosEco250mGrid.vue';
import { useToggleStore } from './stores/toggleStore.js';
import { computed } from 'vue';

const toggleStore = useToggleStore();
const grid250m = computed( () => toggleStore.grid250m );

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
	top: 10px; 
	left: 5px;
}

#logoFVH {
    z-index: 1000;
    height: 40px;
	float: right;
	margin-left: 10px;
}

#logoR4C {
    z-index: 1000;
    height: 30px;
	float: left;
}

#app {
	font-family: Avenir, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: #2c3e50;
  }
</style>
