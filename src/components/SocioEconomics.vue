<template>
    <div id="socioeonomicsContainer">
    </div>
  </template>
  
  <script>
  import { eventBus } from '../services/eventEmitter.js';
  import * as d3 from 'd3'; // Import D3.js
  import { useGlobalStore } from '../store.js';
  import Plot from "../services/plot.js"; 

  export default {
    mounted() {
      this.unsubscribe = eventBus.$on('newSocioEconomicsDiagram', this.newSocioEconomicsDiagram);
      this.store = useGlobalStore( );
      this.plotService = new Plot( );
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

// 3. Setup Axes
setupAxes(svg, xScale, yScale, height) {
    svg.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll('.tick text')
        .call(this.wrapText, xScale.bandwidth()); // Wraps text if it's long

    svg.append('g').call(d3.axisLeft(yScale));
},

// Helper for wrapping text (can be improved for more general use)
wrapText(text, width) {
    text.each(function() {
        const text = d3.select(this);
        const words = text.text().split(/\s+/).reverse();
        let word, line = [], lineNumber = 0, lineHeight = 1.1; // ems
        const y = text.attr("y");
        const dy = parseFloat(text.attr("dy"));
        let tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
        }
    });
},

// 4. Create Bars
createBars(svg, data, xScale, yScale, height, tooltip) {
    const bar = svg.selectAll('.bar')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'bar')
        .attr('transform', d => `translate(${xScale(d.label)}, 0)`);

    bar.append('rect')
        .attr('x', 0)
        .attr('y', d => yScale(d.value))
        .attr('width', xScale.bandwidth())
        .attr('height', d => height - yScale(d.value))
        .attr('fill', 'lightblue')
        .on('mouseover', function (event, d) {
            const containerRect = document.getElementById('socioeonomicsContainer').getBoundingClientRect();
            const xPos = event.pageX - containerRect.left;
            const yPos = event.pageY - containerRect.top;

            tooltip.transition().duration(200).style('opacity', 0.9);
            tooltip.html(`Indicator: ${d.label}<br>Value: ${d.value}`)
                .style('left', `${xPos}px`)
                .style('top', `${yPos}px`);
        })
        .on('mouseout', function () {
            tooltip.transition().duration(200).style('opacity', 0);
        });
},

/**
 * Creates SocioEconomics histogram for a postal code area.
 *
 * @param { object } sosData socioeconomic data used for creating the diagram
 */
createSocioEconomicsDiagram(sosData) {
    if (sosData) {
        this.plotService.initializePlotContainer('socioeonomicsContainer');

        const margin = { top: 20, right: 30, bottom: 50, left: 30 };
        const width = 460 - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;

        const svg = this.plotService.createSVGElement( margin, width, height, '#socioeonomicsContainer' );

        const xLabels = [
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

        const yValues = [
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

        const xScale = this.plotService.createScaleBand(xLabels, width);  
        const yScale = this.plotService.createScaleLinear(0, d3.max(yValues), [ height, 0 ] ); 
        this.setupAxes(svg, xScale, yScale, height);

        const barData = yValues.map((value, index) => ({ value, label: xLabels[index] }));
        const tooltip = this.plotService.createTooltip( '#socioeonomicsContainer' );
        this.createBars(svg, barData, xScale, yScale, height, tooltip);

        this.plotService.addTitle(svg, `Vulnerability in ${this.store.nameOfZone}`, width, margin);

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