<template>
	<div
		v-if="showChart"
		id="buildingTreeChartContainer"
	/>
</template>

<script>
import { ref, watch, nextTick } from 'vue';
import * as d3 from 'd3';
import { useGlobalStore } from '../stores/globalStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import Plot from '../services/plot.js';

export default {
	setup() {
		const store = useGlobalStore();
		const propsStore = usePropsStore();
		const plotService = new Plot();
		const showChart = ref(false);

		const setTreeArea = () => {
			return propsStore.treeArea || 0;
		};

		const createBuildingTreeBarChart = () => {
			const treeArea = setTreeArea();
			const postinumero = store.postalcode;
			const address = store.buildingAddress;

			plotService.initializePlotContainer('buildingTreeChartContainer');

			const margin = { top: 70, right: 30, bottom: 30, left: 60 };
			const width = 300 - margin.left - margin.right;
			const height = 200 - margin.top - margin.bottom;

			const svg = plotService.createSVGElement(
				margin,
				width,
				height,
				'#buildingTreeChartContainer'
			);

			const xScale = plotService.createScaleBand([address, postinumero], width);
			const yScale = plotService.createScaleLinear(0, Math.max(treeArea, store.averageTreeArea), [
				height,
				0,
			]);

			const data = [
				{ name: address, value: treeArea.toFixed(3) },
				{ name: postinumero, value: store.averageTreeArea.toFixed(3) },
			];

			const colors = { [address]: 'green', [postinumero]: 'yellow' };

			createBars(svg, data, xScale, yScale, height, colors);

			plotService.setupAxes(svg, xScale, yScale, height);
			plotService.addTitle(svg, 'Nearby tree area comparison', width, margin);
		};

		const createBars = (svg, data, xScale, yScale, height, colors) => {
			svg
				.selectAll('.bar')
				.data(data)
				.enter()
				.append('rect')
				.attr('class', 'bar')
				.attr('x', (d) => xScale(d.name))
				.attr('width', xScale.bandwidth())
				.attr('y', (d) => yScale(d.value))
				.attr('height', (d) => height - yScale(d.value))
				.style('fill', (d) => colors[d.name]);

			svg
				.selectAll('.label')
				.data(data)
				.enter()
				.append('text')
				.attr('class', 'label')
				.attr('x', (d) => xScale(d.name) + xScale.bandwidth() / 2)
				.attr('y', (d) => yScale(d.value) - 5)
				.attr('text-anchor', 'middle')
				.text((d) => d.value);
		};

		const clearBuildingTreeBarChart = () => {
			d3.select('#buildingTreeChartContainer').select('svg').remove();
		};

		watch(
			() => propsStore.treeArea,
			(treeArea) => {
				if (treeArea) {
					showChart.value = true;
					nextTick(() => {
						createBuildingTreeBarChart();
					});
				} else {
					showChart.value = false;
					clearBuildingTreeBarChart();
				}
			}
		);

		return {
			showChart,
		};
	},
};
</script>

<style scoped>
#buildingTreeChartContainer {
	position: fixed;
	top: 80px;
	right: 1px;
	width: 300px;
	height: 200px;
	visibility: hidden;
	font-size: smaller;
	border: 1px solid black;
	box-shadow: 3px 5px 5px black;
	background-color: white;
}
</style>
