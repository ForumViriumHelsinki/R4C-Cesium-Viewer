/**
 * @file toggleStore.js
 * @module stores/toggleStore
 * @description Toggle Store - Pinia store for managing UI layer visibility and feature toggles.
 * Controls visibility of all map layers, data overlays, and UI components.
 * Provides centralized boolean state management for the entire application.
 *
 * Managed toggles include:
 * - Map layers (postal codes, trees, vegetation, landcover, NDVI, flood)
 * - View modes (grid view, Helsinki view, 250m population grid)
 * - Data filters (hide new buildings, hide non-SOTE, hide low values)
 * - UI components (plots, cold areas, survey locations)
 *
 * @see {@link https://pinia.vuejs.org/|Pinia Documentation}
 */

import { defineStore } from 'pinia';

/**
 * Toggle Pinia Store
 * Manages all application-wide boolean toggles for layer visibility and UI state.
 *
 * @typedef {Object} ToggleState
 * @property {boolean} postalCode - Show/hide postal code boundaries
 * @property {boolean} natureGrid - Show/hide nature grid overlay
 * @property {boolean} travelTime - Show/hide public transport travel time visualization
 * @property {boolean} resetGrid - Flag to trigger grid reset
 * @property {boolean} gridView - Enable/disable grid-based view mode
 * @property {boolean} helsinkiView - Enable/disable Helsinki-specific view
 * @property {boolean} showPlot - Show/hide data visualization plots
 * @property {boolean} print - Enable/disable print mode
 * @property {boolean} showVegetation - Show/hide low vegetation layers
 * @property {boolean} showOtherNature - Show/hide other nature surfaces (rock, sand, bare soil)
 * @property {boolean} hideNewBuildings - Filter out newly constructed buildings
 * @property {boolean} hideNonSote - Filter out non-SOTE (social/health) buildings
 * @property {boolean} hideLow - Hide low-value data points
 * @property {boolean} showTrees - Show/hide tree canopy layers (all height categories)
 * @property {boolean} hideColdAreas - Hide/show cooling zone visualizations
 * @property {boolean} landCover - Show/hide HSY landcover WMS layers
 * @property {boolean} switchView - Flag for view switching state
 * @property {boolean} surveyPlaces - Show/hide survey location markers
 * @property {boolean} capitalRegionCold - Show/hide Capital Region cold areas
 * @property {boolean} grid250m - Show/hide 250m population grid
 * @property {boolean} ndvi - Show/hide NDVI vegetation index imagery
 */
export const useToggleStore = defineStore('toggle', {
  state: () => ({
    postalCode: false,
    natureGrid: false,
    travelTime: false,
    resetGrid: false,
    gridView: false,
    helsinkiView: false,
    showPlot: true,
    print: true,
    showVegetation: false,
    showOtherNature: false,
    hideNewBuildings: false,
    hideNonSote: false,
    hideLow: false,
    showTrees: false,
    hideColdAreas: false,
    landCover: false,
    switchView: false,
    surveyPlaces: false,
    capitalRegionCold: false,
	  grid250m: false,
    ndvi: false,
  }),
  actions: {
    /**
     * Toggle NDVI vegetation index imagery visibility
     * @param {boolean} enabled - True to show NDVI layers
     */
    setNDVI(enabled) {
      this.ndvi = enabled;
    },
    /**
     * Toggle 250m population statistical grid visibility
     * @param {boolean} enabled - True to show population grid
     */
    setGrid250m(enabled) {
      this.grid250m = enabled;
    },
    /**
     * Toggle Capital Region cold area visualization
     * @param {boolean} enabled - True to show Capital Region cooling zones
     */
    setCapitalRegionCold(enabled) {
      this.capitalRegionCold = enabled;
    },
    /**
     * Toggle postal code boundary visibility
     * @param {boolean} enabled - True to show postal code polygons
     */
    setPostalCode(enabled) {
      this.postalCode = enabled;
    },
    /**
     * Toggle nature grid overlay
     * @param {boolean} enabled - True to show nature grid
     */
    setNatureGrid(enabled) {
      this.natureGrid = enabled;
    },
    /**
     * Toggle public transport travel time visualization
     * @param {boolean} enabled - True to show travel time grid labels
     */
    setTravelTime(enabled) {
      this.travelTime = enabled;
    },
    /**
     * Trigger grid reset operation
     * @param {boolean} enabled - True to reset grid to default state
     */
    setResetGrid(enabled) {
      this.resetGrid = enabled;
    },
    /**
     * Toggle grid-based view mode
     * @param {boolean} enabled - True to enable grid view
     */
    setGridView(enabled) {
      this.gridView = enabled;
    },
    /**
     * Toggle Helsinki-specific view mode
     * @param {boolean} enabled - True to enable Helsinki view
     */
    setHelsinkiView(enabled) {
      this.helsinkiView = enabled;
    },
    /**
     * Toggle data visualization plot visibility
     * @param {boolean} enabled - True to show plots
     */
    setShowPlot(enabled) {
      this.showPlot = enabled;
    },
    /**
     * Toggle print mode for optimized printing
     * @param {boolean} enabled - True to enable print mode
     */
    setPrint(enabled) {
      this.print = enabled;
    },
    /**
     * Toggle low vegetation layer visibility (grass, wetlands)
     * @param {boolean} show - True to show vegetation layers
     */
    setShowVegetation(show) {
      this.showVegetation = show;
    },
    /**
     * Toggle other nature surface visibility (rock, sand, bare soil)
     * @param {boolean} show - True to show other nature layers
     */
    setShowOtherNature(show) {
      this.showOtherNature = show;
    },
    /**
     * Toggle filter to hide newly constructed buildings
     * @param {boolean} hide - True to hide new buildings
     */
    setHideNewBuildings(hide) {
      this.hideNewBuildings = hide;
    },
    /**
     * Toggle filter to hide non-SOTE buildings (excluding social/health facilities)
     * @param {boolean} hide - True to hide non-SOTE buildings
     */
    setHideNonSote(hide) {
      this.hideNonSote = hide;
    },
    /**
     * Toggle filter to hide low-value data points
     * @param {boolean} hide - True to hide low values
     */
    setHideLow(hide) {
      this.hideLow = hide;
    },
    /**
     * Toggle tree canopy layer visibility (all height categories)
     * @param {boolean} treesVisible - True to show tree layers
     */
    setShowTrees(treesVisible) {
      this.showTrees = treesVisible;
    },
    /**
     * Toggle cooling zone visualization visibility
     * @param {boolean} coldAreasHidden - True to hide cold areas
     */
    setHideColdAreas(coldAreasHidden) {
      this.hideColdAreas = coldAreasHidden;
    },
    /**
     * Toggle HSY landcover WMS layer visibility
     * @param {boolean} showLandCover - True to show landcover layers
     */
    setLandCover(showLandCover) {
      this.landCover = showLandCover;
    },
    /**
     * Toggle view switching state
     * @param {boolean} switchView - True to enable view switch
     */
    setSwitchView(switchView) {
      this.switchView = switchView;
    },
    /**
     * Toggle survey location marker visibility
     * @param {boolean} show - True to show survey places
     */
    setSurveyPlaces(show) {
      this.surveyPlaces = show;
    },
    /**
     * Resets all toggles to their initial default values
     * Uses Pinia's built-in $reset functionality.
     * @returns {void}
     */
    reset() {
      this.$reset(); // Pinia has a built-in $reset function which resets state to initial values
    }
  },
});