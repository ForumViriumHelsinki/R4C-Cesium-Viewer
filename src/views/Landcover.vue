<template>
  <v-container
v-if="showComponents"
fluid
>
    <!-- Vuetify Checkbox for toggling land cover -->
    <v-row
no-gutters
class="pa-0 ma-0"
>
      <v-col
cols="3"
class="pa-0 ma-0"
>
        <div class="pie-chart-container">
          <PieChart />
          <div class="hsy-area-select">
            <HSYAreaSelect />
          </div>
          <div class="land-cover-checkbox">
            <!-- Checkbox component -->
            <v-checkbox
              v-model="landcover"
              color="success"
              hide-details
              class="checkbox-aligned"
              @change="toggleLandCover"
            />
            <!-- Custom label for the checkbox with better alignment -->
            <label
for="landcover"
class="landcover-label"
>
              Landcover as background map
            </label>
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
import { ref, watch } from 'vue';
import HSYYearSelect from '../components/HSYYearSelect.vue';
import HSYAreaSelect from '../components/HSYAreaSelect.vue';
import PieChart from '../components/PieChart.vue';
import { createHSYImageryLayer, removeLandcover } from '../services/landcover';
import { useToggleStore } from '../stores/toggleStore.js'; // Store for toggling
import { useGlobalStore } from '../stores/globalStore.js'; // Global store for Cesium viewer

export default {
  components: {
    HSYYearSelect,
    HSYAreaSelect,
    PieChart,
  },
  setup() {
    const showComponents = ref(true);
    const landcover = ref(false); // State for checkbox
    const toggleStore = useToggleStore();
    const store = useGlobalStore();

    // Watch to synchronize landcover state with the store's landCover value
    watch(
      () => toggleStore.landCover,
      (newVal) => {
        landcover.value = newVal;
      },
      { immediate: true }
    );

    // Function to toggle land cover
    const toggleLandCover = () => {
      const isLandcoverChecked = landcover.value;
      toggleStore.setLandCover(isLandcoverChecked); // Update land cover state in store

      if (isLandcoverChecked) {
        // Remove background map and add land cover layer
        store.cesiumViewer.imageryLayers.remove('avoindata:Karttasarja_PKS', true);
        createHSYImageryLayer( ); // Add land cover
      } else {
        // Remove land cover
        removeLandcover( );
      }
    };

    return {
      showComponents,
      landcover,
      toggleLandCover, // Expose the toggle function
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
  top: 30px; /* Adjusts distance from top */
  left: 0px; /* Adjusts distance from right */
  width: 215px;
}

.hsy-year-select {
  position: absolute;
  bottom: -55px; /* Adjusts distance from bottom */
  right: -290px; /* Adjusts distance from right */
  width: 80px;
}

.land-cover-checkbox {
  position: absolute;
  top: 190px;
  display: flex;
  align-items: center; /* Ensures checkbox and label are vertically aligned */
}

.checkbox-aligned {
  margin-right: 40px; /* Space between checkbox and label */
}

.landcover-label {
  font-size: 14px; /* Adjust the font size as needed */
  vertical-align: middle; /* Align label with checkbox */
  white-space: nowrap; /* Prevent the label from wrapping */
}
</style>
