/**
 * FeaturePicker Service - Refactored Modular Version
 * Handles user interactions with map entities including click events, entity selection,
 * and navigation between geographic levels (region -> postal code -> building).
 * Coordinates data loading and view updates across multiple service dependencies.
 *
 * This is the main entry point that maintains backward compatibility with existing imports.
 * Internal logic is delegated to focused modules:
 * - entityPicker.js: Core Cesium picking logic
 * - postalCodeHandler.js: Postal code navigation and visibility
 * - buildingHandler.js: Building selection and processing
 *
 * @module featurepicker
 */
import { SPECIAL_ENTITIES } from '../../constants/specialEntities.js'
import { useGlobalStore } from '../../stores/globalStore.js'
import { usePropsStore } from '../../stores/propsStore.js'
import { useToggleStore } from '../../stores/toggleStore.js'
import logger from '../../utils/logger.js'
import Building from '../building.js'
import Camera from '../camera.js'
import CapitalRegion from '../capitalRegion.js'
import ColdArea from '../coldarea.js'
import Datasource from '../datasource.js'
import ElementsDisplay from '../elementsDisplay.js'
import { eventBus } from '../eventEmitter.js'
import Helsinki from '../helsinki.js'
import HSYBuilding from '../hsybuilding.js'
import Plot from '../plot.js'
import {
	loadPostalCodeWithParallelStrategy,
	setNameOfZone as setNameOfZoneHelper,
} from '../postalCodeLoader.js'
import Sensor from '../sensor.js'
import Traveltime from '../traveltime.js'
import {
	handleBuildingFeature as handleBuildingFeatureCore,
	initializePostalCodeNavigation,
	logMissingPostalCodeProperty,
	logSkippedNavigation,
	processBuildingAtPostalCodeLevel,
	shouldNavigateToPostalCode,
} from './buildingHandler.js'
// Import refactored modules
import {
	getBoundingBox as getBoundingBoxCore,
	pickEntity as pickEntityCore,
	processClick as processClickCore,
	removeEntityByName as removeEntityByNameCore,
} from './entityPicker.js'
import {
	getVisiblePostalCodes as getVisiblePostalCodesCore,
	warmNearbyPostalCodes,
} from './postalCodeHandler.js'
import {
	applyVisibilityChanges,
	calculateVisibilityChanges,
	dumpBuildingDatasourceState,
	hideBuildingsForPostalCode as hideBuildingsForPostalCodeCore,
	hideTreesForPostalCode as hideTreesForPostalCodeCore,
} from './visibilityManager.js'

/**
 * FeaturePicker Service Class
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
	 * @param {MouseEvent} event - Browser mouse click event
	 */
	processClick(event) {
		logger.debug('[FeaturePicker] Processing click at coordinates:', event.x, event.y)
		processClickCore(event, this._getContext(), (entity) =>
			this.handleFeatureWithProperties(entity)
		)
	}

	/**
	 * Picks and processes the entity at specified screen position
	 * @param {Cesium.Cartesian2} windowPosition - Screen coordinates
	 */
	pickEntity(windowPosition) {
		pickEntityCore(windowPosition, this._getContext(), (entity) =>
			this.handleFeatureWithProperties(entity)
		)
	}

	/**
	 * Loads data and visualizations for the currently selected postal code
	 * @returns {Promise<void>}
	 */
	async loadPostalCode() {
		logger.debug('[FeaturePicker] Loading postal code:', this.store.postalcode)
		logger.debug('[FeaturePicker] Helsinki view mode:', this.toggleStore.helsinkiView)

		this.setNameOfZone()
		this.elementsDisplayService.setSwitchViewElementsDisplay('inline-block')
		await this.datasourceService.removeDataSourcesAndEntities()

		if (!this.toggleStore.helsinkiView) {
			logger.debug('[FeaturePicker] Loading Capital Region elements (including buildings)...')
			await this.capitalRegionService.loadCapitalRegionElements()
		} else {
			logger.debug('[FeaturePicker] Loading Helsinki elements (including buildings)...')
			await this.helsinkiService.loadHelsinkiElements()
		}

		this.store.setLevel('postalCode')
		logger.debug('[FeaturePicker] Postal code loading complete')
	}

	/**
	 * Loads postal code data for a specific postal code (used for retry functionality and URL restoration)
	 * @param {string} postalCode - Postal code to load
	 * @param {Object} [options] - Loading options
	 * @param {boolean} [options.skipCameraAnimation=false] - Skip camera animation (for URL state restoration)
	 */
	async loadPostalCodeData(postalCode, options = {}) {
		logger.debug('[FeaturePicker] Loading postal code data:', postalCode, options)
		this.store.setPostalCode(postalCode)

		if (options.skipCameraAnimation) {
			// Load postal code without camera animation (URL restoration mode)
			await this.loadPostalCodeWithoutAnimation(postalCode)
		} else {
			await this.loadPostalCode()
		}
	}

	/**
	 * Loads postal code data without camera animation
	 * Used when restoring state from URL where camera is already positioned.
	 * @param {string} postalCode - Postal code to load
	 * @private
	 */
	async loadPostalCodeWithoutAnimation(postalCode) {
		logger.debug('[FeaturePicker] Loading postal code without animation:', postalCode)

		this.setNameOfZone()
		this.elementsDisplayService.setSwitchViewElementsDisplay('inline-block')
		await this.datasourceService.removeDataSourcesAndEntities()

		if (!this.toggleStore.helsinkiView) {
			logger.debug('[FeaturePicker] Loading Capital Region elements (including buildings)...')
			await this.capitalRegionService.loadCapitalRegionElements()
		} else {
			logger.debug('[FeaturePicker] Loading Helsinki elements (including buildings)...')
			await this.helsinkiService.loadHelsinkiElements()
		}

		this.store.setLevel('postalCode')
		logger.debug('[FeaturePicker] Postal code loading complete (no animation)')
	}

	/**
	 * Loads postal code with parallel camera animation and data loading
	 * @param {string} postalCode - Postal code to load
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

		await loadPostalCodeWithParallelStrategy(postalCode, services, stores, () =>
			this.setNameOfZone()
		)
	}

	/**
	 * Sets the name of the current zone from postal code data
	 * @private
	 */
	setNameOfZone() {
		setNameOfZoneHelper(this.store.postalcode, this.propStore.postalCodeData, (name) =>
			this.store.setNameOfZone(name)
		)
	}

	/**
	 * Handles building feature selection and visualization
	 * @param {Object} properties - Building properties
	 */
	async handleBuildingFeature(properties) {
		await handleBuildingFeatureCore(properties, {
			store: this.store,
			toggleStore: this.toggleStore,
			buildingService: this.buildingService,
			elementsDisplayService: this.elementsDisplayService,
		})
	}

	/**
	 * Removes entities from viewer by name
	 * @param {string} name - Name of entities to remove
	 */
	removeEntityByName(name) {
		removeEntityByNameCore(this.viewer, name)
	}

	/**
	 * Handles the feature with properties - main dispatch method
	 * @param {Object} id - The ID of the picked entity
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

		// Handle building selection at postal code level
		if (this.store.level === 'postalCode') {
			processBuildingAtPostalCodeLevel(id, {
				store: this.store,
				coldAreaService: this.coldAreaService,
				toggleStore: this.toggleStore,
				buildingService: this.buildingService,
				elementsDisplayService: this.elementsDisplayService,
			}).catch((error) => {
				logger.error('Failed to handle building feature:', error)
			})
		}

		// Handle postal code navigation
		if (id.properties.posno) {
			const newPostalCode = id.properties.posno._value
			const postalCodeName = id.properties.nimi?._value || `Postal Code ${newPostalCode}`

			logger.debug('[FeaturePicker] Postal code detected:', newPostalCode)
			logger.debug('[FeaturePicker] Current postal code:', this.store.postalcode)
			logger.debug('[FeaturePicker] Current level:', this.store.level)

			if (shouldNavigateToPostalCode(newPostalCode, this.store.postalcode, this.store.level)) {
				logger.debug('[FeaturePicker] Triggering postal code loading with parallel strategy...')
				initializePostalCodeNavigation(newPostalCode, postalCodeName, this.store)

				this.loadPostalCodeWithParallelStrategy(newPostalCode).catch((error) => {
					logger.error('Failed to load postal code with parallel strategy:', error)
				})
			} else {
				logSkippedNavigation()
			}
		} else {
			logMissingPostalCodeProperty()
		}

		// Handle population grid
		if (id.properties.asukkaita) {
			const boundingBox = this.getBoundingBox(id)
			this.store.setCurrentGridCell(id)

			if (boundingBox) {
				const bboxString = `${boundingBox.minLon},${boundingBox.minLat},${boundingBox.maxLon},${boundingBox.maxLat}`
				this.hSYBuildingService.loadHSYBuildings(bboxString).catch((error) => {
					logger.error('Failed to load HSY buildings:', error)
				})
			}
		}

		// Handle travel time grid
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
	 * Calculates bounding box for a polygon entity
	 * @param {Cesium.Entity} id - Entity with polygon property
	 * @returns {Object|null} Bounding box
	 */
	getBoundingBox(id) {
		return getBoundingBoxCore(id)
	}

	/**
	 * Gets all postal codes that intersect with the current viewport
	 * @param {Object} viewportRect - Viewport rectangle in degrees
	 * @returns {Array<string>} Visible postal codes
	 */
	getVisiblePostalCodes(viewportRect) {
		return getVisiblePostalCodesCore(viewportRect, this.propStore.postalCodeData)
	}

	/**
	 * Loads buildings for visible postal codes in viewport
	 * @param {Array<string>} visiblePostalCodes - Postal codes to load
	 */
	async loadBuildingsForVisiblePostalCodes(visiblePostalCodes) {
		if (this._isLoadingVisiblePostalCodes) {
			logger.debug('[FeaturePicker] Skipping load - already loading visible postal codes')
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

			// Calculate what needs to change
			const { visibilityChanges, postalCodesToLoad } = calculateVisibilityChanges(
				this.visiblePostalCodes,
				newVisibleSet,
				currentPostalCode,
				this.datasourceService
			)

			// Apply visibility changes in batch
			applyVisibilityChanges(visibilityChanges, this.viewer)

			if (postalCodesToLoad.length === 0) {
				logger.debug('[FeaturePicker] All visible postal codes already have buildings loaded')
				this.visiblePostalCodes = newVisibleSet
				this._dumpBuildingDatasourceState()
				return
			}

			logger.debug(
				'[FeaturePicker] Loading buildings for',
				postalCodesToLoad.length,
				'postal codes:',
				postalCodesToLoad
			)

			// Load buildings sequentially
			for (const postalCode of postalCodesToLoad) {
				try {
					logger.debug('[FeaturePicker] Loading buildings for postal code:', postalCode)

					if (this.toggleStore.helsinkiView) {
						await this.buildingService.loadBuildings(postalCode)
					} else {
						await this.hSYBuildingService.loadHSYBuildings(null, postalCode)
					}

					logger.debug('[FeaturePicker] Loaded buildings for postal code:', postalCode)
				} catch (error) {
					logger.error(
						'[FeaturePicker] Failed to load buildings for',
						postalCode,
						error?.message || error
					)
				}
			}

			this.visiblePostalCodes = newVisibleSet
			warmNearbyPostalCodes(currentPostalCode, visiblePostalCodes)
			this._dumpBuildingDatasourceState()
		} finally {
			this._isLoadingVisiblePostalCodes = false
		}
	}

	/**
	 * DIAGNOSTIC: Dumps current state of all building datasources
	 * @private
	 */
	_dumpBuildingDatasourceState() {
		dumpBuildingDatasourceState(this.viewer, this.visiblePostalCodes)
	}

	/**
	 * Hides buildings for a specific postal code
	 * @param {string} postalCode - Postal code to hide
	 */
	hideBuildingsForPostalCode(postalCode) {
		hideBuildingsForPostalCodeCore(postalCode, this.datasourceService)
	}

	/**
	 * Hides trees for a specific postal code
	 * @param {string} postalCode - Postal code to hide
	 */
	hideTreesForPostalCode(postalCode) {
		hideTreesForPostalCodeCore(postalCode, this.datasourceService)
	}

	/**
	 * Gets context object for module functions
	 * @private
	 */
	_getContext() {
		return {
			viewer: this.viewer,
			store: this.store,
		}
	}
}
