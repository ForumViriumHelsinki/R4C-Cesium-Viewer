/**
 * Building Highlighter Module
 *
 * Handles building selection and outline highlighting effects.
 * Manages visual highlighting of buildings based on temperature values,
 * IDs, or histogram brush selection.
 *
 * @module services/building/buildingHighlighter
 */

import * as Cesium from 'cesium'
import { useGlobalStore } from '../../stores/globalStore.js'
import { useToggleStore } from '../../stores/toggleStore.js'
import Datasource from '../datasource.js'
import { eventBus } from '../eventEmitter.js'

/**
 * Building Highlighter Class
 *
 * Manages visual highlighting and outline effects for building entities.
 */
export class BuildingHighlighter {
	constructor() {
		this.store = useGlobalStore()
		this.toggleStore = useToggleStore()
		this.datasourceService = new Datasource()
	}

	/**
	 * Highlights buildings in viewer based on temperature values
	 *
	 * @param {Array<number>} temps - Array of temperature values to highlight
	 */
	highlightBuildingsInViewer(temps) {
		const buildingDataSource = this.datasourceService.getDataSourceByName(
			`Buildings ${this.store.postalcode}`
		)

		if (!buildingDataSource) return

		const entities = buildingDataSource.entities.values

		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i]

			if (!this.toggleStore.helsinkiView) {
				this.outlineByTemperature(entity, 'avg_temp_c', temps)
			} else {
				this.outlineByTemperature(entity, 'avgheatexposuretobuilding', temps)
			}
		}
	}

	/**
	 * Resets all building outlines to default black
	 */
	resetBuildingOutline() {
		const buildingDataSource = this.datasourceService.getDataSourceByName(
			`Buildings ${this.store.postalcode}`
		)

		if (!buildingDataSource) return

		const entities = buildingDataSource.entities.values

		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i]
			this.polygonOutlineToBlack(entity)
		}
	}

	/**
	 * Outlines entity based on temperature match
	 *
	 * @param {Cesium.Entity} entity - Building entity to check
	 * @param {string} property - Property name to match (avg_temp_c or avgheatexposuretobuilding)
	 * @param {Array<number>} values - Values to match against
	 */
	outlineByTemperature(entity, property, values) {
		const heatTimeseries = entity._properties.heat_timeseries?._value || []
		const foundEntry = heatTimeseries.find(({ date }) => date === this.store.heatDataDate)

		const shouldOutlineYellow = !this.toggleStore.helsinkiView
			? foundEntry && values.includes(foundEntry.avg_temp_c)
			: entity._properties[property] && values.includes(entity._properties[property]._value)

		if (shouldOutlineYellow) {
			this.polygonOutlineToYellow(entity)
		} else {
			this.polygonOutlineToBlack(entity)
		}
	}

	/**
	 * Highlights a specific building by ID
	 *
	 * @param {string|number} id - Building ID to highlight
	 */
	highlightBuildingInViewer(id) {
		const buildingDataSource = this.datasourceService.getDataSourceByName(
			`Buildings ${this.store.postalcode}`
		)

		if (!buildingDataSource) return

		const entities = buildingDataSource.entities.values

		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i]
			this.outlineById(entity, this.toggleStore.helsinkiView ? 'id' : 'kiitun', id)
		}
	}

	/**
	 * Outlines a building entity by matching a property value
	 * Highlights matching entity with yellow outline and emits print event.
	 *
	 * @param {Cesium.Entity} entity - Building entity to check
	 * @param {string} property - Property name to match
	 * @param {string|number} id - Value to match against property
	 * @private
	 */
	outlineById(entity, property, id) {
		if (entity._properties[property] && entity._properties[property]._value === id) {
			this.polygonOutlineToYellow(entity)
			this.store.setPickedEntity(entity)
			eventBus.emit('entityPrintEvent')
		} else {
			this.polygonOutlineToBlack(entity)
		}
	}

	/**
	 * Sets building polygon outline to yellow highlight
	 *
	 * @param {Cesium.Entity} entity - Building entity to highlight
	 */
	polygonOutlineToYellow(entity) {
		entity.polygon.outline = true
		entity.polygon.outlineColor = Cesium.Color.YELLOW
		entity.polygon.outlineWidth = 20
	}

	/**
	 * Resets building polygon outline to default black
	 *
	 * @param {Cesium.Entity} entity - Building entity to reset
	 */
	polygonOutlineToBlack(entity) {
		entity.polygon.outlineColor = Cesium.Color.BLACK
		entity.polygon.outlineWidth = 8
	}
}

export default BuildingHighlighter
