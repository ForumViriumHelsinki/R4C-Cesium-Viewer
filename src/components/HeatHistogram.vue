<template>
	<div id="heatHistogramContainer" />
</template>

<script>
import * as d3 from 'd3' // Import D3.js
import { nextTick, onBeforeUnmount, onMounted } from 'vue'
import Building from '../services/building.js'
import { eventBus } from '../services/eventEmitter.js'
import Plot from '../services/plot.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { usePropsStore } from '../stores/propsStore.js'

/**
 * @component HeatHistogram
 * @description D3.js-powered heat distribution histogram visualization component.
 *
 * Creates an interactive histogram that displays the distribution of building heat exposure
 * or surface temperatures across the selected postal code area. Uses D3.js for data visualization
 * with dynamic color coding based on temperature ranges.
 *
 * **Features:**
 * - Interactive histogram with 20 bins for temperature distribution
 * - Color-coded bars (warm/cold palettes) based on data type and date
 * - Clickable bars to highlight corresponding buildings on the 3D map
 * - Tooltip on hover showing temperature ranges and building counts
 * - Dynamic title with hyperlink to data source information
 * - Responsive sizing based on navbar width
 * - Automatic updates via event bus
 *
 * **Data Modes:**
 * - Heat Exposure Index (0-1 range) - For capital region view
 * - Surface Temperature (°C) - For postal code level with specific dates
 * - Cold wave data (2021-02-18) - Uses inverted color palette
 *
 * **Store Integration:**
 * - `globalStore` - View level, navbar width, heat data date, temperature ranges
 * - `propsStore` - Heat histogram data (temperature values for all buildings)
 *
 * **Service Integration:**
 * - `Plot` - D3.js chart creation and styling utilities
 * - `Building` - Building highlighting on map interaction
 *
 * **Event Emissions:**
 * - Listens: 'newHeatHistogram' (via eventBus) - Triggers histogram recreation
 * - Emits: None
 *
 * **Visibility:**
 * Only renders when `store.level === 'postalCode'` and histogram data is available.
 *
 * @example
 * <HeatHistogram />
 */

export default {
	setup() {
		const store = useGlobalStore()
		const plotService = new Plot()
		const propsStore = usePropsStore()

		/**
		 * Creates histogram bars with D3.js
		 *
		 * Renders the histogram bars with color coding, tooltips, and click handlers
		 * for building selection on the map.
		 *
		 * @param {d3.Selection} svg - D3 SVG selection
		 * @param {Array} data - Binned histogram data from d3.histogram()
		 * @param {d3.ScaleLinear} xScale - D3 scale for x-axis positioning
		 * @param {d3.ScaleLinear} yScale - D3 scale for y-axis (bar heights)
		 * @param {number} height - Chart height in pixels
		 * @param {d3.Selection} tooltip - D3 tooltip element
		 * @param {string} containerId - Container element ID for positioning
		 * @param {Function} dataFormatter - Function to format tooltip content
		 * @returns {void}
		 */
		const createBars = (svg, data, xScale, yScale, height, tooltip, containerId, dataFormatter) => {
			svg
				.selectAll('.bar')
				.data(data)
				.enter()
				.append('g')
				.attr('class', 'bar')
				.attr('transform', (d) => `translate(${xScale(d.x0)}, ${yScale(d.length)})`)
				.append('rect')
				.attr('x', 1)
				.attr('width', (d) => Math.max(0, xScale(d.x1) - xScale(d.x0))) // Adjust width for the bars
				.attr('height', (d) => Math.max(0, height - yScale(d.length))) // Ensure no negative heights
				.attr('fill', (d) => rgbColor(d)) // Assuming you have a function for coloring bars
				.on('mouseover', (event, d) =>
					plotService.handleMouseover(tooltip, containerId, event, d, dataFormatter)
				)
				.on('mouseout', () => plotService.handleMouseout(tooltip))
				.on('click', (_event, d) => {
					const buildingService = new Building()
					buildingService.highlightBuildingsInViewer(d)
				})
		}

		/**
		 * Determines bar color based on temperature data
		 *
		 * Calculates the appropriate color for histogram bars using warm or cold
		 * color palettes depending on the data type and selected date.
		 *
		 * @param {Object} data - Histogram bin data containing temperature values
		 * @returns {string} RGBA color string
		 */
		const rgbColor = (data) => {
			const average = calculateAverage(data)
			const isCold = store.heatDataDate === '2021-02-18'
			const index =
				store.view === 'capitalRegion'
					? calculateIndex(
							average,
							store.minMaxKelvin[store.heatDataDate].min,
							store.minMaxKelvin[store.heatDataDate].max
						)
					: average

			return isCold ? getColdColor(index) : getWarmColor(index)
		}

		/**
		 * Calculates average value from histogram bin data
		 *
		 * @param {Array} data - Array of temperature values in the bin
		 * @returns {number} Average temperature value, or 0 if data is empty
		 */
		const calculateAverage = (data) => {
			if (!data || data.length === 0) return 0
			return data.reduce((sum, value) => sum + value, 0) / data.length
		}

		/**
		 * Calculates normalized index from temperature value
		 *
		 * Converts Celsius to Kelvin and normalizes to 0-1 range based on
		 * min/max temperatures for the selected date.
		 *
		 * @param {number} average - Average temperature in Celsius
		 * @param {number} minKelvin - Minimum temperature in Kelvin for date
		 * @param {number} maxKelvin - Maximum temperature in Kelvin for date
		 * @returns {number} Normalized index (0-1)
		 */
		const calculateIndex = (average, minKelvin, maxKelvin) => {
			return (average + 273.15 - minKelvin) / (maxKelvin - minKelvin)
		}

		/**
		 * Generates warm color palette for heat visualization
		 *
		 * Creates gradient from yellow to red based on temperature index.
		 *
		 * @param {number} index - Normalized temperature index (0-1)
		 * @returns {string} RGBA color string
		 */
		const getWarmColor = (index) => {
			const g = 255 - index * 255
			const a = 255 * index
			return `rgba(255, ${g}, 0, ${a / 255})`
		}

		/**
		 * Generates cold color palette for cold wave visualization
		 *
		 * Creates gradient from blue to cyan for cold temperature data.
		 *
		 * @param {number} index - Normalized temperature index (0-1)
		 * @returns {string} RGBA color string
		 */
		const getColdColor = (index) => {
			const g = 255 - (255 - index * 255)
			const a = 1 - index
			return `rgba(0, ${g}, 255, ${a})`
		}

		/**
		 * Creates the histogram chart
		 *
		 * Main histogram rendering function that:
		 * 1. Initializes the plot container
		 * 2. Creates SVG element with proper dimensions
		 * 3. Sets up scales and bins the data (20 bins)
		 * 4. Creates axes and bars
		 * 5. Adds title with data source link
		 *
		 * @returns {void}
		 */
		const createHistogram = () => {
			const urbanHeatData = propsStore.heatHistogramData

			plotService.initializePlotContainerForGrid('heatHistogramContainer')

			// Get the container's actual width and height dynamically
			const margin = { top: 30, right: 50, bottom: 34, left: 30 }
			const width = store.navbarWidth - margin.left - margin.right // Use container width
			const height = 250 - margin.top - margin.bottom // Use container height

			const svg = plotService.createSVGElement(margin, width, height, '#heatHistogramContainer')

			const minDataValue = d3.min(urbanHeatData) - 0.02
			const maxDataValue = d3.max(urbanHeatData) + 0.02
			const x = plotService.createScaleLinear(minDataValue, maxDataValue, [0, width])
			const bins = d3.histogram().domain(x.domain()).thresholds(x.ticks(20))(urbanHeatData)
			const y = plotService.createScaleLinear(
				0,
				d3.max(bins, (d) => d.length),
				[height, 0]
			)

			plotService.setupAxes(svg, x, y, height)

			const tooltip = plotService.createTooltip('#heatHistogramContainer')

			if (urbanHeatData?.[0]?.toString().startsWith('0')) {
				createBars(
					svg,
					bins,
					x,
					y,
					height,
					tooltip,
					'heatHistogramContainer',
					(d) => `Heat exposure index: ${d.x0}<br>Amount of buildings: ${d.length}`
				)
				plotService.addTitle(
					svg,
					`Heat exposure to buildings in ${store.nameOfZone}`,
					width,
					margin
				)
			} else {
				createBars(
					svg,
					bins,
					x,
					y,
					height,
					tooltip,
					'heatHistogramContainer',
					(d) =>
						`Temperature in Celsius: ${d.x0}<br>Amount of buildings: ${d.length}<br>Left click highlights the building(s) on map`
				)
				plotService.addTitleWithLink(
					svg,
					`${store.nameOfZone} ${store.heatDataDate} buildings <a href="https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-temperature" target="_blank">surface temperature</a> in °C`,
					margin.left,
					margin.top
				)
			}
		}

		/**
		 * Removes the histogram from the DOM
		 *
		 * @returns {void}
		 */
		const clearHistogram = () => {
			d3.select('#heatHistogramContainer').select('svg').remove()
		}

		/**
		 * Creates or clears histogram based on view level
		 *
		 * Only displays histogram when viewing postal code level data
		 * with available heat histogram data.
		 *
		 * @returns {void}
		 */
		const newHeatHistogram = () => {
			if (store.level === 'postalCode' && propsStore.heatHistogramData) {
				createHistogram()
			} else {
				clearHistogram()
			}
		}

		// Lifecycle hooks for mounting and unmounting
		onMounted(() => {
			void nextTick(() => {
				newHeatHistogram()
			})

			eventBus.on('newHeatHistogram', createHistogram)
		})

		onBeforeUnmount(() => {
			eventBus.off('newHeatHistogram')
		})

		return {}
	},
}
</script>

<style scoped>
#heatHistogramContainer {
	height: 220px;
	width: 100%;
	position: relative;
	background-color: white;
}
</style>
