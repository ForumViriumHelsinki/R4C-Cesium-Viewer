<template>
    <div id="cesiumTimelineContainer"></div> 

</template>

<script>
import * as Cesium from 'cesium';
import 'cesium/Source/Widgets/widgets.css';
import { useGlobalStore } from '../stores/globalStore.js';
import { onMounted, ref, watch } from 'vue'; // Import watch for reactivity

export default {
  setup() {
    const store = useGlobalStore();
    const viewer = ref(null);
    const timeline = ref(null);

    onMounted(async () => {
      viewer.value = await store.cesiumViewerReady; // Wait for viewer to be ready
      createTimeline();
    });

    // Watch for changes in the viewer to handle potential re-initialization
    watch(viewer, (newViewer, oldViewer) => {
      if (newViewer && oldViewer !== newViewer) {
        createTimeline(); 
      }
    });

    const createTimeline = () => {
      const dates = [
        '2015-07-03', '2018-07-27', '2021-07-12', 
        '2022-06-28', '2023-06-21', '2024-05-25'
      ];

      const startTime = Cesium.JulianDate.fromDate(new Date(dates[0]));
      const stopTime = Cesium.JulianDate.fromDate(new Date(dates[dates.length - 1]));

      // Ensure the viewer and its clock exist before proceeding
      if (!viewer.value || !viewer.value.clock) return; 

      viewer.value.clock.startTime = startTime;
      viewer.value.clock.stopTime = stopTime;
      viewer.value.clock.currentTime = startTime.clone();
      viewer.value.timeline.zoomTo(startTime, stopTime);

      const timelineViewModel = new Cesium.TimelineViewModel(viewer.value.clock);
      timeline.value = new Cesium.Timeline('cesiumTimelineContainer', timelineViewModel);

      // ... (rest of the code for adding markers and event listeners)
    };

    return { viewer, timeline };
  }
};
</script>


<style scoped>
#cesiumTimelineContainer {
  position: absolute; /* Ensure proper positioning within Cesium Viewer */
  bottom: 20px;       /* Adjust to your desired location */
  left: 20px;
  width: 80%;        /* Adjust width as needed */
  z-index: 10;        /* Ensure timeline is visible over other elements */
}

.cesium-timeline-bar {
  background: #333; /* Customize background color */
}
.cesium-timeline-needle {
  background: #f00; /* Customize needle color */
}
.cesium-timeline-tick {
  color: #fff;      /* Customize tick color */
}
.cesium-timeline-marker {
  color: #fff;      /* Customize marker label color */
}
</style>