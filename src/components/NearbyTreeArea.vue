<template>
	<div id="nearbyTreeAreaContainer" />

	<label
		id="bearingLabel"
		style="position: fixed; bottom: 41px; left: 15px; visibility: hidden"
		>Direction of trees</label
	>

	<div id="bearingAllSwitchContainer">
		<!-- bearingAll -->
		<label
			id="bearingAllSwitch"
			class="switch"
		>
			<input
				id="bearingAllToggle"
				type="checkbox"
				value="a"
			/>
			<span class="slider round" />
		</label>
		<label
			id="bearingAllLabel"
			for="bearingAllToggle"
			class="label"
			>All</label
		>
	</div>

	<div id="bearingSouthSwitchContainer">
		<!-- bearingSouth -->
		<label
			id="bearingSouthSwitch"
			class="switch"
		>
			<input
				id="bearingSouthToggle"
				type="checkbox"
				value="s"
			/>
			<span class="slider round" />
		</label>
		<label
			id="bearingSouthLabel"
			for="bearingSouthToggle"
			class="label"
			>South</label
		>
	</div>

	<div id="bearingWestSwitchContainer">
		<!-- bearingWest -->
		<label
			id="bearingWestSwitch"
			class="switch"
		>
			<input
				id="bearingWestToggle"
				type="checkbox"
				value="w"
			/>
			<span class="slider round" />
		</label>
		<label
			id="bearingWestLabel"
			for="bearingWestToggle"
			class="label"
			>West</label
		>
	</div>

	<div id="bearingEastSwitchContainer">
		<!-- bearingEast -->
		<label
			id="bearingEastwitch"
			class="switch"
		>
			<input
				id="bearingEastToggle"
				type="checkbox"
				value="e"
			/>
			<span class="slider round" />
		</label>
		<label
			id="bearingEastLabel"
			for="bearingEastToggle"
			class="label"
			>East</label
		>
	</div>

	<div id="bearingNorthSwitchContainer">
		<!-- bearingWest -->
		<label
			id="bearingNorthSwitch"
			class="switch"
		>
			<input
				id="bearingNorthToggle"
				type="checkbox"
				value="n"
			/>
			<span class="slider round" />
		</label>
		<label
			id="bearingNorthLabel"
			for="bearingNorthToggle"
			class="label"
			>North</label
		>
	</div>
</template>

<script>
import * as Cesium from 'cesium'
import * as d3 from 'd3' // Import D3.js
import Building from '../services/building.js'
import { cesiumEntityManager } from '../services/cesiumEntityManager.js'
import { eventBus } from '../services/eventEmitter.js'
import Plot from '../services/plot.js'
import Tree from '../services/tree.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { usePropsStore } from '../stores/propsStore.js'
import { useToggleStore } from '../stores/toggleStore.js'

export default {
	data() {
		return {
			eventCleanupFunctions: [],
		}
	},
	mounted() {
		this.unsubscribe = eventBus.on('newNearbyTreeDiagram', this.newNearbyTreeDiagram)
		this.store = useGlobalStore()
		this.toggleStore = useToggleStore()
		this.plotService = new Plot()
	},
	beforeUnmount() {
		eventBus.off('newNearbyTreeDiagram')
		// Clean up all bearing switch event listeners
		this.eventCleanupFunctions.forEach((cleanup) => cleanup())
		this.eventCleanupFunctions = []
	},
	methods: {
		newNearbyTreeDiagram() {
			const propsStore = usePropsStore()
			setupBearingSwitches(this.store.postalcode, this)

			if (this.store.level === 'postalCode') {
				this.plotService.hideScatterPlot()
				// Call function that combines datasets for plotting
				// Use serializable data from store + cesiumEntityManager for visual mutations
				const sumPAlaM2Map = this.combineDistanceAndTreeData(
					propsStore.treeBuildingDistanceData,
					propsStore.treeData
				)
				const heatExpTreeArea = this.createTreeBuildingPlotMap(
					sumPAlaM2Map,
					propsStore.buildingData
				)
				const heatExpAverageTreeArea = this.extractKeysAndAverageTreeArea(heatExpTreeArea)
				this.createTreesNearbyBuildingsPlot(
					heatExpAverageTreeArea[0],
					heatExpAverageTreeArea[1],
					heatExpAverageTreeArea[2]
				)
			}
		},
		clearNearbyTreeDiagram() {
			d3.select('#nearbyTreeAreaContainer').select('svg').remove()
		},
		/**
		 * Extracts heat expsoure and calculates average tree_area from the heatTreeAverageMap.
		 *
		 * @param { Map } heatTreeAverageMap - The map containing heat exposure values as keys and tree_area/count as values.
		 *
		 * @return { Array } An array containing three sub-arrays. The first sub-array contains all the keys from the map, and the second sub-array contains the calculated average tree_area for each key. Third one contains the count of buildings for the heat exposure value.
		 */
		extractKeysAndAverageTreeArea(heatTreeAverageMap) {
			const heatExpArray = []
			const averageTreeAreaArray = []
			const buildingCounts = []

			heatTreeAverageMap.forEach((value, key) => {
				heatExpArray.push(key)

				if (value.tree_area === 0) {
					// setting the value to 1 if there is no tree area nearby
					averageTreeAreaArray.push(1)
				} else {
					averageTreeAreaArray.push(value.tree_area / value.count)
				}

				buildingCounts.push(value.count)
			})

			return [heatExpArray, averageTreeAreaArray, buildingCounts]
		},

		/**
		 * Adds Urban Heat Exposure to tree area data.
		 * Uses serializable buildingData + cesiumEntityManager for visual updates
		 *
		 * @param { Map } sumPAlaM2Map - The dataset containing tree information, mapped to building IDs.
		 * @param { Map } buildingData - Map of building_id -> {heatExposure, area_m2, hki_id}
		 *
		 * @return { Map } A map for plotting that contains the aggregated tree_area and count of buildings for each heat exposure value.
		 */
		createTreeBuildingPlotMap(sumPAlaM2Map, buildingData) {
			const heatTreeAverageMap = new Map()
			let totalCounter = 0
			let totalTreeArea = 0

			let maxTreeArea = 0
			let maxTreeAreaBuilding = null

			// Iterate over serializable building data
			for (const [building_id, buildingInfo] of buildingData.entries()) {
				const heatExposure = buildingInfo.heatExposure
				const area_m2 = buildingInfo.area_m2

				// Check if building has required data and meets size threshold
				if (heatExposure && building_id && area_m2 && Number(area_m2) > 225) {
					let tree_area = sumPAlaM2Map.get(building_id)

					// Set tree area to 0 if not found
					if (!tree_area) {
						tree_area = 0
					}

					const heatExpFixed = heatExposure.toFixed(2)

					// Aggregate by heat exposure
					if (heatTreeAverageMap.has(heatExpFixed)) {
						const storedValues = heatTreeAverageMap.get(heatExpFixed)
						storedValues.tree_area = storedValues.tree_area + tree_area
						storedValues.count = storedValues.count + 1

						heatTreeAverageMap.set(heatExpFixed, storedValues)
					} else {
						heatTreeAverageMap.set(heatExpFixed, { tree_area: tree_area, count: 1 })
					}

					// Visual updates via cesiumEntityManager
					const entity = cesiumEntityManager.getBuildingEntity(building_id)
					if (entity) {
						// Set tree_area as a property of the entity using proper Cesium Property API
						if (!entity.properties.hasProperty('treeArea')) {
							entity.properties.addProperty('treeArea')
						}
						entity.properties.treeArea = new Cesium.ConstantProperty(tree_area)

						if (tree_area > 225) {
							// Highlight the building entity edges by changing its outlineColor and outlineWidth
							if (entity.polygon) {
								entity.polygon.outline = true // Enable outline
								entity.polygon.outlineColor = Cesium.Color.CHARTREUSE // Set outline color to green
								entity.polygon.outlineWidth = 20 // Set outline width to 3 (adjust as needed)
							}

							if (maxTreeArea < tree_area) {
								maxTreeArea = tree_area
								maxTreeAreaBuilding = building_id
							}
						}
					}

					// for calculating postal code average
					totalTreeArea += tree_area
					totalCounter++
				}
			}

			this.setEntityColorToGreen(maxTreeAreaBuilding)

			this.store.setAverageTreeArea(totalTreeArea / totalCounter)

			return heatTreeAverageMap
		},

		/**
		 * Set up entity outline
		 * Uses cesiumEntityManager for direct entity lookup
		 *
		 * @param { string } entityId - Id of Cesium entity
		 *
		 */
		setEntityColorToGreen(entityId) {
			if (!entityId) return

			// Get entity directly from cesiumEntityManager
			const entity = cesiumEntityManager.getBuildingEntity(entityId)

			if (entity?.polygon) {
				entity.polygon.material = Cesium.Color.FORESTGREEN
				entity.polygon.outlineColor = Cesium.Color.RED // Set outline color to red
			}
		},

		/**
		 * Combines the distance and tree datasets for plotting
		 * Uses serializable treeData + cesiumEntityManager for visual updates
		 *
		 * @param { object } distanceData - The dataset containing distance information
		 * @param { Array } treeData - Serializable tree data [{kohde_id, p_ala_m2}]
		 *
		 * @return { object } mapped data for plotting
		 */
		combineDistanceAndTreeData(distanceData, treeData) {
			const selectedBearingValue = this.findSelectedBearingValue()

			// Create a map to store the sum of 'p_ala_m2' for each 'kohde_id' in 'treeData'
			const sumPAlaM2Map = new Map()

			// Create a lookup map from treeData for faster access
			const treeDataMap = new Map()
			for (const tree of treeData) {
				treeDataMap.set(tree.kohde_id, tree.p_ala_m2)
			}

			for (let i = 0, len = distanceData.features.length; i < len; i++) {
				const bearing = distanceData.features[i].properties.bearing

				if (this.checkBearing(bearing, selectedBearingValue)) {
					const building_id = distanceData.features[i].properties.building_id
					const tree_id = distanceData.features[i].properties.tree_id

					// Get tree area from serializable data
					const p_ala_m2 = treeDataMap.get(tree_id)

					if (p_ala_m2 !== undefined) {
						// Update visual properties via cesiumEntityManager
						const entity = cesiumEntityManager.getTreeEntity(tree_id)
						if (entity) {
							entity.polygon.outline = true // Enable outline
							entity.polygon.outlineColor = Cesium.Color.CHARTREUSE // Set outline color to green
							entity.polygon.outlineWidth = 20 // Set outline width to 3 (adjust as needed)
						}

						// Aggregate tree area by building
						if (sumPAlaM2Map.has(building_id)) {
							sumPAlaM2Map.set(building_id, sumPAlaM2Map.get(building_id) + p_ala_m2)
						} else {
							sumPAlaM2Map.set(building_id, p_ala_m2)
						}
					}
				}
			}

			return sumPAlaM2Map
		},

		/**
		 * Check if the bearing value is according to user select value
		 *
		 * @param { Number } bearing - The bearing of tree to building
		 * @param { String } selectedBearingValue - The selected bearing value by user
		 *
		 * @return { Boolean }
		 */
		checkBearing(bearing, selectedBearingValue) {
			switch (selectedBearingValue) {
				case 'a':
					return true
				case 's':
					if (bearing > 134 && bearing < 225) {
						return true
					}
					break
				case 'w':
					if (bearing > 224 && bearing < 315) {
						return true
					}
					break
				case 'n':
					if (bearing > 314 && bearing < 45) {
						return true
					}
					break
				case 'e':
					if (bearing > 44 && bearing < 135) {
						return true
					}
					break
				default:
					return false
			}
		},

		createBarsForTreeChart(
			svg,
			data,
			xScale,
			yScale,
			width,
			height,
			tooltip,
			containerId,
			heatExps,
			color = 'green'
		) {
			svg
				.selectAll('.bar')
				.data(data)
				.enter()
				.append('rect')
				.attr('class', 'bar')
				.attr('x', (_d, i) => xScale(heatExps[i]))
				.attr('y', (d) => yScale(d))
				.attr('width', width / data.length)
				.attr('height', (d) => height - yScale(d))
				.attr('fill', color)
				.on('mouseover', (event, d, i) =>
					this.plotService.handleMouseover(
						tooltip,
						containerId,
						event,
						d,
						() => `Heat Exposure: ${heatExps[i]}<br>Tree Area: ${d}`
					)
				)
				.on('mouseout', () => this.plotService.handleMouseout(tooltip))
		},
		/**
		 * This function iterates through each direction using the switches array.
		 * For each direction, function gets the corresponding switch container and the associated toggle input element.
		 * If the toggle is checked (meaning the switch is turned on), the function return its value
		 *
		 */
		findSelectedBearingValue() {
			const switches = ['All', 'South', 'West', 'East', 'North']

			for (const direction of switches) {
				const switchContainer = document.getElementById(`bearing${direction}SwitchContainer`)
				const toggle = switchContainer.querySelector(`#bearing${direction}Toggle`)

				if (toggle.checked) {
					return toggle.value
				}
			}

			return null // Return null if no switch is selected
		},

		/**
		 * Creates trees nearby buildings bar plot
		 *
		 * @param { Array<Number> } heatexps array cointainig buildings heat exposure
		 * @param { Array<Number> } tree_areas array cointainig buildings nearby tree area
		 * @param { Array<Number> } counts array cointainig count of buildings for that heat exposure
		 */
		createTreesNearbyBuildingsPlot(heatexps, tree_areas) {
			this.plotService.initializePlotContainer('nearbyTreeAreaContainer')

			if (tree_areas.length > 0) {
				this.plotService.toggleBearingSwitchesVisibility('visible')

				const margin = { top: 30, right: 30, bottom: 60, left: 30 }
				const width = 600 - margin.left - margin.right
				const height = 300 - margin.top - margin.bottom

				const svg = this.plotService.createSVGElement(
					margin,
					width,
					height,
					'#nearbyTreeAreaContainer'
				)

				const x = this.plotService.createScaleLinear(d3.min(heatexps), d3.max(heatexps), [0, width])
				const y = this.plotService.createScaleLinear(0, d3.max(tree_areas), [height, 0])

				this.plotService.setupAxes(svg, x, y, height)

				const tooltip = this.plotService.createTooltip('#nearbyTreeAreaContainer')

				this.createBarsForTreeChart(
					svg,
					tree_areas,
					x,
					y,
					width,
					height,
					tooltip,
					'nearbyTreeAreaContainer',
					heatexps,
					'green'
				)
				this.plotService.addTitle(
					svg,
					'Nearby Tree Area of Buildings with Heat Exposure',
					width,
					margin
				)
			}
		},
	},
}

const setupBearingSwitches = (postalcode, componentInstance) => {
	const switches = ['All', 'South', 'West', 'East', 'North']

	// Clean up previous listeners before adding new ones
	if (componentInstance.eventCleanupFunctions.length > 0) {
		componentInstance.eventCleanupFunctions.forEach((cleanup) => cleanup())
		componentInstance.eventCleanupFunctions = []
	}

	for (const currentDirection of switches) {
		const switchContainer = document.getElementById(`bearing${currentDirection}SwitchContainer`)
		const toggle = switchContainer.querySelector(`#bearing${currentDirection}Toggle`)

		const handler = () => {
			updateBearingSwitches(switches, currentDirection)
			const treeService = new Tree()
			const buildingService = new Building()
			buildingService.resetBuildingEntities()
			treeService.resetTreeEntities()
			treeService.fetchAndAddTreeDistanceData(postalcode)
		}

		toggle.addEventListener('click', handler)
		// Store cleanup function
		componentInstance.eventCleanupFunctions.push(() => toggle.removeEventListener('click', handler))

		// Set the 'All' switch to checked by default
		if (currentDirection === 'All') {
			toggle.checked = true
		}
	}
}

const updateBearingSwitches = (switches, currentDirection) => {
	// Use an arrow function with const
	for (const otherDirection of switches) {
		if (currentDirection !== otherDirection) {
			const otherSwitchContainer = document.getElementById(
				`bearing${otherDirection}SwitchContainer`
			)
			const otherToggle = otherSwitchContainer.querySelector(`#bearing${otherDirection}Toggle`)
			otherToggle.checked = false
		}
	}
}
</script>

<style>
#nearbyTreeAreaContainer {
	position: fixed;
	bottom: 35px;
	left: -19px;
	width: 640px; /* Adjusted width to accommodate margin */
	height: 300px; /* Adjusted height to accommodate margin */
	visibility: hidden;
	font-size: smaller;
	border: 1px solid black;
	box-shadow: 3px 5px 5px black;
	background-color: white;
	margin: 20px; /* Add margins to the container */
}
#bearingAllSwitchContainer {
	position: fixed;
	bottom: 65px;
	left: 120px;
	visibility: hidden;
}

#bearingSouthSwitchContainer {
	position: fixed;
	bottom: 65px;
	left: 210px;
	visibility: hidden;
}

#bearingWestSwitchContainer {
	position: fixed;
	bottom: 65px;
	left: 300px;
	visibility: hidden;
}

#bearingEastSwitchContainer {
	position: fixed;
	bottom: 65px;
	left: 390px;
	visibility: hidden;
}

#bearingNorthSwitchContainer {
	position: fixed;
	bottom: 65px;
	left: 480px;
	visibility: hidden;
}
</style>
