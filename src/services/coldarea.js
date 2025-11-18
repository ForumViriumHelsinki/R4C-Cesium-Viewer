import * as Cesium from 'cesium';
import Datasource from './datasource.js';
import { useGlobalStore } from '../stores/globalStore.js';
import ElementsDisplay from './elementsDisplay.js';
import { useURLStore } from '../stores/urlStore.js';

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
		this.datasourceService = new Datasource();
		this.elementsDisplayService = new ElementsDisplay();
		this.store = useGlobalStore();
		this.urlStore = useURLStore();
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
		const coordinates = location.split(',');

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
		});
	}

	/**
	 * Loads ColdArea data for a given postcode asynchronously
	 *
	 * @returns {Promise} - A promise that resolves once the data has been loaded
	 */
	async loadColdAreas() {
		this.store.setIsLoading(true);

		fetch(this.urlStore.coldAreas(this.store.postalcode))
			.then((response) => response.json())
			.then((data) => {
				this.addColdAreaDataSource(data);
			})
			.catch((error) => {
				console.log('Error loading ColdAreas:', error);
			});
	}

	/**
	 * Adds a ColdArea data source to the viewer
	 *
	 * @param {Object} data - The ColdArea data to be added as a data source
	 */
	async addColdAreaDataSource(data) {
		let entities = await this.datasourceService.addDataSourceWithPolygonFix(data, 'ColdAreas');

		if (entities) {
			this.elementsDisplayService.setColdAreasElementsDisplay('inline-block');
			for (let i = 0; i < entities.length; i++) {
				let entity = entities[i];

				if (entity._properties._heatexposure && entity.polygon) {
					entity.polygon.material = new Cesium.Color(
						1,
						1 - entity._properties._heatexposure._value,
						0,
						entity._properties._heatexposure._value
					);
					entity.polygon.outlineColor = Cesium.Color.BLACK;
					entity.polygon.outlineWidth = 3;
				}
			}
		}

		this.store.setIsLoading(false);
	}
}
