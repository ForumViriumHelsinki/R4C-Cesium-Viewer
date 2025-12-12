import * as Cesium from 'cesium'
import { useGlobalStore } from '../stores/globalStore.js'
import { useURLStore } from '../stores/urlStore.js'
import Datasource from './datasource.js'
import unifiedLoader from './unifiedLoader.js'

/**
 * Vegetation Service
 * Manages low-ground vegetation layer visualization (grass, shrubs, water bodies).
 * Loads and renders vegetation data from HSY datasets with category-specific styling.
 *
 * Vegetation categories (koodi codes):
 * - 212: Low vegetation (<2m grass/shrubs) - Light green, 0.1m extrusion
 * - 211: Taller vegetation (2m vegetation) - Yellow-green, 0.5m extrusion
 * - 510: Water bodies - Deep sky blue
 * - 520: Other water features - Dodger blue
 *
 * Features:
 * - Unified loader integration with caching (15min TTL)
 * - Batched processing for large datasets
 * - Color-coded visualization by vegetation type
 * - Small 3D extrusion for vegetation layers
 * - Progressive loading support
 *
 * @class Vegetation
 */
export default class Vegetation {
	/**
	 * Creates a Vegetation service instance
	 */
	constructor() {
		this.datasourceService = new Datasource()
		this.store = useGlobalStore()
		this.urlStore = useURLStore()
	}

	/**
	 * Loads vegetation data for a given postcode using unified loader
	 *
	 * @returns {Promise} - A promise that resolves once the data has been loaded
	 */
	async loadVegetation() {
		try {
			const data = await unifiedLoader.loadLayer({
				layerId: 'vegetation',
				url: this.urlStore.vegetation(this.store.postalcode),
				type: 'geojson',
				processor: (data) => this.addVegetationDataSource(data),
				options: {
					cache: true,
					cacheTTL: 15 * 60 * 1000, // 15 minutes
					retries: 2,
					batchSize: 25,
					progressive: true,
				},
			})

			console.log(`✓ Vegetation data loaded for postal code ${this.store.postalcode}`)
			return data
		} catch (error) {
			console.error('Failed to load vegetation data:', error)
			throw error
		}
	}

	/**
	 * Adds a vegetation data source to the viewer with batch processing
	 *
	 * @param {Object} data - The vegetation data to be added as a data source
	 * @param {Object} metadata - Additional metadata about the loading process
	 */
	async addVegetationDataSource(data, metadata = {}) {
		try {
			const entities = await this.datasourceService.addDataSourceWithPolygonFix(data, 'Vegetation')

			// Process entities in batches for smooth performance
			const batchSize = 25
			for (let i = 0; i < entities.length; i += batchSize) {
				const batch = entities.slice(i, i + batchSize)

				// Process batch
				for (const entity of batch) {
					const category = entity.properties._koodi?._value
					if (category) {
						this.setVegetationPolygonMaterialColor(entity, category)
					}
				}

				// Yield control after each batch to prevent UI blocking
				if (i + batchSize < entities.length) {
					await new Promise((resolve) => {
						if (window.requestIdleCallback) {
							requestIdleCallback(resolve)
						} else {
							setTimeout(resolve, 0)
						}
					})
				}
			}

			if (!metadata.fromCache) {
				console.log(`✓ Processed ${entities.length} vegetation entities`)
			} else {
				console.log(`✓ Restored ${entities.length} vegetation entities from cache`)
			}
		} catch (error) {
			console.error('Error processing vegetation data:', error)
			throw error
		}
	}

	/**
	 * Sets the polygon material color for a vegetation entity based on its category
	 *
	 * @param {Object} entity - The vegetation entity
	 * @param {string} category - The category of the vegetation entity
	 */
	setVegetationPolygonMaterialColor(entity, category) {
		switch (category) {
			case '212':
				entity.polygon.extrudedHeight = 0.1
				entity.polygon.material = Cesium.Color.LIGHTGREEN.withAlpha(0.5)
				break
			case '211':
				entity.polygon.extrudedHeight = 0.5
				entity.polygon.material = Cesium.Color.GREENYELLOW.withAlpha(0.5)
				break
			case '510':
				entity.polygon.material = Cesium.Color.DEEPSKYBLUE.withAlpha(0.5)
				break
			case '520':
				entity.polygon.material = Cesium.Color.DODGERBLUE.withAlpha(0.5)
				break
		}
	}
}
