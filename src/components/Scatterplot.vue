<template>
  <div id="plotMaterialContainer">
  </div>
</template>
  
  <script>
  import { eventBus } from '../services/urbanheat.js';
  import * as d3 from 'd3'; // Import D3.js
  import { useGlobalStore } from '../store.js';
  
  export default {
    data() {
      return {
        urbanHeatData: [],
        showPlot: false,
      };
    },
    mounted() {
      this.unsubscribe = eventBus.$on('urbanHeatDataChanged', this.handleUrbanHeatDataChanged);
      this.store = useGlobalStore( );
    },
    beforeUnmount() {
      this.unsubscribe();
    },
    methods: {
      handleUrbanHeatDataChanged(newData) {
        this.urbanHeatData = newData;
        this.showPlot = this.urbanHeatData.length > 0 && document.getElementById("showPlotToggle").checked;
        if (this.showPlot) {
          this.createHistogram();
        } else {
          // Hide or clear the visualization when not visible
          // Example: call a method to hide or clear the D3 visualization
          this.clearHistogram();
        }
      },
createHistogram() {
    
},
      clearHistogram() {
        // Remove or clear the D3.js visualization
        // Example:
        d3.select("#plotContainer").select("svg").remove();
      },
    },
  };
  </script>
  
  <style>
#plotMaterialContainer
{
	position: fixed;
	bottom: 40px;
	left: 10px;
	width: 600px;
	height: 290px; 
	visibility: hidden;
	
	font-size: smaller;
	border: 1px solid black;
	box-shadow: 3px 5px 5px black;  
}
  </style>