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
	} ),
	actions: {
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
		}

	},
} );