<template>

<div id="canvasScalerDiv">
  <CesiumViewer />
  <GridView />
  <Geocoding />
  <PrintBox />
  <PostalCodeView />

  <!-- Add Logo -->		
	<div class="logoHolder">	
	<img src="/public/assets/images/regions4climate-black.png" id="logoR4C" alt="Regions4Climate" />
	<img src="/public/assets/images/fvh-1_musta.png" id="logoFVH" alt="Forum Virium Helsinki" />
  </div>
  
  </div>
</template>

<script setup>
import CesiumViewer from './components/CesiumViewer.vue';
import Geocoding from './components/Geocoding.vue';
import PrintBox from './components/PrintBox.vue';
import GridView from './components/GridView.vue';
import PostalCodeView from './components/PostalCodeView.vue';


</script>