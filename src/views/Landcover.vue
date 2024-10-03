<template>
  <v-container fluid v-if="showComponents">
    <v-row no-gutters class="pa-0 ma-0">
      <v-col cols="3" class="pa-0 ma-0">
        <div class="pie-chart-container">
          <PieChart />
          <div class="hsy-area-select">
            <HSYAreaSelect />
          </div>
          <div class="hsy-year-select">
            <HSYYearSelect />
          </div>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref } from 'vue';
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
  },
};
</script>

<style scoped>
.pie-chart-container {
  position: relative;
  width: 100%;
  height: 200px; 
  background-color: white;
}

.hsy-area-select {
  position: absolute;
  top: 10px; /* Adjusts distance from top */
  right: -280px; /* Adjusts distance from right */
  width: 215px;
  z-index: 10; /* Ensure it is on top */
}

.hsy-year-select {
  position: absolute;
  bottom: 0px; /* Adjusts distance from bottom */
  right: -280px; /* Adjusts distance from right */
  width: 80px;
  z-index: 10; /* Ensure it is on top */
}
</style>
