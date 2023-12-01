<template>

<div id="canvasScalerDiv">
  <CesiumViewer />
  <PrintBox />
  <Geocoding />
  <HeatHistogram />
  <SocioEconomics />
  <Scatterplot />
  <Building />
  <Controlpanel />
  <NearbyTreeArea />
  		<!-- Add Logo -->
		
	<div class="logoHolder">	
	<img src="/src/assets/images/regions4climate-black.png" id="logoR4C" alt="Regions4Climate" />
	<img src="/src/assets/images/fvh-1_musta.png" id="logoFVH" alt="Forum Virium Helsinki" />
  </div>
  
  </div>
</template>

<script setup>
import CesiumViewer from "./components/CesiumViewer.vue";
import Geocoding from "./components/Geocoding.vue";
import PrintBox from "./components/PrintBox.vue";
import HeatHistogram from "./components/HeatHistogram.vue";
import SocioEconomics from "./components/SocioEconomics.vue";
import Scatterplot from "./components/Scatterplot.vue";
import Building from "./components/Building.vue";
import Controlpanel from "./components/ControlPanel.vue";
import NearbyTreeArea from "./components/NearbyTreeArea.vue";

</script>