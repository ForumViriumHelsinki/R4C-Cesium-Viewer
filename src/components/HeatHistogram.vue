<template>
  <div id="heatHistogramContainer"></div>
</template>

<script>
import { onMounted, onBeforeUnmount } from 'vue';
import * as d3 from 'd3'; // Import D3.js
import { eventBus } from '../services/eventEmitter.js';
import { useGlobalStore } from '../stores/globalStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import Plot from '../services/plot.js'; 
import Building from '../services/building.js';

export default {
	setup() {
		const store = useGlobalStore();
		const plotService = new Plot();
		const propsStore = usePropsStore();
		const toggleStore = useToggleStore();

		const createBars = ( svg, data, xScale, yScale, height, tooltip, containerId, dataFormatter ) => {
			svg.selectAll( '.bar' )
				.data( data )
				.enter()
				.append( 'g' )
				.attr( 'class', 'bar' )
				.attr( 'transform', ( d ) => `translate(${xScale( d.x0 )}, ${yScale( d.length )})` )
				.append( 'rect' )
				.attr( 'x', 1 )
				.attr( 'width', ( d ) => xScale( d.x1 ) - xScale( d.x0 ) ) // Adjust width for the bars
				.attr( 'height', ( d ) => height - yScale( d.length ) )
				.attr( 'fill', ( d ) => rgbColor( d ) )
				.on( 'mouseover', ( event, d ) =>
					plotService.handleMouseover( tooltip, containerId, event, d, dataFormatter )
				)
				.on( 'mouseout', () => plotService.handleMouseout( tooltip ) )
				.on( 'click', ( event, d ) => {
					const buildingService = new Building();
					buildingService.highlightBuildingsInViewer( d );
				} );
		};

		const rgbColor = ( data ) => {
			const average = calculateAverage( data );
			const isCold = toggleStore.capitalRegionCold;

			const index = isCold
				? calculateIndex( average, store.minKelvinCold, store.maxKelvinCold )
				: store.view === 'capitalRegion'
					? calculateIndex( average, store.minKelvin, store.maxKelvin )
					: average;

			return isCold ? getColdColor( index ) : getWarmColor( index );
		};

		const calculateAverage = ( data ) => {
			if ( !data || data.length === 0 ) return 0;
			return data.reduce( ( sum, value ) => sum + value, 0 ) / data.length;
		};

		const calculateIndex = ( average, minKelvin, maxKelvin ) => {
			return ( average + 273.15 - minKelvin ) / ( maxKelvin - minKelvin );
		};

		const getWarmColor = ( index ) => {
			const g = 255 - index * 255;
			const a = 255 * index;
			return `rgba(255, ${g}, 0, ${a / 255})`;
		};

		const getColdColor = ( index ) => {
			const g = 255 - ( 255 - index * 255 );
			const a = 1 - index;
			return `rgba(0, ${g}, 255, ${a})`;
		};

		const createHistogram = () => {
			const urbanHeatData = propsStore.heatHistogramData;
      
			plotService.initializePlotContainer( 'heatHistogramContainer' );

			const margin = { top: 30, right: 30, bottom: 30, left: 30 };
			const width = 420 - margin.left - margin.right;
			const height = 220 - margin.top - margin.bottom;

			const svg = plotService.createSVGElement( margin, width, height, '#heatHistogramContainer' );

			const minDataValue = d3.min( urbanHeatData ) - 0.02;
			const maxDataValue = d3.max( urbanHeatData ) + 0.02;
			const x = plotService.createScaleLinear( minDataValue, maxDataValue, [ 0, width ] );
			const bins = d3.histogram().domain( x.domain() ).thresholds( x.ticks( 20 ) )( urbanHeatData );
			const y = plotService.createScaleLinear( 0, d3.max( bins, ( d ) => d.length ), [ height, 0 ] );

			plotService.setupAxes( svg, x, y, height );

			const tooltip = plotService.createTooltip( '#heatHistogramContainer' );

			if ( urbanHeatData && urbanHeatData[0] && urbanHeatData[0].toString().startsWith( '0' ) ) {
				createBars( svg, bins, x, y, height, tooltip, 'heatHistogramContainer', ( d ) =>
					`Heat exposure index: ${d.x0}<br>Amount of buildings: ${d.length}`
				);
				plotService.addTitle( svg, `Heat exposure to buildings in ${store.nameOfZone}`, width, margin );
			} else {
				createBars( svg, bins, x, y, height, tooltip, 'heatHistogramContainer', ( d ) =>
					`Temperature in Celsius: ${d.x0}<br>Amount of buildings: ${d.length}<br>Left click highlights the building(s) on map`
				);
				plotService.addTitleWithLink(
					svg,
					`${store.nameOfZone} ${store.heatDataDate} buildings <a href="https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-temperature" target="_blank">surface temperature</a> in °C`,
					width - 20,
					margin
				);
			}
		};

		const clearHistogram = () => {
			d3.select( '#heatHistogramContainer' ).select( 'svg' ).remove();
		};

		const newHeatHistogram = () => {
			if ( store.level === 'postalCode' && propsStore.heatHistogramData ) {
				createHistogram();
			} else {
				clearHistogram();
			}
		};

		// Lifecycle hooks for mounting and unmounting
		onMounted( () => {
			newHeatHistogram();
			eventBus.on( 'newHeatHistogram', newHeatHistogram );
		} );

		onBeforeUnmount( () => {
			eventBus.off( 'newHeatHistogram' );
		} );

		return {};
	},
};
</script>

<style scoped>
#heatHistogramContainer {
  position: fixed;
  top: 90px;
  left: 1px;
  width: 420px;
  height: 220px;
  font-size: smaller;
  border: 1px solid black;
  box-shadow: 3px 5px 5px black;
  background-color: white;
}
</style>
