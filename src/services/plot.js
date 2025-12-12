import * as d3 from 'd3'
import { useGlobalStore } from '../stores/globalStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import { eventBus } from './eventEmitter.js'

/**
 * Plot Service
 * Provides D3.js-based plotting utilities for data visualization throughout the application.
 * Manages plot containers, SVG creation, scales, axes, tooltips, and interactive chart elements.
 * Handles visibility control for level-specific (postal code vs building) visualizations.
 *
 * Key capabilities:
 * - SVG element creation and initialization
 * - Linear and band scale generation
 * - Tooltip management for interactive charts
 * - Axis setup and configuration
 * - Plot container lifecycle management
 * - Tree bearing switch controls
 *
 * @class Plot
 * @see {@link https://d3js.org/|D3.js Documentation}
 */
export default class Plot {
	/**
	 * Creates a Plot service instance
	 */
	constructor() {
		this.store = useGlobalStore()
		this.toggleStore = useToggleStore()
	}

	/**
	 * Shows all plots and select elements
	 * Emits visibility events based on current view level (postalCode or building).
	 *
	 * @fires eventBus#showHelsinki - Emitted when showing Helsinki postal code view
	 * @fires eventBus#showCapitalRegion - Emitted when showing Capital Region postal code view
	 * @fires eventBus#showBuilding - Emitted when showing building level view
	 */
	showAllPlots() {
		switch (this.store.level) {
			case 'postalCode':
				eventBus.emit(this.toggleStore.helsinkiView ? 'showHelsinki' : 'showCapitalRegion')
				break
			case 'building':
				eventBus.emit('showBuilding')
				break
		}
	}

	/**
	 * Hides all plots and select elements
	 * Emits hide events based on current view level (postalCode or building).
	 *
	 * @fires eventBus#hideHelsinki - Emitted when hiding Helsinki postal code view
	 * @fires eventBus#hideCapitalRegion - Emitted when hiding Capital Region postal code view
	 * @fires eventBus#hideBuilding - Emitted when hiding building level view
	 */
	hideAllPlots() {
		switch (this.store.level) {
			case 'postalCode':
				eventBus.emit(this.toggleStore.helsinkiView ? 'hideHelsinki' : 'hideCapitalRegion')
				break
			case 'building':
				eventBus.emit('hideBuilding')
				break
		}
	}

	/**


	/**
 * Toggle visibility of tree bearing switches
 *
 * @param {string} status - The desired visibility status ("visible" or "hidden")
 */
	toggleBearingSwitchesVisibility(status) {
		const switchContainers = ['All', 'South', 'West', 'East', 'North']

		for (const direction of switchContainers) {
			const switchContainer = document.getElementById(`bearing${direction}SwitchContainer`)
			switchContainer.style.visibility = status
		}
	}

	/**
	 *
	 */

	updateTreeElements(status) {
		document.getElementById('nearbyTreeAreaContainer').style.visibility = status
		this.toggleBearingSwitchesVisibility(status)
	}

	/**
	 * Initializes container for plotting
	 *
	 * @param {string} containerId - The containerId
	 */
	initializePlotContainerForGrid(containerId) {
		const container = document.getElementById(containerId)
		// Use textContent for safe clearing (prevents potential XSS)
		container.textContent = ''

		container.style.visibility = 'visible'
	}

	/**
	 * Initializes container for plotting
	 *
	 * @param {string} containerId - The containerId
	 */
	initializePlotContainer(containerId) {
		const container = document.getElementById(containerId)
		// Use textContent for safe clearing (prevents potential XSS)
		container.textContent = ''

		container.style.visibility = this.toggleStore.showPlot ? 'visible' : 'hidden'
	}

	/**
	 * Adds a title to plot
	 *
	 * @param {Object} svg - D3 SVG selection to add title to
	 * @param {string} title - Title text to display
	 * @param {number} left - Horizontal offset from left edge
	 * @param {number} top - Vertical offset from top edge
	 */
	addTitle(svg, title, left, top) {
		// Title doesn't need splitting
		svg
			.append('text')
			.attr('x', 0 - left)
			.attr('y', 0 - top)
			.style('font-size', '12px')
			.style('text-align', 'left')
			.text(title)
	}

	addTitleWithLink(svg, title, left, top) {
		svg
			.append('foreignObject')
			.attr('x', 0 - left) // Adjust horizontal position
			.attr('y', 0 - top) // Adjust vertical position
			.attr('width', 4000) // Width of the foreignObject
			.attr('height', 40) // Height of the foreignObject
			.append('xhtml:div') // Append a div as a child of the foreignObject
			.style('font-size', '12px')
			.style('text-align', 'left') // Center-align the text
			.html(title) // Insert the HTML content (including the link)
	}

	// 1. Initialize SVG and Background
	createSVGElement(margin, width, height, container) {
		// Ensure width and height are non-negative
		const validatedWidth = Math.max(0, width)
		const validatedHeight = Math.max(0, height)

		const svg = d3
			.select(container)
			.append('svg')
			.attr('width', validatedWidth + margin.left + margin.right)
			.attr('height', validatedHeight + margin.top + margin.bottom)
			.append('g')
			.attr('transform', `translate(${margin.left}, ${margin.top})`)

		svg
			.append('rect')
			.attr('width', validatedWidth)
			.attr('height', validatedHeight)
			.attr('fill', 'white')

		return svg
	}

	createScaleLinear(domainMin, domainMax, range) {
		return d3.scaleLinear().domain([domainMin, domainMax]).range(range).nice()
	}

	createScaleBand(xLabels, width) {
		return d3.scaleBand().domain(xLabels).range([0, width]).padding(0.1)
	}

	createTooltip(container) {
		return d3
			.select(container)
			.append('div')
			.attr('class', 'tooltip')
			.style('opacity', 0)
			.style('position', 'absolute')
			.style('background-color', 'white')
			.style('border', 'solid')
			.style('border-width', '1px')
			.style('border-radius', '5px')
			.style('padding', '10px')
			.style('pointer-events', 'none')
			.style('z-index', '10000')
	}

	setupAxes(svg, xScale, yScale, height) {
		// Create x-axis
		svg.append('g').attr('transform', `translate(0, ${height})`).call(d3.axisBottom(xScale))

		// Create y-axis
		svg.append('g').call(d3.axisLeft(yScale))

		// If you need additional customization like gridlines or tick formatting,
		// you can add that logic here.
	}

	handleMouseover(tooltip, containerId, event, d, dataFormatter) {
		const containerRect = document.getElementById(containerId).getBoundingClientRect()
		const xPos = event.pageX - containerRect.left
		const yPos = event.pageY - containerRect.top

		tooltip.transition().duration(200).style('opacity', 0.9)
		tooltip
			.html(dataFormatter(d))
			.style('left', `${xPos - 80}px`)
			.style('top', `${yPos - 100}px`)
	}

	handleMouseout(tooltip) {
		tooltip.transition().duration(200).style('opacity', 0)
	}
}
