import Datasource from './datasource.js'; 
import * as Cesium from 'cesium';
import { useGlobalStore } from '../stores/globalStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import { eventBus } from '../services/eventEmitter.js';
import { useURLStore } from '../stores/urlStore.js';
import unifiedLoader from './unifiedLoader.js';

export default class Tree {
	constructor( ) {
		this.datasourceService = new Datasource();
		this.store = useGlobalStore();
        this.urlStore = useURLStore();
	}

	/**
	 * Asynchronously load tree data using unified loader with coordinated parallel loading
	 */
	async loadTrees() {
		try {
			// Define all tree height categories
			const koodis = ['221', '222', '223', '224'];
			
			// Create loading configurations for parallel execution
			const loadingConfigs = koodis.map(koodi => ({
				layerId: `trees_${koodi}`,
				url: this.urlStore.tree(this.store.postalcode, koodi),
				type: 'geojson',
				processor: (data, metadata) => this.addTreesDataSource(data, koodi, metadata),
				options: {
					cache: true,
					cacheTTL: 25 * 60 * 1000, // 25 minutes (trees change less frequently)
					retries: 2,
					batchSize: 30,
					progressive: true,
					priority: 'high' // Trees are important for cooling analysis
				}
			}));
			
			// Load all tree types in parallel using unified loader
			const results = await unifiedLoader.loadLayers(loadingConfigs);
			
			// Check results and log success/failures
			const successful = results.filter(r => r.status === 'fulfilled').length;
			const failed = results.length - successful;
			
			if (failed === 0) {
				console.log(`✓ All ${successful} tree height categories loaded successfully`);
			} else {
				console.warn(`⚠ ${successful}/${results.length} tree categories loaded, ${failed} failed`);
			}
			
			return results;
			
		} catch (error) {
			console.error('Failed to load tree data:', error);
			throw error;
		}
	}

	/**
	 * Legacy method maintained for backward compatibility
	 * @deprecated Use loadTrees() instead for unified loading
	 */
	async loadTreesWithKoodi(koodi) {
		console.warn('loadTreesWithKoodi is deprecated, use loadTrees() instead');
		
		try {
			const data = await unifiedLoader.loadLayer({
				layerId: `trees_${koodi}`,
				url: this.urlStore.tree(this.store.postalcode, koodi),
				type: 'geojson',
				processor: (data, metadata) => this.addTreesDataSource(data, koodi, metadata),
				options: {
					cache: true,
					retries: 2,
					batchSize: 30
				}
			});
			
			console.log(`✓ Loaded trees for height category ${koodi}`);
			return data;
			
		} catch (error) {
			console.error(`Failed to load trees for koodi ${koodi}:`, error);
			throw error;
		}
	}	

	/**
	 * Add the tree data as a new data source to Cesium with optimized batch processing
	 * 
	 * @param {Object} data - Tree data from API
	 * @param {string} koodi - Tree height category code
	 * @param {Object} metadata - Loading metadata from unified loader
	 */
	async addTreesDataSource(data, koodi, metadata = {}) {
		try {
			const entities = await this.datasourceService.addDataSourceWithPolygonFix(data, 'Trees' + koodi);

			// Enhanced batch processing with adaptive batch sizes
			const adaptiveBatchSize = entities.length > 1000 ? 15 : 25;
			let processed = 0;
			
			for (let i = 0; i < entities.length; i += adaptiveBatchSize) {
				const batch = entities.slice(i, i + adaptiveBatchSize);
				
				// Process batch with improved error handling
				for (const entity of batch) {
					try {
						const description = entity.properties._kuvaus?._value;
						if (description) {
							this.setTreePolygonMaterialColor(entity, description);
						}
						processed++;
					} catch (entityError) {
						console.warn(`Error processing tree entity in koodi ${koodi}:`, entityError);
					}
				}
				
				// Yield control with improved scheduling
				if (i + adaptiveBatchSize < entities.length) {
					await new Promise(resolve => {
						if (window.requestIdleCallback) {
							requestIdleCallback(resolve, { timeout: 50 });
						} else {
							setTimeout(resolve, 0);
						}
					});
				}
			}

			// Handle Helsinki-specific tree distance data
			if (this.store.view === 'helsinki') {
				this.fetchAndAddTreeDistanceData(entities);
			}
			
			if (!metadata.fromCache) {
				console.log(`✓ Processed ${processed} trees for height category ${koodi}`);
			} else {
				console.log(`✓ Restored ${processed} trees from cache for category ${koodi}`);
			}
			
		} catch (error) {
			console.error(`Error processing tree data for koodi ${koodi}:`, error);
			throw error;
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

