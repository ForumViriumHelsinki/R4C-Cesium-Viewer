import Datasource from './datasource.js'; 
import * as Cesium from 'cesium';
import { useGlobalStore } from '../stores/globalStore.js';
import { useURLStore } from '../stores/urlStore.js';

export default class Othernature {
	constructor( ) {
		this.store = useGlobalStore();
		this.urlStore = useURLStore();
		this.viewer = this.store.cesiumViewer;
		this.datasourceService = new Datasource();
	}

	/**
 * Loads othernature data for a given postcode asynchronously
 * 
 * @returns {Promise} - A promise that resolves once the data has been loaded
 */
	async loadOtherNature() {

		this.store.setIsLoading( true );

		fetch( this.urlStore.otherNature( this.store.postalcode ) )
			.then( response => response.json() )
			.then( data => { this.addOtherNatureDataSource( data ); } )
			.catch( error => { console.log( 'Error loading other nature data:', error ); } );
	}

	/**
 * Adds a othernature data source to the viewer
 * 
 * @param {Object} data - The othernature data to be added as a data source
 */
	async addOtherNatureDataSource( data ) {
	
		let entities = await this.datasourceService.addDataSourceWithPolygonFix( data, 'OtherNature' );

		for ( let i = 0; i < entities.length; i++ ) {
			
			let entity = entities[ i ];
			const category = entity.properties._koodi._value;
            
			if ( category ) {
			//colors of nature area enity are set based on it's category
				this.setOtherNaturePolygonMaterialColor( entity, category );
			}
		}

		this.store.setIsLoading( false );
	}

	/**
 * Sets the polygon material color for a othernature entity based on its category
 * 
 * @param {Object} entity - The othernature entity
 * @param {string} category - The category of the othernature entity
 */
	setOtherNaturePolygonMaterialColor( entity, category ) {

		switch ( category ){
		case '310':
			entity._polygon._material._color._value = Cesium.Color.LIGHTGREY.withAlpha( 0.5 );
			break;
		case '410':
			entity._polygon._material._color._value = Cesium.Color.SANDYBROWN.withAlpha( 0.5 );
			break;
		case '130':
			entity._polygon._material._color._value = Cesium.Color.ROSYBROWN.withAlpha( 0.5 );
			break;
		}	

	}

}
