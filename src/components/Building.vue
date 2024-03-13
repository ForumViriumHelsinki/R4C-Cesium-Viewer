<template>
    <div id="buildingChartContainer">
    </div>

    <div id="buildingTreeChartContainer">
    </div>

  </template>
  
<script>
import { eventBus } from '../services/eventEmitter.js';
import * as d3 from 'd3'; // Import D3.js
import { useGlobalStore } from '../stores/globalStore.js';
import Plot from '../services/plot.js'; 
import Address from '../services/address.js';
  
export default {
	mounted() {
		this.unsubscribe = eventBus.$on( 'newBuildingHeat', this.newBuildingHeat );
		this.unsubscribe = eventBus.$on( 'newBuildingTree', this.newBuildingTree );
		this.unsubscribe = eventBus.$on( 'newBuildingGridChart', this.newBuildingGridChart );
		this.store = useGlobalStore();
		this.plotService = new Plot();
		this.addressService = new Address();

	},
	beforeUnmount() {
		this.unsubscribe();
	},
	methods: {
		newBuildingGridChart( buildingProps ) {
			if ( buildingProps ) {
				this.createBuildingGridChart( buildingProps );
			} else {
				// Hide or clear the visualization when not visible
				// Example: call a method to hide or clear the D3 visualization
				this.clearBuildingBarChart();
			}
		},
		newBuildingHeat( buildingHeatExposure, address, postinumero ) {
			if ( buildingHeatExposure ) {
				this.createBuildingBarChart( buildingHeatExposure, address, postinumero );
			} else {
				// Hide or clear the visualization when not visible
				// Example: call a method to hide or clear the D3 visualization
				this.clearBuildingBarChart();
			}
		},
		newBuildingTree( treeArea, address, postinumero ) {
			if ( postinumero ) {
				this.createBuildingTreeBarChart( treeArea, address, postinumero );
			} else {
				// Hide or clear the visualization when not visible
				// Example: call a method to hide or clear the D3 visualization
				this.clearBuildingTreeBarChart();
			}
		},

		createBuildingGridChart( buildingProps ) {

			this.plotService.initializePlotContainerForGrid( 'buildingChartContainer' );
			const margin = { top: 50, right: 20, bottom: 30, left: 40 };
			const width = 300 - margin.left - margin.right;
			const height = 250 - margin.top - margin.bottom;
			const address = this.addressService.findAddressForBuilding( buildingProps );


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
			this.plotService.addTitle( svg, 'Population approximation for ' + address, width, margin );
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
		/**
 * Create building specific bar chart.
 *
 */
		createBuildingBarChart( buildingHeatExposure, address, postinumero ) {
			this.plotService.initializePlotContainer( 'buildingChartContainer' );

			const postalCodeHeat = this.getPostalCodeHeat();

			const margin = { top: 70, right: 30, bottom: 30, left: 60 };
			const width = 300 - margin.left - margin.right;
			const height = 250 - margin.top - margin.bottom;

			const svg = this.plotService.createSVGElement( margin, width, height, '#buildingChartContainer' );

			const xScale = this.plotService.createScaleBand( [ address, postinumero ], width );
			const yScale = this.plotService.createScaleLinear( 0, Math.max( buildingHeatExposure, postalCodeHeat ), [ height, 0 ] );

			// Create bars and labels
			const data = [
				{ name: address, value: buildingHeatExposure.toFixed( 3 ) },
				{ name: postinumero, value: postalCodeHeat.toFixed( 3 ) }
			];
			const colors = { [address]: 'orange', [postinumero]: 'steelblue' };

			this.createBarsWithLabels( svg, data, xScale, yScale, height, colors );

			this.plotService.setupAxes( svg, xScale, yScale, height );

			if ( this.store.view == 'helsinki' ) {

				this.plotService.addTitle( svg, 'Urban Heat Exposure Index Comparison', width, margin );
    
			} else {

				this.plotService.addTitle( svg, 'Temperature in Celsius Comparison', width, margin );

			}
		},

		/**
 * Returns either heat exposure or temperature in Celsius of postal code area.
 *
 */
		getPostalCodeHeat() {

			if ( this.store.view == 'helsinki' ) {

				return this.store.averageHeatExposure;

			} else {

				let tempInKelvin = this.store.averageHeatExposure * ( this.store.maxKelvin - this.store.minKelvin ) + this.store.minKelvin;

				return tempInKelvin - 273.15;

			}

		},
		/**
 * Create building specific bar chart.
 *
 */
		createBuildingTreeBarChart( treeArea, address, postinumero ) {
			this.plotService.initializePlotContainer( 'buildingTreeChartContainer' );

			const margin = { top: 70, right: 30, bottom: 30, left: 60 };
			const width = 300 - margin.left - margin.right;
			const height = 200 - margin.top - margin.bottom;

			const svg = this.plotService.createSVGElement( margin, width, height, '#buildingTreeChartContainer' );

			const xScale = this.plotService.createScaleBand( [ address, postinumero ], width );
			const yScale = this.plotService.createScaleLinear( 0, Math.max( treeArea, this.store.averageTreeArea ), [ height, 0 ] );

			// Create bars and labels
			const data = [
				{ name: address, value: treeArea.toFixed( 3 ) },
				{ name: postinumero, value: this.store.averageTreeArea.toFixed( 3 ) }
			];
			const colors = { [address]: 'green', [postinumero]: 'yellow' };

			this.createBarsWithLabels( svg, data, xScale, yScale, height, colors );

			this.plotService.setupAxes( svg, xScale, yScale, height );

			this.plotService.addTitle( svg, 'Nearby tree area comparison', width, margin );
		},

		createBarsWithLabels( svg, data, xScale, yScale, height, colors ) {
			svg.selectAll( '.bar' )
				.data( data )
				.enter().append( 'rect' )
				.attr( 'class', 'bar' )
				.attr( 'x', d => xScale( d.name ) )
				.attr( 'width', xScale.bandwidth() )
				.attr( 'y', d => yScale( d.value ) )
				.attr( 'height', d => height - yScale( d.value ) )
				.style( 'fill', d => colors[d.name] );

			svg.selectAll( '.label' )
				.data( data )
				.enter().append( 'text' )
				.attr( 'class', 'label' )
				.attr( 'x', d => xScale( d.name ) + xScale.bandwidth() / 2 )
				.attr( 'y', d => yScale( d.value ) - 5 )
				.attr( 'text-anchor', 'middle' )
				.text( d => d.value );
		},
		clearBuildingBarChart() {
			// Remove or clear the D3.js visualization
			// Example:
			d3.select( '#buildingChartContainer' ).select( 'svg' ).remove();
		},

		clearBuildingTreeBarChart() {
			// Remove or clear the D3.js visualization
			// Example:
			d3.select( '#buildingTreeChartContainer' ).select( 'svg' ).remove();
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
    top: 80px;
    left: 10px;
    width: 300px;
    height: 250px; 
    visibility: hidden;
    font-size: smaller;
    border: 1px solid black;
    box-shadow: 3px 5px 5px black; 
    background-color: white;
  }
  </style>