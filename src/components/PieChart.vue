<!-- Piechart.vue -->
<template>
  <div id="pieChartContainer"/>
</template>

<script setup>
import * as d3 from 'd3';
import { onMounted, onBeforeUnmount } from 'vue';
import Plot from '../services/plot.js';
import { useBackgroundMapStore } from '../stores/backgroundMapStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import { useGlobalStore } from '../stores/globalStore.js';
import { eventBus } from '../services/eventEmitter.js';

// Pinia store
const backgroundMapStore = useBackgroundMapStore();
const globalStore = useGlobalStore();
const propsStore = usePropsStore();

const createPieChart = ( ) => {

	const datasource = propsStore.postalCodeData;
	const nameOfZone = globalStore.nameOfZone._value;
	const year = backgroundMapStore.hsyYear;
	const area = backgroundMapStore.hsySelectArea;

	const plotService = new Plot();
	plotService.initializePlotContainerForGrid( 'pieChartContainer' );

	// Assuming firstData and secondData are already fetched and processed
	const labels = [ 'Trees 20m+', 'Trees 15-20m', 'Trees 10-15m', 'Trees2 -10m', 'Vegetation', 'Water', 'Fields', 'Rocks', 'Other', 'Bareland', 'Buildings', 'Dirtroads', 'Pavedroads' ];
	const colors = [ '#326428', '#327728', '#328228', '#32a028', '#b2df43', '#6495ed', '#ffd980', '#bfbdc2', '#857976', '#cd853f', '#d80000', '#824513', '#000000' ];

	const firstData = getLandCoverDataForArea( nameOfZone, year, datasource );
	const secondData = getLandCoverDataForArea( area, year, datasource );

	const margin = {top: 10, right: 10, bottom: 10, left: 10};
	const width = globalStore.navbarWidth - margin.left - margin.right;
	const height = 220 - margin.top - margin.bottom;
	const radius = Math.min( width, height ) / 3; // Adjust as needed

	const pie = d3.pie().sort( null ).value( d => d.value );
	const arc = d3.arc().innerRadius( 0 ).outerRadius( radius );

	// First pie chart data setup
	const firstPieData = pie( firstData.map( ( value, index ) => ( { value: value, label: labels[index], zone: nameOfZone } ) ) );

	// Second pie chart data setup
	const secondPieData = pie( secondData.map( ( value, index ) => ( { value: value, label: labels[index], zone: area } ) ) );

	const svg = plotService.createSVGElement( margin, width, height, '#pieChartContainer' );

	// Translate pies to be centered vertically and positioned horizontally
	const xOffsetFirstPie = width / 6.5; // Keeps existing horizontal positioning for the first pie
	const xOffsetSecondPie = width / 1.8; // Keeps existing horizontal positioning for the second pie
	const yOffset = height / 1.6; // New: Centers pies vertically

	// Initialize tooltip using the Plot service
	const tooltip = plotService.createTooltip( '#pieChartContainer' );
	createPie( svg, '.firstPie', firstPieData, colors, arc, xOffsetFirstPie, yOffset, tooltip, plotService );
	createPie( svg, '.secondPie', secondPieData, colors, arc, xOffsetSecondPie, yOffset, tooltip, plotService );
	plotService.addTitleWithLink(
		svg,
    	`Compare <a href="https://www.hsy.fi/en/environmental-information/open-data/avoin-data---sivut/helsinki-region-land-cover-dataset/"
        	target="_blank">HSY landcover</a> in ${nameOfZone} to:`,
    	margin.left,
    	margin.top
	);
};

const clearPieChart = ()  => {
	// Remove or clear the D3.js visualization
	// Example:
	d3.select( '#pieChartContainer' ).select( 'svg' ).remove();
};
        		/**
 * Get total area of district properties by district data source name and district id and list of property keys
 *
 * @param { Number } id Id of the district
 * @param { Array } propertyKeys - List of property keys to calculate the total area
 * @param { Number } year user selected year
 * @param { Object } datasource postalcode datasource
 *
 * @returns { Number } The total area
*/
const getTotalAreaByNameAndPropertyKeys = ( name, propertyKeys, year, datasource ) =>
	datasource._entityCollection._entities._array
		.filter( ( { _properties } ) => _properties._nimi._value === name )
		.reduce( ( total, { _properties } ) =>
			total + propertyKeys.reduce( ( sum, key ) =>
				sum + ( _properties[`${ key }_${ year }`]?._value || 0 ), 0 ), 0 );

/**
 * Get landcover data array for a specific area
 *
 * @param { string } name - name of the area
 * @param { Number } year user selected year
 * @param { Object } datasource postalcode datasource
 *
 * @returns { Array } Data array for the specified area
 */
const getLandCoverDataForArea = ( name, year, datasource ) => {
	const propertyKeys = [
		'tree20_m2', 'tree15_m2', 'tree10_m2', 'tree2_m2', 'vegetation_m2',
		'water_m2', 'field_m2', 'rocks_m2', 'other_m2', 'bareland_m2',
		'building_m2', 'dirtroad_m2', 'pavedroad_m2'
	];

	const areas = propertyKeys.map( key => getTotalAreaByNameAndPropertyKeys( name, [ key ], year, datasource ) );
	const totalArea = areas.reduce( ( sum, area ) => sum + area, 0 );

	return areas.map( area => ( area / totalArea ) );
};

const createPie = ( svg, name, data, colors, arc, xOffset, yOffset, tooltip, plotService ) => {
	// Drawing first pie chart
	svg.selectAll( name )
		.data( data )
		.enter().append( 'path' )
		.attr( 'fill', ( d, i ) => colors[i] )
		.attr( 'd', arc )
		.attr( 'transform', `translate(${xOffset}, ${yOffset})` ) // Adjusted positioning
		.on( 'mouseover', ( event, d ) => {
			plotService.handleMouseover( tooltip, 'pieChartContainer', event, d,
				( data ) => `${data.data.label} cover ${ ( 100 * data.value ).toFixed( 1 ) } % of the land in ${data.data.zone}` );
		} )
		.on( 'mouseout', () => plotService.handleMouseout( tooltip ) );
};

const recreatePieChart = () => {
	clearPieChart();
	createPieChart();
};

onMounted( () => {
	eventBus.on( 'recreate piechart', recreatePieChart );
} );

onBeforeUnmount( () => {
	clearPieChart();
	eventBus.off( 'recreate piechart', recreatePieChart );
} );

</script>
