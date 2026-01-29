/**
 * Postal Code Handler Module
 * Handles postal code viewport detection and spatial calculations.
 * Determines which postal codes are visible in the current viewport.
 *
 * @module featurepicker/postalCodeHandler
 */
import logger from '../../utils/logger.js'
import cacheWarmer from '../cacheWarmer.js'
import { getCesium } from '../cesiumProvider.js'

/**
 * Gets all postal codes that intersect with the current viewport
 * Performs spatial intersection check between viewport rectangle and postal code polygons.
 *
 * @param {Object} viewportRect - { west, south, east, north } in degrees
 * @param {Object} postalCodeData - Postal code datasource with entity collection
 * @returns {Array<string>} Array of postal code strings that are visible
 */
export function getVisiblePostalCodes(viewportRect, postalCodeData) {
	if (!viewportRect) {
		logger.warn('[PostalCodeHandler] Invalid viewport rectangle')
		return []
	}

	if (!postalCodeData || !postalCodeData._entityCollection) {
		logger.warn('[PostalCodeHandler] Postal code data not loaded')
		return []
	}

	const Cesium = getCesium()
	const entities = postalCodeData._entityCollection._entities._array
	const visiblePostalCodes = []

	// Create Cesium Rectangle for viewport
	const viewportRectangle = Cesium.Rectangle.fromDegrees(
		viewportRect.west,
		viewportRect.south,
		viewportRect.east,
		viewportRect.north
	)

	// DIAGNOSTIC: Log viewport bounds
	logger.debug(
		`%c[VIEWPORT DEBUG] Viewport bounds: W=${viewportRect.west.toFixed(4)}, S=${viewportRect.south.toFixed(4)}, E=${viewportRect.east.toFixed(4)}, N=${viewportRect.north.toFixed(4)}`,
		'color: orange; font-weight: bold'
	)
	logger.debug(`[VIEWPORT DEBUG] Total postal code entities to check: ${entities.length}`)

	for (const entity of entities) {
		if (!entity.polygon || !entity.properties?.posno) continue

		// Get entity bounding rectangle
		const hierarchy = entity.polygon.hierarchy.getValue()
		if (!hierarchy || !hierarchy.positions) continue

		// Convert Cartesian positions to Rectangle
		const cartographics = hierarchy.positions.map((pos) => Cesium.Cartographic.fromCartesian(pos))

		const lons = cartographics.map((c) => c.longitude)
		const lats = cartographics.map((c) => c.latitude)

		const entityRectangle = new Cesium.Rectangle(
			Math.min(...lons),
			Math.min(...lats),
			Math.max(...lons),
			Math.max(...lats)
		)

		// Check if rectangles intersect
		const intersection = Cesium.Rectangle.intersection(viewportRectangle, entityRectangle)

		if (intersection) {
			const postalCode = entity.properties.posno._value
			visiblePostalCodes.push(postalCode)
		}
	}

	logger.debug(
		'[PostalCodeHandler] Found',
		visiblePostalCodes.length,
		'visible postal codes:',
		visiblePostalCodes
	)

	return visiblePostalCodes
}

/**
 * Triggers predictive warming for nearby postal codes
 * Preloads building data for adjacent areas before user pans there.
 *
 * @param {string} currentPostalCode - Currently selected postal code
 * @param {Array<string>} visiblePostalCodes - Array of visible postal codes
 * @returns {void}
 */
export function warmNearbyPostalCodes(currentPostalCode, visiblePostalCodes) {
	if (visiblePostalCodes.length > 0) {
		cacheWarmer.warmNearbyPostalCodes(currentPostalCode, visiblePostalCodes)
	}
}
