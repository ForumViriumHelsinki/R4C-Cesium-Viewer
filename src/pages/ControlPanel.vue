<template>
  <div class="control-panel-main">
    <v-btn
icon
class="toggle-btn"
size="x-small"
@click="togglePanel"
>
      <v-icon>{{ panelVisible ? 'mdi-menu-open' : 'mdi-menu' }}</v-icon>
    </v-btn>

    <v-app>
        <v-navigation-drawer
          v-model="panelVisible"
          location="right"
          app
          temporary
          class="control-panel"
          :width="drawerWidth"
        >
          <v-list dense>
            <v-list-item-group>
              <v-list-item class="pa-0 ma-0">
                <v-list-item-content class="pa-0 ma-0">

                  <v-tooltip
location="bottom"
class="tooltip"
>
                    <template #activator="{ props }">
                      <v-btn
                        v-if="currentLevel === 'building'"
                        icon
                        class="uiButton"
                        style="color: red; float:right; cursor: pointer;"
                        v-bind="props"
                        size="x-small"
                        @click="returnToPostalCode"
                      >
                        <v-icon>mdi-arrow-left</v-icon>
                      </v-btn>
                    </template>
                    <span>Return to postal code level</span>
                  </v-tooltip>

                  <v-tooltip location="bottom">
                    <template #activator="{ props }">
                      <v-btn
                        icon
                        class="uiButton"
                        style="color: red; float:right; cursor: pointer;"
                        v-bind="props"
                        size="x-small"
                        @click="reset"
                      >
                        <v-icon>mdi-refresh</v-icon>
                      </v-btn>
                    </template>
                    <span>Reset application</span>
                  </v-tooltip>

                  <v-tooltip location="bottom">
                    <template #activator="{ props }">
                      <v-btn
                        v-if="currentLevel !== 'start'"
                        icon
                        class="uiButton"
                        style="color: blue; float:right; cursor: pointer;"
                        v-bind="props"
                        size="x-small"
                        @click="rotateCamera"
                      >
                        <v-icon>mdi-compass</v-icon>
                      </v-btn>
                    </template>
                    <span>Rotate camera 180 degrees</span>
                  </v-tooltip>

                </v-list-item-content>
              </v-list-item>
              
              <v-list-item class="pa-0 ma-0">
                <v-list-item-content class="pa-0 ma-0">
                  <v-list-item-title>View Mode</v-list-item-title>

                 <!-- Include ViewMode component here -->
                  <ViewMode />

                </v-list-item-content>                
                  <v-list-item-content
v-if="currentLevel === 'postalCode' || currentView === 'grid'"
class="pa-0 ma-0"
>
                    <v-container
fluid
class="pa-0 ma-0 custom-container"
> 
                      <v-row
no-gutters
class="pa-0 ma-0"
>
                        <v-col
v-if="currentView !== 'grid'"
cols="6"
class="pa-0 ma-0"
>
                          <Layers />
                        </v-col>
                        <v-col
:cols="currentView === 'grid' ? 12 : 6"
class="pa-0 ma-0"
> 
                          <Layers v-if="currentView === 'grid'" />
                          <Filters v-else /> 
                        </v-col>
                      </v-row>
                    </v-container>
                  </v-list-item-content>
              </v-list-item>

              <!-- Add `multiple` prop here to allow multiple panels to stay open -->
              <v-expansion-panels
multiple
class="pa-0 ma-0"
>  

                  <v-expansion-panel
v-if="currentView === 'grid'"
class="pa-0 ma-0"
title="Statistical grid options"
>
                    <v-expansion-panel-text
class="pa-0 ma-0"
>
                      <StatisticalGridOptions />
                    </v-expansion-panel-text>                                                           
                  </v-expansion-panel>

                  <v-expansion-panel
class="pa-0 ma-0"
title="HSY Background maps"
>
                    <v-expansion-panel-text class="pa-0 ma-0">
                      <HSYWMS />
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                <template v-if="currentLevel === 'postalCode'">
                  <!-- Conditionally render Heat Histogram if data is available -->
                  <v-expansion-panel
                    v-if="heatHistogramData && heatHistogramData.length > 0"
                    class="pa-0 ma-0"
                    title="Heat Histogram"
                  >
                    <v-expansion-panel-text class="pa-0 ma-0">
                      <HeatHistogram />
                    </v-expansion-panel-text>
                  </v-expansion-panel>

                  <v-expansion-panel
class="pa-0 ma-0"
title="Socioeconomics Diagram"
>
                    <v-expansion-panel-text class="pa-0 ma-0">
                      <SocioEconomics />
                    </v-expansion-panel-text>
                  </v-expansion-panel>

                  <v-expansion-panel
v-if="currentView !== 'helsinki'"
class="pa-0 ma-0"
title="Land Cover"
>
                    <v-expansion-panel-text class="pa-0 ma-0">
                      <Landcover />
                    </v-expansion-panel-text>
                  </v-expansion-panel>

                  <v-expansion-panel
class="pa-0 ma-0"
title="Building Scatter Plot"
>
                    <v-expansion-panel-text
v-if="currentView !== 'helsinki'"
class="pa-0 ma-0"
>
                      <BuildingScatterPlot />
                    </v-expansion-panel-text>
                    <v-expansion-panel-text
v-if="currentView === 'helsinki'"
class="pa-0 ma-0"
>
                      <Scatterplot v-if="scatterPlotEntities" />                    
                    </v-expansion-panel-text>                    
                  </v-expansion-panel>

                  <v-expansion-panel
class="pa-0 ma-0"
title="Area properties"
>
                    <v-expansion-panel-text class="pa-0 ma-0">
                      <PrintBox />
                    </v-expansion-panel-text>
                  </v-expansion-panel>   
                </template>

                <template v-if="currentLevel === 'building'">
                  <v-expansion-panel
class="pa-0 ma-0"
title="Building heat data"
>
                    <v-expansion-panel-text
v-if="currentView !== 'helsinki' && currentView !== 'grid'"
class="pa-0 ma-0"
>
                      <HSYBuildingHeatChart />
                    </v-expansion-panel-text> 
                    <v-expansion-panel-text
v-if="currentView === 'helsinki' && currentView !== 'grid'"
class="pa-0 ma-0"
>
                      <BuildingHeatChart />
                    </v-expansion-panel-text> 
                    <v-expansion-panel-text
v-if="currentView === 'grid'"
class="pa-0 ma-0"
>
                      <BuildingGridChart />
                    </v-expansion-panel-text>                                                           
                  </v-expansion-panel>

                  <v-expansion-panel
class="pa-0 ma-0"
title="Building properties"
>
                    <v-expansion-panel-text class="pa-0 ma-0">
                      <PrintBox />
                    </v-expansion-panel-text>
                  </v-expansion-panel>   
                </template>  

                <v-expansion-panel
class="pa-0 ma-0"
title="Geocoding"
>
                    <v-expansion-panel-text class="pa-0 ma-0">
                      <Geocoding />
                    </v-expansion-panel-text>
                </v-expansion-panel> 
                               
              </v-expansion-panels>
            </v-list-item-group>
          </v-list>
<template #append>
          <div class="text-center text-subtitle-2">
        Data sources from Helsinki Region Environmental Services HSY: Buildings in the Helsinki metropolitan area & Helsinki metropolitan postal code areas by CC-BY-4.0 Licence. Open data by postal code area from Statistics Finland by CC-BY-4.0 Licence.
</div>
        </template>
        </v-navigation-drawer>
    </v-app>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import HeatHistogram from '../components/HeatHistogram.vue';
import SocioEconomics from '../views/SocioEconomics.vue';
import ViewMode from '../components/ViewMode.vue'; // Adjust the path as necessary
import HSYWMS from '../components/HSYWMS.vue';
import Filters from '../components/Filters.vue';
import Layers from '../components/Layers.vue';
import Landcover from '../views/Landcover.vue';
import BuildingScatterPlot from '../views/BuildingScatterPlot.vue';
import Scatterplot from '../components/Scatterplot.vue';
import HSYBuildingHeatChart from '../components/HSYBuildingHeatChart.vue';
import BuildingHeatChart from '../components/BuildingHeatChart.vue';
import BuildingGridChart from '../components/BuildingGridChart.vue';
import PrintBox from '../components/PrintBox.vue';
import { useGlobalStore } from '../stores/globalStore'; // Import global store for current level
import { usePropsStore } from '../stores/propsStore';
import { useToggleStore } from '../stores/toggleStore';
import Tree from '../services/tree';
import Featurepicker from '../services/featurepicker';
import Camera from '../services/camera';
import Geocoding from '../components/Geocoding.vue';
import StatisticalGridOptions  from '../components/StatisticalGridOptions.vue';

export default {
	components: {
    Layers,
    Filters,
		HeatHistogram,
		SocioEconomics,
		HSYWMS,
		Landcover,
		BuildingScatterPlot,
		PrintBox,
		HSYBuildingHeatChart,
    ViewMode,
    Geocoding,
    Scatterplot,
    BuildingHeatChart,
    BuildingGridChart,
    StatisticalGridOptions,
	},
	setup() {
		const globalStore = useGlobalStore();
		const propsStore = usePropsStore();
    const toggleStore = useToggleStore();
		const panelVisible = ref( window.innerWidth > 600 ); ;
		const currentLevel = computed( () => globalStore.level );
    const currentView = computed( () => globalStore.view );
		const heatHistogramData = computed( () => propsStore.heatHistogramData );
    const scatterPlotEntities = computed( () => propsStore.scatterPlotEntities );

		const togglePanel = () => {
			panelVisible.value = !panelVisible.value;
		};

    const reset = () => {
			location.reload();
		};

    const returnToPostalCode = () => {
			const featurepicker = new Featurepicker();
      const treeService = new Tree();
      hideTooltip(); 
			featurepicker.loadPostalCode();
			toggleStore.showTrees && treeService.loadTrees();
		};

    // Function to hide the tooltip
    const hideTooltip = () => {
      const tooltip = document.querySelector('.tooltip'); // Select the tooltip element
      if (tooltip) {
        tooltip.style.display = 'none'; // Hide the tooltip
      }
    };

    // Function to rotate the Cesium camera
    const rotateCamera = () => {
      const camera = new Camera();
      camera.rotate180Degrees();
    };

    // Computed property to calculate drawer width in percentage
    const drawerWidth = computed(() => {
      return globalStore.navbarWidth; // 37.5% of the window width
    });

		return {
      drawerWidth,
			panelVisible,
			currentLevel,
      currentView,
			heatHistogramData,
      scatterPlotEntities,
      rotateCamera,
      togglePanel,
      reset,
      returnToPostalCode
		};
	},
};
</script>

<style scoped>
.toggle-btn {
  position: fixed;
  top: 10px;
  right: 100px;
  z-index: 1000000;
}
.filters-layers-container {
  display: flex;
  justify-content: space-between; /* Ensures there's space between Filters and Layers */
  gap: 20px; /* Adds some space between the two components */
}

.filter-title {
  font-size: 1.2em;
  margin-bottom: 10px;
  font-family: sans-serif;
}

.slider-container {
  display: flex;
  flex-direction: column;
  background-color: white;
  padding: 10px;
  border: 1px solid #ccc;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 200px;
}

.switch-container {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 47px;
  height: 20px;
}

/* Additional styling for toggles */
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
}

input:checked + .slider {
  background-color: #2196F3;
}

.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}

.label {
  margin-left: 10px;
  font-size: 14px;
  font-family: Arial, sans-serif;
}

.control-panel-main { /* Or the appropriate class/ID for your ControlPanel */
  position: absolute; 
  top: 10px; /* Adjust as needed */
  right: 10px; /* Adjust as needed */
}
/* In your ControlPanel.vue styles */
.custom-container {
  padding: 0; 
}

.custom-container > .v-row { 
  margin: 0;
}
</style>
