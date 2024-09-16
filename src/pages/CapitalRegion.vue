<template>
    <!-- Layout on top of Cesium -->
    <v-container v-if="showComponents" fluid class="d-flex flex-column pa-0 ma-0" style="position: relative; z-index: 10;">
      <!-- Row 7 -->
      <v-row no-gutters class="pa-0 ma-0">
        <v-col class="d-flex flex-column pa-0 ma-0" style="z-index: 20;">
          <HeatHistogram />		
        </v-col>
        <v-col class="d-flex align-end pa-0 ma-0" style="z-index: 20;">
          <SocioEconomics />
        </v-col>
      </v-row>

      <v-spacer></v-spacer>

      <!-- Row 6 -->
      <v-row v-if="showLandcover" no-gutters class="pa-0 ma-0">
        <v-col class="d-flex align-start pa-0 ma-0" style="z-index: 20;">
		      <Landcover />
        </v-col>
      </v-row>

      <v-spacer></v-spacer>

      <!-- Row 1 -->
      <v-row no-gutters class="pa-0 ma-0">
        <v-col class="d-flex flex-column pa-0 ma-0" style="z-index: 20;">
          <BuildingScatterPlot />
        </v-col>
      </v-row>
    </v-container>

</template>

<script>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { eventBus } from '../services/eventEmitter.js';
import { useGlobalStore } from '../stores/globalStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import HeatHistogram from '../components/HeatHistogram.vue';
import BuildingScatterPlot from '../views/BuildingScatterPlot.vue';
import SocioEconomics from '../views/SocioEconomics.vue';
import Landcover from '../views/Landcover.vue';

export default {
  components: {
    HeatHistogram,
    BuildingScatterPlot,
    SocioEconomics,
    Landcover,
  },
  setup() {
    const showComponents = ref(false);
    const showLandcover = ref(false);
    const store = useGlobalStore();
    const toggleStore = useToggleStore();

    onMounted(() => {
      eventBus.on('showCapitalRegion', () => {
        showComponents.value = true;
      });

      eventBus.on('hideCapitalRegion', () => {
        showComponents.value = false;
      });
    });

    onBeforeUnmount(() => {
      eventBus.off('showCapitalRegion');
      eventBus.off('hideCapitalRegion');
    });

    watch(() => toggleStore.landCover , (newValue) => {
      showLandcover.value = toggleStore.capitalRegionView ? !!newValue : showLandcover.value; 
    });

    return {
      showComponents,
      showLandcover,
    };
  }
};
</script>

<style scoped>
</style>