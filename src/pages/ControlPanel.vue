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
                  <v-list-item-title>Control Panel</v-list-item-title>
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

                  <v-expansion-panel class="pa-0 ma-0" title="Land Cover">
                    <v-expansion-panel-text class="pa-0 ma-0">
                      <Landcover />
                    </v-expansion-panel-text>
                  </v-expansion-panel>

                  <v-expansion-panel class="pa-0 ma-0" title="Building Scatter Plot">
                    <v-expansion-panel-text class="pa-0 ma-0">
                      <BuildingScatterPlot />
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </template>

                <template v-if="currentLevel === 'building'">
                  <v-expansion-panel class="pa-0 ma-0" title="Building heat data">
                    <v-expansion-panel-text class="pa-0 ma-0">
                      <HSYBuildingHeatChart />
                    </v-expansion-panel-text>
                  </v-expansion-panel>

                  <v-expansion-panel class="pa-0 ma-0" title="Building properties">
                    <v-expansion-panel-text class="pa-0 ma-0">
                      <PrintBox />
                    </v-expansion-panel-text>
                  </v-expansion-panel>   
                </template>                
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
import HSYWMS from '../components/HSYWMS.vue';
import Landcover from '../views/Landcover.vue';
import BuildingScatterPlot from '../views/BuildingScatterPlot.vue';
import HSYBuildingHeatChart from '../components/HSYBuildingHeatChart.vue';
import PrintBox from '../components/PrintBox.vue';
import { useGlobalStore } from '../stores/globalStore'; // Import global store for current level
import { usePropsStore } from '../stores/propsStore'; // Import global store for current level

export default {
  components: {
    HeatHistogram,
    SocioEconomics,
    HSYWMS,
    Landcover,
    BuildingScatterPlot,
    PrintBox,
    HSYBuildingHeatChart
  },
  setup() {
    const globalStore = useGlobalStore();
    const propsStore = usePropsStore();
    const panelVisible = ref(true);
    const componentsVisible = ref({
      heatHistogram: false,
      socioEconomics: false,
      hsyWMS: false,
      landCover: false,
      buildingScatterPlot: false,
    });
    const currentLevel = computed(() => globalStore.level);
    const heatHistogramData = computed(() => propsStore.heatHistogramData);

    const togglePanel = () => {
      panelVisible.value = !panelVisible.value;
    };

    return {
      panelVisible,
      componentsVisible,
      currentLevel,
      togglePanel,
      heatHistogramData,
    };
  },
};
</script>

<style scoped>
.toggle-btn {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 1000000;
}
</style>
