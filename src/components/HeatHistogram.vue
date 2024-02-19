<template>
    <div id="heatHistogramContainer">
    </div>
  </template>
  
  <script>
  import { eventBus } from '../services/eventEmitter.js';
  import * as d3 from 'd3'; // Import D3.js
  import { useGlobalStore } from '../stores/globalStore.js';
  import Plot from "../services/plot.js"; 
  
  export default {
    data() {
      return {
        urbanHeatData: [],
      };
    },
    mounted() {
      this.unsubscribe = eventBus.$on('newHeatHistogram', this.newHeatHistogram);
      this.store = useGlobalStore( );
      this.plotService = new Plot( );
    },
    beforeUnmount() {
      this.unsubscribe();
    },
    methods: {
      newHeatHistogram(newData) {
        this.urbanHeatData = newData;
        if (this.urbanHeatData.length > 0) {
          this.createHistogram();
        } else {
          // Hide or clear the visualization when not visible
          // Example: call a method to hide or clear the D3 visualization
          this.clearHistogram();
        }
      },

createBars(svg, data, xScale, yScale, height, tooltip, containerId, dataFormatter) {
  console.log("data", data);
    svg.selectAll('.bar')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'bar')
        .attr('transform', d => `translate(${xScale(d.x0)},${yScale(d.length)})`)
        .append('rect')
        .attr('x', 1)
        .attr('width', d => xScale(d.x1) - xScale(d.x0)) // Adjusted width for the bars
        .attr('height', d => height - yScale(d.length))
        .attr('fill', 'orange')
        .on('mouseover', (event, d) => this.plotService.handleMouseover(tooltip, containerId, event, d, dataFormatter))
        .on('mouseout', () => this.plotService.handleMouseout(tooltip));
},      
createHistogram() {
  this.plotService.initializePlotContainer('heatHistogramContainer');

  const margin = { top: 30, right: 30, bottom: 30, left: 30 };
  const width = 420 - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  const svg = this.plotService.createSVGElement(margin, width, height, '#heatHistogramContainer');

  const minDataValue = d3.min(this.urbanHeatData) - 0.02;
  const maxDataValue = d3.max(this.urbanHeatData) + 0.02;
  const x = this.plotService.createScaleLinear(minDataValue, maxDataValue, [0, width]);
  const bins = d3.histogram().domain(x.domain()).thresholds(x.ticks(20))(this.urbanHeatData);
  const y = this.plotService.createScaleLinear(0, d3.max(bins, (d) => d.length), [height, 0]);

  this.plotService.setupAxes(svg, x, y, height);

  const tooltip = this.plotService.createTooltip('#heatHistogramContainer');

  this.createBars(svg, bins, x, y, height, tooltip, 'heatHistogramContainer', 
                d => `Heat exposure index: ${d.x0}<br>Amount of buildings: ${d.length}`);

  this.plotService.addTitle(svg, `Heat exposure to buildings in ${this.store.nameOfZone}`, width, margin);

},
      clearHistogram() {
        // Remove or clear the D3.js visualization
        // Example:
        d3.select("#heatHistogramContainer").select("svg").remove();
      },
    },
  };
  </script>
  
  <style>
  #heatHistogramContainer {
    position: fixed;
    top: 90px;
    left: 10px;
    width: 420px;
    height: 300px; 
    visibility: hidden;
    font-size: smaller;
    border: 1px solid black;
    box-shadow: 3px 5px 5px black; 
    background-color: white;
  }
  </style>