<template>
    <div id="socioeonomicsContainer">
    </div>

    <select id="areaSelect" @change="onAreaSelectChange">
    </select>
</template>
  
<script>
import { eventBus } from '../services/eventEmitter.js';
import * as d3 from 'd3'; // Import D3.js
import { useGlobalStore } from '../stores/globalStore.js';
import { useSocioEconomicsStore } from '../stores/socioEconomicsStore.js';
import { useHeatExposureStore } from '../stores/heatExposureStore.js';
import Plot from '../services/plot.js'; 

export default {
	mounted() {
		this.unsubscribe = eventBus.$on( 'newSocioEconomicsDiagram', this.newSocioEconomicsDiagram );
		this.store = useGlobalStore();
		this.socioEconomicsStore = useSocioEconomicsStore();
		this.heatExposureStore = useHeatExposureStore();
		this.plotService = new Plot();
  
	},
	beforeUnmount() {
		this.unsubscribe();
	},
	methods: {
		newSocioEconomicsDiagram( newData ) {
                        
			if ( newData && this.store.level == 'postalCode'  ) {
				this.populateSelectFromStore();
				const dataForPostcode = this.socioEconomicsStore.getDataByPostcode( newData );
				const statsData = this.findSocioEconomicsStats();
				this.createSocioEconomicsDiagram( dataForPostcode, statsData );

			} else {
				// Hide or clear the visualization when not visible
				// Example: call a method to hide or clear the D3 visualization
				this.clearDiagram();
			}
		},
    
		/**
 * Fetches heat vulnerable demographic statistical data from store 
 *
 */
		findSocioEconomicsStats() {

			if ( this.store.view == 'capitalRegion' ) {

				return this.socioEconomicsStore.regionStatistics;

			} else {

				return this.socioEconomicsStore.helsinkiStatistics;
			}

		},

		// 3. Setup Axes
		setupAxes( svg, xScale, yScale, height ) {
			svg.append( 'g' )
				.attr( 'transform', `translate(0, ${height})` )
				.call( d3.axisBottom( xScale ) )
				.selectAll( '.tick text' )
				.call( this.wrapText, xScale.bandwidth() ); // Wraps text if it's long

			svg.append( 'g' ).call( d3.axisLeft( yScale ) );
		},

		// Helper for wrapping text (can be improved for more general use)
		wrapText( text, width ) {
			text.each( function() {
				const text = d3.select( this );
				const words = text.text().split( /\s+/ ).reverse();
				let word, line = [], lineNumber = 0, lineHeight = 1.1; // ems
				const y = text.attr( 'y' );
				const dy = parseFloat( text.attr( 'dy' ) );
				let tspan = text.text( null ).append( 'tspan' ).attr( 'x', 0 ).attr( 'y', y ).attr( 'dy', dy + 'em' );

				while ( word = words.pop() ) {
					line.push( word );
					tspan.text( line.join( ' ' ) );
					if ( tspan.node().getComputedTextLength() > width ) {
						line.pop();
						tspan.text( line.join( ' ' ) );
						line = [ word ];
						tspan = text.append( 'tspan' ).attr( 'x', 0 ).attr( 'y', y ).attr( 'dy', ++lineNumber * lineHeight + dy + 'em' ).text( word );
					}
				}
			} );
		},

		// Updated to include xOffset and barColor parameters
		createBars( svg, data, xScale, yScale, height, tooltip, xOffset, barColor, name ) {
			const barWidth = xScale.bandwidth() / 2; // Make bars narrower

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
					this.plotService.handleMouseover( tooltip, 'socioeonomicsContainer', event, d, 
						( data ) => `Area: ${name}<br>Indicator: ${data.label}<br>Value: ${data.value}` ) )
				.on( 'mouseout', () => this.plotService.handleMouseout( tooltip ) );
		},

		calculateTotalChildrenAndEldery( data ) {

			const totalChildren = data.he_0_2 + data.he_3_6 + data.he_7_12;
			const totalEldery = data.he_65_69 + data.he_70_74 + data.he_80_84 + data.he_85_;

			return { totalChildren: totalChildren, totalEldery: totalEldery };

		},

		/**
 * Creates SocioEconomics histogram for a postal code area.
 *
 * @param { object } sosData socioeconomic data used for creating the diagram
 */
		createSocioEconomicsDiagram( sosData, statsData ) {
			if ( sosData ) {

				this.plotService.initializePlotContainer( 'socioeonomicsContainer' );

				const margin = { top: 20, right: 30, bottom: 50, left: 30 };
				const width = 460 - margin.left - margin.right;
				const height = 200 - margin.top - margin.bottom;

				const svg = this.plotService.createSVGElement( margin, width, height, '#socioeonomicsContainer' );

				const xLabels = [
					'Apartment Heat Exposure',
					'% of Children & Elderly',
					'% of Children',
					'% of Elderly',
					'% of Unemployed',
					'Small Apartment Size',
					'% with Basic Education',
					'Low Income',
					'% of Rentals'
				];

				// Get the second area's data based on the selected nimi
				const selectedNimi = document.getElementById( 'areaSelect' ).value || 'Kruunuvuorenranta';
				const compareData = this.socioEconomicsStore.getDataByNimi( selectedNimi );
				const heatData = this.store.averageHeatExposure.toFixed( 3 );
				const yValues = this.calculateYValues( sosData, statsData, heatData );
				const compareHeatData = this.helsinkiOrCapitalHeatExposure( this.heatExposureStore.getDataById( compareData.postinumeroalue ) );
				const compareValues = this.calculateYValues( compareData, statsData, compareHeatData );       

				const xScale = this.plotService.createScaleBand( xLabels, width );  
				const yScale = this.plotService.createScaleLinear( 0, d3.max( yValues ), [ height, 0 ] ); 
				this.setupAxes( svg, xScale, yScale, height );

				const barData = yValues.map( ( value, index ) => ( { value, label: xLabels[index] } ) );
				const compareBarData = compareValues.map( ( value, index ) => ( { value, label: xLabels[index] } ) );

				const tooltip = this.plotService.createTooltip( '#socioeonomicsContainer' );
				// Original dataset bars (light blue)
				this.createBars( svg, barData, xScale, yScale, height, tooltip, 0, 'lightblue', sosData.nimi );

				// Additional dataset bars (orange), with an xOffset to place them next to the original bars
				const xOffsetForCompareData = xScale.bandwidth() / 2; // Adjust as needed for proper spacing
				this.createBars( svg, compareBarData, xScale, yScale, height, tooltip, xOffsetForCompareData, 'orange', selectedNimi );

				this.plotService.addTitle( svg, `Compare vulnerability in ${this.store.nameOfZone} to:`, width / 2, margin );

			}
		},

		// Normalize values based on stats
		normalizeValue( value, min, max ) {
			return ( value - min ) / ( max - min );
		},

		// Calculate yValues for the diagram
		calculateYValues( data, statsData, heatData ) {
			const { totalChildren, totalEldery } = this.calculateTotalChildrenAndEldery( data );
			return [
				heatData,
				( ( totalChildren + totalEldery ) / data.he_vakiy ).toFixed( 3 ),
				( totalChildren / data.he_vakiy ).toFixed( 3 ),
				( totalEldery / data.he_vakiy ).toFixed( 3 ),
				( data.pt_tyott / data.he_vakiy ).toFixed( 3 ),
				1 - this.normalizeValue( data.ra_as_kpa, statsData.ra_as_kpa.min, statsData.ra_as_kpa.max ).toFixed( 3 ),
				( data.ko_perus / data.ko_ika18y ).toFixed( 3 ),
				1 - this.normalizeValue( data.hr_ktu, statsData.hr_ktu.min, statsData.hr_ktu.max ).toFixed( 3 ),
				( data.te_vuok_as / data.te_taly ).toFixed( 3 )
			];
		},

		/**
 * Returns correct average heat exposure value of postal code area based on view the diagram is created from.
 * 
 * @param {Object} heatData - The averarage heat exposure for postal code region
 */
		helsinkiOrCapitalHeatExposure( heatData ) {

			const metropolitanView = document.getElementById( 'capitalRegionViewToggle' ).checked;

			if ( metropolitanView ) {

				return heatData.properties.avgheatexposure.toFixed( 3 );

			} else {

				return heatData.properties.hki_avgheatexposure.toFixed( 3 );
			}

		},

		/**
 * Populate a <select> element with options based on the 'nimi' attribute of socioEconomics store
 * 
 * @param {string} selectElementId - The ID of the <select> element to populate.
 * @param {string} currentValue - The currently selected value 
 */
		populateSelectFromStore() {
			document.getElementById( 'areaSelect' ).style.visibility = 'visible';
			const selectElement = document.getElementById( 'areaSelect' );
			const nimiValues = this.getNimiDataFromStore();

			// Clear existing options first
			selectElement.innerHTML = '';

			// Populate with nimi values
			nimiValues.forEach( nimi => {
				const option = document.createElement( 'option' );
				option.textContent = nimi;
				option.value = nimi;
				selectElement.appendChild( option );
			} );
		},

		getNimiDataFromStore( ) {

			if ( this.store.view == 'capitalRegion' ) {

				return this.socioEconomicsStore.getNimiForCapital();

			} else {

				return this.socioEconomicsStore.getNimiForHelsinki();
			}
		},

		onAreaSelectChange( ) {
			const dataForPostcode = this.socioEconomicsStore.getDataByPostcode( this.store.postalcode );
			const statsData = this.findSocioEconomicsStats();
			this.createSocioEconomicsDiagram( dataForPostcode, statsData );

		},

		clearDiagram() {
			// Remove or clear the D3.js visualization
			// Example:
			d3.select( '#socioeonomicsContainer' ).select( 'svg' ).remove();
			document.getElementById( 'areaSelect' ).style.visibility = 'hidden';
		},
	},
};
</script>
  
  <style>
 #socioeonomicsContainer
{
	position: fixed;
	top: 90px;
	right: 1px;
	width: 500px;
	height: 200px; 
	visibility: hidden;
	
	font-size: smaller;
	
	border: 1px solid black;
	box-shadow: 3px 5px 5px black; 
    background-color: white;

}

#areaSelect {
    position: fixed;
    top: 90px; /* Margin from the content below */
    right: 1px;
    font-size: smaller;
    visibility: hidden;
}
  </style>