/**
 * Building Styler Module
 *
 * Handles visual styling and coloring of building entities based on heat exposure data.
 * Manages building polygon materials, heights, and color coding by heat exposure values.
 *
 * @module services/building/buildingStyler
 */

import { isSoteBuilding } from '../../constants/buildingCodes.js'
import { useGlobalStore } from '../../stores/globalStore.js'
import { usePropsStore } from '../../stores/propsStore.js'
import { useToggleStore } from '../../stores/toggleStore.js'
import { processBatchAdaptive } from '../../utils/batchProcessor.js'
import { calculateBuildingHeight } from '../../utils/entityStyling.js'
import { getCesium } from '../cesiumProvider.js'
import { eventBus } from '../eventEmitter.js'
import { logVisibilityChange } from '../visibilityLogger.js'

/**
 * Filters heat timeseries data by construction year cutoff
 * Removes historical data predating the building's construction year.
 *
 * @param {Object} buildingProps - Building properties object
 * @param {Object} buildingProps._kavu - Construction year property
 * @param {Object} buildingProps._heat_timeseries - Heat timeseries array
 * @private
 */
export const filterHeatTimeseries = (buildingProps) => {
	if (buildingProps._kavu && typeof buildingProps._kavu._value === 'number') {
		const cutoffYear = buildingProps._kavu._value
		buildingProps._heat_timeseries._value = buildingProps._heat_timeseries._value.filter(
			(entry) => {
				const entryYear = new Date(entry.date).getFullYear()
				return entryYear >= cutoffYear
			}
		)
	}
}

/**
 * Building Styler Class
 *
 * Manages visual styling of building entities including polygon colors,
 * heights, and heat exposure visualization.
 */
export class BuildingStyler {
	constructor() {
		this.store = useGlobalStore()
		this.toggleStore = useToggleStore()
		this.propsStore = usePropsStore()
	}

	/**
	 * Removes nearby tree coverage effects from building entities
	 * Resets building polygon colors to original heat exposure values.
	 * Processes entities in adaptive batches to prevent UI blocking on large datasets.
	 *
	 * @param {Array<Cesium.Entity>} entities - Building entities to process
	 * @returns {Promise<void>}
	 */
	async removeNearbyTreeEffect(entities) {
		await processBatchAdaptive(entities, (entity) => this.setBuildingEntityPolygon(entity), {
			processorName: 'buildingPolygon',
		})
	}

	/**
	 * Applies heat exposure visualization to building entities
	 * Updates building polygon colors based on heat exposure data.
	 * Uses adaptive batched processing for optimal performance across devices.
	 *
	 * @param {Array<Cesium.Entity>} entities - Building entities to style
	 * @returns {Promise<void>}
	 */
	async setHeatExposureToBuildings(entities) {
		await processBatchAdaptive(entities, (entity) => this.setBuildingEntityPolygon(entity), {
			processorName: 'heatExposure',
		})
	}

	/**
	 * Sets height extrusion for Helsinki buildings
	 * Uses adaptive batching for optimal performance across different devices.
	 *
	 * @param {Array<Cesium.Entity>} entities - Building entities to process
	 * @returns {Promise<void>}
	 */
	async setHelsinkiBuildingsHeight(entities) {
		await processBatchAdaptive(
			entities,
			(entity) => {
				if (entity.polygon) {
					entity.polygon.extrudedHeight = calculateBuildingHeight(entity.properties)
				}
			},
			{ processorName: 'heightExtrusion' }
		)
	}

	/**
	 * Set building entity polygon color based on heat exposure
	 *
	 * @param {Object} entity - Building entity
	 */
	setBuildingEntityPolygon(entity) {
		const { properties, polygon } = entity
		const targetDate = this.store.heatDataDate
		const Cesium = getCesium()

		if (polygon) {
			if (this.toggleStore.helsinkiView) {
				if (properties?.avgheatexposuretobuilding) {
					const heatExposureValue = properties.avgheatexposuretobuilding._value
					polygon.material = new Cesium.Color(1, 1 - heatExposureValue, 0, heatExposureValue)
				}
			} else {
				const heatTimeseries = properties.heat_timeseries?._value || []
				const foundEntry = heatTimeseries.find(({ date }) => date === targetDate)

				if (foundEntry) {
					// Only set color if an entry is found
					if (targetDate === '2021-02-18') {
						polygon.material = new Cesium.Color(
							0,
							1 - (1 - foundEntry.avgheatexposure),
							1,
							1 - foundEntry.avgheatexposure
						)
					} else {
						polygon.material = new Cesium.Color(
							1,
							1 - foundEntry.avgheatexposure,
							0,
							foundEntry.avgheatexposure
						)
					}
				} else {
					logVisibilityChange(
						'entity',
						entity.id || 'building',
						entity.show,
						false,
						'setBuildingEntityPolygon-noHeatData'
					)
					entity.show = false
					polygon.material = new Cesium.Color(0, 0, 0, 0)
				}
			}
		}

		// Apply visibility filters based on view mode
		if (this.toggleStore.helsinkiView) {
			this._hideNonSoteBuilding(entity)
			this._hideLowBuilding(entity)
		}
		if (this.store.view === 'grid' && entity._properties?._kayttarks?._value !== 'Asuinrakennus') {
			logVisibilityChange(
				'entity',
				entity.id || 'building',
				entity.show,
				false,
				'setBuildingEntityPolygon-gridNonResidential'
			)
			entity.show = false
		}
	}

	/**
	 * If hideNonSote switch is checked, hides buildings based on value of c_kayttark
	 *
	 * @param {Object} entity - Cesium entity
	 * @private
	 */
	_hideNonSoteBuilding(entity) {
		if (this.toggleStore.hideNonSote) {
			const kayttotark = entity._properties.c_kayttark?._value

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
	 * If hideLow switch is checked, hides buildings based on their floor count
	 *
	 * @param {Object} entity - Cesium entity
	 * @private
	 */
	_hideLowBuilding(entity) {
		if (
			this.toggleStore.hideLow &&
			(!Number(entity._properties.i_kerrlkm?._value) ||
				Number(entity._properties.i_kerrlkm?._value) < 7)
		) {
			logVisibilityChange('entity', entity.id || 'building', entity.show, false, 'hideLowBuilding')
			entity.show = false
		}
	}

	/**
	 * Creates and emits events for building-specific data visualizations
	 * Processes building heat timeseries data, tree coverage, and heat exposure values.
	 *
	 * @param {number} treeArea - Nearby tree coverage area in square meters
	 * @param {number} avg_temp_c - Average surface temperature in Celsius (unused)
	 * @param {Object} buildingProps - Building properties object containing heat and structural data
	 * @returns {Promise<void>}
	 */
	async createBuildingCharts(treeArea, _avg_temp_c, buildingProps) {
		if (this.store.view === 'grid') {
			this.propsStore.setGridBuildingProps(buildingProps)
		}

		// Process heat timeseries asynchronously to avoid blocking UI
		await new Promise((resolve) => {
			filterHeatTimeseries(buildingProps)
			if (requestIdleCallback) {
				requestIdleCallback(resolve)
			} else {
				setTimeout(resolve, 0)
			}
		})

		// Set tree area if tree layer is visible and data exists
		if (this.toggleStore.showTrees && treeArea) {
			this.propsStore.setTreeArea(treeArea)
		}

		// Set heat exposure data based on view mode (Helsinki vs Capital Region)
		if (this.toggleStore.helsinkiView) {
			this.propsStore.setBuildingHeatExposure(buildingProps._avgheatexposuretobuilding._value)
			eventBus.emit('newBuildingHeat')
		} else if (!this.toggleStore.helsinkiView) {
			if (buildingProps.heat_timeseries) {
				this.propsStore.setBuildingHeatTimeseries(buildingProps.heat_timeseries._value)
			}
		} else {
			this.propsStore.setGridBuildingProps(buildingProps)
		}
	}
}

export default BuildingStyler
