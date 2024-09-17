<template>
  <!-- Layout on top of Cesium -->
  <v-container v-if="showComponents" fluid class="d-flex flex-column pa-0 ma-0" style="position: relative; z-index: 10;">
    <!-- Row 7 -->
    <v-row no-gutters class="pa-0 ma-0">
      <v-col class="d-flex flex-column pa-0 ma-0" style="z-index: 20;">
        <HeatHistogram />
      </v-col>
      <v-col
        v-if="store.postalcode !== '00230'"
        class="d-flex align-end pa-0 ma-0"
        style="z-index: 20;"
      >
        <SocioEconomics />
      </v-col>
    </v-row>

    <v-spacer></v-spacer>

    <!-- Row 6 -->
    <v-row no-gutters class="pa-0 ma-0">
      <v-col class="d-flex align-start pa-0 ma-0" style="z-index: 20;">
        <Landcover />
      </v-col>
    </v-row>

    <v-spacer></v-spacer>

    <!-- Row 1 -->
    <v-row no-gutters class="pa-0 ma-0">
      <v-col class="d-flex flex-column pa-0 ma-0" style="z-index: 20;">
        <Scatterplot />
        <NearbyTreeArea />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { eventBus } from '../services/eventEmitter.js';
import { useGlobalStore } from '../stores/globalStore.js';
import HeatHistogram from '../components/HeatHistogram.vue';
import SocioEconomics from '../views/SocioEconomics.vue';
import Scatterplot from '../components/Scatterplot.vue';
import NearbyTreeArea from '../components/NearbyTreeArea.vue';

export default {
  components: {
    HeatHistogram,
    SocioEconomics,
    Scatterplot,
    NearbyTreeArea,
  },
  setup() {
    const showComponents = ref(false);
    const store = useGlobalStore(); // Access the store

    onMounted(() => {
      eventBus.on('showHelsinki', () => {
        showComponents.value = true;
      });

      eventBus.on('hideHelsinki', () => {
        showComponents.value = false;
      });
    });

    onBeforeUnmount(() => {
      eventBus.off('showHelsinki');
      eventBus.off('hideHelsinki');
    });

    return {
      showComponents,
      store, // Return the store to access postalCode in the template
    };
  },
};
</script>

<style scoped>
</style>