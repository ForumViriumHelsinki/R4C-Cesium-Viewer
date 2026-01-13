/**
 * @module stores/urlStore
 * Provides centralized URL generation for all pygeoapi collections, WMS services, and imagery.
 * All endpoints are accessed through development proxies to handle CORS and authentication.
 *
 * Data sources:
 * - **pygeoapi**: Finland's geospatial API portal for R4C climate data
 * - **HSY WMS**: Helsinki Region Environmental Services Web Map Service
 * - **Digitransit**: Public transport geocoding (via separate proxy)
 * - **NDVI TIFF**: Vegetation index imagery (Cloud Optimized GeoTIFF)
 * - **SYKE**: Finnish Environment Institute flood risk data
 * - **Helsinki Maps**: Helsinki City WFS/WMS services
 * - **R4C Sensors**: Real-time environmental sensor data
 *
 * Proxy configuration:
 * - `/pygeoapi` → Finland geo data portal
 * - `/wms/proxy` → HSY WMS services
 * - `/ndvi_public` → NDVI imagery storage
 *
 * @see {@link https://docs.pygeoapi.io/|Pygeoapi Documentation}
 * @see {@link https://pinia.vuejs.org/|Pinia Documentation}
 */

import { defineStore } from 'pinia'
import { encodeURLParam, validatePostalCode } from '@/utils/validators'

/**
 * URL Pinia Store
 * Manages all API endpoint URLs with getter functions for dynamic URL generation.
 * All getters return functions that accept parameters and return complete URLs.
 *
 * @typedef {Object} URLState
 * @property {string} imagesBase - Base path for NDVI TIFF imagery (/ndvi_public)
 * @property {string} helsinkiWMS - Helsinki WMS base URL
 * @property {string} pygeoapiBase - Pygeoapi collections base URL (/pygeoapi/collections)
 * @property {string} wmsProxy - WMS proxy endpoint (/wms/proxy)
 * @property {Object} externalApis - External API endpoints configuration
 * @property {Object} externalApis.syke - Finnish Environment Institute (SYKE) endpoints
 * @property {string} externalApis.syke.geoserverBase - Base URL for SYKE GeoServer
 * @property {Object} externalApis.syke.flood - SYKE flood map service paths
 * @property {Object} externalApis.maps - Map service endpoints
 * @property {Object} externalApis.sensors - Environmental sensor data endpoints
 */
export const useURLStore = defineStore('url', {
	state: () => ({
		imagesBase: '/ndvi_public',
		helsinkiWMS: '/helsinki-wms?SERVICE=WMS&',
		pygeoapiBase: '/pygeoapi/collections', // Base URL for pygeoapi collections (proxied through /pygeoapi)
		wmsProxy: '/wms/proxy',
		externalApis: {
			// Finnish Environment Institute (SYKE) - Flood risk and environmental data
			syke: {
				geoserverBase: 'https://paikkatiedot.ymparisto.fi/geoserver',
				flood: {
					// Stormwater flood maps (extreme rainfall scenarios)
					stormwater52mm: '/tulva/ows?SERVICE=WMS&',
					stormwater80mm: '/tulva/ows?SERVICE=WMS&',
					// Coastal flood maps (sea level rise scenarios)
					coastalBase: '/meritulvakartat_2022/ows?SERVICE=WMS&',
					// Combined scenario comparison (SSP pathways)
					coastalCombined: '/meritulvakartat_2022_yhdistelma/wms?SERVICE=WMS&',
				},
			},
			// Map service providers
			maps: {
				// Helsinki City WFS/WMS services
				helsinkiWfs: 'https://kartta.hel.fi/ws/geoserver/avoindata/wfs',
				helsinkiWms: 'https://kartta.hel.fi/ws/geoserver/avoindata/wms',
				// HSY (Helsinki Region Environmental Services) WMS
				hsyWms: 'https://kartta.hsy.fi/geoserver/wms',
			},
			// Environmental sensors
			sensors: {
				// R4C (Regions for Climate Action) real-time sensor network
				r4cLatest: 'https://bri3.fvh.io/opendata/r4c/r4c_last.geojson',
			},
		},
	}),
	getters: {
		/**
		 * Generates pygeoapi URL for cold area (cooling zone) data by postal code
		 * @param {Object} state - Pinia state
		 * @returns {(postinumero: string) => string} Function accepting postal code and returning cold area URL
		 * @example
		 * coldAreas(state)('00100') // Returns cold area URL for postal code 00100
		 */
		coldAreas: (state) => (postinumero) => {
			const validated = validatePostalCode(postinumero)
			return `${state.pygeoapiBase}/coldarea/items?f=json&limit=100000&posno=${encodeURLParam(validated)}`
		},
		/**
		 * Generates generic pygeoapi collection URL with optional limit
		 * @param {Object} state - Pinia state
		 * @returns {(collection: string, limit?: number) => string} Function accepting collection path and optional limit, returning collection URL
		 * @example
		 * collectionUrl(state)('/heatexposure', 5000) // Returns heatexposure collection URL
		 */
		collectionUrl:
			(state) =>
			(collection, limit = 35000) => {
				return `${state.pygeoapiBase}${collection}/items?f=json&limit=${limit}`
			},
		/**
		 * Generates URL for heat exposure index data (postal code level aggregates)
		 * @param {Object} state - Pinia state
		 * @returns {(limit?: number) => string} Function accepting optional limit and returning heat exposure URL
		 * @example
		 * heatExposure(state)(500) // Returns first 500 heat exposure records
		 */
		heatExposure:
			(state) =>
			(limit = 1000) => {
				return `${state.pygeoapiBase}/heatexposure_optimized/items?f=json&limit=${limit}` // New getter
			},
		/**
		 * Generates URL for Helsinki Region Transport (HSL) travel time matrix data
		 * @param {Object} state - Pinia state
		 * @returns {(from_id: number, limit?: number) => string} Function accepting grid cell ID and optional limit, returning travel time URL
		 * @example
		 * hkiTravelTime(state)(5975375, 2) // Returns travel times from grid cell 5975375
		 */
		hkiTravelTime:
			(state) =>
			(from_id, limit = 2) => {
				return `${state.pygeoapiBase}/hki_travel_time/items?f=json&limit=${limit}&from_id=${from_id}`
			},
		/**
		 * Generates URL for HSY (Capital Region) building data by postal code
		 * @param {Object} state - Pinia state
		 * @returns {(postinumero: string, limit?: number) => string} Function accepting postal code and optional limit, returning buildings URL
		 * @example
		 * hsyBuildings(state)('00100', 5000) // Returns buildings in postal code 00100
		 */
		hsyBuildings:
			(state) =>
			(postinumero, limit = 10000) => {
				const validated = validatePostalCode(postinumero)
				return `${state.pygeoapiBase}/hsy_buildings_optimized/items?f=json&limit=${limit}&postinumero=${encodeURLParam(validated)}`
			},
		/**
		 * Generates URL for HSY buildings filtered by bounding box (BBOX)
		 * @param {Object} state - Pinia state
		 * @returns {(bboxString: string, limit?: number) => string} Function accepting bounding box string and optional limit, returning buildings URL
		 * @example
		 * hsyGridBuildings(state)('24.9,60.1,25.0,60.2', 2000) // Buildings in bbox
		 */
		hsyGridBuildings:
			(state) =>
			(bboxString, limit = 2000) => {
				return `${state.pygeoapiBase}/hsy_buildings_optimized/items?f=json&limit=${limit}&bbox=${bboxString}`
			},
		/**
		 * Generates URL for fetching a single HSY building by its vtj_prt ID
		 * Used for lazy-loading building data when tooltip cache misses.
		 * @param {Object} state - Pinia state
		 * @returns {(buildingId: string) => string} Function accepting building ID and returning single building URL
		 * @example
		 * hsyBuildingById(state)('103142373A') // Single building by ID
		 */
		hsyBuildingById: (state) => (buildingId) => {
			return `${state.pygeoapiBase}/hsy_buildings_optimized/items?f=json&limit=1&vtj_prt=${encodeURLParam(buildingId)}`
		},
		/**
		 * Generates URL for landcover-to-parks adaptation scenario data
		 * @param {Object} state - Pinia state
		 * @returns {(gridId: number, limit?: number) => string} Function accepting grid cell ID and optional limit, returning adaptation URL
		 * @example
		 * landcoverToParks(state)(5975375, 2) // Park conversion potential for grid cell
		 */
		landcoverToParks:
			(state) =>
			(gridId, limit = 2) => {
				return `${state.pygeoapiBase}/adaptation_landcover/items?f=json&limit=${limit}&grid_id=${gridId}`
			},
		/**
		 * Generates URL for NDVI (Normalized Difference Vegetation Index) TIFF imagery
		 * @param {Object} state - Pinia state
		 * @returns {(ndviDate: string) => string} Function accepting date string and returning TIFF URL
		 * @example
		 * ndviTiffUrl(state)('2022-06-26') // Returns NDVI TIFF for June 26, 2022
		 */
		ndviTiffUrl: (state) => (ndviDate) => {
			return `${state.imagesBase}/ndvi_${ndviDate}.tiff`
		},
		/**
		 * Generates URL for other nature surfaces (rock, sand, bare soil) by postal code
		 * @param {Object} state - Pinia state
		 * @returns {(postinumero: string, limit?: number) => string} Function accepting postal code and optional limit, returning other nature URL
		 * @example
		 * otherNature(state)('00100', 10000) // Other nature in postal code 00100
		 */
		otherNature:
			(state) =>
			(postinumero, limit = 10000) => {
				const validated = validatePostalCode(postinumero)
				return `${state.pygeoapiBase}/othernature/items?f=json&limit=${limit}&postinumero=${encodeURLParam(validated)}`
			},
		/**
		 * Generates URL for tree canopy data by postal code and height category
		 * @param {Object} state - Pinia state
		 * @returns {(postinumero: string, koodi: string, limit?: number) => string} Function accepting postal code, height category code, and optional limit, returning tree URL
		 * @example
		 * tree(state)('00100', '510', 100000) // Trees 10-15m height in postal code 00100
		 */
		tree:
			(state) =>
			(postinumero, koodi, limit = 100000) => {
				const validated = validatePostalCode(postinumero)
				return `${state.pygeoapiBase}/tree/items?f=json&limit=${limit}&postinumero=${encodeURLParam(validated)}&koodi=${encodeURLParam(koodi)}`
			},
		/**
		 * Generates URL for tree-to-building distance analysis by postal code
		 * @param {Object} state - Pinia state
		 * @returns {(postinumero: string, limit?: number) => string} Function accepting postal code and optional limit, returning distance URL
		 * @example
		 * treeBuildingDistance(state)('00100', 100000) // Tree distances for postal code 00100
		 */
		treeBuildingDistance:
			(state) =>
			(postinumero, limit = 100000) => {
				const validated = validatePostalCode(postinumero)
				return `${state.pygeoapiBase}/tree_building_distance/items?f=json&limit=${limit}&postinumero=${encodeURLParam(validated)}`
			},
		/**
		 * Generates URL for urban heat exposure building data (Helsinki only)
		 * @param {Object} state - Pinia state
		 * @returns {(postinumero: string, limit?: number) => string} Function accepting postal code and optional limit, returning heat URL
		 * @example
		 * urbanHeatHelsinki(state)('00100', 2000) // Building heat data for postal code 00100
		 */
		urbanHeatHelsinki:
			(state) =>
			(postinumero, limit = 2000) => {
				const validated = validatePostalCode(postinumero)
				return `${state.pygeoapiBase}/urban_heat_building/items?f=json&limit=${limit}&postinumero=${encodeURLParam(validated)}`
			},
		/**
		 * Generates SYKE flood map URL for a specific scenario
		 * @param {Object} state - Pinia state
		 * @returns {(scenario: string) => string|null} Function accepting scenario name and returning WMS URL or null if unknown
		 * @example
		 * sykeFloodUrl(state)('HulevesitulvaVesisyvyysSade52mmMallinnettuAlue') // Returns stormwater 52mm flood URL
		 * sykeFloodUrl(state)('coastal_flood_SSP585_2050_0020_with_protected') // Returns coastal flood SSP585 2050 URL
		 */
		sykeFloodUrl: (state) => (scenario) => {
			const { geoserverBase, flood } = state.externalApis.syke

			// Stormwater flood scenarios
			if (scenario === 'HulevesitulvaVesisyvyysSade52mmMallinnettuAlue') {
				return `${geoserverBase}${flood.stormwater52mm}`
			}
			if (scenario === 'HulevesitulvaVesisyvyysSade80mmMallinnettuAlue') {
				return `${geoserverBase}${flood.stormwater80mm}`
			}

			// Combined coastal flood scenarios (all SSP pathways)
			if (scenario === 'SSP585_re_with_SSP245_with_SSP126_with_current') {
				return `${geoserverBase}${flood.coastalCombined}`
			}

			// Individual coastal flood scenarios
			if (scenario.startsWith('coastal_flood_')) {
				return `${geoserverBase}${flood.coastalBase}`
			}

			return null // Unknown scenario
		},
		/**
		 * Generates Helsinki WFS URL for building data by postal code
		 * @param {Object} state - Pinia state
		 * @returns {(postalCode: string) => string} Function accepting postal code and returning WFS GetFeature URL
		 * @example
		 * helsinkiBuildingsUrl(state)('00100') // Returns WFS URL for buildings in postal code 00100
		 */
		helsinkiBuildingsUrl: (state) => (postalCode) => {
			const validated = validatePostalCode(postalCode)
			const baseUrl = state.externalApis.maps.helsinkiWfs
			return `${baseUrl}?service=wfs&version=2.0.0&request=GetFeature&typeNames=avoindata%3ARakennukset_alue_rekisteritiedot&outputFormat=application/json&srsName=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A4326&CQL_FILTER=postinumero%3D%27${encodeURLParam(validated)}%27`
		},
		/**
		 * Generates R4C sensor data URL for latest measurements
		 * @param {Object} state - Pinia state
		 * @returns {string} GeoJSON URL for latest sensor readings
		 * @example
		 * r4cSensorUrl(state) // Returns latest R4C sensor data URL
		 */
		r4cSensorUrl: (state) => {
			return state.externalApis.sensors.r4cLatest
		},
	},
})
