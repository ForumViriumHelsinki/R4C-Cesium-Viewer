/**
 * Entity Picker Module
 * Core Cesium picking logic for entity selection at screen coordinates.
 * Handles the low-level interaction with Cesium's scene.pick() API.
 *
 * @module featurepicker/entityPicker
 */
import * as Cesium from 'cesium'
import logger from '../../utils/logger.js'
import { eventBus } from '../eventEmitter.js'

/**
 * Processes mouse click events on the Cesium viewer
 * Entry point for all entity selection interactions.
 * Converts screen coordinates to Cartesian2 and delegates to pickEntity.
 *
 * @param {MouseEvent} event - Browser mouse click event with x,y coordinates
 * @param {Object} context - Context object with viewer and store
 * @param {Function} onEntityPicked - Callback when entity is picked
 * @returns {void}
 */
export function processClick(event, context, onEntityPicked) {
	logger.debug('[EntityPicker] Processing click at coordinates:', event.x, event.y)
	pickEntity(new Cesium.Cartesian2(event.x, event.y), context, onEntityPicked)
}

/**
 * Picks and processes the entity at specified screen position
 * Uses Cesium scene.pick() to identify clicked entity and routes to appropriate handler.
 * Handles both direct entities and primitives with associated entity IDs.
 *
 * @param {Cesium.Cartesian2} windowPosition - Screen coordinates for entity picking
 * @param {Object} context - Context object with viewer and store
 * @param {Object} context.viewer - Cesium viewer instance
 * @param {Object} context.store - Global store instance
 * @param {Function} onEntityPicked - Callback when entity with properties is picked
 * @returns {void}
 * @fires eventBus#entityPrintEvent - Emitted when a polygon entity is selected
 */
export function pickEntity(windowPosition, context, onEntityPicked) {
	const { viewer, store } = context

	logger.debug('[EntityPicker] Picking entity at window position:', windowPosition)

	// Guard: Check if viewer and scene are in a valid state
	if (!viewer || !viewer.scene) {
		logger.warn('[EntityPicker] Viewer or scene not available')
		return
	}

	// Guard: Check if the drawing buffer has valid dimensions
	const canvas = viewer.scene.canvas
	if (!canvas || canvas.clientWidth === 0 || canvas.clientHeight === 0) {
		logger.warn('[EntityPicker] Canvas has invalid dimensions, skipping pick')
		return
	}

	const picked = viewer.scene.pick(windowPosition)
	logger.debug('[EntityPicker] Picked object:', picked)

	if (picked) {
		const id = picked.id ?? picked.primitive?.id

		if (id?._polygon) {
			if (id instanceof Cesium.Entity) {
				store.setPickedEntity(id)
				eventBus.emit('entityPrintEvent')

				if (id.properties) {
					onEntityPicked(id)
				}
			}
		}
	}
}

/**
 * Removes entities from viewer by name
 * Iterates through all entities and removes those matching the specified name.
 *
 * @param {Cesium.Viewer} viewer - Cesium viewer instance
 * @param {string} name - Name of entities to remove
 * @returns {void}
 */
export function removeEntityByName(viewer, name) {
	viewer.entities._entities._array.forEach((entity) => {
		if (entity.name === name) {
			viewer.entities.remove(entity)
		}
	})
}

/**
 * Calculates bounding box (geographic extent) for a polygon entity
 * Extracts polygon positions, converts to geographic coordinates, and finds min/max bounds.
 * Hides the entity after calculating its bounding box.
 *
 * @param {Cesium.Entity} entity - Entity with polygon property
 * @returns {Object|null} Bounding box object with {minLon, maxLon, minLat, maxLat} in degrees, or null if no polygon
 */
export function getBoundingBox(entity) {
	let boundingBox = null

	if (entity.polygon) {
		// Access the polygon hierarchy to get vertex positions
		const hierarchy = entity.polygon.hierarchy.getValue()

		if (hierarchy) {
			const positions = hierarchy.positions

			// Convert Cartesian positions to geographic coordinates (latitude/longitude)
			const cartographics = positions.map((position) => Cesium.Cartographic.fromCartesian(position))

			// Find the geographic extent (bounding box)
			let minLon = Number.POSITIVE_INFINITY,
				maxLon = Number.NEGATIVE_INFINITY
			let minLat = Number.POSITIVE_INFINITY,
				maxLat = Number.NEGATIVE_INFINITY

			cartographics.forEach((cartographic) => {
				minLon = Math.min(minLon, cartographic.longitude)
				maxLon = Math.max(maxLon, cartographic.longitude)
				minLat = Math.min(minLat, cartographic.latitude)
				maxLat = Math.max(maxLat, cartographic.latitude)
			})

			// Convert radians to degrees
			minLon = Cesium.Math.toDegrees(minLon)
			maxLon = Cesium.Math.toDegrees(maxLon)
			minLat = Cesium.Math.toDegrees(minLat)
			maxLat = Cesium.Math.toDegrees(maxLat)

			boundingBox = {
				minLon: minLon,
				maxLon: maxLon,
				minLat: minLat,
				maxLat: maxLat,
			}

			// Hide entity after extracting bounds
			entity.show = false
		}
	}

	return boundingBox
}
