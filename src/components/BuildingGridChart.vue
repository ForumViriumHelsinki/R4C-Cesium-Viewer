<template>
    <div id="buildingChartContainer">
    </div>
  </template>
  
<script>
import { eventBus } from '../services/eventEmitter.js';
import * as d3 from 'd3'; // Import D3.js
import { useGlobalStore } from '../stores/globalStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import Plot from '../services/plot.js'; 
  
export default {
	computed: {
		shouldShowBuilding() {
			const store = useGlobalStore(); // Get access to the global store
			return store.level === 'building';
		}
	},
	watch: {
		shouldShowBuilding( newValue ) {
			if ( !newValue ) {
				document.getElementById( 'buildingChartContainer' ).style.visibility = 'hidden';
			}
		}
	},
	mounted() {
		this.unsubscribe = eventBus.on( 'newBuildingGridChart', this.newBuildingGridChart );
		this.store = useGlobalStore();
		this.toggleStore  = useToggleStore();
		this.propsStore  = usePropsStore();
		this.plotService = new Plot();
	},
	beforeUnmount() {
		this.unsubscribe();
	},
	methods: {	
		newBuildingGridChart( ) {
			if ( this.propsStore.gridBuildingProps && this.store.view == 'grid' ) {
				this.createBuildingGridChart( this.propsStore.gridBuildingProps );
			} else {
				// Hide or clear the visualization when not visible
				// Example: call a method to hide or clear the D3 visualization
				this.clearBuildingBarChart();
			}
		},	

		createBuildingGridChart( buildingProps ) {

			this.plotService.initializePlotContainerForGrid( 'buildingChartContainer' );
			const margin = { top: 50, right: 20, bottom: 30, left: 40 };
			const width = 300 - margin.left - margin.right;
			const height = 250 - margin.top - margin.bottom;

			// Prepare the data array from buildingProps
			const data = [
				{ label: '0-9', value: buildingProps._pop_d_0_9._value },
				{ label: '10-19', value: buildingProps._pop_d_10_19._value },
				{ label: '20-29', value: buildingProps._pop_d_20_29._value },
				{ label: '30-39', value: buildingProps._pop_d_30_39._value },
				{ label: '40-49', value: buildingProps._pop_d_40_49._value },
				{ label: '50-59', value: buildingProps._pop_d_50_59._value },
				{ label: '60-69', value: buildingProps._pop_d_60_69._value },
				{ label: '70-79', value: buildingProps._pop_d_70_79._value },
				{ label: '80-', value: buildingProps._pop_d_over80._value }
			];

			// Create SVG element
			const svg = this.plotService.createSVGElement( margin, width, height, '#buildingChartContainer' );

			// Create scales
			const xScale = this.plotService.createScaleBand( data.map( d => d.label ), width );
			const yScale = this.plotService.createScaleLinear( 0, d3.max( data, d => d.value ), [ height, 0 ] );

			// Setup axes
			this.plotService.setupAxes( svg, xScale, yScale, height );
			const tooltip = this.plotService.createTooltip( '#buildingChartContainer' );

			// Create the bars
			this.createBars( svg, data, xScale, yScale, height, tooltip, 0, 'steelblue' );

			// Add labels to the x-axis
			svg.append( 'g' )
				.attr( 'transform', `translate(0, ${height})` )
				.call( d3.axisBottom( xScale ) )
				.selectAll( 'text' )
				.style( 'display', 'none' ); // Hide the text labels

			// Add chart title
			this.plotService.addTitle( svg, 'Population approximation for ' + this.store.buildingAddress, width, margin );
		}, 
		// Updated to include xOffset and barColor parameters
		createBars( svg, data, xScale, yScale, height, tooltip, xOffset, barColor ) {
			const barWidth = xScale.bandwidth();

			const bar = svg.selectAll( `.bar.${barColor}` )
				.data( data )
				.enter()
				.append( 'g' )
				.attr( 'class', `bar ${barColor}` )
				.attr( 'transform', d => `translate(${xScale( d.label ) + xOffset}, 0)` ); // Adjust position based on xOffset

			bar.append( 'rect' )
				.attr( 'x', 0 )
				.attr( 'y', d => yScale( d.value ) )
				.attr( 'width', barWidth ) // Use the narrower width
				.attr( 'height', d => height - yScale( d.value ) )
				.attr( 'fill', barColor )
				.on( 'mouseover', ( event, d ) => 
					this.plotService.handleMouseover( tooltip, 'buildingChartContainer', event, d, 
						( data ) => `Age ${data.label}: ${( data.value * 100 ).toFixed( 2 )} %` ) )
				.on( 'mouseout', () => this.plotService.handleMouseout( tooltip ) );
		},     

		clearBuildingBarChart() {
			// Remove or clear the D3.js visualization
			// Example:
			d3.select( '#buildingChartContainer' ).select( 'svg' ).remove();
		},
	},
};

</script>
  
  <style>
  #buildingChartContainer {
    position: fixed;
    top: 80px;
    left: 1px;
    width: 300px;
    height: 250px; 
    visibility: hidden;
    font-size: smaller;
    border: 1px solid black;
    box-shadow: 3px 5px 5px black; 
    background-color: white;
  }
  </style>