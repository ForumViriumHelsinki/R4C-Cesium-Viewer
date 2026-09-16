<!-- Piechart.vue -->
<template>
	<div
		id="pieChartContainer"
		ref="containerRef"
	/>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as d3 from '@/utils/d3'
import { useChartSize } from '../composables/useChartSize.js'
import { eventBus } from '../services/eventEmitter.js'
import Plot from '../services/plot.js'
import { useBackgroundMapStore } from '../stores/backgroundMapStore.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { usePropsStore } from '../stores/propsStore.js'

// Pinia store
const backgroundMapStore = useBackgroundMapStore()
const globalStore = useGlobalStore()
const propsStore = usePropsStore()

const containerRef = ref(/** @type {HTMLElement | null} */ (null))
const {
	width: chartWidth,
	height: chartHeight,
	cleanup,
} = useChartSize(containerRef, {
	aspect: 1.4,
	// Only redraw a chart that exists: the first draw waits for the area select.
	onResize: () => {
		if (containerRef.value?.querySelector('svg')) recreatePieChart()
	},
})

const createPieChart = () => {
	// Not laid out yet (e.g. a closed panel); the resize observer redraws later.
	if (chartWidth.value === 0) return
	const datasource = propsStore.postalCodeData
	// nameOfZone is stored as a plain string (already unwrapped from the Cesium
	// property's ._value at the call site in featurepicker). Reading ._value here
	// was a bug that yielded undefined; use the value directly with a null guard.
	const nameOfZone = globalStore.nameOfZone ?? ''
	const year = backgroundMapStore.hsyYear
	const area = backgroundMapStore.hsySelectArea

	const plotService = new Plot()
	plotService.initializePlotContainerForGrid('pieChartContainer')

	// Assuming firstData and secondData are already fetched and processed
	const labels = [
		'Trees 20m+',
		'Trees 15-20m',
		'Trees 10-15m',
		'Trees2 -10m',
		'Vegetation',
		'Water',
		'Fields',
		'Rocks',
		'Other',
		'Bareland',
		'Buildings',
		'Dirtroads',
		'Pavedroads',
	]
	const colors = [
		'#326428',
		'#327728',
		'#328228',
		'#32a028',
		'#b2df43',
		'#6495ed',
		'#ffd980',
		'#bfbdc2',
		'#857976',
		'#cd853f',
		'#d80000',
		'#824513',
		'#000000',
	]

	const firstData = getLandCoverDataForArea(nameOfZone, year, datasource)
	const secondData = getLandCoverDataForArea(area, year, datasource)

	const margin = { top: 10, right: 10, bottom: 10, left: 10 }
	const width = chartWidth.value - margin.left - margin.right
	const height = chartHeight.value - margin.top - margin.bottom
	// Two pies side by side, each centred in its half, below the two-line title.
	const titleHeight = 30
	const radius = Math.max(0, Math.min(width / 4, (height - titleHeight) / 2) - 4)

	/**
	 * @typedef {{ value: number, label: string, zone: string }} PieDatum
	 */
	const pie = /** @type {import('d3-shape').Pie<any, PieDatum>} */ (
		/** @type {unknown} */ (d3.pie())
	)
		.sort(null)
		.value((d) => d.value)
	const arc = d3.arc().innerRadius(0).outerRadius(radius)

	// First pie chart data setup
	const firstPieData = pie(
		firstData.map((value, index) => ({ value: value, label: labels[index], zone: nameOfZone }))
	)

	// Second pie chart data setup
	const secondPieData = pie(
		secondData.map((value, index) => ({ value: value, label: labels[index], zone: area }))
	)

	const svg = plotService.createSVGElement(margin, width, height, '#pieChartContainer')

	// Translate pies to be centered vertically and positioned horizontally
	const xOffsetFirstPie = width / 4
	const xOffsetSecondPie = (width * 3) / 4
	const yOffset = titleHeight + (height - titleHeight) / 2

	// Initialize tooltip using the Plot service
	const tooltip = plotService.createTooltip('#pieChartContainer')
	createPie(
		svg,
		'.firstPie',
		firstPieData,
		colors,
		arc,
		xOffsetFirstPie,
		yOffset,
		tooltip,
		plotService
	)
	createPie(
		svg,
		'.secondPie',
		secondPieData,
		colors,
		arc,
		xOffsetSecondPie,
		yOffset,
		tooltip,
		plotService
	)
	plotService.addTitleWithLink(
		svg,
		`Compare <a href="https://www.hsy.fi/en/environmental-information/open-data/avoin-data---sivut/helsinki-region-land-cover-dataset/"
        	target="_blank">HSY landcover</a> in ${nameOfZone} to:`,
		margin.left,
		margin.top
	)
}

const clearPieChart = () => {
	// Remove or clear the D3.js visualization
	// Example:
	d3.select('#pieChartContainer').select('svg').remove()
}
/**
 * Get total area of district properties by district data source name and district id and list of property keys
 *
 * @param { string } name Name of the district
 * @param { Array } propertyKeys - List of property keys to calculate the total area
 * @param { Number } year user selected year
 * @param { Object } datasource postalcode datasource
 *
 * @returns { Number } The total area
 */
const getTotalAreaByNameAndPropertyKeys = (name, propertyKeys, year, datasource) =>
	datasource._entityCollection._entities._array
		.filter(({ _properties }) => _properties._nimi._value === name)
		.reduce(
			(total, { _properties }) =>
				total +
				propertyKeys.reduce((sum, key) => sum + (_properties[`${key}_${year}`]?._value || 0), 0),
			0
		)

/**
 * Get landcover data array for a specific area
 *
 * @param { string } name - name of the area
 * @param { Number } year user selected year
 * @param { Object } datasource postalcode datasource
 *
 * @returns { Array } Data array for the specified area
 */
const getLandCoverDataForArea = (name, year, datasource) => {
	const propertyKeys = [
		'tree20_m2',
		'tree15_m2',
		'tree10_m2',
		'tree2_m2',
		'vegetation_m2',
		'water_m2',
		'field_m2',
		'rocks_m2',
		'other_m2',
		'bareland_m2',
		'building_m2',
		'dirtroad_m2',
		'pavedroad_m2',
	]

	const areas = propertyKeys.map((key) =>
		getTotalAreaByNameAndPropertyKeys(name, [key], year, datasource)
	)
	const totalArea = areas.reduce((sum, area) => sum + area, 0)

	return areas.map((area) => area / totalArea)
}

const createPie = (svg, name, data, colors, arc, xOffset, yOffset, tooltip, plotService) => {
	// Drawing first pie chart
	svg
		.selectAll(name)
		.data(data)
		.enter()
		.append('path')
		.attr('fill', (_d, i) => colors[i])
		.attr('d', arc)
		.attr('transform', `translate(${xOffset}, ${yOffset})`) // Adjusted positioning
		.on('mouseover', (event, d) => {
			plotService.handleMouseover(
				tooltip,
				'pieChartContainer',
				event,
				d,
				(data) =>
					`${data.data.label} cover ${(100 * data.value).toFixed(1)} % of the land in ${data.data.zone}`
			)
		})
		.on('mouseout', () => plotService.handleMouseout(tooltip))
}

const recreatePieChart = () => {
	clearPieChart()
	createPieChart()
}

onMounted(() => {
	eventBus.on('recreate piechart', recreatePieChart)
})

onBeforeUnmount(() => {
	clearPieChart()
	eventBus.off('recreate piechart', recreatePieChart)
	cleanup()
})
</script>

<style scoped>
#pieChartContainer {
	position: relative;
	width: 100%;
	background-color: rgb(var(--v-theme-surface));
}
</style>
