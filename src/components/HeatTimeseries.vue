<template>
  <div id="heatTimeseriesContainer">
    <div class="date-labels">
      <span v-for="(date, index) in dates" :key="index" class="date-label">
        {{ date }}
      </span>
    </div>
    <v-slider
      v-model="currentPropertyIndex"
      :max="timelineLength - 1"
      :step="1"
      :tick-size="2"
      tick-labels
      hide-details
      class="timeline-slider"
      :style="{ width: `800px` }"
    >
      <template v-slot:append>
        <div class="label-container">
          <div class="time-label">
            {{ selectedDate.value }}
          </div>
        </div>
      </template>
    </v-slider>
  </div>
</template>

<script>
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue';
import { useBuildingStore } from '../stores/buildingStore.js';
import { useGlobalStore } from '../stores/globalStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import Datasource from '../services/datasource.js';
import Building from '../services/building.js';
import { eventBus } from '../services/eventEmitter.js';

export default {
  setup() {
    const buildingStore = useBuildingStore();
    const globalStore = useGlobalStore();
    const propsStore = usePropsStore();
    const dataSourceService = new Datasource();
    const buildingService = new Building();
    const viewer = globalStore.cesiumViewer;

    const selectedDate = ref('2023-06-23'); // Set default date
    const timelineLength = ref(0);
    const dates = [
      '2015-07-03',
      '2018-07-27',
      '2021-02-18',
      '2021-07-12',
      '2022-06-28',
      '2023-06-23',
      '2024-05-25',
    ];

    const currentPropertyIndex = ref(dates.indexOf(selectedDate.value)); // Set default index    

    const sliderWidth = computed(() => {
      return window.innerWidth - Math.min(Math.max(window.innerWidth * 0.375, 400), 800); // Calculate remaining width
    });

    const updateViewAndPlots = () => {
        const buildingsDataSource = dataSourceService.getDataSourceByName('Buildings ' + globalStore.postalcode);

        if (!buildingsDataSource) return;

        const entities = buildingsDataSource.entities.values;
        buildingService.setHeatExposureToBuildings(entities);
        buildingService.updateHeatHistogramDataAfterFilter(entities);
        propsStore.setScatterPlotEntities( entities );
  		eventBus.emit('updateScatterPlot');
    };    

    onMounted(() => {
      timelineLength.value = dates.length; // Set the timeline length when mounted
    });

    // Watch for changes in currentPropertyIndex
    watch(currentPropertyIndex, (newIndex) => {
      selectedDate.value = dates[newIndex];
      globalStore.setHeatDataDate(selectedDate.value);
      updateViewAndPlots();
    });

    return {
      selectedDate,
      timelineLength, // Return timelineLength
      currentPropertyIndex, // Return currentPropertyIndex
      sliderWidth,
      dates, // Expose the dates array
    };
  },
};
</script>

<style scoped>
#heatTimeseriesContainer {
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 1000; /* Ensure it's on top */
}

.date-labels {
  display: flex;
  justify-content: space-around; /* Distribute labels evenly */
  margin-bottom: 5px; /* Add some space between labels and slider */
  font-size: 10px; /* Adjust font size as needed */
}
</style>