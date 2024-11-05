<template>
  <div id="heatTimeseriesContainer" :style="{ width: `${sliderWidth.value}px` }"> 
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
	  :width="sliderWidth" 
	  :style="{ marginLeft: marginWidth, marginRight: marginWidth }"
	  :disabled="isTimelineLocked"
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
import { onMounted, ref, computed, watch } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import Datasource from '../services/datasource.js';
import Building from '../services/building.js';
import { eventBus } from '../services/eventEmitter.js';

export default {
  setup() {
    const globalStore = useGlobalStore();
    const propsStore = usePropsStore();
    const dataSourceService = new Datasource();
    const buildingService = new Building();

    const selectedDate = ref('2023-06-23'); // Set default date
    const timelineLength = ref(0);
    const dates = [
      '2015-07-03',
      '2018-07-27',
      '2021-07-12',
      '2022-06-28',
      '2023-06-23',
      '2024-05-25',
    ];

    const currentPropertyIndex = ref(dates.indexOf(selectedDate.value)); // Set default index    

    const sliderWidth = computed(() => {
      return ( window.innerWidth - Math.min(Math.max(window.innerWidth * 0.375, 400), 800)) * 0.90; // Calculate remaining width
    });

    const marginWidth = computed(() => {
      return sliderWidth.value * 0.07 + 'px'; // Calculate remaining width
    });	

    const updateViewAndPlots = () => {
        const buildingsDataSource = dataSourceService.getDataSourceByName( 'Buildings ' + globalStore.postalcode );

        if (!buildingsDataSource) return;

        const entities = buildingsDataSource.entities.values;
        buildingService.setHeatExposureToBuildings( entities );
        buildingService.updateHeatHistogramDataAfterFilter( entities) ;
        propsStore.setScatterPlotEntities( entities );
		globalStore.setShowBuildingInfo( true );
  		eventBus.emit('updateScatterPlot');
    };    

    onMounted(() => {
      	timelineLength.value = dates.length; // Set the timeline length when mounted
  		// Unlock the timeline after a 1-second delay
  		setTimeout(() => {
    		isTimelineLocked.value = false;
  		}, 1000);		
    });

	const isTimelineLocked = ref(true); // Initially unlocked

    // Watch for changes in currentPropertyIndex
	watch(currentPropertyIndex, (newIndex) => {
		globalStore.setShowBuildingInfo( false );
  		isTimelineLocked.value = true; // Lock the timeline

  		selectedDate.value = dates[newIndex];
  		globalStore.setHeatDataDate(selectedDate.value);
  		updateViewAndPlots();

  		// Unlock the timeline after a 1-second delay
  		setTimeout(() => {
    		isTimelineLocked.value = false;
  		}, 1200);
	});
    return {
      	selectedDate,
      	timelineLength, // Return timelineLength
      	currentPropertyIndex, // Return currentPropertyIndex
      	sliderWidth,
      	dates, // Expose the dates array
		marginWidth,
		isTimelineLocked
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
  background-color: rgba(255, 255, 255, 0.5); /* White background with 80% opacity */
  border: 1px solid black; /* Small black border */
  padding: 5px; /* Add some padding for spacing */
  border-radius: 4px; /* Optional: Add rounded corners */
}

.date-labels {
  display: flex;
  justify-content: space-around; /* Distribute labels evenly */
  margin-bottom: 0px; /* Add some space between labels and slider */
  font-size: 14px; /* Adjust font size as needed */
  font-weight: 1000;
  color: #0000d7;
}
</style>