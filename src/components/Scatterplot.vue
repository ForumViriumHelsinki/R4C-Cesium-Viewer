<template>
	<div class="scatter-plot">
		<div class="d-flex ga-2 mb-2">
			<v-select
				v-model="numericalValue"
				:items="numericalOptions"
				label="X axis"
				density="compact"
				variant="underlined"
				hide-details
			/>
			<v-select
				v-model="categoricalValue"
				:items="categoricalOptions"
				label="Colour by"
				density="compact"
				variant="underlined"
				hide-details
			/>
		</div>
		<div
			ref="containerRef"
			class="scatter-plot-container"
		/>
	</div>
</template>

<script>
import { ref } from 'vue'
import * as d3 from '@/utils/d3' // Import D3.js
import { useChartSize } from '../composables/useChartSize.js'
import { DATES } from '../constants/dates.js'
import Building from '../services/building.js'
import { cesiumEntityManager } from '../services/cesiumEntityManager.js'
import { eventBus } from '../services/eventEmitter.js'
import Plot from '../services/plot.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { useToggleStore } from '../stores/toggleStore.js'

/** Option `title`s are the attribute names shown in the tooltip and legend. */
const NUMERICAL_OPTIONS = [
	{ title: 'height', value: 'measured_height' },
	{ title: 'age', value: 'c_valmpvm' },
	{ title: 'area', value: 'area_m2' },
	{ title: 'volume', value: 'i_raktilav' },
]

const CATEGORICAL_OPTIONS = [
	{ title: 'facade material', value: 'c_julkisivu' },
	{ title: 'building material', value: 'c_rakeaine' },
	{ title: 'roof type', value: 'roof_type' },
	{ title: 'roof median color', value: 'roof_median_color' },
	{ title: 'roof mode color', value: 'roof_mode_color' },
	{ title: 'usage', value: 'kayttotarkoitus' },
	{ title: 'type', value: 'tyyppi' },
	{ title: 'heating method', value: 'c_lammtapa' },
	{ title: 'heating source', value: 'c_poltaine' },
]

export default {
	setup() {
		const containerRef = ref(/** @type {HTMLElement | null} */ (null))
		// onResize is wired in mounted(), once the Options API instance exists.
		const resizeHandler = { redraw: () => {} }
		const chartSize = useChartSize(containerRef, {
			aspect: 1.5,
			onResize: () => resizeHandler.redraw(),
		})
		return { containerRef, chartSize, resizeHandler }
	},
	data() {
		return {
			numericalOptions: NUMERICAL_OPTIONS,
			categoricalOptions: CATEGORICAL_OPTIONS,
			// Vue reactive properties for dropdown selections
			numericalValue: 'measured_height',
			categoricalValue: 'c_julkisivu',
			// Non-reactive service/store handles assigned in mounted() before any
			// method runs. Declared here so the component instance type knows about
			// them; the `(null)` placeholder is cast because the real value is set
			// in mounted() prior to first use.
			/** @type {ReturnType<typeof useGlobalStore>} */
			store: /** @type {any} */ (null),
			/** @type {ReturnType<typeof useToggleStore>} */
			toggleStore: /** @type {any} */ (null),
			/** @type {Plot} */
			plotService: /** @type {any} */ (null),
			/** @type {(() => void) | null} */
			unsubscribe: null,
		}
	},
	watch: {
		numericalValue() {
			this.selectAttributeForScatterPlot()
		},
		categoricalValue() {
			this.selectAttributeForScatterPlot()
		},
	},
	mounted() {
		this.store = useGlobalStore()
		this.toggleStore = useToggleStore()
		this.plotService = new Plot()
		this.resizeHandler.redraw = () => this.newScatterPlot()

		// Subscribe to eventBus updates. mitt's `on()` returns void, so build an
		// explicit unsubscribe closure that calls `off()` with the same handler
		// (otherwise the listener would never be removed on unmount).
		const handler = () => this.selectAttributeForScatterPlot()
		eventBus.on('updateScatterPlot', handler)
		this.unsubscribe = () => eventBus.off('updateScatterPlot', handler)

		this.newScatterPlot()
	},
	beforeUnmount() {
		// Remove eventBus listener
		if (this.unsubscribe) {
			this.unsubscribe()
		}
		this.chartSize.cleanup()
	},
	methods: {
		newScatterPlot() {
			if (this.toggleStore.helsinkiView) {
				this.selectAttributeForScatterPlot()
			} else {
				// Hide or clear the visualization when not visible
				this.clearScatterPlot()
			}
		},
		/**
		 * * A function to handle change of categorical or numerical value in the scatter plot
		 *
		 * */
		selectAttributeForScatterPlot() {
			// Not laid out yet (e.g. a closed panel); the resize observer redraws later.
			if (this.chartSize.width.value === 0) return
			const urbanHeatDataAndMaterial = []

			// Process the entities in the buildings data source and populate the urbanHeatDataAndMaterial array with scatter plot data
			this.processEntitiesForScatterPlot(urbanHeatDataAndMaterial)
			// Create a scatter plot with the updated data
			this.createScatterPlot(
				urbanHeatDataAndMaterial,
				this.getSelectedText('categoricalSelect') ?? '',
				this.getSelectedText('numericalSelect') ?? ''
			)
		},
		/**
		 * A function to process entities for scatter plot data
		 *
		 * @param { Array } urbanHeatDataAndMaterial - Array to store scatter plot data
		 */
		processEntitiesForScatterPlot(urbanHeatDataAndMaterial) {
			const numerical = this.numericalValue
			const categorical = this.categoricalValue
			const hideNonSote = this.toggleStore.hideNonSote
			const hideLowToggle = this.toggleStore.hideLow
			const hideNew = this.toggleStore.hideNewBuildings
			// Get entities from cesiumEntityManager instead of propsStore
			const entities = cesiumEntityManager.getAllBuildingEntities()

			entities.forEach((entity) => {
				let addDataToScatterPlot = true

				if (!hideNonSote && !hideLowToggle && !hideNew) {
					this.addDataForScatterPlot(
						urbanHeatDataAndMaterial,
						entity,
						this.getSelectedText('categoricalSelect') ?? '',
						this.getSelectedText('numericalSelect') ?? '',
						categorical,
						numerical
					)
				} else {
					if (hideNonSote && !this.isSoteBuilding(entity)) {
						addDataToScatterPlot = false
					}

					if (hideLowToggle && this.isLowBuilding(entity)) {
						addDataToScatterPlot = false
					}

					if (hideNew && this.isNewBuilding(entity)) {
						addDataToScatterPlot = false
					}

					if (addDataToScatterPlot) {
						this.addDataForScatterPlot(
							urbanHeatDataAndMaterial,
							entity,
							this.getSelectedText('categoricalSelect') ?? '',
							this.getSelectedText('numericalSelect') ?? '',
							categorical,
							numerical
						)
					}
				}
			})
		},

		isSoteBuilding(entity) {
			const kayttotark = Number(entity._properties.c_kayttark?._value)

			return (
				!kayttotark ||
				[511, 131, ...Array.from({ length: 28 }, (_, i) => i + 211)].includes(kayttotark)
			)
		},

		isLowBuilding(entity) {
			const floorCount = Number(entity._properties.i_kerrlkm?._value)

			return !floorCount || floorCount <= 6
		},

		isNewBuilding(entity) {
			const c_valmpvm = new Date(entity._properties._c_valmpvm?._value)?.getTime()
			const cutoffDate = DATES.NEW_BUILDING_CUTOFF.getTime()

			return !c_valmpvm || c_valmpvm >= cutoffDate
		},

		/**
		 * This function creates a data set required for scatter plotting urban heat exposure.
		 *
		 * @param { Array } urbanHeatDataAndMaterial array to append scatter plot data to
		 * @param { Object } entity building entity in postal code area
		 * @param { String } categorical name of categorical attribute displayed for user
		 * @param { String } numerical name of numerical attribute displayed for user
		 * @param { String } categoricalName name of categorical attribute in register
		 * @param { String } numericalName name of numerical attribute in registery
		 */
		addDataForScatterPlot(
			urbanHeatDataAndMaterial,
			entity,
			categorical,
			numerical,
			categoricalName,
			numericalName
		) {
			// Check if entity has the required properties.
			if (
				entity._properties.avgheatexposuretobuilding &&
				entity._properties[categoricalName] &&
				entity._properties[numericalName] &&
				entity._properties[categoricalName]._value
			) {
				// Get the numerical value from the entity properties.
				let numbericalValue = entity._properties[numericalName]._value

				// If the numerical attribute is c_valmpvm, convert it to a number.
				if (numericalName === 'c_valmpvm' && numbericalValue) {
					numbericalValue = new Date().getFullYear() - Number(numbericalValue.slice(0, 4))
				}

				if (
					entity._properties._area_m2 &&
					Number(entity._properties._area_m2._value) > 225 &&
					entity._properties._id
				) {
					// Create an object with the required properties and add it to the urbanHeatDataAndMaterial array.
					const element = {
						heat: entity._properties.avgheatexposuretobuilding._value,
						[categorical]: entity._properties[categoricalName]._value,
						[numerical]: numbericalValue,
						buildingId: entity._properties._id._value,
					}
					urbanHeatDataAndMaterial.push(element)
				}
			}
		},

		/**
		 * Returns the display name of the selected option in a dropdown.
		 *
		 * @param { 'numericalSelect' | 'categoricalSelect' } selectName - Which dropdown to read
		 * @returns { string | null } The selected option's title, or null if nothing matches.
		 */
		getSelectedText(selectName) {
			const [options, value] =
				selectName === 'numericalSelect'
					? [this.numericalOptions, this.numericalValue]
					: [this.categoricalOptions, this.categoricalValue]
			return options.find((option) => option.value === value)?.title ?? null
		},

		/**
		 * The function finds all unique values for given category.
		 *
		 * @param { object } features dataset that contains building heat exposure and attributes of the building
		 * @param { String } category value code for facade material
		 * @return { Array<String> } List containing all unique values for the category
		 */
		createUniqueValuesList(features, category) {
			const uniqueValues = []

			for (let i = 0; i < features.length; i++) {
				const value = features[i][category]

				if (!uniqueValues.includes(value)) {
					uniqueValues.push(value)
				}
			}

			return uniqueValues
		},
		/**
		 * The function adds heat exposure data for given category value.
		 *
		 * @param { String } value value of category
		 * @param { object } features dataset that contains building heat exposure and attributes of the building
		 * @param { String } categorical name of categorical attribute
		 * @param { String } numerical name of numerical attribute
		 * @return { object } Object that contains list of heat exposures and numerical values, and average heat exposure
		 */
		addHeatForLabelAndX(value, features, categorical, numerical) {
			const heatList = []
			const numericalList = []
			let average = 0
			let sum = 0
			const ids = []

			for (let i = 0; i < features.length; i++) {
				if (features[i][categorical] === value) {
					heatList.push(features[i].heat)
					numericalList.push(features[i][numerical])
					ids.push(features[i].buildingId)
					sum = sum + features[i].heat
				}
			}

			// calculate average heat exposure
			average = sum / heatList.length

			return [heatList, numericalList, average, ids]
		},

		/**
		 * Initialize plot container using Vue ref (proper Vue pattern)
		 * Note: D3.js requires DOM access for SVG manipulation - using ref maintains Vue encapsulation
		 */
		initializePlotContainer() {
			// Use Vue ref for direct DOM access (maintains component encapsulation)
			const container = /** @type {HTMLElement | undefined} */ (this.$refs.containerRef)
			if (container) {
				// Use textContent for safe clearing (prevents potential XSS)
				container.textContent = ''
				container.style.visibility = this.toggleStore.showPlot ? 'visible' : 'hidden'
			}
		},

		prepareDataForPlot(features, categorical, numerical) {
			const values = this.createUniqueValuesList(features, categorical)
			const heatData = []
			const labelsWithAverage = []

			values.forEach((value) => {
				const dataWithHeat = this.addHeatForLabelAndX(value, features, categorical, numerical)
				const plotData = {
					xData: dataWithHeat[1],
					yData: dataWithHeat[0],
					name: value,
					buildingId: dataWithHeat[3],
				}
				plotData.xData.forEach((xData, j) => {
					// Include the buildingId in the data pushed to heatData
					heatData.push({
						xData: xData,
						yData: plotData.yData[j],
						name: value,
						buildingId: plotData.buildingId[j],
					})
				})
				const averageLabel = `${value} ${dataWithHeat[2].toFixed(2)}`
				if (!labelsWithAverage.includes(averageLabel)) {
					labelsWithAverage.push(averageLabel)
				}
			})

			return { heatData, labelsWithAverage, values }
		},

		addPlotElements(svg, heatData, xScale, yScale, colorScale, numerical, categorical) {
			const container = this.containerRef
			const tooltip = this.plotService.createTooltip(container)
			const buildingSerivce = new Building()

			svg
				.append('g')
				.selectAll('dot')
				.data(heatData)
				.enter()
				.append('circle')
				.attr('cx', (d) => xScale(d.xData))
				.attr('cy', (d) => yScale(d.yData))
				.attr('r', 2)
				.style('fill', (d) => colorScale(d.name))
				.style('cursor', 'pointer')
				.on('mouseover', (event, d) =>
					this.plotService.handleMouseover(
						tooltip,
						container,
						event,
						d,
						(data) =>
							`${numerical}: ${data.xData}<br>heat exposure index: ${data.yData}<br>${categorical}: ${data.name}`
					)
				)
				.on('mouseout', () => this.plotService.handleMouseout(tooltip))
				.on('click', (_event, d) => {
					// Assume each data point includes a building ID or some identifier
					buildingSerivce.highlightBuildingInViewer(d.buildingId)
				})
		},

		createLegend(svg, width, margin, values, labelsWithAverage, colorScale) {
			const maxVisibleItems = 15
			const itemHeight = 16
			const legendHeight = maxVisibleItems * itemHeight

			const legend = svg
				.append('g')
				.attr('class', 'legend')
				.attr('transform', `translate(${width},${margin.top - 20})`)

			// Create a scrolling container
			const legendContainer = legend
				.append('foreignObject')
				.attr('width', margin.right) // Adjust based on your layout
				.attr('height', legendHeight)
				.style('overflow-y', values.length > maxVisibleItems ? 'scroll' : 'hidden')

			const legendContent = legendContainer
				.append('xhtml:div')
				.style('height', `${values.length * itemHeight}px`) // Total height to allow scroll
				.style('position', 'relative')

			// Draw color boxes
			legendContent
				.selectAll('.legend-color')
				.data(values)
				.enter()
				.append('div')
				.style('position', 'absolute')
				.style('top', (_d, i) => `${i * itemHeight}px`)
				.style('left', '2px')
				.style('width', '10px')
				.style('height', '10px')
				.style('background-color', (d) => colorScale(d))

			// Draw labels
			legendContent
				.selectAll('.legend-label')
				.data(labelsWithAverage)
				.enter()
				.append('div')
				.style('position', 'absolute')
				.style('top', (_d, i) => `${i * itemHeight}px`)
				.style('left', '15px')
				.style('font-size', '9px')
				.text((d) => d)
		},

		createColorScale(values) {
			return d3.scaleOrdinal().domain(values).range(d3.schemeCategory10) // This is a D3 predefined set of colors
		},

		/**
		 * Creates scatter plot that always has average urban heat exposure to building at y-axis. Categorical attributes.
		 *
		 * @param { object } features dataset that contains building heat exposure and attributes of the building
		 * @param { String } categorical name of categorical attribute
		 * @param { String } numerical name of numerical attribute
		 */
		createScatterPlot(features, categorical, numerical) {
			// Setup the scatter plot container
			this.initializePlotContainer()

			// Prepare the data for the plot
			const { heatData, labelsWithAverage, values } = this.prepareDataForPlot(
				features,
				categorical,
				numerical
			)

			const margin = { top: 25, right: 190, bottom: 18, left: 28 }
			const width = this.chartSize.width.value - margin.left - margin.right
			const height = this.chartSize.height.value - margin.top - margin.bottom

			// Initialize the SVG element
			const svg = this.plotService.createSVGElement(margin, width, height, this.containerRef)

			const xScale = this.plotService.createScaleLinear(
				d3.min(heatData, (d) => d.xData) - 1,
				d3.max(heatData, (d) => d.xData) + 2,
				[0, width]
			)
			const yScale = this.plotService.createScaleLinear(
				d3.min(heatData, (d) => d.yData) - 0.05,
				d3.max(heatData, (d) => d.yData) + 0.05,
				[height, 0]
			)

			// Setup the axes
			this.plotService.setupAxes(svg, xScale, yScale, height)

			// Create the color scale
			const colorScale = this.createColorScale(values)

			// Add the dots (plot elements) to the plot
			this.addPlotElements(svg, heatData, xScale, yScale, colorScale, numerical, categorical)

			// Create the legend
			this.createLegend(svg, width, margin, values, labelsWithAverage, colorScale)

			this.plotService.addTitle(
				svg,
				'Heat exposure index with building attributes',
				margin.left,
				margin.top - 8
			)
		},

		clearScatterPlot() {
			// Remove or clear the D3.js visualization using Vue ref
			// Using D3.js on the ref value maintains Vue encapsulation
			if (this.$refs.containerRef) {
				d3.select(/** @type {HTMLElement} */ (this.$refs.containerRef))
					.select('svg')
					.remove()
			}
		},
	},
}
</script>

<style scoped>
.scatter-plot-container {
	position: relative;
	width: 100%;
	background-color: rgb(var(--v-theme-surface));
}
</style>
