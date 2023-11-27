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

  <label id="bearingLabel" style="position: fixed; bottom: 41px; left: 15px; visibility: hidden;">Direction of trees</label>

  <div id="bearingAllSwitchContainer">
    <!-- bearingAll -->
    <label class="switch" id="bearingAllSwitch">
      <input type="checkbox" id="bearingAllToggle" value="a">
      <span class="slider round"></span>
    </label>
    <label for="bearingAllToggle" class="label" id="bearingAllLabel">All</label>
  </div>

  <div id="bearingSouthSwitchContainer">
    <!-- bearingSouth -->
    <label class="switch" id="bearingSouthSwitch">
      <input type="checkbox" id="bearingSouthToggle" value="s">
      <span class="slider round"></span>
    </label>
    <label for="bearingSouthToggle" class="label" id="bearingSouthLabel">South</label>
  </div>

  <div id="bearingWestSwitchContainer">
    <!-- bearingWest -->
    <label class="switch" id="bearingWestSwitch">
      <input type="checkbox" id="bearingWestToggle" value="w">
      <span class="slider round"></span>
    </label>
    <label for="bearingWestToggle" class="label" id="bearingWestLabel">West</label>
  </div>

  <div id="bearingEastSwitchContainer">
    <!-- bearingEast -->
    <label class="switch" id="bearingEastwitch">
      <input type="checkbox" id="bearingEastToggle" value="e">
      <span class="slider round"></span>
    </label>
    <label for="bearingEastToggle" class="label" id="bearingEastLabel">East</label>
  </div>

  <div id="bearingNorthSwitchContainer">
    <!-- bearingWest -->
    <label class="switch" id="bearingNorthSwitch">
      <input type="checkbox" id="bearingNorthToggle" value="n">
      <span class="slider round"></span>
    </label>
    <label for="bearingNorthToggle" class="label" id="bearingNorthLabel">North</label>
  </div>
  		<!-- Add Logo -->
		
	<div class="logoHolder">	
	<img src="src/assets/images/regions4climate-black.png" id="logoR4C" alt="Regions4Climate" />
	<img src="src/assets/images/fvh-1_musta.png" id="logoFVH" alt="Forum Virium Helsinki" />
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

</script>