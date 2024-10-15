<template>
  <div>
    <v-btn icon @click="togglePanel" class="toggle-btn">
      <v-icon>{{ panelVisible ? 'mdi-menu-open' : 'mdi-menu' }}</v-icon>
    </v-btn>
    <v-app>
      <div>
        <v-navigation-drawer
          v-model="panelVisible"
          location="right"
          app
          temporary
          class="control-panel"
          :width="500"
        >
          <v-list dense>
            <v-list-item-group>
                <v-list-item class="pa-0 ma-0">
                  <v-list-item-content class="pa-0 ma-0">
                    <v-btn v-if="currentLevel === 'building' " icon @click="returnToPostalCode" class="uiButton" style="color: red; float:right; cursor: pointer;"> 
                      <v-icon>mdi-arrow-left</v-icon>
                    </v-btn>

                    <v-btn icon @click="reset" class="uiButton" style="color: red; float:right; cursor: pointer;">
                      <v-icon>mdi-refresh</v-icon>
                    </v-btn>
                  </v-list-item-content>                
              </v-list-item>
              <v-list-item class="pa-0 ma-0">
                <v-list-item-content class="pa-0 ma-0">
                  <v-list-item-title>View Mode</v-list-item-title>

                 <!-- Include ViewMode component here -->
                  <ViewMode />

                </v-list-item-content>                
                <v-list-item-content class="pa-0 ma-0" v-if="currentLevel === 'postalCode'">

                  <!-- The Filters and Layers are now side by side -->
                  <div class="filters-layers-container">
                    <Layers />
                    <Filters />
                  </div>
                </v-list-item-content>
              </v-list-item>

              <!-- Add `multiple` prop here to allow multiple panels to stay open -->
              <v-expansion-panels multiple class="pa-0 ma-0">  
                <template v-if="currentLevel === 'postalCode'">
                  <v-expansion-panel class="pa-0 ma-0" title="HSY Background maps">
                    <v-expansion-panel-text class="pa-0 ma-0">
                      <HSYWMS />
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                
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

                  <v-expansion-panel class="pa-0 ma-0" title="Socioeconomics Diagram">
                    <v-expansion-panel-text class="pa-0 ma-0">
                      <SocioEconomics />
                    </v-expansion-panel-text>
                  </v-expansion-panel>

                  <v-expansion-panel v-if="currentView !== 'helsinki'" class="pa-0 ma-0" title="Land Cover">
                    <v-expansion-panel-text class="pa-0 ma-0">
                      <Landcover />
                    </v-expansion-panel-text>
                  </v-expansion-panel>

                  <v-expansion-panel class="pa-0 ma-0" title="Building Scatter Plot">
                    <v-expansion-panel-text v-if="currentView !== 'helsinki'" class="pa-0 ma-0">
                      <BuildingScatterPlot />
                    </v-expansion-panel-text>
                    <v-expansion-panel-text v-if="currentView === 'helsinki'" class="pa-0 ma-0">
                      <Scatterplot v-if="scatterPlotEntities" />                    
                    </v-expansion-panel-text>                    
                  </v-expansion-panel>

                  <v-expansion-panel class="pa-0 ma-0" title="Area properties">
                    <v-expansion-panel-text class="pa-0 ma-0">
                      <PrintBox />
                    </v-expansion-panel-text>
                  </v-expansion-panel>   
                </template>

                <template v-if="currentLevel === 'building'">
                  <v-expansion-panel class="pa-0 ma-0" title="Building heat data">
                    <v-expansion-panel-text  v-if="currentView !== 'helsinki'" class="pa-0 ma-0">
                      <HSYBuildingHeatChart />
                    </v-expansion-panel-text> 
                    <v-expansion-panel-text v-if="currentView === 'helsinki'" class="pa-0 ma-0">
                      <BuildingHeatChart />
                    </v-expansion-panel-text>                                       
                  </v-expansion-panel>

                  <v-expansion-panel class="pa-0 ma-0" title="Building properties">
                    <v-expansion-panel-text class="pa-0 ma-0">
                      <PrintBox />
                    </v-expansion-panel-text>
                  </v-expansion-panel>   
                </template>  

                <v-expansion-panel class="pa-0 ma-0" title="Geocoding">
                    <v-expansion-panel-text class="pa-0 ma-0">
                      <Geocoding />
                    </v-expansion-panel-text>
                </v-expansion-panel> 
                               
              </v-expansion-panels>
            </v-list-item-group>
          </v-list>
        </v-navigation-drawer>
      </div>
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
import PrintBox from '../components/PrintBox.vue';
import { useGlobalStore } from '../stores/globalStore'; // Import global store for current level
import { usePropsStore } from '../stores/propsStore';
import { useToggleStore } from '../stores/toggleStore';
import Tree from '../services/tree';
import Featurepicker from '../services/featurepicker';
import Geocoding from '../components/Geocoding.vue';

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
	},
	setup() {
		const globalStore = useGlobalStore();
		const propsStore = usePropsStore();
    const toggleStore = useToggleStore();
		const panelVisible = ref( true );
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
			featurepicker.loadPostalCode();
			toggleStore.showTrees && treeService.loadTrees();
		};

		return {
			panelVisible,
			currentLevel,
      currentView,
			heatHistogramData,
      scatterPlotEntities,
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
</style>
