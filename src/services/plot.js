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

/**
 * 
 */

updateTreeElements( status ) {

  document.getElementById( 'nearbyTreeAreaContainer' ).style.visibility = status;
  this.toggleBearingSwitchesVisibility( status );

}

/**
 * Initializes container for plotting
 * 
 * @param {string} containerId - The containerId
 */
initializePlotContainer( containerId ) {
  const container = document.getElementById( containerId );
  container.innerHTML = '';
  container.style.visibility = document.getElementById( "showPlotToggle" ).checked ? 'visible' : 'hidden';
}


/**
 * Adds a title to plot
 * 
 * @param {string} svg 
 * @param {string} title 
 * @param {number} width 
 * @param {number} margin

 */
addTitle(svg, title, width, margin) {
  svg.append('text')
      .attr('x', width / 2)
      .attr('y', -margin.top / 3)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(title);
}

// 1. Initialize SVG and Background
createSVGElement( margin, width, height, container ) {
  const svg = d3.select( container )
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

  svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'white');

  return svg;
}

createScaleLinear(domainMin, domainMax, range) {
  return d3.scaleLinear().domain([domainMin, domainMax]).range(range).nice();
}

createScaleBand(xLabels, width) {
  return d3.scaleBand().domain(xLabels).range([0, width]).padding(0.1);
}

createTooltip( container ) {
  return d3.select( container )
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('background-color', 'white')
        .style('border', 'solid')
        .style('border-width', '1px')
        .style('border-radius', '5px')
        .style('padding', '10px');
}

setupAxes(svg, xScale, yScale, height) {
  // Create x-axis
  svg.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(xScale));

  // Create y-axis
  svg.append('g').call(d3.axisLeft(yScale));

  // If you need additional customization like gridlines or tick formatting,
  // you can add that logic here.
}

handleMouseover(tooltip, containerId, event, d, dataFormatter) {
  const containerRect = document.getElementById(containerId).getBoundingClientRect();
  const xPos = event.pageX - containerRect.left;
  const yPos = event.pageY - containerRect.top;

  tooltip.transition().duration(200).style('opacity', 0.9);
  tooltip.html(dataFormatter(d))
    .style('left', `${xPos}px`)
    .style('top', `${yPos}px`);
}

handleMouseout(tooltip) {
  tooltip.transition().duration(200).style('opacity', 0);
}

}