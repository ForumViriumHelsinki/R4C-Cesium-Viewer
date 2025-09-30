import Datasource from './datasource.js';
import * as Cesium from 'cesium';
import { useGlobalStore } from '../stores/globalStore.js';
import { eventBus } from './eventEmitter.js';
import { usePropsStore } from '../stores/propsStore.js';
import { useURLStore } from '../stores/urlStore.js';

/**
 * Espoo Survey Service
 * Manages visualization of Espoo resident survey data with location-based heat exposure.
 * Displays survey response points color-coded by heat exposure and quality-scored by
 * resident satisfaction ratings. Part of urban heat perception study.
 *
 * Survey data visualization:
 * - Point markers at survey locations
 * - Heat exposure coloring (red-yellow gradient)
 * - Quality score outline colors:
 *   - Green: High satisfaction (≥67%)
 *   - Yellow: Medium satisfaction (33-67%)
 *   - Red: Low satisfaction (<33%)
 *
 * Features:
 * - Temperature conversion (normalized → Kelvin → Celsius)
 * - Heat exposure gradient visualization
 * - Survey quality scoring
 * - Scatter plot integration for analysis
 *
 * @class EspooSurvey
 */
export default class EspooSurvey {
	/**
	 * Creates an EspooSurvey service instance
	 */
	constructor() {
		this.store = useGlobalStore();
		this.viewer = this.store.cesiumViewer;
		this.datasourceService = new Datasource();
		this.urlStore = useURLStore();
	}

	/**
 * Loads Espoo resident survey data for a given collection asynchronously
 * 
 * @param {String} collection - The name of survey collection to be added as a data source
 * @returns {Promise} - A promise that resolves once the data has been loaded
 */
	async loadSurveyFeatures( collection ) {

		fetch( this.urlStore.collectionUrl( collection ) )
			.then( response => response.json() )
			.then( data => { this.addSurveyDataSource( data, collection ); } )
			.catch( error => { console.log( 'Error loading other nature data:', error ); } );
	}

	/**
 * Adds a survey data source to the viewer
 * 
 * @param {Object} data - The survey data to be added as a data source
 * @param {String} collection - The name of survey collection to be added as a data source
 */
	async addSurveyDataSource( data, collection ) {

		this.setAvgTempInCelsius( data.features );
		let entities = await this.datasourceService.addDataSourceWithPolygonFix( data, 'Survey ' + collection );
		this.setColorAndLabelForPointEntities( entities );
		const propsStore = usePropsStore();
		propsStore.setScatterPlotEntities( entities );
		eventBus.emit( 'newSurveyScatterPlot' );

	}

	/**
	 * Converts normalized heat exposure values to Celsius temperature
	 * Denormalizes heat exposure index using min/max Kelvin values,
	 * then converts from Kelvin to Celsius for display.
	 *
	 * Formula: K = normalized × (max_K - min_K) + min_K, then C = K - 273.15
	 *
	 * @param {Array<Object>} features - GeoJSON features with heatexposure property
	 * @returns {void}
	 *
	 * @example
	 * // Feature with normalized heat exposure 0.7
	 * // Min: 303K (30°C), Max: 323K (50°C)
	 * // Result: 0.7 × 20K + 303K = 317K = 43.85°C
	 */
	setAvgTempInCelsius( features ) {

		for ( let i = 0; i < features.length; i++ ) {

			let feature = features[i];
			let normalizedIndex = feature.properties.heatexposure;

			// Convert normalized index back to Kelvin
			let tempInKelvin = normalizedIndex * ( this.store.minMaxKelvin['2023-06-23'].max - this.store.minMaxKelvin['2023-06-23'].min ) + this.store.minMaxKelvin['2023-06-23'].min

			// Convert Kelvin to Celsius
			feature.properties.avg_temp_c = tempInKelvin - 273.15;

		}
	}

	/**
	 * Applies heat exposure colors and quality score outlines to survey point entities
	 * Colors points using red-yellow heat gradient, with outline color indicating
	 * resident satisfaction level (Paikan_kok field: 0-100 quality score).
	 *
	 * Color scheme:
	 * - Point fill: Heat gradient (red = high exposure, yellow = low)
	 * - Outline: Green (≥67), Yellow (33-67), Red (<33), None (no score)
	 *
	 * @param {Array<Object>} entities - Cesium entities to style
	 * @returns {void}
	 */
	setColorAndLabelForPointEntities( entities ) {

		for ( let i = 0; i < entities.length; i++ ) {
			let entity = entities[i];
			if ( entity.position ) {

				const color = new Cesium.Color( 1, 1 - entity._properties._heatexposure._value, 0, entity._properties._heatexposure._value );
				const outlineColor = this.getOutlineColor( entity._properties._Paikan_kok._value );

				if ( outlineColor ) {

					// Set point color
					entity.point = new Cesium.PointGraphics( {
						color: color,
						pixelSize: 10,
						outlineColor: outlineColor,
						outlineWidth: 3,
					} );

				} else {

					entity.show = false;
				}

				entity.billboard = undefined; // Remove any billboard icon

			}
		}
	}

	/**
	 * Determines outline color based on survey quality score
	 * Maps resident satisfaction ratings to color-coded quality tiers.
	 *
	 * @private
	 * @param {number} value - Quality score (0-100), where 100 = highest satisfaction
	 * @returns {Cesium.Color|null} Green (high), Yellow (medium), Red (low), or null (no data)
	 *
	 * @example
	 * getOutlineColor(80);  // GREEN (high satisfaction)
	 * getOutlineColor(50);  // YELLOW (medium)
	 * getOutlineColor(20);  // RED (low)
	 * getOutlineColor(null); // null (no data)
	 */
	getOutlineColor( value ) {

		if ( value >= 100 * 2 / 3 ) return Cesium.Color.GREEN;
		if ( value >= 100 * 1 / 3 ) return Cesium.Color.YELLOW;
		return value ? Cesium.Color.RED : null;

	}

}
