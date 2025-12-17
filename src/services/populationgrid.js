import * as Cesium from 'cesium'
import { useGlobalStore } from '../stores/globalStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import logger from '../utils/logger.js'
import Camera from './camera.js'
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
	 * Set population grid entities heat exposure
	 *
	 * @param {Object} entities - Cesium entities
	 */
	setHeatExposureToGrid(entities) {
		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i]
			this.setGridEntityPolygon(entity)
		}
	}

	/**
	 * Set grid entity polygon
	 *
	 * @param {Object} entity - Grid entity
	 */
	setGridEntityPolygon(entity) {
		if (entity.properties.averageheatexposure && entity.polygon) {
			entity.polygon.material = new Cesium.Color(
				1,
				1 - entity.properties.averageheatexposure._value,
				0,
				entity.properties.averageheatexposure._value
			)
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
		let water = 0
		let vegetation = 0
		let trees = 0

		if (entity.properties.water_m2) {
			water = entity.properties.water_m2._value
		}

		if (entity.properties.vegetation_m2) {
			vegetation = entity.properties.vegetation_m2._value
		}

		if (entity.properties.tree_cover_m2) {
			trees = entity.properties.tree_cover_m2._value
		}

		const greenIndex = (water + vegetation + trees) / this.gridArea
		entity.polygon.material = new Cesium.Color(1 - greenIndex, 1, 0, greenIndex)
	}

	setGridHeight(entities) {
		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i]

			if (entity.polygon) {
				if (entity.properties.asukkaita) {
					entity.polygon.extrudedHeight = entity.properties.asukkaita._value / 4
				}
			}
		}
	}

	async createPopulationGrid() {
		await this.datasourceService.removeDataSourcesAndEntities()
		this.cameraService.switchTo3DGrid()

		try {
			await this.datasourceService.removeDataSourcesByNamePrefix('250m_grid')
			const entities = await this.datasourceService.loadGeoJsonDataSource(
				0.1,
				'assets/data/hsy_populationgrid.json',
				'PopulationGrid'
			)

			this.setHeatExposureToGrid(entities)

			if (!this.toggleStore.travelTime) {
				this.setGridHeight(entities)
			} else {
				this.toggleStore.setTravelTime(false)
			}
		} catch (error) {
			logger.error(error)
		}
	}
}
