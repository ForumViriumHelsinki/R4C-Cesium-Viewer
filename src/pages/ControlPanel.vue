<template>
  <v-navigation-drawer>
    <v-list>
      <v-list-item>
        <v-tooltip location="bottom">
          <template #activator="{ props }">
            <v-btn
              v-if="currentLevel === 'building'"
              icon
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
              v-bind="props"
              size="x-small"
              @click="rotateCamera"
            >
              <v-icon>mdi-compass</v-icon>
            </v-btn>
          </template>
          <span>Rotate camera 180 degrees</span>
        </v-tooltip>
      </v-list-item>

      <v-list-item>
        <v-list-item-title>View Mode</v-list-item-title>

        <!-- Include ViewMode component here -->
        <ViewMode />

        <v-container fluid>
          <v-row no-gutters>
            <v-col cols="12">
              <v-card>
                <v-card-title>Layers</v-card-title>
                <v-card-text>
                  <Layers />
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12">
              <v-card>
                <v-card-title>Filters</v-card-title>
                <v-card-text>
                  <Filters />
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-list-item>

      <!-- Add `multiple` prop here to allow multiple panels to stay open -->
      <v-expansion-panels multiple>
        <v-expansion-panel
          v-if="currentView === 'grid' && statsIndex === 'heat_index'"
          title="Manage Cooling Centers"
        >
          <v-expansion-panel-text>
            <v-row no-gutters>
              <v-col cols="6">
                <CoolingCenter />
              </v-col>
              <v-col cols="6">
                <CoolingCenterOptimiser />
              </v-col>
            </v-row>

            <EstimatedImpacts />
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel
          v-if="currentView === 'grid'"
          title="Statistical grid options"
        >
          <v-expansion-panel-text>
            <StatisticalGridOptions />
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel
          v-if="currentView === 'grid' && statsIndex.includes('heat')"
          title="Turn landcover green and blue"
        >
          <v-expansion-panel-text>
            <LandcoverToParks />
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel
          v-if="currentView !== 'grid'"
          title="NDVI"
>
          <v-expansion-panel-text>
            <PostalCodeNDVI />
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="HSY Background maps">
          <v-expansion-panel-text>
            <HSYWMS />
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Syke Flood Background Maps">
          <v-expansion-panel-text>
            <FloodBackgroundSyke />
          </v-expansion-panel-text>
        </v-expansion-panel>

        <template v-if="currentLevel === 'postalCode'">
          <!-- Conditionally render Heat Histogram if data is available -->
          <v-expansion-panel
            v-if="heatHistogramData && heatHistogramData.length > 0"
            title="Heat Histogram"
          >
            <v-expansion-panel-text>
              <HeatHistogram />
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel
v-if="showSosEco"
title="Socioeconomics Diagram"
>
            <v-expansion-panel-text>
              <SocioEconomics />
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel
v-if="currentView !== 'helsinki'"
title="Land Cover"
>
            <v-expansion-panel-text>
              <Landcover />
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel title="Building Scatter Plot">
            <v-expansion-panel-text v-if="currentView !== 'helsinki'">
              <BuildingScatterPlot />
            </v-expansion-panel-text>
            <v-expansion-panel-text v-if="currentView === 'helsinki'">
              <Scatterplot v-if="scatterPlotEntities" />
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel title="Area properties">
            <v-expansion-panel-text>
              <PrintBox />
            </v-expansion-panel-text>
          </v-expansion-panel>
        </template>

        <template v-if="currentLevel === 'building'">
          <v-expansion-panel title="Building heat data">
            <v-expansion-panel-text
              v-if="currentView !== 'helsinki' && currentView !== 'grid'"
            >
              <HSYBuildingHeatChart />
            </v-expansion-panel-text>
            <v-expansion-panel-text
              v-if="currentView === 'helsinki' && currentView !== 'grid'"
            >
              <BuildingHeatChart />
            </v-expansion-panel-text>
            <v-expansion-panel-text v-if="currentView === 'grid'">
              <BuildingGridChart />
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel title="Building properties">
            <v-expansion-panel-text>
              <PrintBox />
            </v-expansion-panel-text>
          </v-expansion-panel>
        </template>

        <v-expansion-panel title="Geocoding">
          <v-expansion-panel-text>
            <Geocoding />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-list>

  </v-navigation-drawer>
</template>

<script>
import { ref, computed, watch } from 'vue';
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
import { useHeatExposureStore } from '../stores/heatExposureStore';
import { useSocioEconomicsStore } from '../stores/socioEconomicsStore';
import Tree from '../services/tree';
import Featurepicker from '../services/featurepicker';
import Camera from '../services/camera';
import Geocoding from '../components/Geocoding.vue';
import StatisticalGridOptions from '../components/StatisticalGridOptions.vue';
import FloodBackgroundSyke from '../components/FloodBackgroundSyke.vue';
import PostalCodeNDVI from '../views/PostalCodeNDVI.vue';
import { storeToRefs } from 'pinia';
import CoolingCenter from '../components/CoolingCenter.vue';
import CoolingCenterOptimiser from '../components/CoolingCenterOptimiser.vue';
import EstimatedImpacts from '../components/EstimatedImpacts.vue';
import LandcoverToParks from '../components/LandcoverToParks.vue';

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
    FloodBackgroundSyke,
    PostalCodeNDVI,
    CoolingCenter,
    CoolingCenterOptimiser,
    EstimatedImpacts,
    LandcoverToParks,
  },
  setup() {
    const globalStore = useGlobalStore();
    const propsStore = usePropsStore();
    const toggleStore = useToggleStore();
    const heatExposureStore = useHeatExposureStore();
    const socioEconomicsStore = useSocioEconomicsStore();
    const currentLevel = computed(() => globalStore.level);
    const currentView = computed(() => globalStore.view);
    const { ndvi } = storeToRefs(toggleStore);

    const heatHistogramData = computed(() => propsStore.heatHistogramData);
    const statsIndex = computed(() => propsStore.statsIndex);
    const scatterPlotEntities = computed(() => propsStore.scatterPlotEntities);
    const showSosEco = computed(
      () => socioEconomicsStore.data && heatExposureStore.data
    );

    const reset = () => {
      location.reload();
    };

    const rotateCamera = () => {
      const camera = new Camera();
      camera.rotateCamera();
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

    // Computed property to calculate drawer width in percentage
    const drawerWidth = computed(() => {
      return globalStore.navbarWidth; // 37.5% of the window width
    });

    return {
      drawerWidth,
      currentLevel,
      currentView,
      heatHistogramData,
      scatterPlotEntities,
      rotateCamera,
      reset,
      returnToPostalCode,
      ndvi,
      showSosEco,
      statsIndex,
    };
  },
};
</script>
