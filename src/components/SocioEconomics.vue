<template>
    <div id="socioeonomicsContainer">
    </div>
  </template>
  
  <script>
  import { eventBus } from '../services/eventEmitter.js';
  import * as d3 from 'd3'; // Import D3.js
  import { useGlobalStore } from '../store.js';
  
  export default {
    mounted() {
      this.unsubscribe = eventBus.$on('newSocioEconomicsDiagram', this.newSocioEconomicsDiagram);
      this.store = useGlobalStore( );
    },
    beforeUnmount() {
      this.unsubscribe();
    },
    methods: {
        newSocioEconomicsDiagram(newData) {
                        
            if (newData) {

                this.findSocioEconomicsData( newData );
            } else {
            // Hide or clear the visualization when not visible
          // Example: call a method to hide or clear the D3 visualization
                this.clearDiagram();
            }
        },
    
/**
 * Fetches heat vulnerable demographic data from pygeoapi for postal code.
 *
 * @param { String } postcode postal code of the area
 */
findSocioEconomicsData(postcode) {
    fetch("https://geo.fvh.fi/r4c/collections/heat_vulnerable_demographic/items?f=json&limit=1&postinumero=" + postcode)
        .then((response) => response.json())
        .then((data) => {
            this.createSocioEconomicsDiagram(data.features[0].properties); // 'this' will refer to the component instance
        });
},


/**
 * Creates SocioEconomics histogram for a postal code area.
 *
 * @param { object } sosData socioeconomic data used for creating the diagram
 */
 createSocioEconomicsDiagram(sosData) {
    if (sosData) {
        const container = document.getElementById('socioeonomicsContainer');

        // Clear existing content in the container
        container.innerHTML = '';

        if ( document.getElementById( "showPlotToggle" ).checked ) {
            // Set container visibility to visible
            container.style.visibility = 'visible';
        }

        const margin = { top: 20, right: 30, bottom: 50, left: 30 };
        const width = 460 - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;

        // Create SVG element
        const svg = d3.select('#socioeonomicsContainer')
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

        const x = [
            '% not vegetation',
            'Apartment Heat Exposure',
            '% of Children & Elderly',
            '% of Children',
            '% of Elderly',
            'Small Apartment Size',
            '% with Basic Education',
            'Lack of Income',
            '% of Rentals'
        ];

        const y = [
            1 - sosData.vegetation.toFixed(3),
            sosData.apartment_heat_exposure.toFixed(3),
            sosData.vulnerable_both.toFixed(3),
            sosData.vulnerable_children.toFixed(3),
            sosData.vulnerable_eldery.toFixed(3),
            1 - sosData.avg_apart_size.toFixed(3),
            1 - sosData.educ.toFixed(3),
            1 - sosData.income.toFixed(3),
            sosData.rental_rate.toFixed(3)
        ];

        const xScale = d3.scaleBand()
            .domain(x)
            .range([0, width])
            .padding(0.1); // Adjust padding between bars

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(y)])
            .range([height, 0]);

// Append x-axis with labels on two lines
svg.append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll('.tick text')
    .attr('dy', '1.2em') // Set the vertical offset between lines
    .html(function(d) {
        const label = d.split(' '); // Split label text into three lines
        return `<tspan x="0">${label[0]}</tspan><tspan x="0" dy="1.2em">${label[1]}</tspan><tspan x="0" dy="1.2em">${label[2]}</tspan>`;
    })
    .style('text-anchor', 'middle'); // Align text to the middle

        // Append y-axis
        svg.append('g')
            .call(d3.axisLeft(yScale));

        // Create bars
        const bar = svg
            .selectAll('.bar')
            .data(y.map((d, i) => ({ value: d, label: x[i] }))) // Combine x and y data for bars
            .enter()
            .append('g')
            .attr('class', 'bar')
            .attr('transform', d => `translate(${xScale(d.label)}, ${yScale(d.value)})`);

        const tooltip = d3.select('#socioeonomicsContainer')
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
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', xScale.bandwidth())
            .attr('height', d => height - yScale(d.value))
            .attr('fill', 'lightblue')
            .on('mouseover', function (event, d) {
        // Calculate the mouse position relative to the container
        const containerRect = document.getElementById('socioeonomicsContainer').getBoundingClientRect();
        const xPos = event.pageX - containerRect.left;
        const yPos = event.pageY - containerRect.top;

        const indicator = d.label; // Store indicator value
        const value = d.value; // Store value

        tooltip.transition().duration(200).style('opacity', 0.9);
        tooltip.html(`Indicator: ${indicator}<br>Value: ${value}`)
            .style('left', `${xPos}px`) // Use left for horizontal positioning
            .style('top', `${yPos}px`); // Use top for vertical positioning
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
    .text(`Vulnerability in ${this.store.nameOfZone}`);
    }
},
      clearDiagram() {
        // Remove or clear the D3.js visualization
        // Example:
        d3.select("#socioeonomicsContainer").select("svg").remove();
      },
    },
  };
  </script>
  
  <style>
 #socioeonomicsContainer
{
	position: fixed;
	top: 90px;
	right: 10px;
	width: 500px;
	height: 300px; 
	visibility: hidden;
	
	font-size: smaller;
	
	border: 1px solid black;
	box-shadow: 3px 5px 5px black; 
    background-color: white;

}
  </style>