<template>
    <div id="pieChartContainer">
    </div>

    <select id="HSYSelect" @change="onHSYSelectChange">
    </select>
  </template>
  
<script>
import { eventBus } from '../services/eventEmitter.js';
import * as d3 from 'd3'; // Import D3.js
import { useGlobalStore } from '../stores/globalStore.js';
import Plot from '../services/plot.js'; 
  
export default {   
	data() {
		return {
			datasource: [],
		};
	},    
	mounted() {
		this.unsubscribe = eventBus.$on( 'newPieChart', this.newPieChart );
		this.store = useGlobalStore();
		this.plotService = new Plot();
	},
	beforeUnmount() {
		this.unsubscribe();
	},
	methods: {
		newPieChart( ) {
			if ( this.store.level == 'postalCode' ) {
				this.datasource = this.store.postalCodeData;
				this.populateHSYSelect();
				this.createPieChart( );
			} else {
				// Hide or clear the visualization when not visible
				// Example: call a method to hide or clear the D3 visualization
				this.clearPieChart();
			}
		},  

		extractNimiValues() {
			let nimiValuesSet = new Set();
			// Assuming dataSource._entityCollection._entities._array is the array you mentioned
			const entitiesArray = this.datasource._entityCollection._entities._array;

			// Check if entitiesArray exists and is an array
			if ( Array.isArray( entitiesArray ) ) {
				// Loop through each entity in the array
				for ( let i = 0; i < entitiesArray.length; i++ ) {
					const entity = entitiesArray[i];

					// Safely access the ._nimi._value property
					if ( entity && entity._properties && entity._properties._nimi && typeof entity._properties._nimi._value !== 'undefined' ) {
						nimiValuesSet.add( entity._properties._nimi._value );
					}
				}
			}
            
			return Array.from( nimiValuesSet ).sort();
		},

		populateHSYSelect() {
			document.getElementById( 'HSYSelect' ).style.visibility = 'visible';
			const selectElement = document.getElementById( 'HSYSelect' );
			const nimiValues = this.extractNimiValues();
			const fragment = document.createDocumentFragment();

			nimiValues.forEach( nimi => {
				const option = document.createElement( 'option' );
				option.textContent = nimi;
				option.value = nimi;
				fragment.appendChild( option );
			} );

			selectElement.appendChild( fragment );
		},

        		/**
 * Get total area of district properties by district data source name and district id and list of property keys
 * 
 * @param { Number } id Id of the district
 * @param { Array } propertyKeys - List of property keys to calculate the total area
 * 
 * @returns { Number } The total area 
*/
		getTotalAreaByNameAndPropertyKeys( name, propertyKeys ) {
    
			let totalArea = 0;
			const year = '2022';

			for ( let i = 0; i < this.datasource._entityCollection._entities._array.length; i++ ) {

				if ( this.datasource._entityCollection._entities._array[ i ]._properties._nimi._value == name ) {

					const entity = this.datasource._entityCollection._entities._array[ i ];
	
					propertyKeys.forEach( propertyKey => {

						if ( entity._properties.hasOwnProperty( propertyKey + '_' + year ) ) {

							totalArea += entity._properties[ propertyKey + '_' + year ]._value;

						}

					} );

					return totalArea;

				}

			}

			return totalArea;

		},

		onHSYSelectChange( ) {

			this.createPieChart( this.datasource );

		},

		/**
 * Get landcover data array for a specific major district
 * 
 * @param { string } majordistrict - Major district code
 * @returns { Array } Data array for the specified major district
 */
		getLandCoverDataForArea( name ) {

			let trees20 = this.getTotalAreaByNameAndPropertyKeys( name, [ 'tree20_m2' ] );
			let trees15 = this.getTotalAreaByNameAndPropertyKeys( name, [ 'tree15_m2' ] );
			let trees10 = this.getTotalAreaByNameAndPropertyKeys( name, [ 'tree10_m2' ] );
			let trees2 = this.getTotalAreaByNameAndPropertyKeys( name, [ 'tree2_m2' ] ); 
			let vegetation = this.getTotalAreaByNameAndPropertyKeys( name, [ 'vegetation_m2' ] );
			let water = this.getTotalAreaByNameAndPropertyKeys( name, [ 'water_m2' ] );
			let fields = this.getTotalAreaByNameAndPropertyKeys( name, [ 'field_m2' ] );
			let rock = this.getTotalAreaByNameAndPropertyKeys( name, [ 'rocks_m2' ] );
			let other = this.getTotalAreaByNameAndPropertyKeys( name, [ 'other_m2' ] );
			let bareland = this.getTotalAreaByNameAndPropertyKeys( name, [ 'bareland_m2' ] );
			let building = this.getTotalAreaByNameAndPropertyKeys( name, [ 'building_m2' ] );
			let dirtroad = this.getTotalAreaByNameAndPropertyKeys( name, [  'dirtroad_m2' ] );
			let pavedroad = this.getTotalAreaByNameAndPropertyKeys( name, [  'pavedroad_m2' ] );

			let totalArea = trees20 + trees15 + trees10 + trees2 + vegetation + water + fields + rock + other + bareland + building + dirtroad + pavedroad;

			return [ 
				( trees20 / totalArea ).toFixed( 3 ), 
				( trees15 / totalArea ).toFixed( 3 ), 
				( trees10 / totalArea ).toFixed( 3 ), 
				( trees2 / totalArea ).toFixed( 3 ), 
				( vegetation / totalArea ).toFixed( 3 ), 
				( water / totalArea ).toFixed( 3 ), 
				( fields / totalArea ).toFixed( 3 ), 
				( rock / totalArea ).toFixed( 3 ), 
				( other / totalArea ).toFixed( 3 ), 
				( bareland / totalArea ).toFixed( 3 ), 
				( building / totalArea ).toFixed( 3 ), 
				( dirtroad / totalArea ).toFixed( 3 ),
				( pavedroad / totalArea ).toFixed( 3 ) ];

		}, 

		createPie( svg, name, data, colors, arc, xOffset, yOffset, tooltip ) {
			// Drawing first pie chart
			svg.selectAll( name )
				.data( data )
				.enter().append( 'path' )
				.attr( 'fill', ( d, i ) => colors[i] )
				.attr( 'd', arc )
				.attr( 'transform', `translate(${xOffset}, ${yOffset})` ) // Adjusted positioning
				.on( 'mouseover', ( event, d ) => {
					this.plotService.handleMouseover( tooltip, 'pieChartContainer', event, d, 
						( data ) => `Area: ${data.data.zone}<br>Element: ${data.data.label}<br>${100 * data.data.value } % of HSY 2022 landcover` );
				} )
				.on( 'mouseout', () => this.plotService.handleMouseout( tooltip ) );
		},

		createPieChart( ) {

			this.plotService.initializePlotContainerForGrid( 'pieChartContainer' );

			// Assuming firstData and secondData are already fetched and processed
			const labels = [ 'trees20m', 'trees15-20m', 'trees10-15m', 'trees2-10m', 'vegetation', 'water', 'fields', 'rocks', 'other', 'bareland', 'buildings', 'dirtroads', 'pavedroads' ];
			const colors = [ '#326428', '#327728', '#328228', '#32a028', '#b2df43', '#6495ed', '#ffd980', '#bfbdc2', '#857976', '#cd853f', '#d80000', '#824513', '#000000' ];

			const firstData = this.getLandCoverDataForArea( this.store.nameOfZone._value );
			const selectedNimi = document.getElementById( 'HSYSelect' ).value; 
			const secondData = this.getLandCoverDataForArea( selectedNimi );
			const margin = {top: 20, right: 10, bottom: 10, left: 10};
			const width = 400 - margin.left - margin.right;
			const height = 200 - margin.top - margin.bottom;
			const radius = Math.min( width, height ) / 2.5; // Adjust as needed

			const pie = d3.pie().sort( null ).value( d => d.value );
			const arc = d3.arc().innerRadius( 0 ).outerRadius( radius );

			// First pie chart data setup
			const firstPieData = pie( firstData.map( ( value, index ) => ( { value: value, label: labels[index], zone: this.store.nameOfZone._value } ) ) );

			// Second pie chart data setup
			const secondPieData = pie( secondData.map( ( value, index ) => ( { value: value, label: labels[index], zone: selectedNimi } ) ) );

			const svg = this.plotService.createSVGElement( margin, width, height, '#pieChartContainer' );

			// Translate pies to be centered vertically and positioned horizontally
			const xOffsetFirstPie = width / 4; // Keeps existing horizontal positioning for the first pie
			const xOffsetSecondPie = 3 * width / 4; // Keeps existing horizontal positioning for the second pie
			const yOffset = height / 2; // New: Centers pies vertically

			// Initialize tooltip using the Plot service
			const tooltip = this.plotService.createTooltip( '#pieChartContainer' );
			this.createPie( svg, '.firstPie', firstPieData, colors, arc, xOffsetFirstPie, yOffset, tooltip );
			this.createPie( svg, '.secondPie', secondPieData, colors, arc, xOffsetSecondPie, yOffset, tooltip );
			this.plotService.addTitle( svg, `Compare HSY 2022 Landcover in ${this.store.nameOfZone} to:`, width / 2, margin );  
           
		},
		clearPieChart() {
			// Remove or clear the D3.js visualization
			// Example:
			d3.select( '#pieChartContainer' ).select( 'svg' ).remove();
		},
	},
};
</script>
  
  <style>
  #pieChartContainer {  
    position: fixed;
    top: 295px;
	right: 1px;
    width: 400px;
    height: 200px; 
    visibility: hidden;
    font-size: smaller;
    border: 1px solid black;
    box-shadow: 3px 5px 5px black; 
    background-color: white;
  }

  #HSYSelect {
    position: fixed;
    top: 295px;
    right: 1px;
    font-size: smaller;
    visibility: hidden;
}
  </style>