import Datasource from './datasource.js';
import * as Cesium from 'cesium';
import { useGlobalStore } from '../stores/globalStore.js';
import { useURLStore } from '../stores/urlStore.js';
import unifiedLoader from './unifiedLoader.js';

/**
 * Other Nature Service
 * Manages miscellaneous natural surface layers (rock, sand, bare soil).
 * Complements vegetation and tree layers with additional land cover types
 * from HSY environmental data.
 *
 * Nature categories (koodi codes):
 * - 310: Rock surfaces (kallio) - Light grey
 * - 410: Sand/beaches (hiekka) - Sandy brown
 * - 130: Bare soil/exposed ground (paljas maa) - Rosy brown
 *
 * Features:
 * - Unified loader integration with caching (20min TTL)
 * - Batched processing for performance
 * - Color-coded visualization by surface type
 * - Progressive loading support
 *
 * @class Othernature
 */
export default class Othernature {
	/**
	 * Creates an Othernature service instance
	 * @constructor
	 */
	constructor( ) {
		this.store = useGlobalStore();
		this.urlStore = useURLStore();
		this.viewer = this.store.cesiumViewer;
		this.datasourceService = new Datasource();
	}

	/**
	 * Loads othernature data for a given postcode using unified loader
	 * 
	 * @returns {Promise} - A promise that resolves once the data has been loaded
	 */
	async loadOtherNature() {
		try {
			const data = await unifiedLoader.loadLayer({
				layerId: 'othernature',
				url: this.urlStore.otherNature(this.store.postalcode),
				type: 'geojson',
				processor: (data) => this.addOtherNatureDataSource(data),
				options: {
					cache: true,
					cacheTTL: 20 * 60 * 1000, // 20 minutes
					retries: 2,
					batchSize: 20,
					progressive: true
				}
			});
			
			console.log(`✓ Other nature data loaded for postal code ${this.store.postalcode}`);
			return data;
			
		} catch (error) {
			console.error('Failed to load other nature data:', error);
			throw error;
		}
	}

	/**
	 * Adds a othernature data source to the viewer with batch processing
	 * 
	 * @param {Object} data - The othernature data to be added as a data source
	 * @param {Object} metadata - Additional metadata about the loading process
	 */
	async addOtherNatureDataSource(data, metadata = {}) {
		try {
			const entities = await this.datasourceService.addDataSourceWithPolygonFix(data, 'OtherNature');
			
			// Process entities in batches for smooth performance
			const batchSize = 20;
			for (let i = 0; i < entities.length; i += batchSize) {
				const batch = entities.slice(i, i + batchSize);
				
				// Process batch
				for (const entity of batch) {
					const category = entity.properties._koodi?._value;
					if (category) {
						this.setOtherNaturePolygonMaterialColor(entity, category);
					}
				}
				
				// Yield control after each batch to prevent UI blocking
				if (i + batchSize < entities.length) {
					await new Promise(resolve => {
						if (window.requestIdleCallback) {
							requestIdleCallback(resolve);
						} else {
							setTimeout(resolve, 0);
						}
					});
				}
			}
			
			if (!metadata.fromCache) {
				console.log(`✓ Processed ${entities.length} other nature entities`);
			} else {
				console.log(`✓ Restored ${entities.length} other nature entities from cache`);
			}
			
		} catch (error) {
			console.error('Error processing other nature data:', error);
			throw error;
		}
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
