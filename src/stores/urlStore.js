/**
 * @file urlStore.js
 * @module stores/urlStore
 * @description URL Store - Pinia store for managing API endpoint URLs and data source paths.
 * Provides centralized URL generation for all pygeoapi collections, WMS services, and imagery.
 * All endpoints are accessed through development proxies to handle CORS and authentication.
 *
 * Data sources:
 * - **pygeoapi**: Finland's geospatial API portal for R4C climate data
 * - **HSY WMS**: Helsinki Region Environmental Services Web Map Service
 * - **Digitransit**: Public transport geocoding (via separate proxy)
 * - **NDVI TIFF**: Vegetation index imagery (Cloud Optimized GeoTIFF)
 *
 * Proxy configuration:
 * - `/pygeoapi` → Finland geo data portal
 * - `/wms/proxy` → HSY WMS services
 * - `/ndvi_public` → NDVI imagery storage
 *
 * @see {@link https://docs.pygeoapi.io/|Pygeoapi Documentation}
 * @see {@link https://pinia.vuejs.org/|Pinia Documentation}
 */

import { defineStore } from 'pinia';

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
 */
export const useURLStore = defineStore('url', {
  state: () => ({
    imagesBase: '/ndvi_public',
    helsinkiWMS: 'https://kartta.hel.fi/ws/geoserver/avoindata/ows?SERVICE=WMS&',
    pygeoapiBase: '/pygeoapi/collections', // Base URL for pygeoapi collections (proxied through /pygeoapi)
    wmsProxy: '/wms/proxy'
  }),
  getters: {
    /**
     * Generates pygeoapi URL for cold area (cooling zone) data by postal code
     * @param {Object} state - Pinia state
     * @returns {Function} Function accepting (postinumero) and returning cold area URL
     * @example
     * coldAreas(state)('00100') // Returns cold area URL for postal code 00100
     */
    coldAreas: (state) => (postinumero) => {
        return `${state.pygeoapiBase}/coldarea/items?f=json&limit=100000&posno=${postinumero}`;
    },
    /**
     * Generates generic pygeoapi collection URL with optional limit
     * @param {Object} state - Pinia state
     * @returns {Function} Function accepting (collection, limit) and returning collection URL
     * @example
     * collectionUrl(state)('/heatexposure', 5000) // Returns heatexposure collection URL
     */
    collectionUrl: (state) => (collection, limit = 35000) => {
      return `${state.pygeoapiBase}${collection}/items?f=json&limit=${limit}`;
    },
    /**
     * Generates URL for heat exposure index data (postal code level aggregates)
     * @param {Object} state - Pinia state
     * @returns {Function} Function accepting (limit) and returning heat exposure URL
     * @example
     * heatExposure(state)(500) // Returns first 500 heat exposure records
     */
    heatExposure: (state) => ( limit = 1000 ) => {
      return `${state.pygeoapiBase}/heatexposure_optimized/items?f=json&limit=${limit}`; // New getter
    },
    /**
     * Generates URL for Helsinki Region Transport (HSL) travel time matrix data
     * @param {Object} state - Pinia state
     * @returns {Function} Function accepting (from_id, limit) and returning travel time URL
     * @example
     * hkiTravelTime(state)(5975375, 2) // Returns travel times from grid cell 5975375
     */
    hkiTravelTime: (state) => ( from_id, limit = 2) => {
      return `${state.pygeoapiBase}/hki_travel_time/items?f=json&limit=${limit}&from_id=${from_id}`;
    },
    /**
     * Generates URL for HSY (Capital Region) building data by postal code
     * @param {Object} state - Pinia state
     * @returns {Function} Function accepting (postinumero, limit) and returning buildings URL
     * @example
     * hsyBuildings(state)('00100', 5000) // Returns buildings in postal code 00100
     */
    hsyBuildings: (state) => (postinumero, limit = 10000) => {
      return `${state.pygeoapiBase}/hsy_buildings_optimized/items?f=json&limit=${limit}&postinumero=${postinumero}`;
    },
    /**
     * Generates URL for HSY buildings filtered by bounding box (BBOX)
     * @param {Object} state - Pinia state
     * @returns {Function} Function accepting (bboxString, limit) and returning buildings URL
     * @example
     * hsyGridBuildings(state)('24.9,60.1,25.0,60.2', 2000) // Buildings in bbox
     */
    hsyGridBuildings: (state) => (bboxString, limit = 2000) => {
      return `${state.pygeoapiBase}/hsy_buildings_optimized/items?f=json&limit=${limit}&bbox=${bboxString}`;
    },
    /**
     * Generates URL for landcover-to-parks adaptation scenario data
     * @param {Object} state - Pinia state
     * @returns {Function} Function accepting (gridId, limit) and returning adaptation URL
     * @example
     * landcoverToParks(state)(5975375, 2) // Park conversion potential for grid cell
     */
    landcoverToParks: (state) => (gridId, limit = 2) => {
      return `${state.pygeoapiBase}/adaptation_landcover/items?f=json&limit=${limit}&grid_id=${gridId}`;
    },
    /**
     * Generates URL for NDVI (Normalized Difference Vegetation Index) TIFF imagery
     * @param {Object} state - Pinia state
     * @returns {Function} Function accepting (ndviDate) and returning TIFF URL
     * @example
     * ndviTiffUrl(state)('2022-06-26') // Returns NDVI TIFF for June 26, 2022
     */
    ndviTiffUrl: (state) => (ndviDate) => {
      return `${state.imagesBase}/ndvi_${ndviDate}.tiff`;
    },
    /**
     * Generates URL for other nature surfaces (rock, sand, bare soil) by postal code
     * @param {Object} state - Pinia state
     * @returns {Function} Function accepting (postinumero, limit) and returning other nature URL
     * @example
     * otherNature(state)('00100', 10000) // Other nature in postal code 00100
     */
    otherNature: (state) => (postinumero, limit = 10000) => {
      return `${state.pygeoapiBase}/othernature/items?f=json&limit=${limit}&postinumero=${postinumero}`;
    },
    /**
     * Generates URL for tree canopy data by postal code and height category
     * @param {Object} state - Pinia state
     * @returns {Function} Function accepting (postinumero, koodi, limit) and returning tree URL
     * @example
     * tree(state)('00100', '510', 100000) // Trees 10-15m height in postal code 00100
     */
    tree: (state) => (postinumero, koodi, limit = 100000) => {
      return `${state.pygeoapiBase}/tree/items?f=json&limit=${limit}&postinumero=${postinumero}&koodi=${koodi}`;
    },
    /**
     * Generates URL for tree-to-building distance analysis by postal code
     * @param {Object} state - Pinia state
     * @returns {Function} Function accepting (postinumero, limit) and returning distance URL
     * @example
     * treeBuildingDistance(state)('00100', 100000) // Tree distances for postal code 00100
     */
    treeBuildingDistance: (state) => (postinumero, limit = 100000) => {
      return `${state.pygeoapiBase}/tree_building_distance/items?f=json&limit=${limit}&postinumero=${postinumero}`;
    },
    /**
     * Generates URL for urban heat exposure building data (Helsinki only)
     * @param {Object} state - Pinia state
     * @returns {Function} Function accepting (postinumero, limit) and returning heat URL
     * @example
     * urbanHeatHelsinki(state)('00100', 2000) // Building heat data for postal code 00100
     */
    urbanHeatHelsinki: (state) => (postinumero, limit = 2000) => {
      return `${state.pygeoapiBase}/urban_heat_building/items?f=json&limit=${limit}&postinumero=${postinumero}`;
    }
  }
});
