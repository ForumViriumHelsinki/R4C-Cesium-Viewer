<template>
	<div
		id="buildingGridChartContainer"
		ref="containerRef"
	/>
</template>

<script>
import * as d3 from 'd3'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { eventBus } from '../services/eventEmitter.js'
import Plot from '../services/plot.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { usePropsStore } from '../stores/propsStore.js'

export default {
	setup() {
		const globalStore = useGlobalStore()
		const propsStore = usePropsStore()
		const plotService = new Plot()
		const buildingContainerId = 'buildingGridChartContainer'
		const containerRef = ref(null)

		const createBuildingGridChart = (buildingProps) => {
			plotService.initializePlotContainer(buildingContainerId)
			const margin = { top: 30, right: 40, bottom: 55, left: 40 }
			const width = globalStore.navbarWidth - margin.left - margin.right
			const height = 250 - margin.top - margin.bottom

			const data = [
				{ label: '0-9', value: buildingProps._pop_d_0_9._value },
				{ label: '10-19', value: buildingProps._pop_d_10_19._value },
				{ label: '20-29', value: buildingProps._pop_d_20_29._value },
				{ label: '30-39', value: buildingProps._pop_d_30_39._value },
				{ label: '40-49', value: buildingProps._pop_d_40_49._value },
				{ label: '50-59', value: buildingProps._pop_d_50_59._value },
				{ label: '60-69', value: buildingProps._pop_d_60_69._value },
				{ label: '70-79', value: buildingProps._pop_d_70_79._value },
				{ label: '80-', value: buildingProps._pop_d_over80._value },
			]

			const svg = plotService.createSVGElement(margin, width, height, `#${buildingContainerId}`)
			const xScale = plotService.createScaleBand(
				data.map((d) => d.label),
				width
			)
			const yScale = plotService.createScaleLinear(
				0,
				d3.max(data, (d) => d.value),
				[height, 0]
			)

			plotService.setupAxes(svg, xScale, yScale, height)
			const tooltip = plotService.createTooltip(`#${buildingContainerId}`)

			createBars(svg, data, xScale, yScale, height, tooltip, 0, 'steelblue')
			svg
				.append('g')
				.attr('transform', `translate(0, ${height})`)
				.call(d3.axisBottom(xScale))
				.selectAll('text')
				.style('display', 'none')

			plotService.addTitle(
				svg,
				`Population approximation for ${globalStore.buildingAddress}`,
				margin.left - 10,
				margin.top - 10
			)
		}

		const createBars = (svg, data, xScale, yScale, height, tooltip, xOffset, barColor) => {
			const bar = svg
				.selectAll(`.bar.${barColor}`)
				.data(data)
				.enter()
				.append('g')
				.attr('class', `bar ${barColor}`)
				.attr('transform', (d) => `translate(${xScale(d.label) + xOffset}, 0)`)

			bar
				.append('rect')
				.attr('x', 0)
				.attr('y', (d) => yScale(d.value))
				.attr('width', xScale.bandwidth())
				.attr('height', (d) => height - yScale(d.value))
				.attr('fill', barColor)
				.on('mouseover', (event, d) =>
					plotService.handleMouseover(
						tooltip,
						buildingContainerId,
						event,
						d,
						(data) => `Age ${data.label}: ${(data.value * 100).toFixed(2)} %`
					)
				)
				.on('mouseout', () => plotService.handleMouseout(tooltip))
		}

		/**
		 * Hide the chart container using Vue ref (proper encapsulation)
		 */
		const hideChart = () => {
			if (containerRef.value) {
				containerRef.value.style.visibility = 'hidden'
			}
		}

		watch(
			() => propsStore.gridBuildingProps,
			(gridBuilding) => {
				if (gridBuilding) {
					createBuildingGridChart(propsStore.gridBuildingProps)
				}
			}
		)

		let unsubscribe

		onMounted(() => {
			if (propsStore.gridBuildingProps) {
				createBuildingGridChart(propsStore.gridBuildingProps)
			}
			// Listen for hide event from parent (proper component encapsulation)
			unsubscribe = eventBus.on('hideBuildingGridChart', hideChart)
		})

		onBeforeUnmount(() => {
			if (unsubscribe) {
				unsubscribe()
			}
		})

		return { containerRef }
	},
}
</script>

<style>
#buildingGridChartContainer {
	position: relative;
	width: 100%;
	height: 200px;
}
</style>
