<template>
    <div id="heatHistogramContainer">
    </div>
  </template>
  
<script>
import { eventBus } from '../services/eventEmitter.js';
import * as d3 from 'd3'; // Import D3.js
import { useGlobalStore } from '../stores/globalStore.js';
import Plot from '../services/plot.js'; 
import Building from '../services/building.js';
import { usePropsStore } from '../stores/propsStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
  
export default {
	mounted() {
		this.unsubscribe = eventBus.$on( 'newHeatHistogram', this.newHeatHistogram );
		this.store = useGlobalStore();
		this.plotService = new Plot();
		this.propsStore  = usePropsStore();
		this.toggleStore  = useToggleStore();
	},
	beforeUnmount() {
		this.unsubscribe();
	},
	methods: {
		newHeatHistogram( ) {
			if ( this.store.level == 'postalCode' ) {
				this.createHistogram();
			} else {
				// Hide or clear the visualization when not visible
				// Example: call a method to hide or clear the D3 visualization
				this.clearHistogram();
			}
		},

		createBars( svg, data, xScale, yScale, height, tooltip, containerId, dataFormatter ) {

			svg.selectAll( '.bar' )
				.data( data )
				.enter()
				.append( 'g' )
				.attr( 'class', 'bar' )
				.attr( 'transform', d => `translate(${xScale( d.x0 )},${yScale( d.length )})` )
				.append( 'rect' )
				.attr( 'x', 1 )
				.attr( 'width', d => xScale( d.x1 ) - xScale( d.x0 ) ) // Adjusted width for the bars
				.attr( 'height', d => height - yScale( d.length ) )
				.attr( 'fill', d => this.rgbColor( d ) )
				.on( 'mouseover', ( event, d ) => this.plotService.handleMouseover( tooltip, containerId, event, d, dataFormatter ) )
				.on( 'mouseout', () => this.plotService.handleMouseout( tooltip ) )
				.on( 'click', ( event, d ) => {
					// Assume each data point includes a building ID or some identifier
					const buildingSerivce  = new Building( );
					buildingSerivce.highlightBuildingsInViewer( d );
          
				} );

		},  
  rgbColor(data) {
    const average = this.calculateAverage(data);
    const isCold = this.toggleStore.capitalRegionCold;

    let index;
    if (!isCold) {
      index = this.calculateIndex(average, this.store.minKelvin, this.store.maxKelvin);
      return this.getWarmColor(index);
    } else {
      index = this.calculateIndex(average, this.store.minKelvinCold, this.store.maxKelvinCold);
      return this.getColdColor(index);
    }
  },

  calculateAverage(data) {
    if (!data || data.length === 0) return 0;
    return data.reduce((sum, value) => sum + value, 0) / data.length;
  },

  calculateIndex(average, minKelvin, maxKelvin) {
    return (average + 273.15 - minKelvin) / (maxKelvin - minKelvin);
  },

  getWarmColor(index) {
    const g = 255 - (index * 255);
    const a = 255 * index;
    return `rgba(255, ${g}, 0, ${a / 255})`; // Convert alpha to range [0, 1]
  },

  getColdColor(index) {
    const g = 255 - (255 - index * 255);
    const a = 1 - (index); // Convert alpha to range [0, 1]
    return `rgba(0, ${g}, 255, ${a})`; // Convert alpha to range [0, 1]
  },    
		createHistogram() {
			const urbanHeatData = this.propsStore.heatHistogramData;
			this.plotService.initializePlotContainer( 'heatHistogramContainer' );

			const margin = { top: 30, right: 30, bottom: 30, left: 30 };
			const width = 420 - margin.left - margin.right;
			const height = 220 - margin.top - margin.bottom;

			const svg = this.plotService.createSVGElement( margin, width, height, '#heatHistogramContainer' );

			let minDataValue = d3.min( urbanHeatData ) - 0.02;
			let maxDataValue = d3.max( urbanHeatData ) + 0.02;
			const x = this.plotService.createScaleLinear( minDataValue, maxDataValue, [ 0, width ] );
			const bins = d3.histogram().domain( x.domain() ).thresholds( x.ticks( 20 ) )( urbanHeatData );
			const y = this.plotService.createScaleLinear( 0, d3.max( bins, ( d ) => d.length ), [ height, 0 ] );

			this.plotService.setupAxes( svg, x, y, height );

			const tooltip = this.plotService.createTooltip( '#heatHistogramContainer' );

			if ( urbanHeatData && urbanHeatData[ 0 ] && urbanHeatData[ 0 ].toString().startsWith( '0' ) ) {

				this.createBars( svg, bins, x, y, height, tooltip, 'heatHistogramContainer', 
					d => `Heat exposure index: ${d.x0}<br>Amount of buildings: ${d.length}` );

				this.plotService.addTitle( svg, `Heat exposure to buildings in ${this.store.nameOfZone}`, width, margin );

			} else {

				this.createBars( svg, bins, x, y, height, tooltip, 'heatHistogramContainer', 
					d => `Temperature in Celsius: ${d.x0}<br>Amount of buildings: ${d.length}` );
				this.plotService.addTitle( svg, `${this.store.nameOfZone} buildings average surface temperature in Celsius`, width, margin );

			} 
		},
		clearHistogram() {
			// Remove or clear the D3.js visualization
			// Example:
			d3.select( '#heatHistogramContainer' ).select( 'svg' ).remove();
		},
	},
};
</script>
  
  <style>
  #heatHistogramContainer {
    position: fixed;
    top: 90px;
    left: 1px;
    width: 420px;
    height: 220px; 
    visibility: hidden;
    font-size: smaller;
    border: 1px solid black;
    box-shadow: 3px 5px 5px black; 
    background-color: white;
  }
  </style>