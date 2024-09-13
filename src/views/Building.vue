<template>
  <v-container v-if="showComponents">
    <v-row >
      <!-- Left column for Heat charts -->
      <v-col cols="9">
        <!-- Conditionally render either HSYBuildingHeatChart or BuildingHeatChart -->
        <HSYBuildingHeatChart v-if="toggleStore.capitalRegionView" />
        <BuildingHeatChart v-else />
      </v-col>

      <!-- Right column for Tree chart -->
      <v-col cols="3">
        <BuildingTreeChart />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref, watch } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import HSYBuildingHeatChart from '../components/HSYBuildingHeatChart.vue';
import BuildingTreeChart from '../components/BuildingTreeChart.vue';
import BuildingHeatChart from '../components/BuildingHeatChart.vue';

export default {
  components: {
    HSYBuildingHeatChart,
    BuildingTreeChart,
    BuildingHeatChart,
  },
  setup() {
    const showComponents = ref(false);
    const store = useGlobalStore();
    const toggleStore = useToggleStore();

    // Watch the store level and toggleStore to show or hide components
    watch(
      () => store.level,
      (newValue) => {
        showComponents.value = newValue === 'building';
      }
    );

    return {
      showComponents,
      toggleStore, // Added so it's available in the template
    };
  },
};
</script>