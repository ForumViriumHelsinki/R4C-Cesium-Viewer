/**
 * Visibility Manager Module
 * Manages visibility state of building and tree datasources across postal codes.
 * Handles batched visibility changes to reduce render thrashing.
 *
 * @module featurepicker/visibilityManager
 */
import { ALL_TREE_CODES } from '../../constants/treeCodes.js'
import logger from '../../utils/logger.js'
import { logVisibilityChange } from '../visibilityLogger.js'

/**
 * Collects visibility changes for postal codes leaving/entering viewport
 * Returns an array of changes to be applied in a batch.
 *
 * @param {Set<string>} previousVisible - Previously visible postal codes
 * @param {Set<string>} newVisible - Newly visible postal codes
 * @param {string} currentPostalCode - Currently selected postal code
 * @param {Object} datasourceService - Datasource service instance
 * @returns {Object} { visibilityChanges: Array, postalCodesToLoad: Array }
 */
export function calculateVisibilityChanges(
	previousVisible,
	newVisible,
	currentPostalCode,
	datasourceService
) {
	const visibilityChanges = []
	const postalCodesToLoad = []

	// DIAGNOSTIC: Compare previous vs new visible postal codes
	const previousCodes = Array.from(previousVisible)
	logger.debug(`%c[STATE DEBUG] Visibility transition:`, 'color: cyan; font-weight: bold')
	logger.debug(`  Previous visible: [${previousCodes.join(', ')}] (${previousCodes.length} codes)`)
	logger.debug(`  New visible: [${Array.from(newVisible).join(', ')}] (${newVisible.size} codes)`)
	logger.debug(`  Current selected: ${currentPostalCode || 'none'}`)

	// Hide buildings AND trees for postal codes that left the viewport
	for (const postalCode of previousVisible) {
		if (!newVisible.has(postalCode) && postalCode !== currentPostalCode) {
			collectHideChanges(postalCode, datasourceService, visibilityChanges)
		}
	}

	// Check which postal codes need building/tree data loaded or shown
	for (const postalCode of newVisible) {
		const datasourceName = `Buildings ${postalCode}`
		const existingDatasource = datasourceService.getDataSourceByName(datasourceName)

		if (existingDatasource) {
			collectShowChanges(postalCode, existingDatasource, datasourceService, visibilityChanges)
		} else {
			// Datasource doesn't exist, need to load it
			postalCodesToLoad.push(postalCode)
		}
	}

	return { visibilityChanges, postalCodesToLoad }
}

/**
 * Collects hide changes for a postal code leaving viewport
 * @private
 */
function collectHideChanges(postalCode, datasourceService, visibilityChanges) {
	// Collect building hide changes
	const buildingDatasourceName = `Buildings ${postalCode}`
	const buildingDatasource = datasourceService.getDataSourceByName(buildingDatasourceName)
	if (buildingDatasource && buildingDatasource.show !== false) {
		visibilityChanges.push({
			datasource: buildingDatasource,
			visible: false,
			type: 'building',
			postalCode,
		})
	}

	// Collect tree hide changes
	for (const koodi of ALL_TREE_CODES) {
		const treeDatasourceName = `Trees${koodi}_${postalCode}`
		const treeDatasource = datasourceService.getDataSourceByName(treeDatasourceName)
		if (treeDatasource && treeDatasource.show !== false) {
			visibilityChanges.push({
				datasource: treeDatasource,
				visible: false,
				type: 'tree',
				postalCode,
			})
		}
	}
}

/**
 * Collects show changes for a postal code entering viewport
 * @private
 */
function collectShowChanges(postalCode, existingDatasource, datasourceService, visibilityChanges) {
	// Buildings datasource exists, collect show change if needed
	if (!existingDatasource.show) {
		visibilityChanges.push({
			datasource: existingDatasource,
			visible: true,
			type: 'building',
			postalCode,
		})
	}

	// Also collect tree datasource show changes if they exist
	for (const koodi of ALL_TREE_CODES) {
		const treeDatasourceName = `Trees${koodi}_${postalCode}`
		const treeDatasource = datasourceService.getDataSourceByName(treeDatasourceName)
		if (treeDatasource && !treeDatasource.show) {
			visibilityChanges.push({
				datasource: treeDatasource,
				visible: true,
				type: 'tree',
				postalCode,
			})
		}
	}
}

/**
 * Applies visibility changes in a single batch to reduce render thrashing
 *
 * @param {Array} visibilityChanges - Array of visibility change objects
 * @param {Cesium.Viewer} viewer - Cesium viewer instance
 * @returns {void}
 */
export function applyVisibilityChanges(visibilityChanges, viewer) {
	if (visibilityChanges.length === 0) return

	const showCount = visibilityChanges.filter((c) => c.visible).length
	const hideCount = visibilityChanges.filter((c) => !c.visible).length
	logger.debug(
		`[VisibilityManager] Batching ${visibilityChanges.length} visibility changes (show: ${showCount}, hide: ${hideCount})`
	)

	// Apply all changes
	for (const change of visibilityChanges) {
		const oldValue = change.datasource.show
		logVisibilityChange(
			'datasource',
			`${change.postalCode} (${change.type})`,
			oldValue,
			change.visible,
			'loadBuildingsForVisiblePostalCodes'
		)
		change.datasource.show = change.visible
	}

	// Request single render after batch update
	if (viewer?.scene) {
		viewer.scene.requestRender()
	}
}

/**
 * Hides buildings for a specific postal code by setting datasource.show to false
 * Keeps the datasource in memory (preserves cache) but makes it invisible.
 *
 * @param {string} postalCode - Postal code to hide buildings for
 * @param {Object} datasourceService - Datasource service instance
 * @returns {void}
 */
export function hideBuildingsForPostalCode(postalCode, datasourceService) {
	const datasourceName = `Buildings ${postalCode}`
	const datasource = datasourceService.getDataSourceByName(datasourceName)

	if (datasource && datasource.show !== false) {
		logVisibilityChange('datasource', datasourceName, true, false, 'hideBuildingsForPostalCode')
		datasource.show = false
		logger.debug('[VisibilityManager] Hiding buildings for postal code:', postalCode)
	}
}

/**
 * Hides trees for a specific postal code by setting all tree datasources.show to false
 * Trees are loaded in 4 height categories (221-224), so we need to hide all of them.
 * Keeps the datasources in memory (preserves cache) but makes them invisible.
 *
 * @param {string} postalCode - Postal code to hide trees for
 * @param {Object} datasourceService - Datasource service instance
 * @returns {void}
 */
export function hideTreesForPostalCode(postalCode, datasourceService) {
	let hiddenCount = 0

	for (const koodi of ALL_TREE_CODES) {
		const datasourceName = `Trees${koodi}_${postalCode}`
		const datasource = datasourceService.getDataSourceByName(datasourceName)

		if (datasource && datasource.show !== false) {
			logVisibilityChange('datasource', datasourceName, true, false, 'hideTreesForPostalCode')
			datasource.show = false
			hiddenCount++
		}
	}

	if (hiddenCount > 0) {
		logger.debug(
			`[VisibilityManager] Hiding ${hiddenCount} tree datasources for postal code:`,
			postalCode
		)
	}
}

/**
 * DIAGNOSTIC: Dumps current state of all building datasources
 *
 * @param {Cesium.Viewer} viewer - Cesium viewer instance
 * @param {Set<string>} visiblePostalCodes - Set of tracked visible postal codes
 * @returns {void}
 */
export function dumpBuildingDatasourceState(viewer, visiblePostalCodes) {
	const allDatasources = viewer?.dataSources?._dataSources || []
	const buildingDatasources = allDatasources.filter((ds) => ds.name?.startsWith('Buildings '))

	logger.debug(
		`%c[DATASOURCE STATE] Total building datasources: ${buildingDatasources.length}`,
		'color: magenta; font-weight: bold'
	)

	const visible = []
	const hidden = []

	for (const ds of buildingDatasources) {
		const postalCode = ds.name.replace('Buildings ', '')
		const entityCount = ds.entities?.values?.length || 0

		if (ds.show) {
			visible.push(`${postalCode}(${entityCount})`)
		} else {
			hidden.push(`${postalCode}(${entityCount})`)
		}
	}

	logger.debug(`  Visible: [${visible.join(', ')}]`)
	logger.debug(`  Hidden: [${hidden.join(', ')}]`)
	logger.debug(`  Tracked as visible: [${Array.from(visiblePostalCodes).join(', ')}]`)

	// Check for mismatches
	const actualVisible = buildingDatasources
		.filter((ds) => ds.show)
		.map((ds) => ds.name.replace('Buildings ', ''))
	const mismatches = actualVisible.filter((code) => !visiblePostalCodes.has(code))
	const missing = Array.from(visiblePostalCodes).filter((code) => !actualVisible.includes(code))

	if (mismatches.length > 0 || missing.length > 0) {
		logger.warn(
			`%c[STATE MISMATCH!] Visible but not tracked: [${mismatches.join(', ')}], Tracked but not visible: [${missing.join(', ')}]`,
			'color: red; font-weight: bold'
		)
	}
}
