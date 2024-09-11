<template>
    <div id="surveyScatterPlot">
    </div>
  </template>
  
<script>
import { eventBus } from '../services/eventEmitter.js';
import * as d3 from 'd3'; // Import D3.js
import Plot from '../services/plot.js'; 
import { usePropsStore } from '../stores/propsStore';
import { useGlobalStore } from '../stores/globalStore';
  
export default {
	mounted() {
		this.unsubscribe = eventBus.on( 'newSurveyScatterPlot', this.newSurveyScatterPlot );
		this.plotService = new Plot();
	},
	beforeUnmount() {
		this.unsubscribe();
	},
	methods: {
		newSurveyScatterPlot(  ) {
			const store = useGlobalStore( );
			if ( store.view == 'grid' ) {
				this.createSurveyScatterPlot( );
			} else {
				this.clearSurveyScatterPlot();
			}
		},

		createSurveyScatterPlot( ) {
			const propsStore = usePropsStore( );
			const entities = propsStore.scatterPlotEntities;
			const containerId = 'surveyScatterPlot';
			this.plotService.initializePlotContainerForGrid( containerId );

			// Doubling the width and height for a larger diagram
			const margin = { top: 40, right: 20, bottom: 30, left: 40 },
				width = 500 - margin.left - margin.right, // Previously 300
				height = 300 - margin.top - margin.bottom; // Previously 200

			// Initialize SVG element using provided plot service method
			const svg = this.plotService.createSVGElement( margin, width, height, document.getElementById( containerId ) );

			// Adjusting to access nested properties
			const xValues = entities.map( d => d._properties.Paikan_kok );
			const yValues = entities.map( d => d._properties.avg_temp_c );

			// Creating scales with correct access to nested properties and adjusted yScale
			const xScale = this.plotService.createScaleLinear(
				d3.min( xValues ), 
				d3.max( xValues ), 
				[ 0, width ]
			);

			const yScale = this.plotService.createScaleLinear(
				d3.min( yValues ), // Start from min value
				d3.max( yValues ), // End at max value
				[ height, 0 ] // Keep this to invert the y-axis correctly
			);

			// Setup axes using provided method
			this.plotService.setupAxes( svg, xScale, yScale, height );

			// Create tooltip
			const tooltip = this.plotService.createTooltip( '#surveyScatterPlot' );

			// Data formatter for the tooltip, adjusted for nested properties
			const dataFormatter = d => `Paikan_kok: ${d._properties.Paikan_kok}<br>Temp in Celsius: ${d._properties.avg_temp_c}`;
			this.plotService.addTitle( svg, 'Espoo on the map: resident survey places in everyday life with heat exposure', width, margin );

			// Plot points, adjusted for nested properties
			svg.selectAll( '.dot' )
				.data( entities )
				.enter().append( 'circle' )
				.attr( 'class', 'dot' )
				.attr( 'cx', d => xScale( d._properties.Paikan_kok ) )
				.attr( 'cy', d => yScale( d._properties.avg_temp_c ) )
				.attr( 'r', 2 ) // Increase dot size for better visibility in the larger plot
				.style( 'fill', d => this.getOutlineColor( d._properties.Paikan_kok ) )
				.on( 'mouseover', ( event, d ) => this.plotService.handleMouseover( tooltip, containerId, event, d, dataFormatter ) )
				.on( 'mouseout', () => this.plotService.handleMouseout( tooltip ) );
		},

		getOutlineColor( value ) {
			if ( value >= 100 * 2 / 3 ) return 'green'; // Use appropriate color or method to convert from Cesium.Color
			if ( value >= 100 * 1 / 3 ) return 'yellow';
			return value ? 'red' : null;
		},

		clearSurveyScatterPlot() {
			// Remove or clear the D3.js visualization
			// Example:
			d3.select( '#surveyScatterPlot' ).select( 'svg' ).remove();
		},
	},
};
</script>
  
  <style>
  #surveyScatterPlot {
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