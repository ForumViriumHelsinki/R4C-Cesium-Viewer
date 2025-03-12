import Datasource from './datasource.js'; 
import * as Cesium from 'cesium';
import { useGlobalStore } from '../stores/globalStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import { eventBus } from '../services/eventEmitter.js';
import { useURLStore } from '../stores/urlStore.js';

export default class Tree {
	constructor( ) {
		this.datasourceService = new Datasource();
		this.store = useGlobalStore();
        this.urlStore = useURLStore();
	}

	/**
 * Asynchronously load tree data from an API endpoint based on postcode
 * 
 */
	async loadTrees( ) {
		
		this.store.setIsLoading( true );
		await this.loadTreesWithKoodi('221');
		await this.loadTreesWithKoodi('222');
		await this.loadTreesWithKoodi('223');
		await this.loadTreesWithKoodi('224');

	}

	async loadTreesWithKoodi( koodi ) {

		console.log( "tree", this.urlStore.tree( this.store.postalcode, koodi ) );

		fetch( this.urlStore.tree( this.store.postalcode, koodi ) )
			.then( ( response ) => response.json() )
			.then( ( data ) => {
				this.addTreesDataSource( data, koodi );
			} )
			.catch( ( error ) => {
				console.log( 'Error loading trees:', error );
			} );
	}	

	/**
 * Add the tree data as a new data source to the Cesium
 * 
 * @param { object } data tree data
 */
	async addTreesDataSource( data, koodi ) {
	
		let entities = await this.datasourceService.addDataSourceWithPolygonFix( data, 'Trees' + koodi );

		// Iterate over each entity in the data source and set its polygon material color based on the tree description
		for ( let i = 0; i < entities.length; i++ ) {
			
			let entity = entities[ i ];
			const description = entity.properties._kuvaus._value;
			this.setTreePolygonMaterialColor( entity, description );

		}

		if ( this.view === 'helsinki' ) {
			
			this.fetchAndAddTreeDistanceData( entities );

		}

		koodi === '224' && this.store.setIsLoading( false );

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

		fetch( this.urlStore.treeBuildingDistance(this.store.postalcode) )
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
 * Set the polygon material color and extruded height for a given tree entity based on its description
 * 
 * @param { object } entity tree entity
 * @param { String } description description of tree entity
 */
	setTreePolygonMaterialColor( entity, description ) {

		const height = entity._properties._korkeus_ka_m;

		switch ( description ){
		case 'Puusto yli 20 m':
			entity.polygon.material = Cesium.Color.FORESTGREEN.withAlpha( 0.7 );
            height ? extrudeTree( entity, entity._properties._korkeus_ka_m._value ) : extrudeTree( entity, 22.5 );
			break;
		case 'puusto, 15 m - 20 m':
			entity.polygon.material = Cesium.Color.FORESTGREEN.withAlpha( 0.6 );
			height ? extrudeTree( entity, entity._properties._korkeus_ka_m._value ) : extrudeTree( entity, 17.5 );
			break;
		case 'puusto, 10 m - 15 m':
			entity.polygon.material = Cesium.Color.FORESTGREEN.withAlpha( 0.55 );
			height ? extrudeTree( entity, entity._properties._korkeus_ka_m._value ) : extrudeTree( entity, 12.5 );
			break;
		case 'puusto, 2 m - 10 m':
			entity.polygon.material = Cesium.Color.FORESTGREEN.withAlpha( 0.5 );
			height ? extrudeTree( entity, entity._properties._korkeus_ka_m._value ) : extrudeTree( entity, 6 );
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

const extrudeTree = (entity, heightValue) => {
    if (heightValue) {
        entity.polygon.extrudedHeight = heightValue;
    }
};

