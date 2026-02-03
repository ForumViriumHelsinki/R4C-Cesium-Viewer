import * as Sentry from '@sentry/vue'
import { useGlobalStore } from '../stores/globalStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import { processBatch } from '../utils/batchProcessor.js'
import logger from '../utils/logger.js'
import Camera from './camera.js'
import { getCesium } from './cesiumProvider.js'
import Datasource from './datasource.js'

/**
 * Population Grid Service
 * Manages 250m × 250m statistical grid visualization for the Capital Region.
 * Handles grid cell styling based on heat exposure, green space coverage, and population data.
 * Supports multiple visualization modes including heat gradients and green space percentages.
 *
 * Grid specifications:
 * - Cell size: 250m × 250m (62,500 m² area)
 * - Data source: Statistics Finland (Paavo postal code statistics)
 * - Coverage: Helsinki Capital Region
 * - Attributes: Population, heat exposure, green space, water, vegetation, trees
 *
 * Visualization modes:
 * - Heat exposure (red-yellow gradient)
 * - Green space coverage (normalized by grid area)
 * - Combined indices with 3D extrusion
 *
 * @class Populationgrid
 */
export default class Populationgrid {
	/**
	 * Creates a Populationgrid service instance
	 */
	constructor() {
		this.store = useGlobalStore()
		this.toggleStore = useToggleStore()
		this.viewer = this.store.cesiumViewer
		this.datasourceService = new Datasource()
		this.cameraService = new Camera()
		/** @type {number} Standard grid cell area in square meters (250m × 250m) */
		this.gridArea = 62500
	}

	/**
	 * Set population grid entities heat exposure using batched processing.
	 * Uses adaptive batch sizing to maintain 60fps UI responsiveness.
	 *
	 * @param {Array} entities - Cesium entities
	 * @returns {Promise<void>}
	 */
	async setHeatExposureToGrid(entities) {
		return Sentry.startSpan(
			{ name: 'populationgrid.setHeatExposure', op: 'ui.render' },
			async () => {
				performance.mark('grid-heat-exposure-start')

				await processBatch(entities, (entity) => this.setGridEntityPolygon(entity), {
					processorName: 'gridHeatExposure',
					yieldToMain: true,
				})

				performance.mark('grid-heat-exposure-end')
				performance.measure(
					'grid-heat-exposure',
					'grid-heat-exposure-start',
					'grid-heat-exposure-end'
				)
			}
		)
	}

	/**
	 * Set grid entity polygon
	 *
	 * @param {Object} entity - Grid entity
	 */
	setGridEntityPolygon(entity) {
		const heatExposure = entity.properties?.averageheatexposure?._value
		if (heatExposure != null && entity.polygon) {
			const Cesium = getCesium()
			entity.polygon.material = new Cesium.Color(1, 1 - heatExposure, 0, heatExposure)
		} else {
			if (entity.polygon) {
				entity.show = false
			}
		}
	}

	/**
	 * Set grid entity polygon
	 *
	 * @param {Object} entity - Grid entity
	 */
	setGridEntityPolygonToGreen(entity) {
		const water = entity.properties?.water_m2?._value || 0
		const vegetation = entity.properties?.vegetation_m2?._value || 0
		const trees = entity.properties?.tree_cover_m2?._value || 0

		const Cesium = getCesium()
		const greenIndex = (water + vegetation + trees) / this.gridArea
		entity.polygon.material = new Cesium.Color(1 - greenIndex, 1, 0, greenIndex)
	}

	/**
	 * Set grid entity heights based on population using batched processing.
	 *
	 * @param {Array} entities - Cesium entities
	 * @returns {Promise<void>}
	 */
	async setGridHeight(entities) {
		return Sentry.startSpan({ name: 'populationgrid.setGridHeight', op: 'ui.render' }, async () => {
			performance.mark('grid-height-start')

			await processBatch(
				entities,
				(entity) => {
					if (entity.polygon) {
						const population = entity.properties?.asukkaita?._value
						if (population) {
							entity.polygon.extrudedHeight = population / 4
						}
					}
				},
				{ processorName: 'gridHeight', yieldToMain: true }
			)

			performance.mark('grid-height-end')
			performance.measure('grid-height', 'grid-height-start', 'grid-height-end')
		})
	}

	/**
	 * Set all grid entities to green coloring based on green space index.
	 * Uses batched processing for UI responsiveness.
	 *
	 * @param {Array} entities - Cesium entities
	 * @returns {Promise<void>}
	 */
	async setGridEntitiesToGreen(entities) {
		return Sentry.startSpan(
			{ name: 'populationgrid.setGridEntitiesToGreen', op: 'ui.render' },
			async () => {
				performance.mark('grid-green-start')

				await processBatch(entities, (entity) => this.setGridEntityPolygonToGreen(entity), {
					processorName: 'gridGreen',
					yieldToMain: true,
				})

				performance.mark('grid-green-end')
				performance.measure('grid-green', 'grid-green-start', 'grid-green-end')
			}
		)
	}

	/**
	 * Creates and displays the population grid with heat exposure visualization.
	 * Uses selective datasource removal instead of blanket cleanup.
	 *
	 * @returns {Promise<void>}
	 */
	async createPopulationGrid() {
		return Sentry.startSpan({ name: 'populationgrid.create', op: 'ui.render' }, async () => {
			performance.mark('grid-transition-start')

			// Selective removal: only remove grid-related datasources, not ALL
			await Promise.all([
				this.datasourceService.removeDataSourcesByNamePrefix('PopulationGrid'),
				this.datasourceService.removeDataSourcesByNamePrefix('250m_grid'),
				this.datasourceService.removeDataSourcesByNamePrefix('TravelTimeGrid'),
				this.datasourceService.removeDataSourcesByNamePrefix('TravelLabel'),
			])

			// Hide building datasources during grid view - don't remove to avoid reload cost
			// Buildings are not needed when viewing the statistical grid
			this.datasourceService.changeDataSourceShowByName('Buildings', false)

			// Note: Camera position is preserved - no longer calling switchTo3DGrid()
			// This avoids the performance hit of zooming out and loading buildings across
			// a much larger viewport during the transition

			try {
				const entities = await this.datasourceService.loadGeoJsonDataSource(
					0.1,
					'assets/data/hsy_populationgrid.json',
					'PopulationGrid'
				)

				await this.setHeatExposureToGrid(entities)

				if (!this.toggleStore.travelTime) {
					await this.setGridHeight(entities)
				} else {
					this.toggleStore.setTravelTime(false)
				}

				performance.mark('grid-transition-end')
				performance.measure('grid-transition', 'grid-transition-start', 'grid-transition-end')
			} catch (error) {
				logger.error(error)
			}
		})
	}

	/**
	 * Returns the entities from the PopulationGrid datasource.
	 *
	 * @returns {Array} Array of Cesium entities, or empty array if datasource not found
	 */
	getGridEntities() {
		const dataSource = this.datasourceService.getDataSourceByName('PopulationGrid')
		return dataSource?.entities?.values || []
	}
}
