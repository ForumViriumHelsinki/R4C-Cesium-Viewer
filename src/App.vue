<template>

<div id="canvasScalerDiv">
  <CesiumViewer />
  <PrintBox />
  <Geocoding />
  <HeatHistogram />
  <SocioEconomics />
  <Scatterplot />


  <div id="UIContainer">
  <p class="header">R4C Urban Heat risk demonstrator</p>
  <p class="uiButton" onClick="reset()" style="color: red; float:right;">Reset</p>
  <!-- showPlotSwitch-->

<label class="switch">
  <input type="checkbox" id="populationGridToggle" value="populationGrid">
  <span class="slider round"></span>
</label>
<label for="populationGridToggle" class="label" id="populationGridLabel">Grid view</label>  

<label class="switch">
  <input type="checkbox" id="showPlotToggle" value="showPlot" checked>
  <span class="slider round"></span>
</label>
<label for="showPlotToggle" class="label">Display plot</label>

  <!-- showPrintSwitch-->
<label class="switch">
  <input type="checkbox" id="printToggle" value="print" checked>
  <span class="slider round"></span>
</label>
<label for="printToggle" class="label">Object details</label>

  <!-- showVegetationSwitch-->
<label class="switch" id="showVegetationSwitch">
	<input type="checkbox" id="showVegetationToggle" value="showVegetation" >
	<span class="slider round"></span>
</label>
<label for="showVegetationToggle" class="label" id="showVegetationLabel">Vegetation</label>

  <!-- showOtherNatureSwitch-->
<label class="switch" id="showOtherNatureSwitch">
  <input type="checkbox" id="showOtherNatureToggle" value="showOtherNature" >
  <span class="slider round"></span>
</label>
<label for="showOtherNatureToggle" class="label" id="showOtherNatureLabel">Other nature</label>

  <!-- hideNewBuildingsSwitch-->
<label class="switch" id = "hideNewBuildingsSwitch">
  <input type="checkbox" id="hideNewBuildingsToggle" value="filterBuildings" >
  <span class="slider round"></span>
</label>
<label for="hideNewBuildings" class="label" id="hideNewBuildingsLabel">Built before summer 2018</label>

  <!-- hideNonSoteSwitch-->
<label class="switch" id = "hideNonSoteSwitch">
	<input type="checkbox" id="hideNonSoteToggle" value="filterBuildings" >
	<span class="slider round"></span>
</label>
<label for="hideNonSote" class="label" id="hideNonSoteLabel">Only sote buildings</label>

  <!--  hideLowSwitch-->
<label class="switch" id = "hideLowSwitch" >
  <input type="checkbox" id="hideLowToggle" value="filterBuildings" >
  <span class="slider round"></span>
</label>
<label for="hideLow" class="label" id="hideLowLabel">Only tall buildings</label>

  <!--  showTrees-->
<label class="switch" id = "showTreesSwitch" >
  <input type="checkbox" id="showTreesToggle" value="showTrees" >
  <span class="slider round"></span>
</label>
<label for="showTrees" class="label" id="showTreesLabel">Trees</label>

  <!--  switchView-->
<label class="switch" id = "switchViewSwitch" >
  <input type="checkbox" id="switchViewToggle" value="switchView" >
  <span class="slider round"></span>
</label>
<label for="switchView" class="label" id="switchViewLabel">2D view</label>

  <!--  showSensorData-->
<label class="switch" id = "showSensorDataSwitch" >
  <input type="checkbox" id="showSensorDataToggle" value="showSensorData" >
  <span class="slider round"></span>
</label>
<label for="showSensorData" class="label">Sensor data</label>

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

  <div id="plotSoSContainer">
  </div>

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

</script>