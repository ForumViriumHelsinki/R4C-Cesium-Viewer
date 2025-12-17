/**
 * @module services/cesiumEntityManager
 * Non-reactive container for managing Cesium entity references.
 *
 * This service stores Cesium entities separately from Pinia state to prevent
 * DataCloneError when CesiumJS uses Web Workers. Cesium entities contain
 * non-serializable properties (functions, circular references, getters) that
 * cannot be cloned for postMessage() calls.
 *
 * Usage pattern:
 * - Store serializable data (IDs, values) in Pinia store
 * - Register Cesium entities here for visual manipulation
 * - Look up entities by ID when visual updates are needed
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm|Structured Clone Algorithm}
 */
import logger from '../utils/logger.js'

/**
 * Singleton class managing Cesium entity references by ID
 *
 * @class CesiumEntityManager
 */
class CesiumEntityManager {
	constructor() {
		/**
		 * Map of tree kohde_id to Cesium.Entity
		 * @type {Map<string, Cesium.Entity>}
		 */
		this.treeEntitiesById = new Map()

		/**
		 * Map of building ID to Cesium.Entity
		 * @type {Map<string, Cesium.Entity>}
		 */
		this.buildingEntitiesById = new Map()

		/**
		 * Reference to buildings datasource for public API access
		 * @type {Cesium.DataSource|null}
		 */
		this.buildingsDataSource = null
	}

	/**
	 * Register tree entities for visual manipulation
	 * Indexes entities by their kohde_id property
	 *
	 * @param {Array<Cesium.Entity>} entities - Tree entities from Cesium datasource
	 */
	registerTreeEntities(entities) {
		this.treeEntitiesById.clear()

		for (const entity of entities) {
			const kohdeId = entity._properties?._kohde_id?._value
			if (kohdeId) {
				this.treeEntitiesById.set(kohdeId, entity)
			}
		}

		logger.debug(`[CesiumEntityManager] Registered ${this.treeEntitiesById.size} tree entities`)
	}

	/**
	 * Register building entities for visual manipulation
	 * Indexes entities by their _id or _hki_id property
	 *
	 * @param {Array<Cesium.Entity>} entities - Building entities from datasource
	 */
	registerBuildingEntities(entities) {
		this.buildingEntitiesById.clear()

		for (const entity of entities) {
			const id = entity._properties?._id?._value || entity._properties?._hki_id?._value
			if (id) {
				this.buildingEntitiesById.set(id, entity)
			}
		}

		logger.debug(
			`[CesiumEntityManager] Registered ${this.buildingEntitiesById.size} building entities`
		)
	}

	/**
	 * Register buildings datasource reference
	 * Allows access to public Cesium API (entities.values)
	 *
	 * @param {Cesium.DataSource} datasource - Buildings datasource
	 */
	setBuildingsDataSource(datasource) {
		this.buildingsDataSource = datasource
	}

	/**
	 * Get tree entity by kohde_id for visual manipulation
	 *
	 * @param {string} kohdeId - Tree kohde_id
	 * @returns {Cesium.Entity|undefined} Tree entity or undefined
	 */
	getTreeEntity(kohdeId) {
		return this.treeEntitiesById.get(kohdeId)
	}

	/**
	 * Get building entity by ID for visual manipulation
	 *
	 * @param {string} buildingId - Building _id or _hki_id
	 * @returns {Cesium.Entity|undefined} Building entity or undefined
	 */
	getBuildingEntity(buildingId) {
		return this.buildingEntitiesById.get(buildingId)
	}

	/**
	 * Get all tree entities as array
	 *
	 * @returns {Array<Cesium.Entity>} Array of tree entities
	 */
	getAllTreeEntities() {
		return Array.from(this.treeEntitiesById.values())
	}

	/**
	 * Get all building entities via public Cesium API
	 *
	 * @returns {Array<Cesium.Entity>} Array of building entities
	 */
	getAllBuildingEntities() {
		if (this.buildingsDataSource) {
			return this.buildingsDataSource.entities.values
		}
		return Array.from(this.buildingEntitiesById.values())
	}

	/**
	 * Clear all stored entity references
	 * Call when switching postal codes or resetting view
	 */
	clear() {
		this.treeEntitiesById.clear()
		this.buildingEntitiesById.clear()
		this.buildingsDataSource = null
		logger.debug('[CesiumEntityManager] Cleared all entity references')
	}

	/**
	 * Get statistics about stored entities (for debugging)
	 *
	 * @returns {Object} Statistics object
	 */
	getStats() {
		return {
			treeEntities: this.treeEntitiesById.size,
			buildingEntities: this.buildingEntitiesById.size,
			hasBuildingsDataSource: !!this.buildingsDataSource,
		}
	}
}

// Export singleton instance
export const cesiumEntityManager = new CesiumEntityManager()
