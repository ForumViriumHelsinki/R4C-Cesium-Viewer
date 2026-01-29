import * as turf from '@turf/turf'
import { useBuildingStore } from '../stores/buildingStore.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { usePropsStore } from '../stores/propsStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import { useURLStore } from '../stores/urlStore.js'
import logger from '../utils/logger.js'
import Building from './building.js'
import { cesiumEntityManager } from './cesiumEntityManager.js'
import { getCesium } from './cesiumProvider.js'
import Datasource from './datasource.js'
import { eventBus } from './eventEmitter.js'
import unifiedLoader from './unifiedLoader.js'
import UrbanHeat from './urbanheat.js'

/**
 * HSY Building Service
 * Manages building data from Helsinki Region Environmental Services (HSY) WFS.
 * Handles Capital Region building loading, grid cell intersection calculations,
 * and attribute enrichment with spatial analysis using Turf.js.
 *
 * Data sources:
 * - HSY WFS building footprints (Capital Region)
 * - Spatial filtering by postal code or bounding box
 * - Grid cell overlap calculations for statistical aggregation
 *
 * Features:
 * - WFS-based building loading with bbox filtering
 * - Turf.js spatial analysis for grid/building intersections
 * - GeoJSON polygon generation from Cesium entities
 * - Grid cell attribute calculations (floor area, building count)
 * - Building attribute enrichment
 *
 * @class HSYBuilding
 * @see {@link https://hsy.fi/en/environmental-information/open-data/|HSY Open Data}
 */
export default class HSYBuilding {
	/**
	 * Creates an HSYBuilding service instance with caching support
	 */
	constructor() {
		this.store = useGlobalStore()
		this.viewer = this.store.cesiumViewer
		this.datasourceService = new Datasource()
		this.buildingService = new Building()
		this.urbanHeatService = new UrbanHeat()
		this.toggleStore = useToggleStore()
		this.urlStore = useURLStore()
		this.unifiedLoader = unifiedLoader
	}

	/**
	 * Loads HSY buildings for a postal code or bounding box with caching support.
	 * Uses unifiedLoader for IndexedDB caching with 1-hour TTL.
	 * Fetches building and heat data in parallel for improved performance.
	 *
	 * @param {string} [bbox] - Optional bounding box for grid-based queries. If not provided, uses postal code.
	 * @param {string} [postalCode] - Optional postal code to load buildings for. If not provided, uses current postal code from store.
	 * @returns {Promise<Array<Cesium.Entity>>} Building entities
	 */
	async loadHSYBuildings(bbox, postalCode) {
		try {
			const targetPostalCode = postalCode || this.store.postalcode
			const buildingUrl = bbox
				? this.urlStore.hsyGridBuildings(bbox)
				: this.urlStore.hsyBuildings(targetPostalCode)

			logger.debug('[HSYBuilding] 🏢 Loading HSY buildings for postal code:', targetPostalCode)
			logger.debug('[HSYBuilding] Building API URL:', buildingUrl)

			// Configure building data fetch
			const buildingConfig = {
				layerId: `hsy_buildings_${targetPostalCode}${bbox ? '_grid' : ''}`,
				url: buildingUrl,
				type: 'geojson',
				options: {
					cache: true,
					cacheTTL: 60 * 60 * 1000, // 1 hour (buildings data is relatively static)
					retries: 2,
					progressive: false,
					priority: 'high',
				},
			}

			// Parallel fetch: building data and heat data
			// Heat data is optional - buildings render even if heat API fails
			logger.debug('[HSYBuilding] 🔄 Initiating parallel fetch for buildings and heat data')
			const [buildingResult, heatResult] = await Promise.allSettled([
				this.unifiedLoader.loadLayer(buildingConfig),
				this.urbanHeatService.getHeatData(targetPostalCode),
			])

			// Handle building data (required)
			if (buildingResult.status === 'rejected') {
				logger.error('[HSYBuilding] ❌ Failed to load building data:', buildingResult.reason)
				throw buildingResult.reason
			}

			const buildingData = buildingResult.value

			// Handle heat data (optional)
			const heatData = heatResult.status === 'fulfilled' ? heatResult.value : null
			if (heatResult.status === 'rejected') {
				logger.warn(
					'[HSYBuilding] ⚠️ Heat data fetch failed:',
					heatResult.reason?.message || heatResult.reason
				)
			} else if (!heatData) {
				logger.warn('[HSYBuilding] ⚠️ Heat data unavailable for postal code:', targetPostalCode)
			} else {
				logger.debug(
					'[HSYBuilding] ✅ Heat data loaded:',
					heatData?.features?.length || 0,
					'features'
				)
			}

			// Merge heat data with buildings (if available)
			if (heatData) {
				await this.urbanHeatService.mergeHeatWithBuildings(buildingData, heatData, targetPostalCode)
			}

			// Process building data
			logger.debug(
				'[HSYBuilding] ✅ Received',
				buildingData.features?.length || 0,
				'building features'
			)

			// Only process grid attributes if we have a current grid cell
			if (this.store.currentGridCell) {
				await this.setGridAttributes(buildingData.features)
			}

			// Determine initial visibility:
			// - If loading for the currently selected postal code, show immediately (user clicked it)
			// - If loading for viewport-based preloading (different postal code), start hidden
			//   and let viewport culling logic control visibility
			const isSelectedPostalCode = targetPostalCode === this.store.postalcode
			const initialVisibility = isSelectedPostalCode

			logger.debug(
				`[HSYBuilding] 📍 Loading buildings for ${targetPostalCode}, selected=${this.store.postalcode}, initialVisibility=${initialVisibility}`
			)

			const entities = await this.datasourceService.addDataSourceWithPolygonFix(
				buildingData,
				`Buildings ${targetPostalCode}`,
				initialVisibility
			)

			// Handle empty results gracefully
			if (!entities || entities.length === 0) {
				logger.debug(`[HSYBuilding] ℹ️ No buildings found for postal code ${targetPostalCode}`)
				return []
			}

			logger.debug(
				'[HSYBuilding] 🔧 Calling setHSYBuildingAttributes with',
				entities.length,
				'entities',
				'for postal code:',
				targetPostalCode
			)
			await this.setHSYBuildingAttributes(buildingData, entities, targetPostalCode)

			logger.debug('[HSYBuilding] ✅ Buildings loaded and added to Cesium viewer')
			return entities
		} catch (error) {
			logger.error('[HSYBuilding] ❌ Error loading HSY buildings:', error)
			throw error
		}
	}

	createGeoJsonPolygon() {
		try {
			if (!this.store.currentGridCell?.polygon?.hierarchy) {
				logger.warn('No valid grid cell polygon found')
				return null
			}

			const Cesium = getCesium()
			const cesiumPolygon = this.store.currentGridCell.polygon.hierarchy.getValue(
				Cesium.JulianDate.now()
			)

			return {
				type: 'Feature',
				properties: {},
				geometry: {
					type: 'Polygon',
					coordinates: [
						cesiumPolygon.positions.map((cartesian) => {
							const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
							return [
								Cesium.Math.toDegrees(cartographic.longitude),
								Cesium.Math.toDegrees(cartographic.latitude),
							]
						}),
					],
				},
			}
		} catch (error) {
			logger.error('Error creating GeoJSON polygon:', error)
			return null
		}
	}

	setInitialAttributesForIntersectingBuilding(feature, weight, cellProps) {
		if (!cellProps?.asukkaita) return

		const asukkaita = cellProps.asukkaita
		feature.properties.pop_d_0_9 = weight * (cellProps.ika0_9 / asukkaita).toFixed(4)
		feature.properties.pop_d_10_19 = weight * (cellProps.ika10_19 / asukkaita).toFixed(4)
		feature.properties.pop_d_20_29 = weight * (cellProps.ika20_29 / asukkaita).toFixed(4)
		feature.properties.pop_d_30_39 = weight * (cellProps.ika30_39 / asukkaita).toFixed(4)
		feature.properties.pop_d_40_49 = weight * (cellProps.ika40_49 / asukkaita).toFixed(4)
		feature.properties.pop_d_50_59 = weight * (cellProps.ika50_59 / asukkaita).toFixed(4)
		feature.properties.pop_d_60_69 = weight * (cellProps.ika60_69 / asukkaita).toFixed(4)
		feature.properties.pop_d_70_79 = weight * (cellProps.ika70_79 / asukkaita).toFixed(4)
		feature.properties.pop_d_over80 = weight * (cellProps.ika_yli80 / asukkaita).toFixed(4)
	}

	approximateOtherAttributesForIntersectingBuilding(feature, weight, gridProps) {
		for (let i = 0; i < gridProps.length; i++) {
			const props = gridProps[i]
			if (!props?.asukkaita) continue

			const asukkaita = props.asukkaita
			feature.properties.pop_d_0_9 += weight * (props.ika0_9 / asukkaita).toFixed(4)
			feature.properties.pop_d_10_19 += weight * (props.ika10_19 / asukkaita).toFixed(4)
			feature.properties.pop_d_20_29 += weight * (props.ika20_29 / asukkaita).toFixed(4)
			feature.properties.pop_d_30_39 += weight * (props.ika30_39 / asukkaita).toFixed(4)
			feature.properties.pop_d_40_49 += weight * (props.ika40_49 / asukkaita).toFixed(4)
			feature.properties.pop_d_50_59 += weight * (props.ika50_59 / asukkaita).toFixed(4)
			feature.properties.pop_d_60_69 += weight * (props.ika60_69 / asukkaita).toFixed(4)
			feature.properties.pop_d_70_79 += weight * (props.ika70_79 / asukkaita).toFixed(4)
			feature.properties.pop_d_over80 += weight * (props.ika_yli80 / asukkaita).toFixed(4)
		}
	}

	approximateAttributesForIntersectingBuildings(feature) {
		try {
			const cellProps = this.store.currentGridCell.properties
			if (!feature.geometry) return

			const featureBBox = turf.bbox(feature)
			const bboxPolygon = turf.bboxPolygon(featureBBox)
			const gridProps = []

			const populationGridDataSource = this.datasourceService.getDataSourceByName('PopulationGrid')
			if (!populationGridDataSource) return

			const entities = populationGridDataSource.entities.values

			for (let i = 0; i < entities.length; i++) {
				const entity = entities[i]
				if (entity.properties._index._value !== cellProps._index._value) {
					const entityGeoJson = this.entityToGeoJson(entity)
					if (entityGeoJson && turf.booleanIntersects(bboxPolygon, entityGeoJson)) {
						gridProps.push(entityGeoJson.properties)
					}
				}
			}

			const weight = this.getWeight(gridProps.length)
			this.setInitialAttributesForIntersectingBuilding(feature, weight, cellProps)
			this.approximateOtherAttributesForIntersectingBuilding(feature, weight, gridProps)
		} catch (error) {
			logger.error('Error approximating attributes:', error)
		}
	}

	setGridAttributesForWithinBuilding(feature) {
		const cellProps = this.store.currentGridCell.properties
		if (!cellProps?.asukkaita) return

		const asukkaita = cellProps.asukkaita
		feature.properties.pop_d_0_9 = (cellProps.ika0_9 / asukkaita).toFixed(4)
		feature.properties.pop_d_10_19 = (cellProps.ika10_19 / asukkaita).toFixed(4)
		feature.properties.pop_d_20_29 = (cellProps.ika20_29 / asukkaita).toFixed(4)
		feature.properties.pop_d_30_39 = (cellProps.ika30_39 / asukkaita).toFixed(4)
		feature.properties.pop_d_40_49 = (cellProps.ika40_49 / asukkaita).toFixed(4)
		feature.properties.pop_d_50_59 = (cellProps.ika50_59 / asukkaita).toFixed(4)
		feature.properties.pop_d_60_69 = (cellProps.ika60_69 / asukkaita).toFixed(4)
		feature.properties.pop_d_70_79 = (cellProps.ika70_79 / asukkaita).toFixed(4)
		feature.properties.pop_d_over80 = (cellProps.ika_yli80 / asukkaita).toFixed(4)
	}

	async setGridAttributes(features) {
		const geoJsonPolygon = this.createGeoJsonPolygon()

		if (!geoJsonPolygon) {
			logger.warn('Skipping grid attributes - no valid polygon')
			return
		}

		logger.debug(
			'[HSYBuilding] 🔄 Processing grid attributes for',
			features.length,
			'features with progressive loading'
		)

		// Use progressive loading with the unified loader if available
		try {
			const { unifiedLoader } = await import('./unifiedLoader.js')

			const processor = async (batch) => {
				return this.processGridAttributeBatch(batch, geoJsonPolygon)
			}

			await unifiedLoader.loadLayer({
				layerId: 'grid-attributes',
				data: features,
				processor,
				options: {
					batchSize: 2, // Very small batches for heavy Turf.js operations
					priority: 'high',
					enableYielding: true,
					yieldInterval: 1, // Yield after every batch
				},
			})
		} catch (_error) {
			logger.warn('[HSYBuilding] Unified loader not available, falling back to legacy processing')
			await this.processGridAttributesLegacy(features, geoJsonPolygon)
		}

		logger.debug('[HSYBuilding] ✅ Grid attributes processing complete')
	}

	async processGridAttributeBatch(batch, geoJsonPolygon) {
		const results = []

		for (const feature of batch) {
			try {
				if (!feature.geometry) continue

				const featureGeoJson = {
					type: 'Feature',
					properties: feature.properties,
					geometry: feature.geometry,
				}

				const isWithin = turf.booleanWithin(featureGeoJson, geoJsonPolygon)

				if (isWithin) {
					this.setGridAttributesForWithinBuilding(feature)
				} else {
					this.approximateAttributesForIntersectingBuildings(feature)
				}

				results.push(feature)
			} catch (error) {
				logger.warn(`Error processing feature:`, error)
			}
		}

		return results
	}

	async processGridAttributesLegacy(features, geoJsonPolygon) {
		const batchSize = 2 // Very small batches for heavy operations

		for (let i = 0; i < features.length; i += batchSize) {
			const batch = features.slice(i, i + batchSize)

			// Process each feature individually with yielding
			for (const feature of batch) {
				try {
					if (!feature.geometry) continue

					const featureGeoJson = {
						type: 'Feature',
						properties: feature.properties,
						geometry: feature.geometry,
					}

					const isWithin = turf.booleanWithin(featureGeoJson, geoJsonPolygon)

					if (isWithin) {
						this.setGridAttributesForWithinBuilding(feature)
					} else {
						this.approximateAttributesForIntersectingBuildings(feature)
					}
				} catch (error) {
					logger.warn(`Error processing feature:`, error)
					continue
				}

				// Yield after each feature for responsive UI
				await new Promise((resolve) =>
					requestIdleCallback ? requestIdleCallback(resolve) : setTimeout(resolve, 0)
				)
			}

			// Show progress for large datasets
			if (features.length > 10) {
				const progress = Math.round(((i + batchSize) / features.length) * 100)
				logger.debug(
					`[HSYBuilding] ⏳ Progress: ${progress}% (${Math.min(i + batchSize, features.length)}/${features.length})`
				)
			}
		}
	}

	getWeight(length) {
		const weights = {
			0: 1,
			1: 1 / 2,
			2: 1 / 3,
			3: 1 / 4,
		}
		return weights[length] || 1
	}

	entityToGeoJson(entity) {
		try {
			if (!entity?.polygon?.hierarchy) return null

			const Cesium = getCesium()
			const positions = entity.polygon.hierarchy.getValue(Cesium.JulianDate.now()).positions
			const coordinates = positions.map((position) => {
				const cartographic = Cesium.Cartographic.fromCartesian(position)
				return [
					Cesium.Math.toDegrees(cartographic.longitude),
					Cesium.Math.toDegrees(cartographic.latitude),
				]
			})

			if (
				coordinates.length > 0 &&
				(coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
					coordinates[0][1] !== coordinates[coordinates.length - 1][1])
			) {
				coordinates.push(coordinates[0])
			}

			return {
				type: 'Feature',
				properties: entity.properties,
				geometry: {
					type: 'Polygon',
					coordinates: [coordinates],
				},
			}
		} catch (error) {
			logger.error('Error converting entity to GeoJSON:', error)
			return null
		}
	}

	setHSYBuildingsHeight(entities) {
		for (const entity of entities) {
			if (!entity.polygon) continue

			const floorCount = entity.properties?.kerrosten_lkm?._value
			entity.polygon.extrudedHeight =
				floorCount != null && floorCount < 999 ? floorCount * 3.2 : 2.7
		}
	}

	async calculateHSYUrbanHeatData(data, entities, postalCode) {
		logger.debug('[HSYBuilding] 🌡️ Calculating urban heat data for', entities.length, 'entities')

		const heatExposureData = this.urbanHeatService.calculateAverageExposure(data.features)
		const targetDate = this.store.heatDataDate

		const avgTempCList = entities
			.map((entity) => {
				// Get the actual array from ConstantProperty
				const heatTimeseries = entity.properties.heat_timeseries?.getValue() || []

				if (!Array.isArray(heatTimeseries)) return null

				// Find the entry that matches the target date
				const foundEntry = heatTimeseries.find(({ date }) => date === targetDate)
				return foundEntry ? foundEntry.avg_temp_c : null
			})
			.filter((temp) => temp !== null) // Keep only valid temperature values

		logger.debug('[HSYBuilding] 📊 Calling setBuildingPropsAndEmitEvent with data:', {
			entities: entities.length,
			heatExposureData: heatExposureData.length,
			avgTempCList: avgTempCList.length,
			dataFeatures: data.features?.length || 0,
			postalCode: postalCode,
		})

		setBuildingPropsAndEmitEvent(entities, heatExposureData, avgTempCList, data, postalCode)
	}

	async setHSYBuildingAttributes(data, entities, postalCode) {
		logger.debug('[HSYBuilding] 🏗️ setHSYBuildingAttributes called with:', {
			dataFeatures: data.features?.length || 0,
			entities: entities.length,
			postalCode: postalCode,
			storePostalCode: this.store.postalcode,
		})

		await this.buildingService.setHeatExposureToBuildings(entities)
		this.setHSYBuildingsHeight(entities)

		// Always set buildingFeatures for hover tooltip functionality
		// This was previously only set inside calculateHSYUrbanHeatData which required postal code
		const buildingStore = useBuildingStore()
		logger.debug('[HSYBuilding] 🎯 Setting buildingFeatures in store (always, for hover support)')
		buildingStore.setBuildingFeatures(data, postalCode)

		if (this.store.postalcode) {
			logger.debug('[HSYBuilding] ✓ Postal code exists, calling calculateHSYUrbanHeatData')
			void this.calculateHSYUrbanHeatData(data, entities, postalCode)
		} else {
			logger.debug(
				'[HSYBuilding] ⚠️ No postal code, skipping calculateHSYUrbanHeatData (but buildingFeatures is set)'
			)
		}
	}

	hideNonSoteBuilding(entity) {
		if (!this.toggleStore.hideNonSote) return

		const kayttotark = entity._properties?.kayttarks?._value
		if (!kayttotark || kayttotark !== 'Yleinen rakennus') {
			entity.show = false
		}
	}

	hideLowBuilding(entity) {
		if (!this.toggleStore.hideLow) return

		const floorCount = Number(entity._properties?.kerrosten_lkm?._value)
		if (!floorCount || floorCount < 7) {
			entity.show = false
		}
	}
}

/**
 * Sets building properties in stores and emits Capital Region visibility event
 * Updates scatter plot entities, heat timeseries, histogram data, and building features.
 *
 * @param {Array<Cesium.Entity>} entities - Building entities for scatter plot
 * @param {Array} heatExposureData - Heat exposure timeseries data array
 * @param {Array<number>} avg_temp_cList - Average temperature values for histogram
 * @param {Object} data - Raw building feature data
 * @param {string} postalCode - Postal code for the building features (for LRU cache tracking)
 * @fires eventBus#showCapitalRegion - Emitted when Capital Region data is loaded
 * @private
 */
const setBuildingPropsAndEmitEvent = (
	entities,
	heatExposureData,
	avg_temp_cList,
	data,
	postalCode
) => {
	logger.debug('[HSYBuilding] 💾 setBuildingPropsAndEmitEvent called with:', {
		entities: entities.length,
		heatExposureDataLength: heatExposureData.length,
		avgTempCListLength: avg_temp_cList.length,
		dataType: data?.type,
		dataFeaturesLength: data?.features?.length || 0,
		postalCode: postalCode,
	})

	const propsStore = usePropsStore()
	// Register entities with cesiumEntityManager for non-reactive entity management
	cesiumEntityManager.registerBuildingEntities(entities)
	propsStore.setPostalcodeHeatTimeseries(heatExposureData[1])
	propsStore.setHeatHistogramData(avg_temp_cList)

	const buildingStore = useBuildingStore()
	logger.debug('[HSYBuilding] 🎯 Setting buildingFeatures in store. Data structure:', {
		type: data?.type,
		featuresCount: data?.features?.length,
		firstFeatureId: data?.features?.[0]?.id,
		firstFeatureProps: Object.keys(data?.features?.[0]?.properties || {}),
		postalCode: postalCode,
	})

	buildingStore.setBuildingFeatures(data, postalCode)

	logger.debug('[HSYBuilding] ✅ buildingFeatures set in store. Verifying:', {
		storeHasFeatures: Boolean(buildingStore.buildingFeatures),
		storeFeaturesCount: buildingStore.buildingFeatures?.features?.length,
	})

	eventBus.emit('showCapitalRegion')
}
