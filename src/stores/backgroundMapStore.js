/**
 * @module stores/backgroundMapStore
 * Controls WMS layers, landcover data, NDVI vegetation index imagery, and flood risk maps.
 * Maintains layer references for cleanup and temporal navigation.
 *
 * State includes:
 * - HSY (Helsinki Region Environmental Services) WMS layers
 * - Multi-year landcover imagery (2015-2024)
 * - NDVI TIFF layers for vegetation analysis
 * - Flood risk overlay layers
 *
 * @see {@link https://pinia.vuejs.org/|Pinia Documentation}
 */

import { defineStore } from "pinia";

/**
 * Background Map Pinia Store
 * Manages all background imagery and overlay layers for the 3D map viewer.
 *
 * @typedef {Object} BackgroundMapState
 * @property {number} hsyYear - Selected year for HSY landcover data (2015-2024)
 * @property {string} hsySelectArea - Selected HSY region ('Askisto' or other)
 * @property {Object|null} hSYWMSLayers - HSY WMS layer references
 * @property {string} ndviDate - Selected date for NDVI vegetation imagery (YYYY-MM-DD)
 * @property {Array<Object>} tiffLayers - Active NDVI TIFF imagery layers
 * @property {Array<Object>} landcoverLayers - Active HSY landcover WMS layers
 * @property {Array<Object>} floodLayers - Active flood risk WMS layers
 */
export const useBackgroundMapStore = defineStore("backgroundMap", {
  state: () => ({
    hsyYear: 2024,
    hsySelectArea: "Askisto",
    hSYWMSLayers: null,
    ndviDate: "2022-06-26",
    tiffLayers: [],
    landcoverLayers: [],
    floodLayers: [],
  }),
  actions: {
    /**
     * Sets flood risk WMS layer references
     * @param {Array<Object>} layers - Cesium imagery layer objects
     */
    setFloodLayers(layers) {
      this.floodLayers = layers;
    },
    /**
     * Sets HSY landcover WMS layer references
     * @param {Array<Object>} layers - Cesium imagery layer objects
     */
    setLandcoverLayers(layers) {
      this.landcoverLayers = layers;
    },
    /**
     * Sets NDVI TIFF imagery layer references
     * @param {Array<Object>} layers - Cesium imagery layer objects with TIFF providers
     */
    setTiffLayers(layers) {
      this.tiffLayers = layers;
    },
    /**
     * Sets the selected date for NDVI vegetation imagery
     * @param {string} date - Date string in YYYY-MM-DD format
     */
    setNdviDate(date) {
      this.ndviDate = date;
    },
    /**
     * Sets HSY WMS layer references
     * @param {Object} layers - HSY WMS layer configuration object
     */
    setHSYWMSLayers(layers) {
      this.hSYWMSLayers = layers;
    },
    /**
     * Sets the selected HSY region area
     * @param {string} area - Region name (e.g., 'Askisto')
     */
    setHSYSelectArea(area) {
      this.hsySelectArea = area;
    },
    /**
     * Sets the selected year for HSY landcover data
     * @param {number} year - Year (2015-2024)
     */
    setHSYYear(year) {
      this.hsyYear = year;
    },
  },
});
