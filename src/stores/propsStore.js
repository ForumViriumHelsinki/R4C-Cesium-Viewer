/**
 * @file propsStore.js
 * @module stores/propsStore
 * @description Props Store - Pinia store for managing visualization properties and analysis data.
 * Centralized storage for chart data, plot configurations, and analytical visualizations.
 * Acts as a data bridge between services and Vue components for complex visualizations.
 *
 * Managed data includes:
 * - Building analysis data (grid properties, heat exposure, time-series)
 * - Tree coverage analysis (area, entities, distance-to-building data)
 * - Visualization configurations (categorical/numerical selectors, scatter plots)
 * - Socioeconomic area selections
 * - Multi-index vulnerability data (heat/flood vulnerability)
 *
 * @see {@link https://pinia.vuejs.org/|Pinia Documentation}
 */

import { defineStore } from 'pinia';

/**
 * Props Pinia Store
 * Manages all visualization properties, chart data, and analysis configurations.
 *
 * @typedef {Object} PropsState
 * @property {Object|null} gridBuildingProps - 250m grid cell building properties
 * @property {number|null} treeArea - Total tree canopy area in square meters
 * @property {number|null} buildingHeatExposure - Selected building heat exposure index (0-1)
 * @property {Array|null} heatHistogramData - Heat exposure frequency distribution data
 * @property {Array|null} scatterPlotEntities - Entities for scatter plot visualizations
 * @property {Array|null} treeBuildingDistanceData - Tree proximity analysis data
 * @property {Array|null} treeEntities - Cesium tree entity references
 * @property {Object|null} buildingsDatasource - Cesium buildings data source reference
 * @property {Array|null} postalcodeHeatTimeseries - Postal code heat time-series data
 * @property {Array|null} buildingHeatTimeseries - Building-level heat time-series data
 * @property {Object|null} heatFloodVulnerabilityEntity - Selected entity for vulnerability analysis
 * @property {Object|null} postalCodeData - Postal code boundary data source
 * @property {Object} categoricalSelect - Selected categorical attribute for charts
 * @property {Object} numericalSelect - Selected numerical attribute for charts
 * @property {string} socioEconomics - Selected socioeconomic area name
 * @property {string} statsIndex - Selected statistical index for visualization
 */
export const usePropsStore = defineStore( 'props', {
	state: () => ( {
		gridBuildingProps: null,
		treeArea: null,
		buildingHeatExposure: null,
		heatHistogramData: null,
		scatterPlotEntities: null,
		treeBuildingDistanceData: null,
		treeEntities: null,
		buildingsDatasource: null,
		postalcodeHeatTimeseries: null,
		buildingHeatTimeseries: null,
		heatFloodVulnerabilityEntity: null,
		postalCodeData: null,
		categoricalSelect: { text: 'Facade Material', value: 'julkisivu_s' },
		numericalSelect: { text: 'Area', value: 'area_m2' },
		socioEconomics: 'Alppila - Vallila',
		statsIndex: 'heat_index',
	} ),
	actions: {
		/**
		 * Sets the selected statistical index for grid visualization
		 * @param {string} index - Index name (e.g., 'heat_index', 'flood_vulnerability')
		 */
		setStatsIndex( index ){
			this.statsIndex = index;
		},
		/**
		 * Sets HSY WMS layer references
		 * @param {Array<Object>} layers - HSY WMS layer configuration
		 * @deprecated This action appears misplaced in propsStore
		 */
		setHSYWMSLayers( layers ) {
			this.hSYWMSLayers = layers;
		},
		/**
		 * Sets the selected socioeconomic area for analysis
		 * @param {string} area - Area name (e.g., 'Alppila - Vallila')
		 */
		setSocioEconomics( area ) {
			this.socioEconomics = area;
		},
		/**
		 * Sets the categorical attribute selection for chart visualizations
		 * @param {Object} object - Selection object with text and value properties
		 * @param {string} object.text - Display label
		 * @param {string} object.value - Property key for data access
		 */
		setCategoricalSelect( object ) {
			this.categoricalSelect = object;
		},
		/**
		 * Sets the numerical attribute selection for chart visualizations
		 * @param {Object} object - Selection object with text and value properties
		 * @param {string} object.text - Display label
		 * @param {string} object.value - Property key for data access
		 */
		setNumericalSelect( object ) {
			this.numericalSelect = object;
		},
		/**
		 * Sets postal code boundary data source reference
		 * @param {Object} data - Cesium postal code data source
		 */
		setPostalCodeData( data ) {
			this.postalCodeData = data;
		},
		/**
		 * Sets the selected entity for heat/flood vulnerability analysis
		 * @param {Object} entity - Cesium entity with vulnerability properties
		 */
		setHeatFloodVulnerability( entity ) {
			this.heatFloodVulnerabilityEntity = entity;
		},
		/**
		 * Sets 250m grid cell building aggregation properties
		 * @param {Object} props - Grid cell properties (building count, types, areas)
		 */
		setGridBuildingProps( props ) {
			this.gridBuildingProps = props;
		},
		/**
		 * Sets total tree canopy area for selected postal code or building
		 * @param {number} area - Tree area in square meters
		 */
		setTreeArea( area ) {
			this.treeArea = area;
		},
		/**
		 * Sets heat exposure index for selected building
		 * @param {number} heatExposure - Normalized heat exposure (0-1)
		 */
		setBuildingHeatExposure( heatExposure ) {
			this.buildingHeatExposure = heatExposure;
		},
		/**
		 * Sets heat exposure histogram data for distribution visualization
		 * @param {Array<Object>} data - Histogram bin data
		 */
		setHeatHistogramData( data ) {
			this.heatHistogramData = data;
		},
		/**
		 * Sets entities for scatter plot visualizations
		 * @param {Array<Object>} entities - Cesium entities with plot properties
		 */
		setScatterPlotEntities( entities ) {
			this.scatterPlotEntities = entities;
		},
		/**
		 * Sets tree-to-building distance analysis data
		 * @param {Array<Object>} data - Distance analysis results
		 */
		setTreeBuildingDistanceData( data ) {
			this.treeBuildingDistanceData = data;
		},
		/**
		 * Sets tree entity references for analysis
		 * @param {Array<Object>} entities - Cesium tree canopy entities
		 */
		setTreeEntities( entities ) {
			this.treeEntities = entities;
		},
		/**
		 * Sets buildings data source reference
		 * @param {Object} datasource - Cesium buildings data source
		 */
		setBuildingsDatasource( datasource ) {
			this.buildingsDatasource = datasource;
		},
		/**
		 * Sets postal code-level heat exposure time-series data
		 * @param {Array<Object>} heatTimeseries - Time-series data points
		 */
		setPostalcodeHeatTimeseries( heatTimeseries ) {
			this.postalcodeHeatTimeseries = heatTimeseries;
		},
		/**
		 * Sets building-level heat exposure time-series data
		 * @param {Array<Object>} heatTimeseries - Time-series data points
		 */
		setBuildingHeatTimeseries( heatTimeseries ) {
			this.buildingHeatTimeseries = heatTimeseries;
		},
	},
} );