import Datasource from './datasource.js'; 
import * as Cesium from 'cesium';
import axios from 'axios';
import { useGlobalStore } from '../stores/globalStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import { eventBus } from '../services/eventEmitter.js';
const backendURL = import.meta.env.VITE_BACKEND_URL;

export default class Tree {
	constructor( ) {
		this.datasourceService = new Datasource();
		this.store = useGlobalStore();
	}

	/**
 * Asynchronously load tree data from an API endpoint based on postcode
 * 
 */
	async loadTrees( ) {

		// Construct the API endpoint URL
		let url = 'https://geo.fvh.fi/r4c/collections/tree/items?f=json&limit=100000&postinumero=' + this.store.postalcode;

		try {
			// Attempt to retrieve the tree data from the Redis cache
			const cacheApiUrl = `${backendURL}/api/cache/get?key=${encodeURIComponent( url )}`;
			const cachedResponse = await axios.get( cacheApiUrl );
			const cachedData = cachedResponse.data;

			if ( cachedData ) {
				console.log( 'found from cache' );
				this.addTreesDataSource( cachedData );
			} else {
				this.loadTreesWithoutCache( url );
			}
		} catch ( err ) {
			console.log( err );
		}
	}

	/**
 * Add the tree data as a new data source to the Cesium
 * 
 * @param { object } data tree data
 */
	async addTreesDataSource( data ) {
	
		let entities = await this.datasourceService.addDataSourceWithPolygonFix( data, 'Trees' );

		// Iterate over each entity in the data source and set its polygon material color based on the tree description
		for ( let i = 0; i < entities.length; i++ ) {
			
			let entity = entities[ i ];
			const description = entity.properties._kuvaus._value;
			this.setTreePolygonMaterialColor( entity, description );

		}

		if ( Number( this.store.postalcode ) < 1001 ) {
			
			this.fetchAndAddTreeDistanceData( entities );

		}


	}

	/**
 * Fetch tree distance data from the provided URL and create a new dataset for plot that presents the cooldown effect on trees on buildings
 *
 * @param { Object } entities - The postal code area tree entities
 */
	fetchAndAddTreeDistanceData( entities ) {

		if ( !entities ) {

			// Find the data source for buildings
			const treeDataSource = this.datasourceService.getDataSourceByName( 'Trees' );

			// If the data source isn't found, exit the function
			if ( !treeDataSource ) {
				return;
			}

			entities = treeDataSource.entities.values;

		}

		// Find the data source for buildings
		const buildingsDataSource = this.datasourceService.getDataSourceByName( 'Buildings ' + this.store.postalcode );

		// If the data source isn't found, exit the function
		if ( !buildingsDataSource ) {
			return;
		}

		// Fetch the tree data from the URL
		const url = 'https://geo.fvh.fi/r4c/collections/tree_building_distance/items?f=json&limit=100000&postinumero=' + this.store.postalcode;
		fetch( url )
			.then( response => response.json() )
			.then( data => {

				this.setPropertiesAndEmitEvent( data, entities, buildingsDataSource );

			} )
			.catch( error => {
				// Log any errors encountered while fetching the data
				console.log( 'Error fetching tree distance data:', error );
			} );
	}
	
	setPropertiesAndEmitEvent( data, entities, buildingsDataSource ) {

		const propsStore = usePropsStore();
		propsStore.setTreeBuildingDistanceData( data );
		propsStore.setTreeEntities( entities );
		propsStore.setBuildingsDatasource( buildingsDataSource );
		eventBus.emit( 'hideBuildingScatterPlot' );
		eventBus.emit( 'newNearbyTreeDiagram' );
	}

  
	/**
 * Fetch tree data from the API endpoint and add it to the local storage
 * 
 * @param { String } url API endpoint's url
 */
	loadTreesWithoutCache( url ) {

		console.log( 'Not in cache! Loading: ' + url );

		fetch( url )
			.then( ( response ) => response.json() )
			.then( ( data ) => {
			// Save fetched data to Redis cache through the backend
				axios.post( `${backendURL}/api/cache/set`, { key: url, value: data } );
				this.addTreesDataSource( data );
			} )
			.catch( ( error ) => {
				console.log( 'Error loading trees:', error );
			} );
	
	}

	/**
 * Set the polygon material color and extruded height for a given tree entity based on its description
 * 
 * @param { object } entity tree entity
 * @param { String } description description of tree entity
 */
	setTreePolygonMaterialColor( entity, description ) {

		switch ( description ){
		case 'Puusto yli 20 m':
			entity.polygon.material = Cesium.Color.FORESTGREEN.withAlpha( 0.7 );
			entity.polygon.extrudedHeight = 22.5;
			break;
		case 'puusto, 15 m - 20 m':
			entity.polygon.material = Cesium.Color.FORESTGREEN.withAlpha( 0.6 );
			entity.polygon.extrudedHeight = 17.5;
			break;
		case 'puusto, 10 m - 15 m':
			entity.polygon.material = Cesium.Color.FORESTGREEN.withAlpha( 0.55 );
			entity.polygon.extrudedHeight = 12.5;
			break;
		case 'puusto, 2 m - 10 m':
			entity.polygon.material = Cesium.Color.FORESTGREEN.withAlpha( 0.5 );
			entity.polygon.extrudedHeight = 6;
			break;
		}	

	}

	/**
 * Finds building datasource and resets tree entities polygon
 *
 */
	resetTreeEntities() {

		// Find the data source for trees
		const treeDataSource = this.datasourceService.getDataSourceByName( 'Trees' );

		// If the data source isn't found, exit the function
		if ( !treeDataSource ) {
			return;
		}

		for ( let i = 0; i < treeDataSource._entityCollection._entities._array.length; i++ ) {
        
			let entity = treeDataSource._entityCollection._entities._array[ i ];


			entity.polygon.outlineColor = Cesium.Color.BLACK; 
			entity.polygon.outlineWidth = 3; 

			if ( entity._properties._description && entity.polygon ) {
				this.setTreePolygonMaterialColor( entity, entity._properties._description._value );	
			}
		}

	}

}