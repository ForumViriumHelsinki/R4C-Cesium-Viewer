<template>
    <div id="heatHistogramContainer">
    </div>
  </template>
  
  <script>
  import { eventBus } from '../services/eventEmitter.js';
  import * as d3 from 'd3'; // Import D3.js
  import { useGlobalStore } from '../store.js';
  
  export default {
    data() {
      return {
        urbanHeatData: [],
      };
    },
    mounted() {
      this.unsubscribe = eventBus.$on('newHeatHistogram', this.newHeatHistogram);
      this.store = useGlobalStore( );
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
createHistogram() {
  const plotContainer = document.getElementById('heatHistogramContainer');

  // Remove any existing content in the plot container
  plotContainer.innerHTML = '';
  if ( document.getElementById( "showPlotToggle" ).checked ) {
    // Set container visibility to visible
    plotContainer.style.visibility = 'visible';
  }

  // Set up dimensions and margins
  const margin = { top: 30, right: 30, bottom: 30, left: 30 };
  const width = 420 - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  // Create the SVG element
  const svg = d3
    .select('#heatHistogramContainer')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Append a white background rectangle
  svg
    .append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'white');

    // Find the minimum and maximum values in urbanHeatData
    const minDataValue = d3.min(this.urbanHeatData) - 0.02;
    const maxDataValue = d3.max(this.urbanHeatData) + 0.02;

    // Configure scales
    const x = d3.scaleLinear().domain([minDataValue, maxDataValue]).range([0, width]).nice();
  const bins = d3.histogram().domain(x.domain()).thresholds(x.ticks(20))(this.urbanHeatData);
  const y = d3.scaleLinear().domain([0, d3.max(bins, (d) => d.length)]).range([height, 0]).nice();

  // Create x-axis
  const xAxis = d3.axisBottom().scale(x);
  svg
    .append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(xAxis);

  // Create y-axis
  const yAxis = d3.axisLeft().scale(y);
  svg
    .append('g')
    .call(yAxis);

  // Create bars
  const bar = svg
    .selectAll('.bar')
    .data(bins)
    .enter()
    .append('g')
    .attr('class', 'bar')
    .attr('transform', (d) => `translate(${x(d.x0)},${y(d.length)})`);

  const tooltip = d3.select('#heatHistogramContainer')
    .append('div')
    .style('opacity', 0)
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('background-color', 'white')
    .style('border', 'solid')
    .style('border-width', '1px')
    .style('border-radius', '5px')
    .style('padding', '10px');

  // Create bars with interactive tooltips
  bar
    .append('rect')
    .attr('x', 1)
    .attr('width', (d) => x(d.x1) - x(d.x0)) // Adjusted width for the bars
    .attr('height', (d) => height - y(d.length))
    .attr('fill', 'orange')
    .on('mouseover', function (event, d) {
      const containerRect = document.getElementById('heatHistogramContainer').getBoundingClientRect();
        const xPos = event.pageX - containerRect.left;
        const yPos = event.pageY - containerRect.top;
      tooltip.transition().duration(200).style('opacity', 0.9);
      tooltip.html(`Heat exposure index: ${d.x0}<br>Amount of buildings: ${d.length}`)
        .style('left', `${xPos}px`)
        .style('top', `${yPos}px`);
    })
    .on('mouseout', function () {
      tooltip.transition().duration(200).style('opacity', 0);
    });

  // Add a title
  svg
    .append('text')
    .attr('x', width / 2)
    .attr('y', -margin.top / 3)
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    .text(`Heat exposure to buildings in ${this.store.nameOfZone}`);
    
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