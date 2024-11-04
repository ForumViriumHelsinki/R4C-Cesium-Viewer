<template>
  <div id="scatterPlotContainerHSY"></div>
</template>

<script>
import * as d3 from 'd3';
import { onMounted, onBeforeUnmount } from 'vue'; // Import lifecycle hooks
import { eventBus } from '../services/eventEmitter.js';
import Plot from '../services/plot.js';
import Building from '../services/building.js';
import { useToggleStore } from '../stores/toggleStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import { useGlobalStore } from '../stores/globalStore.js';

export default {
	setup() {
		const toggleStore = useToggleStore();
		const globalStore = useGlobalStore();
		const propsStore = usePropsStore();
		const plotService = new Plot();
		const buildingService = new Building();

		// Function to add plot elements
		const addPlotElements = ( svg, heatData, xScale, yScale, colorScale ) => {
			const tooltip = plotService.createTooltip( '#scatterPlotContainerHSY' );
      
			svg.append( 'g' )
				.selectAll( 'dot' )
				.data( heatData )
				.enter()
				.append( 'circle' )
				.attr( 'cx', d => xScale( d.xData ) )
				.attr( 'cy', d => yScale( d.yData ) )
				.attr( 'r', 2 )
				.style( 'fill', d => colorScale( d.name ) )
				.on( 'mouseover', ( event, d ) => 
					plotService.handleMouseover(
						tooltip, 
						'scatterPlotContainerHSY', 
						event, 
						d, 
						( data ) => `${ propsStore.numericalSelect.text }: ${ data.xData.toFixed( 2 ) }<br>Temperature: ${ data.yData.toFixed( 2 ) }°C<br>${ propsStore.categoricalSelect.text }: ${ data.name }
            <br>Left click highlights the building on map`
					)
				)
				.on( 'mouseout', () => plotService.handleMouseout( tooltip ) )
				.on( 'click', ( event, d ) => buildingService.highlightBuildingInViewer( d.buildingId ) );
		};

		const clearHSYScatterPlot = () => {
			d3.select( '#scatterPlotContainerHSY' )
				.select( 'svg' )
				.remove();
		};

		const isSoteBuilding = ( entity ) => entity._properties._kayttarks._value === 'Yleinen rakennus';

		const isLowBuilding = ( entity ) => Number( entity._properties.kerrosten_lkm?._value ) <= 6;

		const addDataForHSYScatterPlot = ( urbanHeatDataAndMaterial, entity ) => {
			const props = entity._properties;
			const targetDate = globalStore.heatDataDate;

			if ( props?.avg_temp_c && props?.[ propsStore.categoricalSelect.value ]?._value && props?.[ propsStore.numericalSelect.value ]?._value ) {
				let numericalValue = props[ propsStore.numericalSelect.value ]._value;

				if ( propsStore.numericalSelect.text === 'c_valmpvm' && numericalValue ) {
					numericalValue = new Date().getFullYear() - Number( numericalValue.slice( 0, 4 ) );
				}

				if ( props?._area_m2?._value > 225 && numericalValue < 99999999 && numericalValue !== 0 ) {
					const heatValue = props?._heat_timeseries?._value.find( ( { date } ) => date === targetDate )?.avg_temp_c;

					if ( heatValue ) {
						urbanHeatDataAndMaterial.push( {
							heat: heatValue,
							[ propsStore.categoricalSelect.text ]: props[ propsStore.categoricalSelect.value ]._value,
							[ propsStore.numericalSelect.text ]: numericalValue,
							buildingId: props?._kiitun?._value,
						} );
					}
				}
			}
		};

		const processEntitiesForHSYScatterPlot = ( urbanHeatDataAndMaterial ) => {
			const entities = propsStore.scatterPlotEntities;

			entities.forEach( entity => {
				let addData = true;

				if ( !toggleStore.hideNonSote && !toggleStore.hideLow ) {
					addDataForHSYScatterPlot( urbanHeatDataAndMaterial, entity );
				} else {
					if ( toggleStore.hideNonSote && !isSoteBuilding( entity ) ) addData = false;
					if ( toggleStore.hideLow && isLowBuilding( entity ) ) addData = false;

					if ( addData ) addDataForHSYScatterPlot( urbanHeatDataAndMaterial, entity );
				}
			} );
		};

		const createHSYScatterPlot = ( features ) => {
			clearHSYScatterPlot();
			plotService.initializePlotContainer( 'scatterPlotContainerHSY' );

			const { heatData, labelsWithAverage, values } = prepareDataForPlot( features );

			const margin = { top: 50, right: 150, bottom: 16, left: 28 };
			const width = globalStore.navbarWidth - margin.left - margin.right;
			const height = 290 - margin.top - margin.bottom;

			const svg = plotService.createSVGElement( margin, width, height, '#scatterPlotContainerHSY' );
			const xScale = plotService.createScaleLinear( d3.min( heatData, d => d.xData ) - 1, d3.max( heatData, d => d.xData ) + 2, [ 0, width ] );
			const yScale = plotService.createScaleLinear( d3.min( heatData, d => d.yData ) - 0.05, d3.max( heatData, d => d.yData ) + 0.2, [ height, 0 ] );

			plotService.setupAxes( svg, xScale, yScale, height );
			const colorScale = createColorScale( values );

			addPlotElements( svg, heatData, xScale, yScale, colorScale );
			createLegend( svg, width, margin, values, labelsWithAverage, colorScale );
			plotService.addTitleWithLink(
				svg,
				'Average surface temperature in °C <br> and <a href="https://www.hsy.fi/en/environmental-information/open-data/avoin-data---sivut/buildings-in-the-helsinki-metropolitan-area/" target="_blank">Building attributes</a>',
				margin.left,
				margin.top + 3
			);
		};

		const createColorScale = ( values ) => {
			return d3.scaleOrdinal()
				.domain( values )
				.range( d3.schemeCategory10 ); // This is a D3 predefined set of colors
		};

		const createLegend = ( svg, width, margin, values, labelsWithAverage, colorScale ) => {
			const legend = svg.append( 'g' )
				.attr( 'class', 'legend' )
				.attr( 'transform', `translate( ${ width + margin.right - 145 },${ margin.top } )` );
  
			legend.selectAll( '.legend-color' )
				.data( values )
				.enter()
				.append( 'rect' )
				.attr( 'x', 0 )
				.attr( 'y', ( _, i ) => i * 20 )
				.attr( 'width', 9 )
				.attr( 'height', 9 )
				.style( 'fill', d => colorScale( d ) );
  
			legend.selectAll( '.legend-label' )
				.data( labelsWithAverage )
				.enter()
				.append( 'text' )
				.attr( 'x', 14 )
				.attr( 'y', ( _, i ) => i * 20 + 9 )
				.text( d => d )
				.style( 'font-size', '9px' );
		};

		const prepareDataForPlot = ( features ) => {
			const values = createUniqueValuesList( features );
			let heatData = [];
			let labelsWithAverage = [];

			values.forEach( value => {
				const dataWithHeat = addHeatForLabelAndX( value, features );

				const plotData = { xData: dataWithHeat[ 1 ], yData: dataWithHeat[ 0 ], name: value, buildingId: dataWithHeat[ 3 ] };
				plotData.xData.forEach( ( xData, j ) => {
					heatData.push( { xData, yData: plotData.yData[ j ], name: value, buildingId: plotData.buildingId[ j ] } );
				} );
				const averageLabel = `${ value } ${ dataWithHeat[ 2 ].toFixed( 1 ) }`;
				if ( !labelsWithAverage.includes( averageLabel ) ) {
					labelsWithAverage.push( `${ averageLabel } °C` );
				}
			} );

			return { heatData, labelsWithAverage, values };
		};

		const addHeatForLabelAndX = ( value, features ) => {
			let heatList = [];
			let numericalList = [];
			let sum = 0;
			let ids = [];

			for ( let i = 0; i < features.length; i++ ) {
				if ( features[ i ][ propsStore.categoricalSelect.text ] === value ) {
					heatList.push( features[ i ].heat );
					numericalList.push( features[ i ][ propsStore.numericalSelect.text ] );
					sum += features[ i ].heat;
					ids.push( features[ i ].buildingId );
				}
			}

			const average = sum / heatList.length;
			return [ heatList, numericalList, average, ids ];
		};

		const createUniqueValuesList = ( features ) => {
			const uniqueValues = new Set( features.map( feature => feature[ propsStore.categoricalSelect.text ] ) );
			return Array.from( uniqueValues );
		};

		const updateHSYScatterPlot = () => {
			const urbanHeatDataAndMaterial = [];
			processEntitiesForHSYScatterPlot( urbanHeatDataAndMaterial );
			createHSYScatterPlot( urbanHeatDataAndMaterial );
		};

		// Call updateHSYScatterPlot on mounted
		onMounted( () => {
			updateHSYScatterPlot(); // This will be called once the component is mounted
			eventBus.on( 'updateScatterPlot', updateHSYScatterPlot ); // Listen to the event
		} );

		onBeforeUnmount( () => {
			eventBus.off( 'updateScatterPlot', updateHSYScatterPlot ); // Clean up event listener on unmount
		} );

		return {
			updateHSYScatterPlot,
		};
	},
};
</script>