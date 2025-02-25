import Datasource from './datasource.js'; 
import * as Cesium from 'cesium';
import { useGlobalStore } from '../stores/globalStore.js';
import { useURLStore } from '../stores/urlStore.js';

export default class Vegetation {
	constructor( ) {
		this.datasourceService = new Datasource();
		this.store = useGlobalStore();
		this.urlStore = useURLStore();
	}

	/**
 * Loads vegetation data for a given postcode asynchronously
 * 
 * @returns {Promise} - A promise that resolves once the data has been loaded
 */
	async loadVegetation( ) {
		this.store.setIsLoading( true );

		fetch( this.urlStore.vegetation( this.store.postalcode )  )
			.then( response => response.json() )
			.then( data => { this.addVegetationDataSource( data ); } )
			.catch( error => { console.log( 'Error loading vegetation:', error ); } );
	}

	/**
 * Adds a vegetation data source to the viewer
 * 
 * @param {Object} data - The vegetation data to be added as a data source
 */
	async addVegetationDataSource ( data ) {

		let entities = await this.datasourceService.addDataSourceWithPolygonFix( data, 'Vegetation' );
	
		for ( let i = 0; i < entities.length; i++ ) {
			
			let entity = entities[ i ];
			const category = entity.properties._koodi._value;
            
			if ( category ) {
			//colors of nature area enity are set based on it's category
				this.setVegetationPolygonMaterialColor( entity, category );
			}	
		}

		this.store.setIsLoading( false );
	}

	/**
 * Sets the polygon material color for a vegetation entity based on its category
 * 
 * @param {Object} entity - The vegetation entity
 * @param {string} category - The category of the vegetation entity
 */
	setVegetationPolygonMaterialColor( entity, category ) {

		switch ( category ){
		case '212':
			entity.polygon.extrudedHeight = 0.1;
			entity.polygon.material = Cesium.Color.LIGHTGREEN.withAlpha( 0.5 );
			break;
		case '211':
			entity.polygon.extrudedHeight = 0.5;
			entity.polygon.material = Cesium.Color.GREENYELLOW.withAlpha( 0.5 );
			break;
		case '510':
			entity.polygon.material = Cesium.Color.DEEPSKYBLUE.withAlpha( 0.5 );
			break;
		case '520':
			entity.polygon.material = Cesium.Color.DODGERBLUE.withAlpha( 0.5 );
			break;
		}	
	}
}
