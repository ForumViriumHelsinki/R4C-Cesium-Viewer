<template>
    <div id="buildingChartContainer">
    </div>

    <div id="buildingTreeChartContainer">
    </div>

  </template>
  
  <script>
  import { eventBus } from '../services/eventEmitter.js';
  import * as d3 from 'd3'; // Import D3.js
  import { useGlobalStore } from '../store.js';
  
  export default {
    mounted() {
      this.unsubscribe = eventBus.$on('newBuildingHeat', this.newBuildingHeat);
      this.unsubscribe = eventBus.$on('newBuildingTree', this.newBuildingTree);
      this.store = useGlobalStore( );
    },
    beforeUnmount() {
      this.unsubscribe();
    },
    methods: {
        newBuildingHeat( buildingHeatExposure, address, postinumero  ) {
        if (buildingHeatExposure) {
          this.createBuildingBarChart( buildingHeatExposure, address, postinumero );
        } else {
          // Hide or clear the visualization when not visible
          // Example: call a method to hide or clear the D3 visualization
          this.clearBuildingBarChart();
        }
      },
      newBuildingTree( treeArea, address, postinumero  ) {
        if (postinumero) {
          this.createBuildingTreeBarChart( treeArea, address, postinumero );
        } else {
          // Hide or clear the visualization when not visible
          // Example: call a method to hide or clear the D3 visualization
          this.clearBuildingTreeBarChart();
        }
      },
/**
 * Create building specific bar chart.
 *
 */
      createBuildingBarChart( buildingHeatExposure, address, postinumero ) {

          const plotContainer = document.getElementById('buildingChartContainer');

  // Remove any existing content in the plot container
  plotContainer.innerHTML = '';

  if ( document.getElementById( "showPlotToggle" ).checked ) {
    // Set container visibility to visible
    plotContainer.style.visibility = 'visible';
  }

  const trace1 = { x: [address], y: [buildingHeatExposure.toFixed( 3 ) ], name: address, type: 'bar' };
  const trace2 = { x: [postinumero], y: [this.store.averageHeatExposure.toFixed( 3 )], name: postinumero, type: 'bar' };

  const data = [trace1, trace2];

  const margin = { top: 70, right: 30, bottom: 30, left: 60 };
  const width = 300 - margin.left - margin.right;
  const height = 200 - margin.top - margin.bottom;

  // Create the SVG element
  const svg = d3.select('#buildingChartContainer')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleBand()
    .domain([address, postinumero])
    .range([0, width])
    .padding(0.1);

  const yScale = d3.scaleLinear()
    .domain([0, Math.max(buildingHeatExposure, this.store.averageHeatExposure)])
    .range([height, 0])
    .nice(); // Make the scale "nice" for better readability

  // Create bars for trace1
  const colors = { [address]: 'orange', [postinumero]: 'steelblue' }; // Define colors for bars

  svg.selectAll('.bar')
    .data(data)
    .enter().append('rect')
    .attr('class', 'bar')
    .attr('x', d => xScale(d.name))
    .attr('width', xScale.bandwidth())
    .attr('y', d => yScale(d.y[0]))
    .attr('height', d => height - yScale(d.y[0]))
    .style('fill', d => colors[d.name]); // Set fill color based on name

  // Add labels
  svg.selectAll('.text')
    .data(data)
    .enter().append('text')
    .attr('class', 'label')
    .attr('x', d => xScale(d.name) + xScale.bandwidth() / 2)
    .attr('y', d => yScale(d.y[0]) - 5)
    .attr('text-anchor', 'middle')
    .text(d => d.y[0]);

  // Append x-axis
  svg.append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(d3.axisBottom(xScale));

  // Append y-axis
  svg.append('g')
    .call(d3.axisLeft(yScale));

  // Add title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -margin.top / 2)
    .attr('text-anchor', 'middle')
    .text('Urban Heat Exposure Index Comparison');
  
},
/**
 * Create building specific bar chart.
 *
 */
  createBuildingTreeBarChart( treeArea, address, postinumero ) {

          const plotContainer = document.getElementById('buildingTreeChartContainer');

  // Remove any existing content in the plot container
  plotContainer.innerHTML = '';

  if ( document.getElementById( "showPlotToggle" ).checked ) {
    // Set container visibility to visible
    plotContainer.style.visibility = 'visible';
  }

  const trace1 = { x: [address], y: [treeArea.toFixed( 3 ) ], name: address, type: 'bar' };
  const trace2 = { x: [postinumero], y: [this.store.averageHeatExposure.toFixed( 3 )], name: postinumero, type: 'bar' };

  const data = [trace1, trace2];

  const margin = { top: 70, right: 30, bottom: 30, left: 60 };
  const width = 300 - margin.left - margin.right;
  const height = 200 - margin.top - margin.bottom;

  // Create the SVG element
  const svg = d3.select('#buildingTreeChartContainer')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleBand()
    .domain([address, postinumero])
    .range([0, width])
    .padding(0.1);

  const yScale = d3.scaleLinear()
    .domain([0, Math.max(treeArea, this.store.averageTreeArea)])
    .range([height, 0])
    .nice(); // Make the scale "nice" for better readability

  // Create bars for trace1
  const colors = { [address]: 'orange', [postinumero]: 'steelblue' }; // Define colors for bars

  svg.selectAll('.bar')
    .data(data)
    .enter().append('rect')
    .attr('class', 'bar')
    .attr('x', d => xScale(d.name))
    .attr('width', xScale.bandwidth())
    .attr('y', d => yScale(d.y[0]))
    .attr('height', d => height - yScale(d.y[0]))
    .style('fill', d => colors[d.name]); // Set fill color based on name

  // Add labels
  svg.selectAll('.text')
    .data(data)
    .enter().append('text')
    .attr('class', 'label')
    .attr('x', d => xScale(d.name) + xScale.bandwidth() / 2)
    .attr('y', d => yScale(d.y[0]) - 5)
    .attr('text-anchor', 'middle')
    .text(d => d.y[0]);

  // Append x-axis
  svg.append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(d3.axisBottom(xScale));

  // Append y-axis
  svg.append('g')
    .call(d3.axisLeft(yScale));

  // Add title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -margin.top / 2)
    .attr('text-anchor', 'middle')
    .text('Urban Heat Exposure Index Comparison');
  
},
clearBuildingBarChart() {
        // Remove or clear the D3.js visualization
        // Example:
        d3.select("#buildingChartContainer").select("svg").remove();
      },

      clearBuildingTreeBarChart() {
        // Remove or clear the D3.js visualization
        // Example:
        d3.select("#buildingTreeChartContainer").select("svg").remove();
      },
    },
  };
  </script>
  
  <style>
  #buildingTreeChartContainer {
    position: fixed;
    top: 90px;
    right: 10px;
    width: 300px;
    height: 200px; 
    visibility: hidden;
    font-size: smaller;
    border: 1px solid black;
    box-shadow: 3px 5px 5px black; 
    background-color: white;
  }
  #buildingChartContainer {
    position: fixed;
    top: 90px;
    left: 10px;
    width: 300px;
    height: 200px; 
    visibility: hidden;
    font-size: smaller;
    border: 1px solid black;
    box-shadow: 3px 5px 5px black; 
    background-color: white;
  }
  </style>