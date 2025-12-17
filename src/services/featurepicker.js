import * as Cesium from 'cesium'
import { SPECIAL_ENTITIES } from '../constants/specialEntities.js'
import { TIMING } from '../constants/timing.js'
import { ALL_TREE_CODES } from '../constants/treeCodes.js'
import { eventBus } from '../services/eventEmitter.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { usePropsStore } from '../stores/propsStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import logger from '../utils/logger.js'
import { findAddressForBuilding } from './address.js'
import Building from './building.js'
import cacheWarmer from './cacheWarmer.js'
import Camera from './camera.js'
import CapitalRegion from './capitalRegion.js'
import ColdArea from './coldarea.js'
import Datasource from './datasource.js'
import ElementsDisplay from './elementsDisplay.js'
import Helsinki from './helsinki.js'
import HSYBuilding from './hsybuilding.js'
import Plot from './plot.js'
import {
	loadPostalCodeWithParallelStrategy,
	setNameOfZone as setNameOfZoneHelper,
} from './postalCodeLoader.js'
import Sensor from './sensor.js'
import Traveltime from './traveltime.js'
import { logVisibilityChange } from './visibilityLogger.js'

/**
 * FeaturePicker Service
 * Handles user interactions with map entities including click events, entity selection,
 * and navigation between geographic levels (region → postal code → building).
 * Coordinates data loading and view updates across multiple service dependencies.
 *
 * Manages three primary interaction levels:
 * - Start: Capital region overview
 * - PostalCode: Zoom into specific postal code area
 * - Building: Individual building details
 *
 * @class FeaturePicker
 */
export default class FeaturePicker {
	/**
	 * Creates a FeaturePicker service instance
	 * Initializes all required service dependencies for entity interaction handling.
	 */
	constructor() {
		this.store = useGlobalStore()
		this.toggleStore = useToggleStore()
		this.propStore = usePropsStore()
		this.viewer = this.store.cesiumViewer
		this.datasourceService = new Datasource()
		this.buildingService = new Building()
		this.helsinkiService = new Helsinki()
		this.capitalRegionService = new CapitalRegion()
		this.sensorService = new Sensor()
		this.plotService = new Plot()
		this.traveltimeService = new Traveltime()
		this.hSYBuildingService = new HSYBuilding()
		this.elementsDisplayService = new ElementsDisplay()
		this.cameraService = new Camera()
		this.coldAreaService = new ColdArea()
		// Track which postal codes currently have visible buildings
		this.visiblePostalCodes = new Set()
		// Loading lock to prevent concurrent loads causing visibility race conditions
		this._isLoadingVisiblePostalCodes = false
	}

	/**
	 * Processes mouse click events on the Cesium viewer
	 * Entry point for all entity selection interactions.
	 * Converts screen coordinates to Cartesian2 and delegates to pickEntity.
	 *
	 * @param {MouseEvent} event - Browser mouse click event with x,y coordinates
	 * @returns {void}
	 */
	processClick(event) {
		logger.debug('[FeaturePicker] 🖱️ Processing click at coordinates:', event.x, event.y)
		this.pickEntity(new Cesium.Cartesian2(event.x, event.y))
	}

	/**
	 * Picks and processes the entity at specified screen position
	 * Uses Cesium scene.pick() to identify clicked entity and routes to appropriate handler.
	 * Handles both direct entities and primitives with associated entity IDs.
	 *
	 * @param {Cesium.Cartesian2} windowPosition - Screen coordinates for entity picking
	 * @returns {void}
	 * @fires eventBus#entityPrintEvent - Emitted when a polygon entity is selected
	 */
	pickEntity(windowPosition) {
		logger.debug('[FeaturePicker] 🎯 Picking entity at window position:', windowPosition)

		// Guard: Check if viewer and scene are in a valid state
		if (!this.viewer || !this.viewer.scene) {
			logger.warn('[FeaturePicker] ⚠️ Viewer or scene not available')
			return
		}

		// Guard: Check if the drawing buffer has valid dimensions
		const canvas = this.viewer.scene.canvas
		if (!canvas || canvas.clientWidth === 0 || canvas.clientHeight === 0) {
			logger.warn('[FeaturePicker] ⚠️ Canvas has invalid dimensions, skipping pick')
			return
		}

		const picked = this.viewer.scene.pick(windowPosition)
		logger.debug('[FeaturePicker] Picked object:', picked)

		if (picked) {
			const id = picked.id ?? picked.primitive?.id

			if (id?._polygon) {
				if (id instanceof Cesium.Entity) {
					this.store.setPickedEntity(id)
					eventBus.emit('entityPrintEvent')

					if (id.properties) {
						this.handleFeatureWithProperties(id)
					}
				}
			}
		}
	}

	/**
	 * Loads data and visualizations for the currently selected postal code
	 * Clears existing data sources and loads region-specific elements based on Helsinki view mode.
	 * Updates application level state and UI element visibility.
	 *
	 * @returns {Promise<void>}
	 */
	async loadPostalCode() {
		logger.debug('[FeaturePicker] 🚀 Loading postal code:', this.store.postalcode)
		logger.debug('[FeaturePicker] Helsinki view mode:', this.toggleStore.helsinkiView)

		this.setNameOfZone()
		this.elementsDisplayService.setSwitchViewElementsDisplay('inline-block')
		await this.datasourceService.removeDataSourcesAndEntities()

		// Load region-specific data based on view mode
		if (!this.toggleStore.helsinkiView) {
			logger.debug('[FeaturePicker] Loading Capital Region elements (including buildings)...')
			await this.capitalRegionService.loadCapitalRegionElements()
		} else {
			logger.debug('[FeaturePicker] Loading Helsinki elements (including buildings)...')
			await this.helsinkiService.loadHelsinkiElements()
		}

		this.store.setLevel('postalCode')
		logger.debug('[FeaturePicker] ✅ Postal code loading complete')
	}

	/**
	 * Loads postal code data for a specific postal code (used for retry functionality)
	 * Public method that can be called from external components to reload postal code data.
	 *
	 * @param {string} postalCode - Postal code to load
	 * @returns {Promise<void>}
	 */
	async loadPostalCodeData(postalCode) {
		logger.debug('[FeaturePicker] 📦 Loading postal code data:', postalCode)

		// Set the postal code in store
		this.store.setPostalCode(postalCode)

		// Load the postal code data
		await this.loadPostalCode()
	}

	/**
	 * Loads postal code with parallel camera animation and data loading (Phase 3)
	 * Delegates to postalCodeLoader module for implementation.
	 * Implements FR-3.1 (Parallel Loading), FR-3.3 (Performance Optimization), FR-3.4 (Error Handling)
	 *
	 * @param {string} postalCode - Postal code to load
	 * @returns {Promise<void>}
	 * @private
	 */
	async loadPostalCodeWithParallelStrategy(postalCode) {
		const services = {
			cameraService: this.cameraService,
			elementsDisplayService: this.elementsDisplayService,
			datasourceService: this.datasourceService,
			capitalRegionService: this.capitalRegionService,
			helsinkiService: this.helsinkiService,
		}

		const stores = {
			store: this.store,
			toggleStore: this.toggleStore,
		}

		const setNameOfZoneCallback = () => this.setNameOfZone()

		await loadPostalCodeWithParallelStrategy(postalCode, services, stores, setNameOfZoneCallback)
	}

	/**
	 * Sets the name of the current zone from postal code data
	 * Delegates to postalCodeLoader module for implementation.
	 *
	 * @returns {void}
	 * @private
	 */
	setNameOfZone() {
		setNameOfZoneHelper(this.store.postalcode, this.propStore.postalCodeData, (name) =>
			this.store.setNameOfZone(name)
		)
	}

	/**
	 * Handles building feature selection and visualization
	 * Updates application level to 'building', shows loading indicator, emits visibility events,
	 * and creates building-specific charts. Manages loading state throughout the process.
	 *
	 * @param {Object} properties - Building properties object containing building attributes
	 * @param {string} properties._postinumero - Postal code of the building
	 * @param {number} [properties.treeArea] - Nearby tree area
	 * @param {number} [properties._avg_temp_c] - Average temperature
	 * @returns {Promise<void>}
	 * @fires eventBus#hideHelsinki - Emitted when switching away from Helsinki view
	 * @fires eventBus#hideCapitalRegion - Emitted when switching away from Capital Region view
	 * @fires eventBus#showBuilding - Emitted when building level view is activated
	 */
	async handleBuildingFeature(properties) {
		// Clear stale loading states before transitioning to building level
		// This prevents the loading indicator from staying visible due to:
		// - Previous postal code loading that didn't complete properly
		// - Dynamic layer IDs (e.g., 'buildings-00100') that timed out
		try {
			const { useLoadingStore } = await import('../stores/loadingStore.js')
			const loadingStore = useLoadingStore()
			// Clear any stale loading states (older than 15s or dynamic layer IDs)
			loadingStore.clearStaleLoading(TIMING.STALE_LOADING_TIMEOUT_MS)
		} catch (error) {
			logger.warn('Loading store not available for cleanup:', error?.message || error)
		}

		try {
			// Update application state to building level
			this.store.setLevel('building')
			this.store.setPostalCode(properties._postinumero._value)
			if (this.toggleStore.helsinkiView) {
				eventBus.emit('hideHelsinki')
			} else {
				eventBus.emit('hideCapitalRegion')
			}
			eventBus.emit('showBuilding')
			this.elementsDisplayService.setBuildingDisplay('none')
			this.buildingService.resetBuildingOutline()

			// Process building charts asynchronously
			await this.buildingService.createBuildingCharts(
				properties.treeArea,
				properties._avg_temp_c,
				properties
			)
		} catch (error) {
			logger.error('Error handling building feature:', error?.message || error)
		}
	}

	/**
	 * Removes entities from viewer by name
	 * Iterates through all entities and removes those matching the specified name.
	 *
	 * @param {string} name - Name of entities to remove
	 * @returns {void}
	 */
	removeEntityByName(name) {
		this.viewer.entities._entities._array.forEach((entity) => {
			if (entity.name === name) {
				this.viewer.entities.remove(entity)
			}
		})
	}

	/**
	 * Handles the feature with properties
	 *
	 * @param {Object} id - The ID of the picked entity
	 * @fires eventBus#createHeatFloodVulnerabilityChart - Emitted when grid cell with vulnerability data is selected
	 * @private
	 */
	handleFeatureWithProperties(id) {
		logger.debug('[FeaturePicker] Clicked feature properties:', id.properties)
		logger.debug('[FeaturePicker] Current level:', this.store.level)

		this.removeEntityByName('coldpoint')
		this.removeEntityByName('currentLocation')
		this.datasourceService.removeDataSourcesByNamePrefix('TravelLabel').catch((error) => {
			logger.error('Failed to remove travel label datasources:', error)
		})

		this.propStore.setTreeArea(null)
		this.propStore.setHeatFloodVulnerability(id.properties ?? null)

		if (id.properties.grid_id) {
			this.propStore.setHeatFloodVulnerability(id.properties)
			eventBus.emit('createHeatFloodVulnerabilityChart')
		}

		//See if we can find building floor areas
		if (this.store.level === 'postalCode') {
			this.store.setBuildingAddress(findAddressForBuilding(id.properties))

			if (id.properties._locationUnder40) {
				if (id.properties._locationUnder40._value) {
					this.coldAreaService.addColdPoint(id.properties._locationUnder40._value)
				}
			}

			this.handleBuildingFeature(id.properties).catch((error) => {
				logger.error('Failed to handle building feature:', error)
			})
		}

		//If we find postal code, we assume this is an area & zoom in AND load the buildings for it.
		if (id.properties.posno) {
			const newPostalCode = id.properties.posno._value
			const postalCodeName = id.properties.nimi?._value || `Postal Code ${newPostalCode}`
			const currentPostalCode = this.store.postalcode

			logger.debug('[FeaturePicker] ✓ Postal code detected:', newPostalCode)
			logger.debug('[FeaturePicker] Current postal code:', currentPostalCode)
			logger.debug('[FeaturePicker] Current level:', this.store.level)

			// Allow switching between postal codes or loading a new one from any level
			if (
				newPostalCode !== currentPostalCode ||
				this.store.level === 'start' ||
				this.store.level === 'building'
			) {
				logger.debug('[FeaturePicker] Triggering postal code loading with parallel strategy...')

				// Capture view state before any changes
				this.store.captureViewState()

				// Set loading state immediately for instant visual feedback
				this.store.setClickProcessingState({
					isProcessing: true,
					postalCode: newPostalCode,
					postalCodeName: postalCodeName,
					stage: 'loading',
					startTime: performance.now(),
					canCancel: false,
					loadingProgress: { current: 0, total: 2 }, // Track camera + data loading
				})

				// Update postal code in store
				this.store.setPostalCode(newPostalCode)

				// PHASE 3: Parallel loading - camera animation and data load simultaneously
				this.loadPostalCodeWithParallelStrategy(newPostalCode).catch((error) => {
					logger.error('Failed to load postal code with parallel strategy:', error)
				})
			} else {
				logger.debug(
					'[FeaturePicker] ⚠️ Same postal code already selected at postalCode level, skipping reload'
				)
			}
		} else {
			logger.debug('[FeaturePicker] ⚠️ No postal code property (posno) found in clicked feature')
		}

		if (id.properties.asukkaita) {
			const boundingBox = this.getBoundingBox(id)
			this.store.setCurrentGridCell(id)

			// Construct the URL for the WFS request with the bounding box
			if (boundingBox) {
				const bboxString = `${boundingBox.minLon},${boundingBox.minLat},${boundingBox.maxLon},${boundingBox.maxLat}`

				// Now you can use this URL to make your WFS request
				this.hSYBuildingService.loadHSYBuildings(bboxString).catch((error) => {
					logger.error('Failed to load HSY buildings:', error)
				})
			}

			//createDiagramForPopulationGrid( id.properties.index, id.properties.asukkaita );
		}

		if (
			!id.properties.posno &&
			id.entityCollection._entities._array[0]._properties._id &&
			id.entityCollection._entities._array[0]._properties._id._value ===
				SPECIAL_ENTITIES.TRAVEL_TIME_GRID_CELL_ID
		) {
			this.traveltimeService.loadTravelTimeData(id.properties.id._value).catch((error) => {
				logger.error('Failed to load travel time data:', error)
			})
			this.traveltimeService.markCurrentLocation(id).catch((error) => {
				logger.error('Failed to mark current location:', error)
			})
		}
	}

	/**
	 * Calculates bounding box (geographic extent) for a polygon entity
	 * Extracts polygon positions, converts to geographic coordinates, and finds min/max bounds.
	 * Hides the entity after calculating its bounding box.
	 *
	 * @param {Cesium.Entity} id - Entity with polygon property
	 * @returns {Object|null} Bounding box object with {minLon, maxLon, minLat, maxLat} in degrees, or null if no polygon
	 */
	getBoundingBox(id) {
		let boundingBox = null

		if (id.polygon) {
			// Access the polygon hierarchy to get vertex positions
			const hierarchy = id.polygon.hierarchy.getValue()

			if (hierarchy) {
				const positions = hierarchy.positions

				// Convert Cartesian positions to geographic coordinates (latitude/longitude)
				const cartographics = positions.map((position) =>
					Cesium.Cartographic.fromCartesian(position)
				)

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
				id.show = false
			}
		}

		return boundingBox
	}

	/**
	 * Gets all postal codes that intersect with the current viewport
	 * Performs spatial intersection check between viewport rectangle and postal code polygons.
	 *
	 * @param {Object} viewportRect - { west, south, east, north } in degrees
	 * @returns {Array<string>} Array of postal code strings that are visible
	 */
	getVisiblePostalCodes(viewportRect) {
		if (!viewportRect) {
			logger.warn('[FeaturePicker] Invalid viewport rectangle')
			return []
		}

		const postalCodeData = this.propStore.postalCodeData
		if (!postalCodeData || !postalCodeData._entityCollection) {
			logger.warn('[FeaturePicker] Postal code data not loaded')
			return []
		}

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
			'[FeaturePicker] Found',
			visiblePostalCodes.length,
			'visible postal codes:',
			visiblePostalCodes
		)

		return visiblePostalCodes
	}

	/**
	 * Loads buildings for visible postal codes in viewport
	 * Only loads postal codes that don't already have building datasources.
	 * Prioritizes currently selected postal code.
	 * Uses postal code parameters to avoid modifying global state during loading.
	 * Implements visibility state tracking and batching to prevent blinking.
	 *
	 * @param {Array<string>} visiblePostalCodes - Array of postal code strings
	 * @returns {Promise<void>}
	 */
	async loadBuildingsForVisiblePostalCodes(visiblePostalCodes) {
		// Prevent concurrent loads that cause visibility race conditions
		if (this._isLoadingVisiblePostalCodes) {
			logger.debug('[FeaturePicker] ⏳ Skipping load - already loading visible postal codes')
			return
		}

		this._isLoadingVisiblePostalCodes = true

		try {
			const currentPostalCode = this.store.postalcode

			// Always prioritize the currently selected postal code
			if (currentPostalCode && !visiblePostalCodes.includes(currentPostalCode)) {
				visiblePostalCodes.unshift(currentPostalCode)
			}

			const newVisibleSet = new Set(visiblePostalCodes)

			// DIAGNOSTIC: Compare previous vs new visible postal codes
			const previousCodes = Array.from(this.visiblePostalCodes)
			logger.debug(`%c[STATE DEBUG] Visibility transition:`, 'color: cyan; font-weight: bold')
			logger.debug(
				`  Previous visible: [${previousCodes.join(', ')}] (${previousCodes.length} codes)`
			)
			logger.debug(
				`  New visible: [${visiblePostalCodes.join(', ')}] (${visiblePostalCodes.length} codes)`
			)
			logger.debug(`  Current selected: ${currentPostalCode || 'none'}`)

			// Collect all visibility changes to batch them
			const visibilityChanges = []

			// Hide buildings AND trees for postal codes that left the viewport
			for (const postalCode of this.visiblePostalCodes) {
				if (!newVisibleSet.has(postalCode) && postalCode !== currentPostalCode) {
					// Collect building hide changes
					const buildingDatasourceName = `Buildings ${postalCode}`
					const buildingDatasource =
						this.datasourceService.getDataSourceByName(buildingDatasourceName)
					if (buildingDatasource && buildingDatasource.show !== false) {
						visibilityChanges.push({
							datasource: buildingDatasource,
							visible: false,
							type: 'building',
							postalCode,
						})
					}

					// Collect tree hide changes
					const koodis = ALL_TREE_CODES
					for (const koodi of koodis) {
						const treeDatasourceName = `Trees${koodi}_${postalCode}`
						const treeDatasource = this.datasourceService.getDataSourceByName(treeDatasourceName)
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
			}

			const postalCodesToLoad = []

			// Check which postal codes need building/tree data loaded or shown
			for (const postalCode of visiblePostalCodes) {
				const datasourceName = `Buildings ${postalCode}`
				const existingDatasource = this.datasourceService.getDataSourceByName(datasourceName)

				if (existingDatasource) {
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
					const koodis = ALL_TREE_CODES
					for (const koodi of koodis) {
						const treeDatasourceName = `Trees${koodi}_${postalCode}`
						const treeDatasource = this.datasourceService.getDataSourceByName(treeDatasourceName)
						if (treeDatasource && !treeDatasource.show) {
							visibilityChanges.push({
								datasource: treeDatasource,
								visible: true,
								type: 'tree',
								postalCode,
							})
						}
					}
				} else {
					// Datasource doesn't exist, need to load it
					postalCodesToLoad.push(postalCode)
				}
			}

			// Apply all visibility changes in a single batch to reduce render thrashing
			if (visibilityChanges.length > 0) {
				const showCount = visibilityChanges.filter((c) => c.visible).length
				const hideCount = visibilityChanges.filter((c) => !c.visible).length
				logger.debug(
					`[FeaturePicker] 🔄 Batching ${visibilityChanges.length} visibility changes (show: ${showCount}, hide: ${hideCount})`
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
				if (this.viewer?.scene) {
					this.viewer.scene.requestRender()
				}
			}

			if (postalCodesToLoad.length === 0) {
				logger.debug('[FeaturePicker] All visible postal codes already have buildings loaded')
				this.visiblePostalCodes = newVisibleSet
				// DIAGNOSTIC: Still dump state even on early return
				this._dumpBuildingDatasourceState()
				return
			}

			logger.debug(
				'[FeaturePicker] Loading buildings for',
				postalCodesToLoad.length,
				'postal codes:',
				postalCodesToLoad
			)

			// Load buildings sequentially to avoid overwhelming the server
			// Pass postal code as parameter instead of modifying global state
			for (const postalCode of postalCodesToLoad) {
				try {
					logger.debug('[FeaturePicker] 🔄 Loading buildings for postal code:', postalCode)

					// Load buildings based on view mode, passing postal code as parameter
					if (this.toggleStore.helsinkiView) {
						await this.buildingService.loadBuildings(postalCode)
					} else {
						await this.hSYBuildingService.loadHSYBuildings(null, postalCode)
					}

					logger.debug('[FeaturePicker] ✅ Loaded buildings for postal code:', postalCode)
				} catch (error) {
					logger.error(
						'[FeaturePicker] ❌ Failed to load buildings for',
						postalCode,
						error?.message || error
					)
				}
			}

			// Update tracked visible postal codes
			this.visiblePostalCodes = newVisibleSet

			// Predictive warming: warm nearby postal codes in background
			// This preloads building data for adjacent areas before user pans there
			if (visiblePostalCodes.length > 0) {
				cacheWarmer.warmNearbyPostalCodes(currentPostalCode, visiblePostalCodes)
			}

			// DIAGNOSTIC: Dump final state of all building datasources
			this._dumpBuildingDatasourceState()
		} finally {
			// Always release the loading lock
			this._isLoadingVisiblePostalCodes = false
		}
	}

	/**
	 * DIAGNOSTIC: Dumps current state of all building datasources
	 * @private
	 */
	_dumpBuildingDatasourceState() {
		const allDatasources = this.viewer?.dataSources?._dataSources || []
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
		logger.debug(`  Tracked as visible: [${Array.from(this.visiblePostalCodes).join(', ')}]`)

		// Check for mismatches
		const trackedSet = this.visiblePostalCodes
		const actualVisible = buildingDatasources
			.filter((ds) => ds.show)
			.map((ds) => ds.name.replace('Buildings ', ''))
		const mismatches = actualVisible.filter((code) => !trackedSet.has(code))
		const missing = Array.from(trackedSet).filter((code) => !actualVisible.includes(code))

		if (mismatches.length > 0 || missing.length > 0) {
			logger.warn(
				`%c[STATE MISMATCH!] Visible but not tracked: [${mismatches.join(', ')}], Tracked but not visible: [${missing.join(', ')}]`,
				'color: red; font-weight: bold'
			)
		}
	}

	/**
	 * Hides buildings for a specific postal code by setting datasource.show to false
	 * Keeps the datasource in memory (preserves cache) but makes it invisible.
	 *
	 * @param {string} postalCode - Postal code to hide buildings for
	 * @returns {void}
	 */
	hideBuildingsForPostalCode(postalCode) {
		const datasourceName = `Buildings ${postalCode}`
		const datasource = this.datasourceService.getDataSourceByName(datasourceName)

		if (datasource && datasource.show !== false) {
			logVisibilityChange('datasource', datasourceName, true, false, 'hideBuildingsForPostalCode')
			datasource.show = false
			logger.debug('[FeaturePicker] 🙈 Hiding buildings for postal code:', postalCode)
		}
	}

	/**
	 * Hides trees for a specific postal code by setting all tree datasources.show to false
	 * Trees are loaded in 4 height categories (221-224), so we need to hide all of them.
	 * Keeps the datasources in memory (preserves cache) but makes them invisible.
	 *
	 * @param {string} postalCode - Postal code to hide trees for
	 * @returns {void}
	 */
	hideTreesForPostalCode(postalCode) {
		const koodis = ALL_TREE_CODES
		let hiddenCount = 0

		for (const koodi of koodis) {
			const datasourceName = `Trees${koodi}_${postalCode}`
			const datasource = this.datasourceService.getDataSourceByName(datasourceName)

			if (datasource && datasource.show !== false) {
				logVisibilityChange('datasource', datasourceName, true, false, 'hideTreesForPostalCode')
				datasource.show = false
				hiddenCount++
			}
		}

		if (hiddenCount > 0) {
			logger.debug(
				`[FeaturePicker] 🌳 Hiding ${hiddenCount} tree datasources for postal code:`,
				postalCode
			)
		}
	}
}
