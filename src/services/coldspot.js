import * as Cesium from 'cesium';
import axios from 'axios';
import Datasource from './datasource.js'; 
import { useGlobalStore } from '../stores/globalStore.js';
const backendURL = import.meta.env.VITE_BACKEND_URL;

export default class ColdSpot {
	constructor( ) {
		this.datasourceService = new Datasource();
		this.store = useGlobalStore();

	}

	addColdPoint( location ) {
    
		const coordinates = location.split( ',' ); 
    
		this.store.cesiumViewer.entities.add( {
			position: Cesium.Cartesian3.fromDegrees( Number( coordinates[ 1 ] ), Number( coordinates[ 0 ] ) ),
			name: 'coldpoint',
			point: {
				show: true, 
				color: Cesium.Color.ROYALBLUE, 
				pixelSize: 15, 
				outlineColor: Cesium.Color.LIGHTYELLOW, 
				outlineWidth: 5, 
			},
		} );
    
	}

		/**
 * Loads ColdSpot data for a given postcode asynchronously
 * 
 * @returns {Promise} - A promise that resolves once the data has been loaded
 */
	async loadColdSpot( ) {
		const url = 'https://geo.fvh.fi/r4c/collections/coldspot/items?f=json&limit=50000&posno=' + this.store.postalcode;

		try {
			const cacheApiUrl = `${backendURL}/api/cache/get?key=${encodeURIComponent( url )}`;
			const cachedResponse = await axios.get( cacheApiUrl );
			const cachedData = cachedResponse.data;

			if ( cachedData ) {

				console.log( 'found from cache' );
				this.addColdSpotDataSource( cachedData );

			} else {

				this.loadColdSpotWithoutCache( url );

			}
		} catch ( err ) {
			console.log( err );
		}
	}

	/**
 * Adds a ColdSpot data source to the viewer
 * 
 * @param {Object} data - The ColdSpot data to be added as a data source
 */
	async addColdSpotDataSource ( data ) {

		let entities = await this.datasourceService.addDataSourceWithPolygonFix( data, 'ColdAreas' );
	
		for ( let i = 0; i < entities.length; i++ ) {
			
			let entity = entities[ i ];
            
			if ( entity._properties._heatexposure && entity.polygon ) {

				entity.polygon.material = new Cesium.Color( 1, 1 - entity._properties._heatexposure._value, 0, entity._properties._heatexposure._value );
				entity.polygon.outlineColor = Cesium.Color.BLACK; 
				entity.polygon.outlineWidth = 3; 
	
			}
		}
	}

	/**
 * Loads ColdSpot data from the provided URL without using cache
 * 
 * @param {string} url - The URL from which to load ColdSpot data
 */
	loadColdSpotWithoutCache( url ) {
		console.log( 'Not in cache! Loading: ' + url );

		fetch( url )
			.then( response => response.json() )
			.then( data => {
				axios.post( `${backendURL}/api/cache/set`, { key: url, value: data } );
				this.addColdSpotDataSource( data );
			} )
			.catch( error => {
				console.log( 'Error loading ColdAreas:', error );
			} );
	}

}