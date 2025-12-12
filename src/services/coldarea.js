import * as Cesium from 'cesium'
import { useGlobalStore } from '../stores/globalStore.js'
import { useURLStore } from '../stores/urlStore.js'
import Datasource from './datasource.js'
import ElementsDisplay from './elementsDisplay.js'

/**
 * Cold Area Service
 * Manages visualization of cooling zones and shaded areas with lower heat exposure.
 * Identifies and displays areas under 40°C surface temperature as potential cooling refuges.
 * Part of urban heat mitigation strategy for Helsinki region.
 *
 * Features:
 * - Cold spot marker placement (locations <40°C)
 * - Cold area polygon visualization
 * - Heat exposure gradient coloring
 * - Integration with building heat exposure data
 *
 * Cold areas are defined as locations with significantly lower surface temperatures,
 * typically caused by tree canopy shade, water bodies, or building shadows.
 *
 * @class ColdArea
 */
export default class ColdArea {
	/**
	 * Creates a ColdArea service instance
	 */
	constructor() {
		this.datasourceService = new Datasource()
		this.elementsDisplayService = new ElementsDisplay()
		this.store = useGlobalStore()
		this.urlStore = useURLStore()
	}

	/**
	 * Adds a cold spot marker to the map at specified coordinates
	 * Creates a blue point entity to mark locations with temperature <40°C.
	 * Used to highlight cooling refuges near selected buildings.
	 *
	 * @param {string} location - Comma-separated coordinates "lat,lon"
	 * @returns {void}
	 *
	 * @example
	 * coldAreaService.addColdPoint("60.1699,24.9384"); // Adds marker at Helsinki
	 */
	addColdPoint(location) {
		const coordinates = location.split(',')

		this.store.cesiumViewer.entities.add({
			position: Cesium.Cartesian3.fromDegrees(Number(coordinates[1]), Number(coordinates[0])),
			name: 'coldpoint',
			point: {
				show: true,
				color: Cesium.Color.ROYALBLUE,
				pixelSize: 15,
				outlineColor: Cesium.Color.LIGHTYELLOW,
				outlineWidth: 5,
			},
		})
	}

	/**
	 * Loads ColdArea data for a given postcode asynchronously
	 *
	 * @returns {Promise} - A promise that resolves once the data has been loaded
	 */
	async loadColdAreas() {
		this.store.setIsLoading(true)
		try {
			const response = await fetch(this.urlStore.coldAreas(this.store.postalcode))
			const data = await response.json()
			await this.addColdAreaDataSource(data)
		} catch (error) {
			console.error('Error loading cold areas:', error)
			this.store.showError(
				'Unable to load cold area data. Please try again.',
				`Failed to fetch cold areas for postal code ${this.store.postalcode}: ${error.message}`
			)
			throw error // Re-throw so callers know it failed
		} finally {
			this.store.setIsLoading(false)
		}
	}

	/**
	 * Adds a ColdArea data source to the viewer
	 *
	 * @param {Object} data - The ColdArea data to be added as a data source
	 */
	async addColdAreaDataSource(data) {
		const entities = await this.datasourceService.addDataSourceWithPolygonFix(data, 'ColdAreas')

		if (entities) {
			this.elementsDisplayService.setColdAreasElementsDisplay('inline-block')
			for (let i = 0; i < entities.length; i++) {
				const entity = entities[i]

				if (entity._properties._heatexposure && entity.polygon) {
					entity.polygon.material = new Cesium.Color(
						1,
						1 - entity._properties._heatexposure._value,
						0,
						entity._properties._heatexposure._value
					)
					entity.polygon.outlineColor = Cesium.Color.BLACK
					entity.polygon.outlineWidth = 3
				}
			}
		}
	}
}
