import Datasource from './datasource.js';
import * as Cesium from 'cesium';
import { useGlobalStore } from '../stores/globalStore.js';
import { eventBus } from './eventEmitter.js';
import { usePropsStore } from '../stores/propsStore.js';
import { useURLStore } from '../stores/urlStore.js';

export default class EspooSurvey {
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
 * Sets the polygon material color for a othernature entity based on its category
 * 
 * @param {Object} entity - The othernature entity
 * @param {string} category - The category of the othernature entity
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

	getOutlineColor( value ) {

		if ( value >= 100 * 2 / 3 ) return Cesium.Color.GREEN;
		if ( value >= 100 * 1 / 3 ) return Cesium.Color.YELLOW;
		return value ? Cesium.Color.RED : null;

	}

}
