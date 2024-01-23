import { useGlobalStore } from '../store.js';
import * as d3 from 'd3'; // Import D3.js

export default class Plot {


    constructor(  ) {
      this.store = useGlobalStore( );
    }
  

/**
 * Shows all plots and select elements
 * 
 * */
showAllPlots( ) {

  if ( this.store.level === 'postalCode') {

    document.getElementById( 'heatHistogramContainer' ).style.visibility = 'visible';
    document.getElementById( 'socioeonomicsContainer' ).style.visibility = 'visible';
    document.getElementById( 'scatterPlotContainer' ).style.visibility = 'visible';

    // only show scatter plot selects if trees are not visible
    if ( !document.getElementById( "showTreesToggle" ).checked ) {

        document.getElementById( 'numericalSelect' ).style.visibility = 'visible';
        document.getElementById( 'categoricalSelect' ).style.visibility = 'visible'; 
       
    } else {

        this.toggleBearingSwitchesVisibility( 'visible' );

    }
  }

    if ( this.store.level === 'building' ) {


    document.getElementById( 'buildingChartContainer' ).style.visibility = 'visible';
    document.getElementById( 'buildingTreeChartContainer' ).style.visibility = 'visible';

}
}

/**
 * Hides all plots and select elements
 * 
 * */
hideAllPlots( ) {

    document.getElementById( 'heatHistogramContainer' ).style.visibility = 'hidden';
    document.getElementById( 'socioeonomicsContainer' ).style.visibility = 'hidden';
    document.getElementById( 'buildingChartContainer' ).style.visibility = 'hidden';
    document.getElementById( 'buildingTreeChartContainer' ).style.visibility = 'hidden';
    document.getElementById( 'numericalSelect' ).style.visibility = 'hidden';
    document.getElementById( 'categoricalSelect' ).style.visibility = 'hidden';
    this.toggleBearingSwitchesVisibility( 'hidden' );
    document.getElementById( 'scatterPlotContainer' ).style.visibility = 'hidden';
    document.getElementById( 'categoricalSelect' ).value = 'c_julkisivu';
    document.getElementById( 'numericalSelect' ).value = 'measured_height';

}

/**
 * Hides all scatter plot related elements
 * 
 * */
hideScatterPlot( ) {

  document.getElementById( 'numericalSelect' ).style.visibility = 'hidden';
  document.getElementById( 'categoricalSelect' ).style.visibility = 'hidden';
  document.getElementById( 'scatterPlotContainer' ).style.visibility = 'hidden';

}

/**
 * Toggle visibility of plot elements visible at postal code level
 * 
 * */
togglePostalCodePlotVisibility( status ) {

    document.getElementById( 'heatHistogramContainer' ).style.visibility = status;
    document.getElementById( 'socioeonomicsContainer' ).style.visibility = status;
    document.getElementById( 'numericalSelect' ).style.visibility = status;
    document.getElementById( 'categoricalSelect' ).style.visibility = status;
    document.getElementById( 'scatterPlotContainer' ).style.visibility = status;
    document.getElementById( 'categoricalSelect' ).value = 'c_julkisivu';
    document.getElementById( 'numericalSelect' ).value = 'measured_height';

}

/**
 * Toggle visibility of tree bearing switches
 * 
 * @param {string} status - The desired visibility status ("visible" or "hidden")
 */
toggleBearingSwitchesVisibility( status ) {

    const switchContainers = [ 'All', 'South', 'West', 'East', 'North' ];
  
    for ( const direction of switchContainers ) {

      const switchContainer = document.getElementById( `bearing${direction}SwitchContainer` );
      switchContainer.style.visibility = status;

    }
}

// Utility function to setup an SVG container
setupSvgContainer(containerId, width, height, margins) {
  const svg = d3.select(containerId)
    .append('svg')
    .attr('width', width + margins.left + margins.right)
    .attr('height', height + margins.top + margins.bottom)
    .append('g')
    .attr('transform', `translate(${margins.left},${margins.top})`);

  return svg;
}

// Utility function to create scales
createScale(type, domain, range, padding = 0) {
  if (type === 'band') {
    return d3.scaleBand().domain(domain).range(range).padding(padding);
  } else if (type === 'linear') {
    return d3.scaleLinear().domain(domain).range(range).nice();
  }
  // Add other scale types as needed
}

// Utility function to add axes to an SVG
addAxis(svg, axisType, scale, translate) {
  const axis = axisType === 'x' ? d3.axisBottom(scale) : d3.axisLeft(scale);
  svg.append('g')
    .attr('transform', translate)
    .call(axis);
}

// Utility function for tooltips
setupTooltip(containerId) {
  return d3.select(containerId)
    .append('div')
    .style('opacity', 0)
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('background-color', 'white')
    .style('border', 'solid')
    .style('border-width', '1px')
    .style('border-radius', '5px')
    .style('padding', '10px');
}

renderBars(svg, data, xScale, yScale, height) {
  svg.selectAll('.bar')
    .data(data)
    .enter().append('rect')
    .attr('class', 'bar')
    .attr('x', d => xScale(d.name))
    .attr('width', xScale.bandwidth())
    .attr('y', d => yScale(d.value))
    .attr('height', d => height - yScale(d.value))
    .style('fill', (d, i) => i === 0 ? 'orange' : 'steelblue');
}

addBarLabels(svg, data, xScale, yScale) {
  svg.selectAll('.label')
    .data(data)
    .enter().append('text')
    .attr('class', 'label')
    .attr('x', d => xScale(d.name) + xScale.bandwidth() / 2)
    .attr('y', d => yScale(d.value) - 5)
    .attr('text-anchor', 'middle')
    .text(d => d.value);
}

addChartTitle(svg, title, width, margins) {
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -margins.top / 2)
    .attr('text-anchor', 'middle')
    .style('font-size', '16px')
    .text(title);
}

createBarChart(data, containerSelector, options) {

  // Setup SVG container
  const svg = this.setupSvgContainer(containerSelector, options.width, options.height, options.margins);

  // Create scales
  const xScale = this.createScale('band', options.xDomain, [0, options.width], 0.1);
  const yScale = this.createScale('linear', [0, Math.max(...data.map(d => parseFloat(d.value)))], [options.height, 0]);

  // Add axes to the SVG
  this.addAxis(svg, 'x', xScale, `translate(0, ${options.height})`);
  this.addAxis(svg, 'y', yScale, 'translate(0,0)');

  // Render bars
  this.renderBars(svg, data, xScale, yScale, options.height);

  // Add bar labels
  if (options.labels) {
    this.addBarLabels(svg, data, xScale, yScale);
  }

  // Add chart title
  if (options.title) {
    this.addChartTitle(svg, options.title, options.width, options.margins);
  }
}
}