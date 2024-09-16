<template>
  <v-container fluid v-if="showComponents">
    <v-row no-guttersclass="pa-0 ma-0">
      <v-col cols="3" class="pa-0 ma-0">
        <PieChart />
      </v-col>

      <v-col cols="3" class="pa-0 ma-0" style="position: fixed; top: 465px; right: 10px; width: 100px; font-size: smaller;">
        <HSYYearSelect />
      </v-col>

      <v-col cols="4" class="pa-0 ma-0" style="position: fixed; top: 310px; right: 10px; width: 100px;  font-size: smaller;">
        <HSYAreaSelect />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref, watch } from 'vue';
import { eventBus } from '../services/eventEmitter.js';
import HSYYearSelect from '../components/HSYYearSelect.vue';
import HSYAreaSelect from '../components/HSYAreaSelect.vue';
import PieChart from '../components/PieChart.vue';

export default {
  components: {
    HSYYearSelect,
    HSYAreaSelect,
    PieChart,
  },
  setup() {
    const showComponents = ref(true);

    return {
      showComponents,
    };
  }
};
</script>

<style scoped>
#landcoverControls {
  display: flex;
  flex-direction: column;
  gap: 16px; /* Space between controls */
  max-width: 100%;
  padding: 16px; /* Optional: Add some padding */
  box-sizing: border-box; /* Ensures padding is included in width */
}

.landcover-content {
  position: relative; /* Positioning context for internal components */
}
</style>