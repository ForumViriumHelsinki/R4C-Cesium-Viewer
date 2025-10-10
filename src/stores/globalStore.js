/**
 * @module stores/globalStore
 * Manages navigation hierarchy, view modes, current selections, and Cesium viewer reference.
 * Acts as the central state hub for the entire R4C climate adaptation application.
 *
 * Navigation hierarchy:
 * - **Capital Region View** → Postal Code View → Building View
 * - Three-level drill-down: Region (view='capitalRegion') → Postal Code (view='postalcode') → Building (view='building')
 *
 * Key responsibilities:
 * - Current view mode and navigation level tracking
 * - Selected postal code and zone name storage
 * - Cesium viewer instance reference
 * - Heat exposure normalization constants (min/max Kelvin by date)
 * - Temporal heat data date selection
 * - Current grid cell and picked entity references
 * - UI state (loading indicators, panel visibility, navbar width)
 *
 * Heat data normalization:
 * The store contains min/max Kelvin temperatures for each available heat date (2015-2025).
 * These values are used to denormalize heat exposure indices (0-1) back to actual temperatures:
 * Formula: `temp_K = normalized × (max_K - min_K) + min_K`
 *
 * @see {@link https://pinia.vuejs.org/|Pinia Documentation}
 */

import { defineStore } from "pinia";

/**
 * Global Pinia Store
 * Core application state managing navigation, selections, and Cesium viewer reference.
 *
 * @typedef {Object} GlobalState
 * @property {string} view - Current view mode ('capitalRegion', 'postalcode', 'building')
 * @property {string|null} postalcode - Selected postal code (e.g., '00100')
 * @property {string|null} nameOfZone - Selected zone/neighborhood name
 * @property {number} averageHeatExposure - Average heat exposure for selected area (0-1)
 * @property {number} averageTreeArea - Average tree canopy area for selected area (m²)
 * @property {string} level - Navigation level ('start', 'postalcode', 'building')
 * @property {Object} minMaxKelvin - Min/max Kelvin temperatures by date for heat normalization
 * @property {string} heatDataDate - Selected date for heat exposure visualization (YYYY-MM-DD)
 * @property {Object|null} currentGridCell - Currently selected 250m grid cell entity
 * @property {Object|null} cesiumViewer - CesiumJS viewer instance reference
 * @property {string|null} buildingAddress - Selected building address string
 * @property {Object|null} pickedEntity - Currently picked Cesium entity
 * @property {boolean} isLoading - Global loading indicator state
 * @property {boolean} showBuildingInfo - Toggle building info panel visibility
 * @property {boolean} isCameraRotated - Camera 180° rotation state flag
 * @property {number} navbarWidth - Navigation drawer width in pixels (responsive, 400-800px)
 */
export const useGlobalStore = defineStore("global", {
  state: () => ({
    view: "capitalRegion",
    postalcode: null,
    nameOfZone: null,
    averageHeatExposure: 0,
    averageTreeArea: 0,
    level: "start",
    minMaxKelvin: {
      "2015-07-03": { min: 285.7481384277, max: 323.753112793 },
      "2016-06-03": { min: 273.0023498535, max: 326.4089050293 },
      "2018-07-27": { min: 280.1904296875, max: 322.5089416504 },
      "2019-06-05": { min: 284.0459594727, max: 323.6129760742 },
      "2020-06-23": { min: 291.6373901367, max: 325.2809753418 },
      "2021-07-12": { min: 285.3448181152, max: 329.929473877 },
      "2022-06-28": { min: 291.5040893555, max: 332.274230957 },
      "2023-06-23": { min: 288.9166564941, max: 324.6862182617 },
      "2024-06-26": { min: 284.6065368652, max: 323.5138549805 },
      "2025-07-14": { min: 284.924407958, max: 328.2204589844 },
    },
    heatDataDate: "2022-06-28",
    currentGridCell: null,
    cesiumViewer: null,
    buildingAddress: null,
    pickedEntity: null,
    isLoading: false,
    showBuildingInfo: true,
    isCameraRotated: false,
    navbarWidth: Math.min(Math.max(window.innerWidth * 0.375, 400), 800),
  }),
  actions: {
    /**
     * Toggles building info panel visibility
     * @param {boolean} status - True to show building info panel
     */
    setShowBuildingInfo(status) {
      this.showBuildingInfo = status;
    },
    /**
     * Sets global loading indicator state
     * @param {boolean} isLoading - True to show loading indicator
     */
    setIsLoading(isLoading) {
      this.isLoading = isLoading;
    },
    /**
     * Sets the selected date for heat exposure data visualization
     * Must be one of the available dates in minMaxKelvin object.
     * @param {string} date - Date string in YYYY-MM-DD format
     */
    setHeatDataDate(date) {
      this.heatDataDate = date;
    },
    /**
     * Sets the current navigation level
     * @param {string} level - Level name ('start', 'postalcode', 'building')
     */
    setLevel(level) {
      this.level = level;
    },
    /**
     * Sets the CesiumJS viewer instance reference
     * Called during application initialization to store the Cesium viewer.
     * @param {Object} viewer - Cesium.Viewer instance
     */
    setCesiumViewer(viewer) {
      this.cesiumViewer = viewer;
    },
    /**
     * Sets the currently selected 250m population grid cell
     * @param {Object} currentGridCell - Cesium entity representing the grid cell
     */
    setCurrentGridCell(currentGridCell) {
      this.currentGridCell = currentGridCell;
    },
    /**
     * Sets the current view mode
     * Controls which level of the navigation hierarchy is active.
     * @param {string} view - View mode ('capitalRegion', 'postalcode', 'building')
     */
    setView(view) {
      this.view = view;
    },
    /**
     * Sets the selected postal code for data loading
     * Triggers loading of postal code-specific data layers.
     * @param {string} postalcode - Five-digit postal code (e.g., '00100')
     */
    setPostalCode(postalcode) {
      this.postalcode = postalcode;
    },
    /**
     * Sets the name of the selected zone or neighborhood
     * @param {string} nameOfZone - Zone name (e.g., 'Alppila - Vallila')
     */
    setNameOfZone(nameOfZone) {
      this.nameOfZone = nameOfZone;
    },
    /**
     * Sets the average heat exposure for the selected area
     * Used for area-level heat statistics display.
     * @param {number} averageHeatExposure - Normalized heat exposure (0-1)
     */
    setAverageHeatExposure(averageHeatExposure) {
      this.averageHeatExposure = averageHeatExposure;
    },
    /**
     * Sets the average tree canopy area for the selected area
     * @param {number} averageTreeArea - Tree coverage in square meters
     */
    setAverageTreeArea(averageTreeArea) {
      this.averageTreeArea = averageTreeArea;
    },
    /**
     * Sets the selected building address string
     * @param {string} buildingAddress - Building address (e.g., 'Aleksanterinkatu 1')
     */
    setBuildingAddress(buildingAddress) {
      this.buildingAddress = buildingAddress;
    },
    /**
     * Sets the currently picked Cesium entity
     * Updated when user clicks on map features.
     * @param {Object} picked - Cesium entity that was clicked
     */
    setPickedEntity(picked) {
      this.pickedEntity = picked;
    },
    /**
     * Toggles camera 180° rotation state
     * Used to track whether camera has been flipped for different viewing angles.
     */
    toggleCameraRotation() {
      this.isCameraRotated = !this.isCameraRotated;
    },
  },
});
