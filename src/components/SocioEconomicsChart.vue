<template>
  <div id="socioeonomicsContainer"></div>
</template>

<script>
import { onMounted, onBeforeUnmount } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import { useSocioEconomicsStore } from '../stores/socioEconomicsStore.js';
import { useHeatExposureStore } from '../stores/heatExposureStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import { eventBus } from '../services/eventEmitter.js';
import * as d3 from 'd3'; // Import D3.js
import Plot from '../services/plot.js';

export default {
	setup() {
		const globalStore = useGlobalStore();
		const toggleStore = useToggleStore();
		const socioEconomicsStore = useSocioEconomicsStore();
		const heatExposureStore = useHeatExposureStore();
		const propsStore = usePropsStore();
		const plotService = new Plot();

		onMounted( () => {
		    newSocioEconomicsDiagram();
      	eventBus.on( 'updateSocioEconomics', newSocioEconomicsDiagram ); // Listen to the event
		} );

		onBeforeUnmount( () => {
			// Unsubscribe from the eventBus when component is destroyed
			eventBus.off( 'updateSocioEconomics', newSocioEconomicsDiagram );
		} );

		const newSocioEconomicsDiagram = () => {
			const dataForPostcode = socioEconomicsStore.getDataByPostcode( globalStore.postalcode );
			const statsData = findSocioEconomicsStats();
			createSocioEconomicsDiagram( dataForPostcode, statsData );
		};

		const findSocioEconomicsStats = () => {
			return globalStore.view === 'capitalRegion'
				? socioEconomicsStore.regionStatistics
				: socioEconomicsStore.helsinkiStatistics;
		};

		const setupAxes = ( svg, xScale, yScale, height ) => {
			svg.append( 'g' )
				.attr( 'transform', `translate(0, ${height})` )
				.call( d3.axisBottom( xScale ) )
				.selectAll( '.tick text' )
				.call( wrapText, xScale.bandwidth() ); // Wraps text if it's long

			svg.append( 'g' ).call( d3.axisLeft( yScale ) );
		};

		const labelDescriptions = {
			'Apartment Heat Exposure': 'Average heat exposure for apartments.',
			'Apartment Cold Exposure': 'Average surface temperature of residential buildings during cold periods (Landsat data).',
			'Apartment Surface Heat': 'Average surface temperature of residential buildings (Landsat data).',
			'Children and Elderly %': 'Percentage of the population aged 0-12 and 65+.',
			'Children %': 'Percentage of the population aged 0-12.',
			'Elderly %': 'Percentage of the population aged 65 and over.',
			'Unemployed rate': 'Percentage of the population that is unemployed. Higher values indicate higher unemployment rates.',
			'Size of Apartments': 'Relative size of apartments. Higher values indicate smaller apartment sizes.',
			'Basic Education %': 'Percentage of the population with only basic education. Higher values indicate lower education levels.',
			'Income': 'Relative income level in the area. Higher values indicate lower income levels.',
			'Rentals %': 'Percentage of residential properties that are rented. Higher values indicate a higher proportion of rentals.'
		};

		const wrapText = ( text, width ) => {
			text.each( function () {
				const text = d3.select( this );
				const words = text.text().split( /\s+/ ).reverse();
				let word;
				let line = [];
				let lineNumber = 0;
				let lineHeight = 1.1; // ems
				const y = text.attr( 'y' );
				const dy = parseFloat( text.attr( 'dy' ) );
				let tspan = text.text( null ).append( 'tspan' ).attr( 'x', 0 ).attr( 'y', y ).attr( 'dy', dy + 'em' );

				while ( ( word = words.pop() ) ) {
					line.push( word );
					tspan.text( line.join( ' ' ) );
					if ( tspan.node().getComputedTextLength() > width ) {
						line.pop();
						tspan.text( line.join( ' ' ) );
						line = [ word ];
						tspan = text
							.append( 'tspan' )
							.attr( 'x', 0 )
							.attr( 'y', y )
							.attr( 'dy', ++lineNumber * lineHeight + dy + 'em' )
							.text( word );
					}
				}
			} );
		};

		const createBars = ( svg, data, xScale, yScale, height, tooltip, xOffset, barColor, name ) => {
			const barWidth = xScale.bandwidth() / 2; // Make bars narrower

			const bar = svg
				.selectAll( `.bar.${barColor}` )
				.data( data )
				.enter()
				.append( 'g' )
				.attr( 'class', `bar ${barColor}` )
				.attr( 'transform', ( d ) => `translate(${xScale( d.label ) + xOffset}, 0)` ); // Adjust position based on xOffset

			bar.append( 'rect' )
				.attr( 'x', 0 )
				.attr( 'y', ( d ) => yScale( d.value ) )
				.attr( 'width', barWidth ) // Use the narrower width
				.attr( 'height', ( d ) => height - yScale( d.value ) )
				.attr( 'fill', barColor )
				.on( 'mouseover', ( event, d ) => {
					// Get the description for the label
					const description = labelDescriptions[d.label] || d.label;
      
					plotService.handleMouseover(
						tooltip,
						'socioeonomicsContainer',
						event,
						d,
						( data ) => `Area: ${name}<br>Value: ${data.value}<br>${description}`
					);
				} )
				.on( 'mouseout', () => plotService.handleMouseout( tooltip ) );
		};

		const calculateTotalChildrenAndEldery = ( data ) => {
			const totalChildren = data.he_0_2 + data.he_3_6 + data.he_7_12;
			const totalEldery = data.he_65_69 + data.he_70_74 + data.he_80_84 + data.he_85_;
			return { totalChildren, totalEldery };
		};

		const createSocioEconomicsDiagram = ( sosData, statsData ) => {
			if ( sosData ) {
				plotService.initializePlotContainerForGrid( 'socioeonomicsContainer' );

				const margin = { top: 90, right: 5, bottom: 50, left: 24 };
				const width = 450 - margin.left - margin.right;
				const height = 250 - margin.top - margin.bottom;

				const svg = plotService.createSVGElement( margin, width, height, '#socioeonomicsContainer' );

				let xLabels = [
					'Apartment Surface Heat',
					'Children and Elderly %',
					'Children %',
					'Elderly %',
					'Unemployed rate',
					'Size of Apartments',
					'Basic Education',
					'Income',
					'Rentals %',
				];

				if ( toggleStore.capitalRegionCold ) xLabels[0] = 'Apartment Cold Exposure';
				if ( toggleStore.helsinkiView ) xLabels[0] = 'Apartment Heat Exposure';

				const selectedNimi = propsStore.socioEconomics;
				const compareData = socioEconomicsStore.getDataByNimi( selectedNimi );
				const heatData = toggleStore.capitalRegionCold
					? 1 - globalStore.averageHeatExposure.toFixed( 3 ) // Use cold exposure data if cold toggle is active
					: globalStore.averageHeatExposure.toFixed( 3 ); // Use heat exposure data

				const yValues = calculateYValues( sosData, statsData, heatData );
				const compareHeatData = helsinkiOrCapitalHeatExposure(
					heatExposureStore.getDataById( compareData.postinumeroalue )
				);
				const compareValues = calculateYValues( compareData, statsData, compareHeatData );

				const xScale = plotService.createScaleBand( xLabels, width );
				const yScale = plotService.createScaleLinear( 0, d3.max( yValues ), [ height, 0 ] );
				setupAxes( svg, xScale, yScale, height );

				const barData = yValues.map( ( value, index ) => ( { value, label: xLabels[index] } ) );
				const compareBarData = compareValues.map( ( value, index ) => ( { value, label: xLabels[index] } ) );

				const tooltip = plotService.createTooltip( '#socioeonomicsContainer' );
				createBars( svg, barData, xScale, yScale, height, tooltip, 0, 'lightblue', sosData.nimi );

				const xOffsetForCompareData = xScale.bandwidth() / 2; // Adjust as needed for proper spacing
				createBars( svg, compareBarData, xScale, yScale, height, tooltip, xOffsetForCompareData, 'orange', selectedNimi );

				plotService.addTitleWithLink( svg, `Compare <a href="https://stat.fi/tup/paavo/index_en.html" 
		      target="_blank">socioeconomic statistics</a> and heat data of ${globalStore.nameOfZone} to:`, width / 1.5, { top: 75 } );
			}
		};

		const calculateYValues = ( data, statsData, heatData ) => {
			const { totalChildren, totalEldery } = calculateTotalChildrenAndEldery( data );
			return [
				heatData,
				( ( totalChildren + totalEldery ) / data.he_vakiy ).toFixed( 3 ),
				( totalChildren / data.he_vakiy ).toFixed( 3 ),
				( totalEldery / data.he_vakiy ).toFixed( 3 ),
				( data.pt_tyott / data.he_vakiy ).toFixed( 3 ),
				1 - normalizeValue( data.ra_as_kpa, statsData.ra_as_kpa.min, statsData.ra_as_kpa.max ).toFixed( 3 ),
				( data.ko_perus / data.ko_ika18y ).toFixed( 3 ),
				1 - normalizeValue( data.hr_ktu, statsData.hr_ktu.min, statsData.hr_ktu.max ).toFixed( 3 ),
				( data.te_vuok_as / data.te_taly ).toFixed( 3 ),
			];
		};

		const normalizeValue = ( value, min, max ) => {
			return ( value - min ) / ( max - min );
		};

		const helsinkiOrCapitalHeatExposure = ( heatData ) => {
			return toggleStore.capitalRegionCold
				? 1 - heatData.properties.avgcoldexposure.toFixed( 3 )
				: toggleStore.helsinkiView
					? heatData.properties.hki_avgheatexposure.toFixed( 3 )
					: heatData.properties.avgheatexposure.toFixed( 3 );
		};

		return {
			newSocioEconomicsDiagram,
		};
	},
};
</script>