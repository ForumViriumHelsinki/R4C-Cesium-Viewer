import { useBuildingStore } from '../stores/buildingStore.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { usePropsStore } from '../stores/propsStore.js'
import { useURLStore } from '../stores/urlStore.js'
import logger from '../utils/logger.js'
import { cesiumEntityManager } from './cesiumEntityManager.js'
import Datasource from './datasource.js'
import Decoding from './decoding.js'
import unifiedLoader from './unifiedLoader.js'

/**
 * Urban Heat Service
 * Manages urban heat island effect data integration and building heat exposure calculations.
 * Merges building geometry from city WFS with heat exposure data from pygeoapi.
 * Calculates aggregate heat statistics and prepares data for visualization.
 *
 * Data Integration:
 * - Building geometry: Helsinki WFS (kartta.hel.fi)
 * - Heat exposure: Pygeoapi R4C dataset
 * - Matching: By building ID (kiitun/feature ID)
 * - Time series: Historical heat exposure measurements
 *
 * Calculations:
 * - Average heat exposure per postal code
 * - Heat histogram data for distribution visualization
 * - Scatter plot preparation for building analysis
 * - Heat timeseries filtering by building construction date
 *
 * Features:
 * - Batched attribute matching for performance
 * - Missing data handling (orphan heat polygons)
 * - Date-specific heat exposure extraction
 * - Helsinki vs Capital Region mode support
 *
 * @class Urbanheat
 */
export default class Urbanheat {
	/**
	 * Creates an Urbanheat service instance
	 */
	constructor() {
		this.store = useGlobalStore()
		this.viewer = this.store.cesiumViewer
		this.datasourceService = new Datasource()
		this.urlStore = useURLStore()
	}

	/**
	 * Fetches heat exposure data independently from building data.
	 * Uses unifiedLoader for IndexedDB caching with 1-hour TTL.
	 * This method can be called in parallel with building data fetching.
	 *
	 * @param {string} postalCode - Postal code to fetch heat data for
	 * @returns {Promise<Object|null>} Heat data GeoJSON or null if unavailable
	 */
	async getHeatData(postalCode) {
		try {
			const heatConfig = {
				layerId: `heat_${postalCode}`,
				url: this.urlStore.urbanHeatHelsinki(postalCode),
				type: 'geojson',
				options: {
					cache: true,
					cacheTTL: 60 * 60 * 1000, // 1 hour
					retries: 2,
					progressive: false,
					priority: 'high',
				},
			}

			logger.debug('[UrbanHeat] 🌡️ Fetching heat data for postal code:', postalCode)
			const heatData = await unifiedLoader.loadLayer(heatConfig)
			logger.debug('[UrbanHeat] ✅ Heat data loaded:', heatData?.features?.length || 0, 'features')
			return heatData
		} catch (error) {
			logger.warn('[UrbanHeat] ⚠️ Failed to fetch heat data for', postalCode, ':', error.message)
			return null
		}
	}

	/**
	 * Merges heat exposure data with building data.
	 * This is a separate method to allow independent fetching and merging.
	 * Updates buildingStore with building features.
	 *
	 * @param {Object} buildingData - Building GeoJSON data
	 * @param {Object|null} heatData - Heat GeoJSON data (optional, may be null if unavailable)
	 * @param {string} postalCode - Postal code for the data
	 * @returns {Promise<void>}
	 */
	async mergeHeatWithBuildings(buildingData, heatData, postalCode) {
		const buildingStore = useBuildingStore()
		buildingStore.setBuildingFeatures(buildingData, postalCode)

		if (heatData?.features) {
			logger.debug('[UrbanHeat] 🔄 Merging heat data with buildings...')
			for (let i = 0; i < buildingData.features.length; i++) {
				const feature = buildingData.features[i]
				await setAttributesFromApiToBuilding(feature.properties, heatData.features)
			}
			addMissingHeatData(buildingData.features, heatData.features)
			logger.debug('[UrbanHeat] ✅ Heat data merged with buildings')
		} else {
			logger.warn('[UrbanHeat] ⚠️ No heat data available for merging')
		}
	}

	/**
	 * Calculate average Urban Heat exposure to buildings in postal code area
	 *
	 * @param {Object} features - Buildings in postal code area
	 */
	calculateAverageExposure(features) {
		let count = 0
		let total = 0
		const urbanHeatData = []
		const heatTimeseries = []
		const toggleStore = useGlobalStore()
		const inHelsinki = toggleStore.helsinkiView
		const targetDate = this.store.heatDataDate

		for (let i = 0; i < features.length; i++) {
			if (!inHelsinki) {
				if (features[i].properties.heat_timeseries) {
					const properties = features[i].properties
					const heatTimeseriesValue = properties.heat_timeseries || null
					const heatExposureValue = inHelsinki
						? properties.avgheatexposuretobuilding
						: heatTimeseriesValue?.find(({ date }) => date === targetDate)?.avgheatexposure

					if (heatExposureValue) {
						total += heatExposureValue
						count++
						urbanHeatData.push(heatExposureValue)
					}

					if (heatTimeseriesValue) {
						filterHeatTimeseries(properties)
						heatTimeseries.push(heatTimeseriesValue)
					}
				}
			}
		}

		if (count !== 0) {
			this.store.setAverageHeatExposure(total / count)

			return [urbanHeatData, heatTimeseries]
		}
	}

	setPropertiesAndCreateCharts(entities, features) {
		const propsStore = usePropsStore()
		const heatData = this.calculateAverageExposure(features)
		propsStore.setHeatHistogramData(heatData[0])
		// Register entities with cesiumEntityManager for non-reactive entity management
		cesiumEntityManager.registerBuildingEntities(entities)
	}

	/**
	 * Fetches heat exposure data from pygeoapi for postal code.
	 *
	 * @param {Object} data - Data of buildings from city WFS
	 * @param {string} [postalCode] - Optional postal code to use for data fetching. If not provided, uses current postal code from store.
	 */
	async findUrbanHeatData(data, postalCode) {
		const buildingStore = useBuildingStore()
		const postcode = postalCode || this.store.postalcode
		buildingStore.setBuildingFeatures(data, postcode)

		try {
			const response = await fetch(this.urlStore.urbanHeatHelsinki(postcode))
			const urbanheat = await response.json()

			logger.debug('[UrbanHeat] 🔄 Processing building heat attributes...')
			for (let i = 0; i < data.features.length; i++) {
				const feature = data.features[i]
				await setAttributesFromApiToBuilding(feature.properties, urbanheat.features)
			}
			logger.debug('[UrbanHeat] ✅ Building heat attributes processing complete')

			addMissingHeatData(data.features, urbanheat.features)
			const entities = await this.datasourceService.addDataSourceWithPolygonFix(
				data,
				`Buildings ${postcode}`
			)
			this.setPropertiesAndCreateCharts(entities, data.features)

			return entities
		} catch (error) {
			logger.error('Error finding urban heat data:', error)
			return null // Handle error case or return accordingly
		}
	}
}

/**
 * Adds urban heat exposure data that did not match in previous phase.
 *
 * @param {Object} features - The buildings from city WFS
 * @param {Object} heat - Urban heat exposure data from pygeoapi
 */

const addMissingHeatData = (features, heat) => {
	for (let i = 0; i < heat.length; i++) {
		features.push(heat[i])
	}
}

/**
 * Sets attributes from API data source to building data source
 *
 * Finds the purpose of a building in Helsinki based on code included in wfs source data
 * Code list: https://kartta.hel.fi/avoindata/dokumentit/Rakennusrekisteri_avoindata_metatiedot_20160601.pdf
 *
 * @param {Object} properties - Properties of a building
 * @param {Object} features - Urban Heat Exposure buildings dataset
 */
const setAttributesFromApiToBuilding = async (properties, features) => {
	const decodingService = new Decoding()
	const batchSize = 25 // Smaller batches for better responsiveness

	for (let i = 0; i < features.length; i += batchSize) {
		const batch = features.slice(i, i + batchSize)

		// Process batch with yielding for better UI responsiveness
		for (let j = 0; j < batch.length; j++) {
			const feature = batch[j]
			const actualIndex = i + j // Track actual index for splicing

			// match building based on Helsinki id
			if (properties.id === feature.properties.hki_id) {
				if (feature.properties.avgheatexposuretobuilding) {
					properties.avgheatexposuretobuilding = feature.properties.avgheatexposuretobuilding
				}

				if (feature.properties.distancetounder40) {
					properties.distanceToUnder40 = feature.properties.distancetounder40
				}

				if (feature.properties.distancetounder40) {
					properties.locationUnder40 = feature.properties.locationunder40
				}

				if (feature.properties.year_of_construction) {
					properties.year_of_construction = feature.properties.year_of_construction
				}

				if (feature.properties.measured_height) {
					properties.measured_height = feature.properties.measured_height
				}

				if (feature.properties.roof_type) {
					properties.roof_type = feature.properties.roof_type
				}

				if (feature.properties.area_m2) {
					properties.area_m2 = feature.properties.area_m2
				}

				if (feature.properties.roof_median_color) {
					properties.roof_median_color = decodingService.getColorValue(
						feature.properties.roof_median_color
					)
				}

				if (feature.properties.roof_mode_color) {
					properties.roof_mode_color = decodingService.getColorValue(
						feature.properties.roof_mode_color
					)
				}

				properties.kayttotarkoitus = decodingService.decodeKayttotarkoitusHKI(
					feature.properties.c_kayttark
				)
				properties.c_julkisivu = decodingService.decodeFacade(properties.c_julkisivu)
				properties.c_rakeaine = decodingService.decodeMaterial(properties.c_rakeaine)
				properties.c_lammtapa = decodingService.decodeHeatingMethod(properties.c_lammtapa)
				properties.c_poltaine = decodingService.decodeHeatingSource(properties.c_poltaine)

				// Remove matched feature (note: this modifies the original array)
				features.splice(actualIndex, 1)
				return // Found match, exit function
			}
		}

		// Yield control to prevent UI blocking after each batch
		if (i + batchSize < features.length) {
			await new Promise((resolve) =>
				requestIdleCallback ? requestIdleCallback(resolve) : setTimeout(resolve, 0)
			)
		}
	}
}

const filterHeatTimeseries = (buildingProps) => {
	if (buildingProps.kavu && typeof buildingProps.kavu === 'number' && buildingProps.kavu > 2015) {
		const cutoffYear = buildingProps.kavu
		buildingProps.heat_timeseries = buildingProps.heat_timeseries.filter((entry) => {
			const entryYear = new Date(entry.date).getFullYear()
			return entryYear >= cutoffYear
		})
	}
}
