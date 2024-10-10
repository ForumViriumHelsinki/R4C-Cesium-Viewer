<template>
  <div id="buildingChartContainer"></div>
</template>

<script>
import { onMounted, watch } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import Plot from '../services/plot.js';

export default {
	setup() {
		const store = useGlobalStore();
		const propsStore = usePropsStore();
		const plotService = new Plot();

		// Create building heat chart
		const createBuildingBarChart = () => {
			const buildingHeatExposure = propsStore.buildingHeatExposure;
			console.log("buildingHeatExposure",buildingHeatExposure)
			const address = store.buildingAddress;
			const postinumero = store.postalcode;

			plotService.initializePlotContainer( 'buildingChartContainer' );

			const margin = { top: 70, right: 30, bottom: 30, left: 60 };
			const width = 300 - margin.left - margin.right;
			const height = 200 - margin.top - margin.bottom;

			const svg = plotService.createSVGElement( margin, width, height, '#buildingChartContainer' );
			const xScale = plotService.createScaleBand( [ address, postinumero ], width );
			const yScale = plotService.createScaleLinear( 0, Math.max( buildingHeatExposure, store.averageHeatExposure ), [ height, 0 ] );

			const data = [
				{ name: address, value: buildingHeatExposure.toFixed( 3 ) },
				{ name: postinumero, value: store.averageHeatExposure.toFixed( 3 ) }
			];

			const colors = { [address]: 'orange', [postinumero]: 'steelblue' };

			createBarsWithLabels( svg, data, xScale, yScale, height, colors );
			plotService.setupAxes( svg, xScale, yScale, height );
			plotService.addTitle( svg, 'Temperature Comparison', width, margin );
		};

		// Create bars and labels
		const createBarsWithLabels = ( svg, data, xScale, yScale, height, colors ) => {
			svg.selectAll( '.bar' )
				.data( data )
				.enter()
				.append( 'rect' )
				.attr( 'class', 'bar' )
				.attr( 'x', d => xScale( d.name ) )
				.attr( 'width', xScale.bandwidth() )
				.attr( 'y', d => yScale( d.value ) )
				.attr( 'height', d => height - yScale( d.value ) )
				.style( 'fill', d => colors[d.name] );

			svg.selectAll( '.label' )
				.data( data )
				.enter()
				.append( 'text' )
				.attr( 'class', 'label' )
				.attr( 'x', d => xScale( d.name ) + xScale.bandwidth() / 2 )
				.attr( 'y', d => yScale( d.value ) - 5 )
				.attr( 'text-anchor', 'middle' )
				.text( d => d.value );
		};


		// Watch for changes in buildingHeatTimeseries and call newHSYBuildingHeat when it changes
		watch(
			() => propsStore.buildingHeatExposure,
			( newHeatExposure ) => {
				if ( newHeatExposure ) {
					createBuildingBarChart();
				}
			}
		);

		// Call updateHSYBuildingChart on mounted
		onMounted( () => {
			console.log("hi");
			createBuildingBarChart();

		} );

		return {};
	},
};
</script>

<style scoped>
#buildingChartContainer {
  position: fixed;
  top: 80px;
  left: 1px;
  width: 300px;
  height: 200px;
  visibility: hidden;
  font-size: smaller;
  border: 1px solid black;
  box-shadow: 3px 5px 5px black;
  background-color: white;
}
</style>
