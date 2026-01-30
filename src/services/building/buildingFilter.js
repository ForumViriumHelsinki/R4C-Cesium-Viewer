/**
 * Building Filter Module
 *
 * Handles filtering of building entities based on various criteria:
 * - Construction date (hideNewBuildings)
 * - Building purpose (hideNonSote - social/healthcare)
 * - Floor count (hideLow - buildings with <= 6 floors)
 *
 * @module services/building/buildingFilter
 */

import { isSoteBuilding } from '../../constants/buildingCodes.js'
import { DATES } from '../../constants/dates.js'
import { useGlobalStore } from '../../stores/globalStore.js'
import { usePropsStore } from '../../stores/propsStore.js'
import { useToggleStore } from '../../stores/toggleStore.js'
import { eventBus } from '../eventEmitter.js'
import { logVisibilityChange } from '../visibilityLogger.js'

/**
 * Building Filter Class
 *
 * Manages building visibility based on filter criteria.
 * Optimized to prevent redundant re-application and batch visibility changes.
 */
export class BuildingFilter {
	/**
	 * @param {Object} [options] - Configuration options
	 * @param {Function} [options.onHistogramUpdate] - Callback after histogram update (e.g., resetBuildingOutline)
	 */
	constructor(options = {}) {
		this.store = useGlobalStore()
		this.toggleStore = useToggleStore()
		this.propsStore = usePropsStore()
		this.viewer = this.store.cesiumViewer
		// Track last filter state to prevent redundant re-application
		this.lastFilterState = null
		// Callback for post-histogram update actions (to avoid circular dependency with highlighter)
		this._onHistogramUpdate = options.onHistogramUpdate || null
	}

	/**
	 * Filter buildings from the given data source based on UI toggle switches.
	 * Optimized to prevent redundant re-application and batch visibility changes.
	 *
	 * @param {Cesium.DataSource} buildingsDataSource - Data source containing building entities
	 */
	filterBuildings(buildingsDataSource) {
		if (!buildingsDataSource) return

		const hideNewBuildings = this.toggleStore.hideNewBuildings
		const hideNonSote = this.toggleStore.hideNonSote
		const hideLow = this.toggleStore.hideLow

		// Get current filter state
		const currentState = { hideNewBuildings, hideNonSote, hideLow }

		// Skip if state unchanged to prevent redundant re-application
		if (
			this.lastFilterState &&
			JSON.stringify(this.lastFilterState) === JSON.stringify(currentState)
		) {
			return
		}
		this.lastFilterState = currentState

		// Pre-calculate the cutoff date for hideNewBuildings filter
		const cutoffDate = DATES.NEW_BUILDING_CUTOFF.getTime()

		// Batch entity visibility changes
		const entitiesToHide = []
		const entitiesToShow = []

		// Single pass through all entities with all filter checks
		const entities = buildingsDataSource.entities.values
		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i]
			let shouldHide = false

			// Check hideNewBuildings filter
			if (hideNewBuildings) {
				const completionDate = entity._properties?._c_valmpvm?._value
				if (completionDate && new Date(completionDate).getTime() >= cutoffDate) {
					shouldHide = true
				}
			}

			// Check hideNonSote filter (social/healthcare buildings)
			if (!shouldHide && hideNonSote) {
				const kayttotark = this.toggleStore.helsinkiView
					? entity._properties?._c_kayttark?._value
						? Number(entity._properties?.c_kayttark?._value)
						: null
					: entity._properties?._kayttarks?._value

				const entityIsSoteBuilding = this.toggleStore.helsinkiView
					? kayttotark && isSoteBuilding(kayttotark)
					: kayttotark === 'Yleinen rakennus'

				if (!entityIsSoteBuilding) {
					shouldHide = true
				}
			}

			// Check hideLow filter (buildings with <= 6 floors)
			if (!shouldHide && hideLow) {
				const floorCount =
					entity._properties?.[this.toggleStore.helsinkiView ? '_i_kerrlkm' : '_kerrosten_lkm']
						?._value
				if (!floorCount || floorCount <= 6) {
					shouldHide = true
				}
			}

			// Collect entities by visibility state
			if (shouldHide) {
				entitiesToHide.push(entity)
			} else {
				entitiesToShow.push(entity)
			}
		}

		// Apply visibility changes in batches to minimize render cycles
		for (let i = 0; i < entitiesToHide.length; i++) {
			if (entitiesToHide[i].show) {
				logVisibilityChange(
					'entity',
					entitiesToHide[i].id || 'building',
					true,
					false,
					'filterBuildings-hide'
				)
				entitiesToHide[i].show = false
			}
		}
		for (let i = 0; i < entitiesToShow.length; i++) {
			if (!entitiesToShow[i].show) {
				logVisibilityChange(
					'entity',
					entitiesToShow[i].id || 'building',
					false,
					true,
					'filterBuildings-show'
				)
				entitiesToShow[i].show = true
			}
		}

		// Request render after batch updates
		if (this.viewer) {
			this.viewer.scene.requestRender()
		}

		this.updateHeatHistogramDataAfterFilter(buildingsDataSource.entities._entities._array)
	}

	/**
	 * Updates heat histogram data after filtering buildings
	 * Extracts heat exposure values from visible entities and emits update event.
	 *
	 * @param {Array<Cesium.Entity>} entities - Building entities to process
	 * @private
	 */
	updateHeatHistogramDataAfterFilter(entities) {
		const visibleEntities = entities.filter((entity) => entity.show)
		const targetDate = this.store.heatDataDate

		const avg_temp = this.toggleStore.helsinkiView
			? visibleEntities.map((entity) => entity.properties?._avgheatexposuretobuilding?._value)
			: visibleEntities
					.map((entity) => {
						const heatTimeseries = entity.properties.heat_timeseries?._value || []
						const foundEntry = heatTimeseries.find(({ date }) => date === targetDate)
						return foundEntry ? foundEntry.avg_temp_c : null
					})
					.filter((temp) => temp !== null)

		// Call injected callback (e.g., resetBuildingOutline) to avoid circular dependency
		if (this._onHistogramUpdate) {
			this._onHistogramUpdate()
		}

		this.propsStore.setHeatHistogramData(avg_temp)
		eventBus.emit('newHeatHistogram')
	}

	/**
	 * Filters buildings to show only social/healthcare facilities
	 *
	 * @param {Cesium.Entity} entity - Building entity to filter
	 */
	soteBuildings(entity) {
		const kayttotark = this.toggleStore.helsinkiView
			? entity._properties?._c_kayttark?._value
				? Number(entity._properties?.c_kayttark?._value)
				: null
			: entity._properties?._kayttarks?._value

		entity.show = this.toggleStore.helsinkiView
			? kayttotark && isSoteBuilding(kayttotark)
			: kayttotark === 'Yleinen rakennus'
	}

	/**
	 * Hides buildings with 6 or fewer floors
	 *
	 * @param {Cesium.Entity} entity - Building entity to filter
	 */
	lowBuildings(entity) {
		if (
			entity._properties?.[this.toggleStore.helsinkiView ? '_i_kerrlkm' : '_kerrosten_lkm']
				?._value <= 6
		) {
			entity.show = false
		}
	}

	/**
	 * Shows all buildings and updates the histograms and scatter plot
	 *
	 * @param {Cesium.DataSource} buildingsDataSource - Data source containing building entities
	 */
	showAllBuildings(buildingsDataSource) {
		if (!buildingsDataSource) return

		// Reset filter state tracking since we're showing all buildings
		this.lastFilterState = null

		// Batch visibility changes
		const entities = buildingsDataSource._entityCollection._entities._array
		let hasChanges = false

		for (let i = 0; i < entities.length; i++) {
			if (!entities[i].show) {
				logVisibilityChange('entity', entities[i].id || 'building', false, true, 'showAllBuildings')
				entities[i].show = true
				hasChanges = true
			}
		}

		// Request render after batch updates if there were changes
		if (hasChanges && this.viewer) {
			this.viewer.scene.requestRender()
		}

		this.updateHeatHistogramDataAfterFilter(buildingsDataSource.entities._entities._array)
	}

	/**
	 * Hides building if hideNonSote is enabled and building is not a SOTE building
	 *
	 * @param {Object} entity - Cesium entity
	 */
	hideNonSoteBuilding(entity) {
		if (this.toggleStore.hideNonSote) {
			const kayttotark = entity._properties?.c_kayttark?._value

			if (!kayttotark || !isSoteBuilding(kayttotark)) {
				logVisibilityChange(
					'entity',
					entity.id || 'building',
					entity.show,
					false,
					'hideNonSoteBuilding'
				)
				entity.show = false
			}
		}
	}

	/**
	 * Hides building if hideLow is enabled and building has fewer than 7 floors
	 *
	 * @param {Object} entity - Cesium entity
	 */
	hideLowBuilding(entity) {
		if (
			this.toggleStore.hideLow &&
			(!Number(entity._properties?.i_kerrlkm?._value) ||
				Number(entity._properties?.i_kerrlkm?._value) < 7)
		) {
			logVisibilityChange('entity', entity.id || 'building', entity.show, false, 'hideLowBuilding')
			entity.show = false
		}
	}
}

export default BuildingFilter
