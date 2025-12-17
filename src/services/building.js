import * as Cesium from 'cesium'
import { isSoteBuilding } from '../constants/buildingCodes.js'
import { DATES } from '../constants/dates.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { usePropsStore } from '../stores/propsStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import { useURLStore } from '../stores/urlStore.js'
import logger from '../utils/logger.js'
import Datasource from './datasource.js'
import { eventBus } from './eventEmitter.js'
import Tree from './tree.js'
import unifiedLoader from './unifiedLoader.js'
import Urbanheat from './urbanheat.js'
import { logVisibilityChange } from './visibilityLogger.js'

/**
 * Building Service
 * Manages building entity visualization, heat exposure data, and user interactions.
 * Handles building filtering, highlighting, color coding by heat exposure,
 * and integration with tree coverage and urban heat data.
 *
 * Key responsibilities:
 * - Building entity polygon styling based on heat exposure
 * - Building height extrusion from floor count or measured height
 * - Building filtering (by purpose, construction date, floor count)
 * - Building selection and highlighting with outline effects
 * - Heat exposure data visualization and histogram updates
 * - Integration with tree coverage effects
 *
 * @class Building
 */
export default class Building {
	/**
	 * Creates a Building service instance
	 * Initializes service dependencies for data sources, urban heat, tree coverage, and caching.
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
		// Track last filter state to prevent redundant re-application
		this.lastFilterState = null
	}

	/**
	 * Removes nearby tree coverage effects from building entities
	 * Resets building polygon colors to original heat exposure values.
	 * Processes entities in batches to prevent UI blocking on large datasets.
	 * Performance: O(n) where n is the number of entities, with UI-friendly batching
	 *
	 * @param {Array<Cesium.Entity>} entities - Building entities to process
	 * @returns {Promise<void>}
	 */
	async removeNearbyTreeEffect(entities) {
		const batchSize = 25 // Process 25 entities at a time

		for (let i = 0; i < entities.length; i += batchSize) {
			const batch = entities.slice(i, i + batchSize)

			// Process batch synchronously
			for (let j = 0; j < batch.length; j++) {
				this.setBuildingEntityPolygon(batch[j])
			}

			// Yield control to browser to prevent UI blocking
			if (i + batchSize < entities.length) {
				await new Promise((resolve) => requestIdleCallback(resolve))
			}
		}
	}

	/**
	 * Applies heat exposure visualization to building entities
	 * Updates building polygon colors based on heat exposure data.
	 * Uses batched processing for performance optimization.
	 * Performance: O(n) where n is the number of entities, with batching for UI responsiveness
	 *
	 * @param {Array<Cesium.Entity>} entities - Building entities to style
	 * @returns {Promise<void>}
	 */
	async setHeatExposureToBuildings(entities) {
		const batchSize = 25 // Process 25 entities at a time

		for (let i = 0; i < entities.length; i += batchSize) {
			const batch = entities.slice(i, i + batchSize)

			// Process batch synchronously
			for (let j = 0; j < batch.length; j++) {
				this.setBuildingEntityPolygon(batch[j])
			}

			// Yield control to browser to maintain responsiveness
			if (i + batchSize < entities.length) {
				await new Promise((resolve) => requestIdleCallback(resolve))
			}
		}
	}

	/**
	 * Creates and emits events for building-specific data visualizations
	 * Processes building heat timeseries data, tree coverage, and heat exposure values.
	 * Emits events to trigger chart updates in UI components.
	 *
	 * @param {number} treeArea - Nearby tree coverage area in square meters
	 * @param {number} avg_temp_c - Average surface temperature in Celsius (unused in current implementation)
	 * @param {Object} buildingProps - Building properties object containing heat and structural data
	 * @param {Object} buildingProps.heat_timeseries - Time series heat exposure data
	 * @param {Object} buildingProps._avgheatexposuretobuilding - Average heat exposure value
	 * @returns {Promise<void>}
	 * @fires eventBus#newBuildingHeat - Emitted when building heat exposure data is updated
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

	/**
	 * Set building entity polygon
	 *
	 * @param {Object} entity - Building entity
	 */
	setBuildingEntityPolygon(entity) {
		const { properties, polygon } = entity

		const targetDate = this.store.heatDataDate

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
					polygon.material = new Cesium.Color(0, 0, 0, 0) // Set color to 0 0 0 0 if no entry is found
				}
			}
		}

		if (this.toggleStore.helsinkiView) {
			this.hideNonSoteBuilding(entity)
			this.hideLowBuilding(entity)
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
	 * If hideNonSote switch is checked this function hides buildings based on value of c_kayttark
	 *
	 * @param {Object} entity - Cesium entity
	 */
	hideNonSoteBuilding(entity) {
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
	 * If hideLow switch is checked this function hides buildings based on their floor count
	 *
	 * @param {Object} entity - Cesium entity
	 */
	hideLowBuilding(entity) {
		if (
			this.toggleStore.hideLow &&
			(!Number(entity._properties.i_kerrlkm?._value) ||
				Number(entity._properties.i_kerrlkm?._value) < 7)
		) {
			logVisibilityChange('entity', entity.id || 'building', entity.show, false, 'hideLowBuilding')
			entity.show = false
		}
	}

	async setHelsinkiBuildingsHeight(entities) {
		const batchSize = 30 // Process 30 entities at a time (height calc is lighter)

		for (let i = 0; i < entities.length; i += batchSize) {
			const batch = entities.slice(i, i + batchSize)

			// Process batch synchronously
			for (let j = 0; j < batch.length; j++) {
				const entity = batch[j]

				if (entity.polygon) {
					const { measured_height, i_kerrlkm } = entity.properties

					entity.polygon.extrudedHeight = measured_height
						? measured_height._value
						: i_kerrlkm != null
							? i_kerrlkm._value * 3.2
							: 2.7
				}
			}

			// Yield control to prevent UI blocking
			if (i + batchSize < entities.length) {
				await new Promise((resolve) => requestIdleCallback(resolve))
			}
		}
	}

	/**
	 * Loads Helsinki buildings for a postal code with caching support.
	 * Uses unifiedLoader for IndexedDB caching with 1-hour TTL.
	 * Fetches building data from Helsinki WFS service and processes heat exposure data.
	 *
	 * @param {string} [postalCode] - Optional postal code to load buildings for. If not provided, uses current postal code from store.
	 * @returns {Promise<void>}
	 */
	async loadBuildings(postalCode) {
		const targetPostalCode = postalCode || this.store.postalcode
		const url = this.urlStore.helsinkiBuildingsUrl(targetPostalCode)

		logger.debug(
			'[HelsinkiBuilding] 🏢 Loading Helsinki buildings for postal code:',
			targetPostalCode
		)
		logger.debug('[HelsinkiBuilding] API URL:', url)

		try {
			const loadingConfig = {
				layerId: `helsinki_buildings_${targetPostalCode}`,
				url: url,
				type: 'geojson',
				processor: async (data, metadata) => {
					const fromCache = metadata?.fromCache
					logger.debug(
						fromCache ? '[HelsinkiBuilding] ✓ Using cached data' : '[HelsinkiBuilding] ✅ Received',
						data.features?.length || 0,
						'building features'
					)

					const entities = await this.urbanheatService.findUrbanHeatData(data, targetPostalCode)
					await this.setHeatExposureToBuildings(entities)
					await this.setHelsinkiBuildingsHeight(entities)

					logger.debug('[HelsinkiBuilding] ✅ Buildings processed and added to Cesium viewer')
					return entities
				},
				options: {
					cache: true,
					cacheTTL: 60 * 60 * 1000, // 1 hour (buildings data is relatively static)
					retries: 2,
					progressive: false,
					priority: 'high',
				},
			}

			await this.unifiedLoader.loadLayer(loadingConfig)
		} catch (error) {
			logger.error('[HelsinkiBuilding] ❌ Error loading buildings:', error)
		}

		if (this.toggleStore.showTrees) {
			void this.treeService.loadTrees(targetPostalCode)
		}
	}

	/**
	 * Finds building datasource and resets building entities polygon styling.
	 * Uses setBuildingEntityPolygon() to properly handle both Helsinki and Capital Region views,
	 * preventing wireframe appearance that occurred when Capital Region buildings
	 * (without _avgheatexposuretobuilding property) were set to transparent color.
	 */
	resetBuildingEntities() {
		// Find the data source for buildings
		const buildingDataSource = this.datasourceService.getDataSourceByName(
			`Buildings ${this.store.postalcode}`
		)

		// If the data source isn't found, exit the function
		if (!buildingDataSource) return

		logger.debug(
			'[Building] 🔄 Resetting building entities for postal code:',
			this.store.postalcode
		)

		const buildingEntities = buildingDataSource.entities.values
		for (let i = 0; i < buildingEntities.length; i++) {
			const entity = buildingEntities[i]

			// Reset outline styling
			entity.polygon.outlineColor = Cesium.Color.BLACK
			entity.polygon.outlineWidth = 3

			// Ensure fill is enabled to prevent wireframe appearance
			entity.polygon.fill = true

			// Use the proper method that handles both Helsinki and Capital Region views
			// This fixes the wireframe issue where Capital Region buildings were set to transparent
			this.setBuildingEntityPolygon(entity)
		}

		logger.debug('[Building] ✅ Reset', buildingEntities.length, 'building entities')
	}

	/**
	 * Filter buildings from the given data source based on UI toggle switches.
	 * Optimized to prevent redundant re-application and batch visibility changes.
	 *
	 * @param {Cesium.DataSource} buildingsDataSource - Data source containing building entities
	 */
	filterBuildings(buildingsDataSource) {
		// If the data source isn't found, exit the function
		if (!buildingsDataSource) return

		const hideNewBuildings = this.toggleStore.hideNewBuildings
		const hideNonSote = this.toggleStore.hideNonSote
		const hideLow = this.toggleStore.hideLow

		// Get current filter state
		const currentState = {
			hideNewBuildings,
			hideNonSote,
			hideLow,
		}

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
						? Number(entity._properties.c_kayttark._value)
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
	 * @fires eventBus#newHeatHistogram - Emitted when histogram data is recalculated
	 * @private
	 */
	updateHeatHistogramDataAfterFilter(entities) {
		// Add the condition to filter only entities with show === true
		const visibleEntities = entities.filter((entity) => entity.show)
		const targetDate = this.store.heatDataDate

		const avg_temp = this.toggleStore.helsinkiView
			? visibleEntities.map((entity) => entity.properties._avgheatexposuretobuilding._value)
			: visibleEntities
					.map((entity) => {
						const heatTimeseries = entity.properties.heat_timeseries?._value || []
						const foundEntry = heatTimeseries.find(({ date }) => date === targetDate)
						return foundEntry ? foundEntry.avg_temp_c : null
					})
					.filter((temp) => temp !== null)

		this.resetBuildingOutline()
		this.propsStore.setHeatHistogramData(avg_temp)
		eventBus.emit('newHeatHistogram')
	}

	/**
	 * Filters buildings to show only social/healthcare facilities
	 * Filters by building purpose codes for hospitals, schools, and public buildings.
	 *
	 * @param {Cesium.Entity} entity - Building entity to filter
	 * @private
	 */
	soteBuildings(entity) {
		const kayttotark = this.toggleStore.helsinkiView
			? entity._properties?._c_kayttark?._value
				? Number(entity._properties.c_kayttark._value)
				: null
			: entity._properties?._kayttarks?._value

		entity.show = this.toggleStore.helsinkiView
			? kayttotark && isSoteBuilding(kayttotark)
			: kayttotark === 'Yleinen rakennus'
	}

	/**
	 * Hides buildings with 6 or fewer floors
	 * Used to filter out low-rise buildings from visualization.
	 *
	 * @param {Cesium.Entity} entity - Building entity to filter
	 * @private
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
		// If the data source isn't found, exit the function
		if (!buildingsDataSource) return

		// Reset filter state tracking since we're showing all buildings
		this.lastFilterState = null

		// Batch visibility changes
		const entities = buildingsDataSource._entityCollection._entities._array
		let hasChanges = false

		// Iterate over all entities in data source
		for (let i = 0; i < entities.length; i++) {
			// Only update if needed to minimize render cycles
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

	highlightBuildingsInViewer(temps) {
		// Find the data source for buildings
		const buildingDataSource = this.datasourceService.getDataSourceByName(
			`Buildings ${this.store.postalcode}`
		)

		// If the data source isn't found, exit the function
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

	resetBuildingOutline() {
		// Find the data source for buildings
		const buildingDataSource = this.datasourceService.getDataSourceByName(
			`Buildings ${this.store.postalcode}`
		)

		// If the data source isn't found, exit the function
		if (!buildingDataSource) return

		const entities = buildingDataSource.entities.values

		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i]
			this.polygonOutlineToBlack(entity)
		}
	}

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

	highlightBuildingInViewer(id) {
		// Find the data source for buildings
		const buildingDataSource = this.datasourceService.getDataSourceByName(
			`Buildings ${this.store.postalcode}`
		)

		// If the data source isn't found, exit the function
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
	 * @fires eventBus#entityPrintEvent - Emitted when entity is selected for display
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
	 * Used to visually highlight selected buildings.
	 *
	 * @param {Cesium.Entity} entity - Building entity to highlight
	 * @private
	 */
	polygonOutlineToYellow(entity) {
		entity.polygon.outline = true
		entity.polygon.outlineColor = Cesium.Color.YELLOW
		entity.polygon.outlineWidth = 20
	}

	/**
	 * Resets building polygon outline to default black
	 * Removes visual highlighting from buildings.
	 *
	 * @param {Cesium.Entity} entity - Building entity to reset
	 * @private
	 */
	polygonOutlineToBlack(entity) {
		entity.polygon.outlineColor = Cesium.Color.BLACK
		entity.polygon.outlineWidth = 8
	}
}

/**
 * Filters heat timeseries data by construction year cutoff
 * Removes historical data predating the building's construction year.
 *
 * @param {Object} buildingProps - Building properties object
 * @param {Object} buildingProps._kavu - Construction year property
 * @param {Object} buildingProps._heat_timeseries - Heat timeseries array
 * @private
 */
const filterHeatTimeseries = (buildingProps) => {
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
