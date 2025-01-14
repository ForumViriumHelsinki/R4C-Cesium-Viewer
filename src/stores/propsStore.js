import { defineStore } from 'pinia';
import axios from 'axios';

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
		hsyYear: 2022,
		hsySelectArea: 'Askisto',   
		categoricalSelect: { text: 'Facade Material', value: 'julkisivu_s' },
		numericalSelect: { text: 'Area', value: 'area_m2' },
		socioEconomics: 'Alppila - Vallila',
		hSYWMSLayers: null,
		statsIndex: 'heat_index',
	} ),
	actions: {
		setStatsIndex(  index ){
			this.statsIndex = index;
		},
		setHSYWMSLayers( layers ) {
			this.hSYWMSLayers = layers;
		},		
		setSocioEconomics( area ) {
			this.socioEconomics = area;
		},
		setCategoricalSelect( object ) {
			this.categoricalSelect = object;
		},
		setNumericalSelect( object ) {
			this.numericalSelect = object;
		},		
		setHSYSelectArea( area ) {
			this.hsySelectArea = area;
		},
		setPostalCodeData( data ) {
			this.postalCodeData = data;
		},		
		setHeatFloodVulnerability( entity ) {
			this.heatFloodVulnerabilityEntity = entity;
		},
		setGridBuildingProps( props ) {
			this.gridBuildingProps = props;
		},	
		setTreeArea( area ) {
			this.treeArea = area;
		},	
		setBuildingHeatExposure( heatExposure ) {
			this.buildingHeatExposure = heatExposure;
		},
		setHeatHistogramData( data ) {
			this.heatHistogramData = data;
		},	

		setScatterPlotEntities( entities ) {
			this.scatterPlotEntities = entities;
		},

		setTreeBuildingDistanceData( data ) {
			this.treeBuildingDistanceData = data;
		},

		setTreeEntities( entities ) {
			this.treeEntities = entities;
		},

		setBuildingsDatasource( datasource ) {
			this.buildingsDatasource = datasource;
		},

		setPostalcodeHeatTimeseries( heatTimeseries ) {
			this.postalcodeHeatTimeseries = heatTimeseries;
		},

		setBuildingHeatTimeseries( heatTimeseries ) {
			this.buildingHeatTimeseries = heatTimeseries;
		},	
		setHSYYear( year ) {
			this.hsyYear = year;
		},

		    // Fetch WMS layers from the GetCapabilities response
		async fetchHSYWMSLayers() {
			try {
				const response = await axios.get( 'https://kartta.hsy.fi/geoserver/wms?request=getCapabilities' );
				const parser = new DOMParser();
				const xmlDoc = parser.parseFromString( response.data, 'text/xml' );

				const layers = Array.from( xmlDoc.getElementsByTagName( 'Layer' ) ).map( layer => {
					const name = layer.getElementsByTagName( 'Name' )[0]?.textContent;
					const title = layer.getElementsByTagName( 'Title' )[0]?.textContent;
					return { name, title };
				} );

				this.setHSYWMSLayers( layers );
			} catch ( error ) {
				console.error( 'Failed to fetch WMS layers:', error );
			}
		},
	},
} );