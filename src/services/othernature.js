import Datasource from './datasource.js'; 
import * as Cesium from 'cesium';
import axios from 'axios';
const backendURL = import.meta.env.VITE_BACKEND_URL;

export default class Othernature {
	constructor( viewer ) {
		this.datasourceService = new Datasource( viewer );
	}

	/**
 * Loads othernature data for a given postcode asynchronously
 * 
 * @param {string} postcode - The postcode for which to load othernature data
 * @returns {Promise} - A promise that resolves once the data has been loaded
 */
	async loadOtherNature( postcode ) {

		let url = 'https://geo.fvh.fi/r4c/collections/othernature/items?f=json&limit=10000&postinumero=' + postcode ;

		try {
			const cacheApiUrl = `${backendURL}/api/cache/get?key=${encodeURIComponent( url )}`;
			const cachedResponse = await axios.get( cacheApiUrl );
			const cachedData = cachedResponse.data;

			if ( cachedData ) {
				console.log( 'found from cache' );

				this.addOtherNatureDataSource( cachedData );

			} else {

				this.loadOtherNatureWithoutCache( url );

			}

		} catch ( err ) {
		// This code runs if there were any errors.
			console.log( err );
		}
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
	}

	/**
 * Loads othernature data from the provided URL without using cache
 * 
 * @param {string} url - The URL from which to load othernature data
 */
	loadOtherNatureWithoutCache( url ) {

		console.log( 'Not in cache! Loading: ' + url );

		fetch( url )
			.then( response => response.json() )
			.then( data => {
				axios.post( `${backendURL}/api/cache/set`, { key: url, value: data } );
				this.addOtherNatureDataSource( data );
			} )
			.catch( error => {
				console.log( 'Error loading other nature data:', error );
			} );
	
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
			entity.polygon.material = Cesium.Color.LIGHTGREY.withAlpha( 0.5 );
			break;
		case '410':
			entity.polygon.material = Cesium.Color.SANDYBROWN.withAlpha( 0.5 );
			break;
		case '130':
			entity.polygon.material = Cesium.Color.ROSYBROWN.withAlpha( 0.5 );
			break;
		}	

	}

}