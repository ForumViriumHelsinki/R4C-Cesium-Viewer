/**
 * Building Service Module
 *
 * Provides backward-compatible exports for the refactored building service.
 * The original monolithic Building class is now composed from specialized modules:
 * - BuildingLoader: Data fetching and caching
 * - BuildingFilter: Visibility filtering logic
 * - BuildingStyler: Visual styling and coloring
 * - BuildingHighlighter: Selection and outline effects
 *
 * @module services/building
 */

import { useGlobalStore } from '../../stores/globalStore.js'
import { usePropsStore } from '../../stores/propsStore.js'
import { useToggleStore } from '../../stores/toggleStore.js'
import { useURLStore } from '../../stores/urlStore.js'
import logger from '../../utils/logger.js'
import { getCesium } from '../cesiumProvider.js'
import Datasource from '../datasource.js'
import Tree from '../tree.js'
import unifiedLoader from '../unifiedLoader.js'
import Urbanheat from '../urbanheat.js'
import { BuildingFilter } from './buildingFilter.js'
import { BuildingHighlighter } from './buildingHighlighter.js'
import { BuildingLoader } from './buildingLoader.js'
import { BuildingStyler } from './buildingStyler.js'

/**
 * Building Service
 *
 * Manages building entity visualization, heat exposure data, and user interactions.
 * This class composes functionality from specialized modules while maintaining
 * the original API for backward compatibility.
 *
 * @class Building
 */
export default class Building {
	/**
	 * Creates a Building service instance
	 * Initializes service dependencies and specialized module instances.
	 */
	constructor() {
		this.store = useGlobalStore()
		this.toggleStore = useToggleStore()
		this.propsStore = usePropsStore()
		this.urlStore = useURLStore()
		this.viewer = this.store.cesiumViewer
		this.datasourceService = new Datasource()
		this.treeService = new Tree()
		this.urbanheatService = new Urbanheat()
		this.unifiedLoader = unifiedLoader

		// Compose from specialized modules
		this._loader = new BuildingLoader()
		this._styler = new BuildingStyler()
		this._highlighter = new BuildingHighlighter()
		// Filter needs callback to highlighter to reset outlines after histogram update
		this._filter = new BuildingFilter({
			onHistogramUpdate: () => this._highlighter.resetBuildingOutline(),
		})

		// Track last filter state (delegated to filter module)
		this.lastFilterState = null
	}

	// ============================================================
	// Loader Methods (delegated to BuildingLoader)
	// ============================================================

	/**
	 * Loads Helsinki buildings for a postal code with caching support.
	 * @param {string} [postalCode] - Optional postal code to load buildings for.
	 * @returns {Promise<void>}
	 */
	async loadBuildings(postalCode) {
		return this._loader.loadBuildings(postalCode)
	}

	/**
	 * Cancels any in-flight building load operation.
	 * Safe to call even if no load is in progress.
	 *
	 * @returns {void}
	 */
	cancelCurrentLoad() {
		this._loader.cancelCurrentLoad()
	}

	/**
	 * Gets the layer ID for the currently active load.
	 * Used for external monitoring or cancellation.
	 *
	 * @returns {string|null} Layer ID or null if no active load
	 */
	get activeLayerId() {
		return this._loader.activeLayerId
	}

	// ============================================================
	// Styler Methods (delegated to BuildingStyler)
	// ============================================================

	/**
	 * Removes nearby tree coverage effects from building entities.
	 * @param {Array<Cesium.Entity>} entities - Building entities to process
	 * @returns {Promise<void>}
	 */
	async removeNearbyTreeEffect(entities) {
		return this._styler.removeNearbyTreeEffect(entities)
	}

	/**
	 * Applies heat exposure visualization to building entities.
	 * @param {Array<Cesium.Entity>} entities - Building entities to style
	 * @returns {Promise<void>}
	 */
	async setHeatExposureToBuildings(entities) {
		return this._styler.setHeatExposureToBuildings(entities)
	}

	/**
	 * Sets height extrusion for Helsinki buildings.
	 * @param {Array<Cesium.Entity>} entities - Building entities to process
	 * @returns {Promise<void>}
	 */
	async setHelsinkiBuildingsHeight(entities) {
		return this._styler.setHelsinkiBuildingsHeight(entities)
	}

	/**
	 * Set building entity polygon color based on heat exposure.
	 * @param {Object} entity - Building entity
	 */
	setBuildingEntityPolygon(entity) {
		return this._styler.setBuildingEntityPolygon(entity)
	}

	/**
	 * Creates and emits events for building-specific data visualizations.
	 * @param {number} treeArea - Nearby tree coverage area in square meters
	 * @param {number} avg_temp_c - Average surface temperature in Celsius
	 * @param {Object} buildingProps - Building properties object
	 * @returns {Promise<void>}
	 */
	async createBuildingCharts(treeArea, avg_temp_c, buildingProps) {
		return this._styler.createBuildingCharts(treeArea, avg_temp_c, buildingProps)
	}

	/**
	 * Finds building datasource and resets building entities polygon styling.
	 */
	resetBuildingEntities() {
		const buildingDataSource = this.datasourceService.getDataSourceByName(
			`Buildings ${this.store.postalcode}`
		)

		if (!buildingDataSource) return

		logger.debug('[Building] Resetting building entities for postal code:', this.store.postalcode)

		const buildingEntities = buildingDataSource.entities.values
		for (let i = 0; i < buildingEntities.length; i++) {
			const entity = buildingEntities[i]

			// Guard against entities without polygon property
			if (!entity?.polygon) {
				continue
			}

			// Reset outline styling
			const Cesium = getCesium()
			entity.polygon.outlineColor = Cesium.Color.BLACK
			entity.polygon.outlineWidth = 3

			// Ensure fill is enabled to prevent wireframe appearance
			entity.polygon.fill = true

			// Use the proper method that handles both Helsinki and Capital Region views
			this._styler.setBuildingEntityPolygon(entity)
		}

		logger.debug('[Building] Reset', buildingEntities.length, 'building entities')
	}

	// ============================================================
	// Filter Methods (delegated to BuildingFilter)
	// ============================================================

	/**
	 * Filter buildings based on UI toggle switches.
	 * Uses batch processing to yield to main thread and prevent UI blocking.
	 * @param {Cesium.DataSource} buildingsDataSource - Data source containing building entities
	 * @returns {Promise<void>}
	 */
	async filterBuildings(buildingsDataSource) {
		// Call filter, then reset outline (since filter module cannot call back to highlighter)
		await this._filter.filterBuildings(buildingsDataSource)
		// Note: resetBuildingOutline is called within updateHeatHistogramDataAfterFilter
		// which needs to be coordinated here to avoid circular dependency
	}

	/**
	 * Updates heat histogram data after filtering buildings.
	 * Note: resetBuildingOutline is called via callback injected into filter module.
	 * @param {Array<Cesium.Entity>} entities - Building entities to process
	 * @private
	 */
	updateHeatHistogramDataAfterFilter(entities) {
		this._filter.updateHeatHistogramDataAfterFilter(entities)
	}

	/**
	 * Filters buildings to show only social/healthcare facilities.
	 * @param {Cesium.Entity} entity - Building entity to filter
	 */
	soteBuildings(entity) {
		return this._filter.soteBuildings(entity)
	}

	/**
	 * Hides buildings with 6 or fewer floors.
	 * @param {Cesium.Entity} entity - Building entity to filter
	 */
	lowBuildings(entity) {
		return this._filter.lowBuildings(entity)
	}

	/**
	 * Shows all buildings and updates the histograms.
	 * @param {Cesium.DataSource} buildingsDataSource - Data source containing building entities
	 */
	showAllBuildings(buildingsDataSource) {
		return this._filter.showAllBuildings(buildingsDataSource)
	}

	/**
	 * If hideNonSote switch is checked, hides non-SOTE buildings.
	 * @param {Object} entity - Cesium entity
	 */
	hideNonSoteBuilding(entity) {
		return this._filter.hideNonSoteBuilding(entity)
	}

	/**
	 * If hideLow switch is checked, hides buildings with fewer than 7 floors.
	 * @param {Object} entity - Cesium entity
	 */
	hideLowBuilding(entity) {
		return this._filter.hideLowBuilding(entity)
	}

	// ============================================================
	// Highlighter Methods (delegated to BuildingHighlighter)
	// ============================================================

	/**
	 * Highlights buildings based on temperature values.
	 * @param {Array<number>} temps - Array of temperature values to highlight
	 */
	highlightBuildingsInViewer(temps) {
		return this._highlighter.highlightBuildingsInViewer(temps)
	}

	/**
	 * Resets all building outlines to default.
	 */
	resetBuildingOutline() {
		return this._highlighter.resetBuildingOutline()
	}

	/**
	 * Outlines entity based on temperature match.
	 * @param {Cesium.Entity} entity - Building entity to check
	 * @param {string} property - Property name to match
	 * @param {Array<number>} values - Values to match against
	 */
	outlineByTemperature(entity, property, values) {
		return this._highlighter.outlineByTemperature(entity, property, values)
	}

	/**
	 * Highlights a specific building by ID.
	 * @param {string|number} id - Building ID to highlight
	 */
	highlightBuildingInViewer(id) {
		return this._highlighter.highlightBuildingInViewer(id)
	}

	/**
	 * Outlines a building entity by matching a property value.
	 * @param {Cesium.Entity} entity - Building entity to check
	 * @param {string} property - Property name to match
	 * @param {string|number} id - Value to match against property
	 */
	outlineById(entity, property, id) {
		return this._highlighter.outlineById(entity, property, id)
	}

	/**
	 * Sets building polygon outline to yellow highlight.
	 * @param {Cesium.Entity} entity - Building entity to highlight
	 */
	polygonOutlineToYellow(entity) {
		return this._highlighter.polygonOutlineToYellow(entity)
	}

	/**
	 * Resets building polygon outline to default black.
	 * @param {Cesium.Entity} entity - Building entity to reset
	 */
	polygonOutlineToBlack(entity) {
		return this._highlighter.polygonOutlineToBlack(entity)
	}
}

// Re-export individual modules for direct access if needed
export { BuildingFilter } from './buildingFilter.js'
export { BuildingHighlighter } from './buildingHighlighter.js'
export { BuildingLoader } from './buildingLoader.js'
export { BuildingStyler, filterHeatTimeseries } from './buildingStyler.js'
