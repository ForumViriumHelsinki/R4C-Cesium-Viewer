<template>
	<div id="buildingChartContainer" />
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
			const address = store.buildingAddress;
			const postinumero = store.postalcode;

			plotService.initializePlotContainer('buildingChartContainer');

			const margin = { top: 40, right: 40, bottom: 30, left: 30 };
			const width = store.navbarWidth - margin.left - margin.right;
			const height = 200 - margin.top - margin.bottom;

			const svg = plotService.createSVGElement(margin, width, height, '#buildingChartContainer');
			const xScale = plotService.createScaleBand([address, postinumero], width);
			const yScale = plotService.createScaleLinear(
				0,
				Math.max(buildingHeatExposure, store.averageHeatExposure),
				[height, 0]
			);

			const data = [
				{ name: address, value: buildingHeatExposure.toFixed(3) },
				{ name: postinumero, value: store.averageHeatExposure.toFixed(3) },
			];

			const colors = { [address]: 'orange', [postinumero]: 'steelblue' };

			createBarsWithLabels(svg, data, xScale, yScale, height, colors);
			plotService.setupAxes(svg, xScale, yScale, height);
			plotService.addTitle(svg, 'Temperature Comparison', margin.left, margin.top - 10);
		};

		// Create bars and labels
		const createBarsWithLabels = (svg, data, xScale, yScale, height, colors) => {
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

		watch(
			() => propsStore.buildingHeatExposure,
			(newHeatExposure) => {
				if (newHeatExposure) {
					createBuildingBarChart();
				}
			}
		);

		onMounted(() => {
			createBuildingBarChart();
		});

		return {};
	},
};
</script>

<style scoped>
#buildingChartContainer {
	position: relative;
	width: 100%;
	height: 200px;
}
</style>
