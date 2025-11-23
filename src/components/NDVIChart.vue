<template>
	<div class="chart-container">
		<h3>
			<a
				href="https://custom-scripts.sentinel-hub.com/custom-scripts/sentinel-2/ndvi/"
				target="_blank"
			>
				NDVI
			</a>
			Distribution for {{ selectedDate }}
		</h3>
		<svg
			ref="chart"
			width="400"
			height="250"
		/>

		<!-- Updated Legend with text below -->
		<div class="legend">
			<div
				v-for="(color, index) in ndviColors"
				:key="index"
				class="legend-item"
			>
				<span :style="{ backgroundColor: color }" />
				<small>{{ labels[index] }}</small>
			</div>
		</div>
	</div>
</template>

<script>
import { onMounted, watch, ref } from 'vue';
import * as d3 from 'd3';
import { usePropsStore } from '../stores/propsStore.js';
import * as Cesium from 'cesium';
import Datasource from '../services/datasource.js';

export default {
	props: {
		selectedDate: {
			type: String,
			required: true,
		},
	},
	setup(props) {
		const propsStore = usePropsStore();
		const datasourceService = new Datasource();
		const chart = ref(null);

		const ndviColors = [
			'#eaeaea',
			'#ccc682',
			'#91bf51',
			'#70a33f',
			'#4f892d',
			'#306d1c',
			'#004400',
		];
		const labels = ['0.0-0.1', '0.1-0.2', '0.2-0.3', '0.3-0.4', '0.4-0.5', '0.5-0.6', '0.6-1.0'];

		const computeHistogram = () => {
			const entities = propsStore.postalCodeData.entities.values;
			const selectedNDVIValues = entities
				.map((entity) => entity.properties[`ndvi_${props.selectedDate}`]?.getValue() ?? null)
				.filter((value) => value !== null);

			const ndviBins = [0, 0, 0, 0, 0, 0, 0];

			selectedNDVIValues.forEach((value) => {
				if (value < 0.1) ndviBins[0]++;
				else if (value < 0.2) ndviBins[1]++;
				else if (value < 0.3) ndviBins[2]++;
				else if (value < 0.4) ndviBins[3]++;
				else if (value < 0.5) ndviBins[4]++;
				else if (value < 0.6) ndviBins[5]++;
				else ndviBins[6]++;
			});

			return ndviBins;
		};

		const outlineByNDVI = async (ndviRange) => {
			const postCodesDataSource = await datasourceService.getDataSourceByName('PostCodes');
			if (!postCodesDataSource) return;

			postCodesDataSource.entities.values.forEach((entity) => {
				const ndviValue = entity.properties[`ndvi_${props.selectedDate}`]?.getValue();

				if (ndviValue >= ndviRange[0] && ndviValue < ndviRange[1]) {
					entity.polygon.outlineColor = Cesium.Color.WHITE;
					entity.polygon.outlineWidth = 20;
				} else {
					entity.polygon.outlineColor = Cesium.Color.BLACK;
					entity.polygon.outlineWidth = 8;
				}
			});
		};

		const drawChart = () => {
			const bins = computeHistogram();
			const svg = d3.select(chart.value);
			svg.selectAll('*').remove(); // Clear previous chart

			const width = 400,
				height = 250,
				margin = { top: 20, right: 30, bottom: 50, left: 50 };
			const xScale = d3
				.scaleBand()
				.domain(labels)
				.range([margin.left, width - margin.right])
				.padding(0.2);
			const yScale = d3
				.scaleLinear()
				.domain([0, Math.max(...bins)])
				.nice()
				.range([height - margin.bottom, margin.top]);

			// Bars
			svg
				.append('g')
				.selectAll('rect')
				.data(bins)
				.enter()
				.append('rect')
				.attr('x', (_, i) => xScale(labels[i]))
				.attr('y', (d) => yScale(d))
				.attr('width', xScale.bandwidth())
				.attr('height', (d) => height - margin.bottom - yScale(d))
				.attr('fill', (_, i) => ndviColors[i])
				.on('click', function (event, d) {
					const index = bins.indexOf(d); // Get the correct index
					if (index !== -1) {
						const rangeParts = labels[index].split('-').map(parseFloat);
						outlineByNDVI(rangeParts);
					}
				});

			// X Axis
			svg
				.append('g')
				.attr('transform', `translate(0,${height - margin.bottom})`)
				.call(d3.axisBottom(xScale))
				.selectAll('text')
				.attr('transform', 'rotate(-30)')
				.style('text-anchor', 'end');

			// X Axis Label
			svg
				.append('text')
				.attr('x', width / 2)
				.attr('y', height - 5)
				.attr('text-anchor', 'middle')
				.style('font-size', '12px')
				.text('NDVI Ranges');

			// Y Axis
			svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(yScale));

			// Y Axis Label
			svg
				.append('text')
				.attr('x', -height / 2)
				.attr('y', 15)
				.attr('transform', 'rotate(-90)')
				.attr('text-anchor', 'middle')
				.style('font-size', '12px')
				.text('Count of Postal Codes');
		};

		onMounted(drawChart);
		watch(() => props.selectedDate, drawChart);

		return { chart, ndviColors, labels };
	},
};
</script>

<style scoped>
.chart-container {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.legend {
	display: flex;
	justify-content: center;
	gap: 10px;
	margin-top: 10px;
}

.legend-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	font-size: 12px;
}

.legend-item span {
	display: inline-block;
	width: 20px;
	height: 20px;
	border-radius: 3px;
}
</style>
