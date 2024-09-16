import { defineStore } from 'pinia';

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
		socioEconomics: 'Alppila - Vallila'
	} ),
	actions: {
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
		}
	},
} );