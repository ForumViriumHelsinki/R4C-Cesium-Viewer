import { useBuildingStore } from '../stores/buildingStore.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { usePropsStore } from '../stores/propsStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import { useURLStore } from '../stores/urlStore.js'
import { requestIdle } from '../utils/idle.js'
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
	 * @param {Object} [options={}] - Optional fetch options
	 * @param {AbortSignal} [options.signal] - AbortSignal to cancel the in-flight request.
	 *   When the signal fires, the fetch is aborted and null is returned silently
	 *   (same treatment as the stale-token path in BuildingLoader).
	 * @returns {Promise<Object|null>} Heat data GeoJSON or null if unavailable or aborted
	 */
	async getHeatData(postalCode, { signal } = {}) {
		// If the caller already aborted before we even start, return null immediately.
		if (signal?.aborted) {
			logger.debug('[UrbanHeat] Heat data fetch aborted before start for:', postalCode)
			return null
		}

		try {
			const layerId = `heat_${postalCode}`
			const heatConfig = {
				layerId,
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

			// If a signal is provided, abort the unifiedLoader layer when it fires.
			// unifiedLoader owns its own AbortController per layerId; calling cancelLoading()
			// aborts that controller immediately so the network request is freed.
			let abortListener = null
			if (signal) {
				abortListener = () => {
					unifiedLoader.cancelLoading(layerId)
				}
				signal.addEventListener('abort', abortListener, { once: true })
			}

			logger.debug('[UrbanHeat] 🌡️ Fetching heat data for postal code:', postalCode)
			try {
				const heatData = await unifiedLoader.loadLayer(heatConfig)
				logger.debug(
					'[UrbanHeat] ✅ Heat data loaded:',
					heatData?.features?.length || 0,
					'features'
				)
				return heatData
			} finally {
				// Always clean up the abort listener to avoid leaking it if the signal
				// outlives this fetch (e.g. the load completes before cancellation fires).
				if (signal && abortListener) {
					signal.removeEventListener('abort', abortListener)
				}
			}
		} catch (error) {
			// AbortError means the caller cancelled the load — treat as a silent no-op
			// (same as the stale-token path in BuildingLoader: return null, don't log as error).
			if (error?.name === 'AbortError' || signal?.aborted) {
				logger.debug('[UrbanHeat] Heat data fetch aborted for:', postalCode)
				return null
			}
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
			await mergeHeatFeaturesIntoBuildings(buildingData.features, heatData.features)
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
		const toggleStore = useToggleStore()
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
		propsStore.setHeatHistogramData(heatData?.[0] ?? [])
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
		if (!postcode) {
			logger.warn('[UrbanHeat] findUrbanHeatData called without a postal code; skipping')
			return null
		}
		buildingStore.setBuildingFeatures(data, postcode)

		try {
			const response = await fetch(this.urlStore.urbanHeatHelsinki(postcode))
			const urbanheat = await response.json()

			logger.debug('[UrbanHeat] 🔄 Processing building heat attributes...')
			await mergeHeatFeaturesIntoBuildings(data.features, urbanheat.features)
			logger.debug('[UrbanHeat] ✅ Building heat attributes processing complete')

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
 * Number of buildings processed between coarse idle yields during the merge.
 *
 * With the O(B+H) hash-join the per-building work is a single Map lookup plus a
 * handful of property copies, so the merge no longer needs the per-25-feature
 * `requestIdleCallback` ping-pong that previously dominated wall-clock time
 * (WO-1: 300k idle samples vs 145 working samples). We still yield coarsely so
 * a pathologically large dataset cannot monopolise the main thread for an
 * unbounded stretch; the `timeout` bounds each yield so it can never block on a
 * scarce idle gap between Cesium frames.
 *
 * @type {number}
 */
export const HEAT_MERGE_YIELD_INTERVAL = 500

/**
 * Copies the heat-exposure attributes from a matched heat feature onto the
 * building's properties and decodes the building's own coded fields.
 *
 * Behaviour is identical to the per-match block of the previous linear scan:
 * each field is copied only when present on the heat feature, and the building's
 * coded fields (`c_julkisivu`, `c_rakeaine`, …) are decoded only for matched
 * buildings.
 *
 * @param {Object} properties - Properties of the building to enrich (mutated in place).
 * @param {Object} heatProps - Properties of the matched heat feature.
 * @param {Decoding} decodingService - Shared decoding service instance.
 */
const applyHeatAttributes = (properties, heatProps, decodingService) => {
	if (heatProps.avgheatexposuretobuilding) {
		properties.avgheatexposuretobuilding = heatProps.avgheatexposuretobuilding
	}

	if (heatProps.distancetounder40) {
		properties.distanceToUnder40 = heatProps.distancetounder40
	}

	if (heatProps.distancetounder40) {
		properties.locationUnder40 = heatProps.locationunder40
	}

	if (heatProps.year_of_construction) {
		properties.year_of_construction = heatProps.year_of_construction
	}

	if (heatProps.measured_height) {
		properties.measured_height = heatProps.measured_height
	}

	if (heatProps.roof_type) {
		properties.roof_type = heatProps.roof_type
	}

	if (heatProps.area_m2) {
		properties.area_m2 = heatProps.area_m2
	}

	if (heatProps.roof_median_color) {
		properties.roof_median_color = decodingService.getColorValue(heatProps.roof_median_color)
	}

	if (heatProps.roof_mode_color) {
		properties.roof_mode_color = decodingService.getColorValue(heatProps.roof_mode_color)
	}

	properties.kayttotarkoitus = decodingService.decodeKayttotarkoitusHKI(heatProps.c_kayttark)
	properties.c_julkisivu = decodingService.decodeFacade(properties.c_julkisivu)
	properties.c_rakeaine = decodingService.decodeMaterial(properties.c_rakeaine)
	properties.c_lammtapa = decodingService.decodeHeatingMethod(properties.c_lammtapa)
	properties.c_poltaine = decodingService.decodeHeatingSource(properties.c_poltaine)
}

/**
 * Merges urban-heat-exposure features into building features via an O(B+H)
 * hash-join keyed on the Helsinki building id (`building.properties.id` ===
 * `heatFeature.properties.hki_id`).
 *
 * This replaces the previous O(buildings × heat-features) implementation: a
 * per-building linear scan over every heat feature, with a `requestIdleCallback`
 * yield after every 25 heat features. On the Helsinki / non-streaming bulk path
 * that cost 11.7 s (378 buildings) to 137 s (1,319 buildings) — see
 * `tmp/perf-investigation/WO-1-report.md`.
 *
 * Behaviour preserved exactly:
 * - Each heat feature is consumed by at most one building, matched in building
 *   order (the buckets are FIFO, so when multiple heat features share an id the
 *   first building takes the first feature — identical to the old splice order).
 * - Matched heat features are removed from the orphan pool; unmatched heat
 *   features (including those with a missing `hki_id`) are appended to
 *   `buildingFeatures` as orphan heat polygons, in their original order — the
 *   exact behaviour of the old `addMissingHeatData`.
 *
 * @param {Array<Object>} buildingFeatures - Building GeoJSON features (mutated in place).
 * @param {Array<Object>} heatFeatures - Urban heat exposure GeoJSON features.
 * @returns {Promise<void>}
 */
export const mergeHeatFeaturesIntoBuildings = async (buildingFeatures, heatFeatures) => {
	if (!Array.isArray(buildingFeatures) || !Array.isArray(heatFeatures)) {
		return
	}

	const decodingService = new Decoding()

	// Build the hash index once: hki_id -> FIFO bucket of heat features.
	// Buckets preserve input order so consuming with shift() reproduces the
	// "first remaining match" semantics of the old linear-scan + splice.
	const heatById = new Map()
	for (let i = 0; i < heatFeatures.length; i++) {
		const key = heatFeatures[i]?.properties?.hki_id
		if (key === undefined || key === null) continue
		const bucket = heatById.get(key)
		if (bucket) {
			bucket.push(heatFeatures[i])
		} else {
			heatById.set(key, [heatFeatures[i]])
		}
	}

	// Single pass over buildings: O(1) lookup + at most one attribute copy each.
	const matched = new Set()
	for (let b = 0; b < buildingFeatures.length; b++) {
		const properties = buildingFeatures[b]?.properties
		if (properties) {
			const bucket = heatById.get(properties.id)
			if (bucket && bucket.length > 0) {
				const feature = bucket.shift()
				matched.add(feature)
				applyHeatAttributes(properties, feature.properties, decodingService)
			}
		}

		// Coarse, timeout-bounded yield so very large datasets stay responsive.
		if (b > 0 && b % HEAT_MERGE_YIELD_INTERVAL === 0) {
			await new Promise((resolve) => requestIdle(resolve, { timeout: 50 }))
		}
	}

	// Append unmatched heat features as orphan polygons (preserves input order).
	for (let i = 0; i < heatFeatures.length; i++) {
		if (!matched.has(heatFeatures[i])) {
			buildingFeatures.push(heatFeatures[i])
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
