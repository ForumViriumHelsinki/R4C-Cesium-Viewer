<template>
  <div id="scatterPlotContainerHSY"></div>
</template>

<script>
import * as d3 from 'd3';
import { onMounted, onBeforeUnmount } from 'vue';

export default {
  props: {
    data: Array,
  },
  setup(props) {
    const createHSYScatterPlot = () => {
      const container = d3.select('#scatterPlotContainerHSY');
      container.html('');
      const margin = { top: 30, right: 120, bottom: 20, left: 30 };
      const width = 550 - margin.left - margin.right;
      const height = 300 - margin.top - margin.bottom;

      const svg = container
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Add D3 scatter plot logic here

      svg.append('text')
        .attr('x', width / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .text('Building attributes and average surface temperature');
    };

    onMounted(() => {
      createHSYScatterPlot();
    });

    onBeforeUnmount(() => {
      d3.select('#scatterPlotContainerHSY').select('svg').remove();
    });

    return {};
  },
};
</script>

<style scoped>
#scatterPlotContainerHSY {
      position: fixed;
      bottom: 35px;
      left: -19px;
      width: 550px; /* Adjusted width to accommodate margin */
      height: 300px; /* Adjusted height to accommodate margin */
      visibility: hidden;
      font-size: smaller;
      border: 1px solid black;
      box-shadow: 3px 5px 5px black;
      background-color: white;
      margin: 20px; /* Add margins to the container */
}
</style>