<template>
	<div id="scatterPlotContainer" />

	<select id="numericalSelect" value="numerical">
		<option value="measured_height" selected>height</option>
		<option value="c_valmpvm">age</option>
		<option value="area_m2">area</option>
		<option value="i_raktilav">volume</option>
	</select>

	<select id="categoricalSelect" value="categorical">
		<option value="c_julkisivu" selected>facade material</option>
		<option value="c_rakeaine">building material</option>
		<option value="roof_type">roof type</option>
		<option value="roof_median_color">roof median color</option>
		<option value="roof_mode_color">roof mode color</option>
		<option value="kayttotarkoitus">usage</option>
		<option value="tyyppi">type</option>
		<option value="c_lammtapa">heating method</option>
		<option value="c_poltaine">heating source</option>
	</select>
</template>

<script>
import { eventBus } from '../services/eventEmitter.js';
import * as d3 from 'd3'; // Import D3.js
import { useGlobalStore } from '../stores/globalStore.js';
import Plot from '../services/plot.js';
import Building from '../services/building.js';
import { useToggleStore } from '../stores/toggleStore.js';
import { usePropsStore } from '../stores/propsStore';

export default {
	mounted() {
		this.store = useGlobalStore();
		this.toggleStore = useToggleStore();
		this.plotService = new Plot();

		const numericalSelect = document.getElementById('numericalSelect');
		numericalSelect.addEventListener('change', this.handleSelectChange);

		const categoricalSelect = document.getElementById('categoricalSelect');
		categoricalSelect.addEventListener('change', this.handleSelectChange);

		eventBus.on('updateScatterPlot', this.selectAttributeForScatterPlot);

		this.newScatterPlot();
	},
	methods: {
		newScatterPlot() {
			if (this.toggleStore.helsinkiView) {
				this.selectAttributeForScatterPlot();
			} else {
				// Hide or clear the visualization when not visible
				// Example: call a method to hide or clear the D3 visualization
				this.clearScatterPlot();
			}
		},
		// Method to handle the change event for both selects
		handleSelectChange() {
			this.selectAttributeForScatterPlot();
		},
		/**
		 * * A function to handle change of categorical or numerical value in the scatter plot
		 *
		 * */
		selectAttributeForScatterPlot() {
			const urbanHeatDataAndMaterial = [];

			// Process the entities in the buildings data source and populate the urbanHeatDataAndMaterial array with scatter plot data
			this.processEntitiesForScatterPlot(urbanHeatDataAndMaterial);
			// Create a scatter plot with the updated data
			this.createScatterPlot(
				urbanHeatDataAndMaterial,
				this.getSelectedText('categoricalSelect'),
				this.getSelectedText('numericalSelect')
			);
		},
		/**
		 * A function to process entities for scatter plot data
		 *
		 * @param { Array } urbanHeatDataAndMaterial - Array to store scatter plot data
		 */
		processEntitiesForScatterPlot(urbanHeatDataAndMaterial) {
			const numerical = document.getElementById('numericalSelect').value;
			const categorical = document.getElementById('categoricalSelect').value;
			const hideNonSote = this.toggleStore.hideNonSote;
			const hideLowToggle = this.toggleStore.hideLow;
			const hideNew = this.toggleStore.hideNew;
			const propsStore = usePropsStore();
			const entities = propsStore.scatterPlotEntities;

			entities.forEach((entity) => {
				let addDataToScatterPlot = true;

				if (!hideNonSote && !hideLowToggle && !hideNew) {
					this.addDataForScatterPlot(
						urbanHeatDataAndMaterial,
						entity,
						this.getSelectedText('categoricalSelect'),
						this.getSelectedText('numericalSelect'),
						categorical,
						numerical
					);
				} else {
					if (hideNonSote && !this.isSoteBuilding(entity)) {
						addDataToScatterPlot = false;
					}

					if (hideLowToggle && this.isLowBuilding(entity)) {
						addDataToScatterPlot = false;
					}

					if (hideNew && this.isNewBuilding(entity)) {
						addDataToScatterPlot = false;
					}

					if (addDataToScatterPlot) {
						this.addDataForScatterPlot(
							urbanHeatDataAndMaterial,
							entity,
							this.getSelectedText('categoricalSelect'),
							this.getSelectedText('numericalSelect'),
							categorical,
							numerical
						);
					}
				}
			});
		},

		isSoteBuilding(entity) {
			const kayttotark = Number(entity._properties.c_kayttark?._value);

			return (
				!kayttotark ||
				[511, 131, ...Array.from({ length: 28 }, (_, i) => i + 211)].includes(kayttotark)
			);
		},

		isLowBuilding(entity) {
			const floorCount = Number(entity._properties.i_kerrlkm?._value);

			return !floorCount || floorCount <= 6;
		},

		isNewBuilding(entity) {
			const c_valmpvm = new Date(entity._properties._c_valmpvm?._value)?.getTime();
			const cutoffDate = new Date('2018-06-01T00:00:00').getTime();

			return !c_valmpvm || c_valmpvm >= cutoffDate;
		},

		/**
		 * This function creates a data set required for scatter plotting urban heat exposure.
		 *
		 * @param { Object } features buildings in postal code area
		 * @param { String } categorical name of categorical attribute displayed for user
		 * @param { String } numerical name of numerical attribute displayed for user
		 * @param { String } categoricalName name of numerical attribute in register
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
				let numbericalValue = entity._properties[numericalName]._value;

				// If the numerical attribute is c_valmpvm, convert it to a number.
				if (numericalName == 'c_valmpvm' && numbericalValue) {
					numbericalValue = new Date().getFullYear() - Number(numbericalValue.slice(0, 4));
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
					};
					urbanHeatDataAndMaterial.push(element);
				}
			}
		},

		/**
		 * Returns the selected text of a dropdown menu with the given element ID.
		 *
		 * @param { string } elementId - The ID of the HTML element that represents the dropdown menu.
		 * @returns { string } The selected text of the dropdown menu, or null if no option is selected.
		 */
		getSelectedText(elementId) {
			const elt = document.getElementById(elementId);

			if (elt.selectedIndex == -1) {
				return null;
			}

			return elt.options[elt.selectedIndex].text;
		},

		/**
		 * The function finds all unique values for given category.
		 *
		 * @param { object } features dataset that contains building heat exposure and attributes of the building
		 * @param { String } category value code for facade material
		 * @return { Array<String> } List containing all unique values for the category
		 */
		createUniqueValuesList(features, category) {
			let uniqueValues = [];

			for (let i = 0; i < features.length; i++) {
				let value = features[i][category];

				if (!uniqueValues.includes(value)) {
					uniqueValues.push(value);
				}
			}

			return uniqueValues;
		},
		/**
		 * The function adds heat exposure data for given category value.
		 *
		 * @param { String } valeu value of category
		 * @param { object } features dataset that contains building heat exposure and attributes of the building
		 * @param { String } categorical name of categorical attribute
		 * @param { String } numerical name of numerical attribute
		 * @return { object } Object that contains list of heat exposures and numerical values, and average heat exposure
		 */
		addHeatForLabelAndX(value, features, categorical, numerical) {
			let heatList = [];
			let numericalList = [];
			let average = 0;
			let sum = 0;
			let ids = [];

			for (let i = 0; i < features.length; i++) {
				if (features[i][categorical] == value) {
					heatList.push(features[i].heat);
					numericalList.push(features[i][numerical]);
					ids.push(features[i].buildingId);
					sum = sum + features[i].heat;
				}
			}

			// calculate average heat exposure
			average = sum / heatList.length;

			return [heatList, numericalList, average, ids];
		},

		initializePlotContainer(containerId) {
			const container = document.getElementById(containerId);
			container.innerHTML = '';
			container.style.visibility = this.toggleStore.showPlot ? 'visible' : 'hidden';
		},

		prepareDataForPlot(features, categorical, numerical) {
			const values = this.createUniqueValuesList(features, categorical);
			let heatData = [];
			let labelsWithAverage = [];

			values.forEach((value) => {
				const dataWithHeat = this.addHeatForLabelAndX(value, features, categorical, numerical);
				const plotData = {
					xData: dataWithHeat[1],
					yData: dataWithHeat[0],
					name: value,
					buildingId: dataWithHeat[3],
				};
				plotData.xData.forEach((xData, j) => {
					// Include the buildingId in the data pushed to heatData
					heatData.push({
						xData: xData,
						yData: plotData.yData[j],
						name: value,
						buildingId: plotData.buildingId[j],
					});
				});
				const averageLabel = value + ' ' + dataWithHeat[2].toFixed(2);
				if (!labelsWithAverage.includes(averageLabel)) {
					labelsWithAverage.push(averageLabel);
				}
			});

			return { heatData, labelsWithAverage, values };
		},

		addPlotElements(svg, heatData, xScale, yScale, colorScale, numerical, categorical) {
			const tooltip = this.plotService.createTooltip('#scatterPlotContainer');
			const buildingSerivce = new Building();

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
				.on('mouseover', (event, d) =>
					this.plotService.handleMouseover(
						tooltip,
						'scatterPlotContainer',
						event,
						d,
						(data) =>
							`${numerical}: ${data.xData}<br>heat exposure index: ${data.yData}<br>${categorical}: ${data.name}`
					)
				)
				.on('mouseout', () => this.plotService.handleMouseout(tooltip))
				.on('click', (event, d) => {
					// Assume each data point includes a building ID or some identifier
					buildingSerivce.highlightBuildingInViewer(d.buildingId);
				});
		},

		createLegend(svg, width, margin, values, labelsWithAverage, colorScale) {
			const maxVisibleItems = 15;
			const itemHeight = 16;
			const legendHeight = maxVisibleItems * itemHeight;

			const legend = svg
				.append('g')
				.attr('class', 'legend')
				.attr('transform', `translate(${width},${margin.top - 20})`);

			// Create a scrolling container
			const legendContainer = legend
				.append('foreignObject')
				.attr('width', margin.right) // Adjust based on your layout
				.attr('height', legendHeight)
				.style('overflow-y', values.length > maxVisibleItems ? 'scroll' : 'hidden');

			const legendContent = legendContainer
				.append('xhtml:div')
				.style('height', `${values.length * itemHeight}px`) // Total height to allow scroll
				.style('position', 'relative');

			// Draw color boxes
			legendContent
				.selectAll('.legend-color')
				.data(values)
				.enter()
				.append('div')
				.style('position', 'absolute')
				.style('top', (d, i) => `${i * itemHeight}px`)
				.style('left', '2px')
				.style('width', '10px')
				.style('height', '10px')
				.style('background-color', (d) => colorScale(d));

			// Draw labels
			legendContent
				.selectAll('.legend-label')
				.data(labelsWithAverage)
				.enter()
				.append('div')
				.style('position', 'absolute')
				.style('top', (d, i) => `${i * itemHeight}px`)
				.style('left', '15px')
				.style('font-size', '9px')
				.text((d) => d);
		},

		createColorScale(values) {
			return d3.scaleOrdinal().domain(values).range(d3.schemeCategory10); // This is a D3 predefined set of colors
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
			this.plotService.initializePlotContainer('scatterPlotContainer');
			this.plotService.showAllPlots();

			// Prepare the data for the plot
			const { heatData, labelsWithAverage, values } = this.prepareDataForPlot(
				features,
				categorical,
				numerical
			);

			const margin = { top: 25, right: 190, bottom: 18, left: 28 };
			const width = this.store.navbarWidth - margin.left - margin.right;
			const height = 300 - margin.top - margin.bottom;

			// Initialize the SVG element
			const svg = this.plotService.createSVGElement(margin, width, height, '#scatterPlotContainer');

			const xScale = this.plotService.createScaleLinear(
				d3.min(heatData, (d) => d.xData) - 1,
				d3.max(heatData, (d) => d.xData) + 2,
				[0, width]
			);
			const yScale = this.plotService.createScaleLinear(
				d3.min(heatData, (d) => d.yData) - 0.05,
				d3.max(heatData, (d) => d.yData) + 0.05,
				[height, 0]
			);

			// Setup the axes
			this.plotService.setupAxes(svg, xScale, yScale, height);

			// Create the color scale
			const colorScale = this.createColorScale(values);

			// Add the dots (plot elements) to the plot
			this.addPlotElements(svg, heatData, xScale, yScale, colorScale, numerical, categorical);

			// Create the legend
			this.createLegend(svg, width, margin, values, labelsWithAverage, colorScale);

			this.plotService.addTitle(
				svg,
				'Heat exposure index with building attributes',
				margin.left,
				margin.top - 8
			);
		},

		clearScatterPlot() {
			// Remove or clear the D3.js visualization
			// Example:
			d3.select('#scatterPlotContainer').select('svg').remove();
		},
	},
};
</script>

<style>
#scatterPlotContainer {
	position: relative;
	width: 100%;
	height: 300px;
	background-color: white;
}

#categoricalSelect {
	position: absolute;
	top: 65px; /* Adjusted position to match scatter plot container */
	right: 15%;
	font-size: smaller;
}

#numericalSelect {
	position: absolute;
	bottom: 0px;
	right: 18%; /* Adjusted position to match scatter plot container */
	font-size: smaller;
}
</style>
