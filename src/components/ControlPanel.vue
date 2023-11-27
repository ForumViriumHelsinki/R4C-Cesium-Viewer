<template>
 <div id="controlPanelContainer">
  <p class="header">R4C Urban Heat risk demonstrator</p>
  <p class="uiButton" @click="reset" style="color: red; float:right; cursor: pointer;">Reset</p>
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
</template>

<script>
// Import the uireset.js file or class

export default {
  methods: {
    reset(){
        location.reload();
    }
  }
}
</script>

<style>
.uiButton {
	background-color: white;
	border: 0px solid black; 

	font-family: sans-serif;
	font-size: small;
	text-align: middle;
	padding: 5px;
	margin: 5px;
	
	float: left;
	
	text-decoration: underline;
}

.uiButton:hover {
	color: rgb(150,150,150);
}

.label {
	background-color: white;
	border: 0px solid black; 

	font-family: sans-serif;
	text-align: middle;
	
	text-decoration: none;
	font-size: small;
}

#controlPanelContainer{
	top: 10px; 
	left: 0px; 

	position: fixed; 
	border: 1px solid black; 
	box-shadow: 3px 5px 5px black; 
	visibility: visible;
	
	background: white;
	padding: 5px;
	
	min-height: 25px;
	
	width: 100%;
}

/* The switch - the box around the slider */
.switch {
  position: relative;
  display: inline-block;
  width: 47px;
  height: 20px;
}

/* Hide default HTML checkbox */
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
  -webkit-transition: .4s;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196F3;
}

input:checked + .slider:before {
  -webkit-transform: translateX(26px);
  -ms-transform: translateX(26px);
  transform: translateX(26px);
}

/* Rounded sliders */
.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}
</style>