import { defineStore } from 'pinia';

export const useGlobalStore = defineStore( 'global', {
	state: () => ( {
		view: 'helsinki',
		showPlot: true,
		showVegetation: false,
		showOtherNature: false,
		print: true,
		postalcode: null,
		nameOfZone: null,
		averageHeatExposure: 0,
		averageTreeArea: 0,
		level: 'city',
		minKelvin: 287.123046875,
		maxKelvin: 313.70355224609375,
		currentGridCell: null,
		cesiumViewer: null,
		postalCodeData: null,
	} ),
	getters: {
		getView: ( state ) => state.view,
		getShowPlot: ( state ) => state.showPlot,
		getShowVegetation: ( state ) => state.showVegetation,
		getShowOtherNature: ( state ) => state.showOtherNature,
		getPrint: ( state ) => state.print,
		getPostalCode: ( state ) => state.postalcode,
		getNameOfZone: ( state ) => state.nameOfZone,
		getAverageHeatExposure: ( state ) => state.averageHeatExposure,
		getAverageTreeArea: ( state ) => state.averageTreeArea,
		getLevel: ( state ) => state.level,
		getMinKelvin: ( state ) => state.minKelvin,
		getMaxKelvin: ( state ) => state.maxKelvin,
		getCurrentGridCell: ( state ) => state.currentGridCell,
		getCesiumViewer: ( state ) => state.cesiumViewer,
		getPostalCodeData: ( state ) => state.postalCodeData,
	},
	actions: {
		setPostalCodeData( newValue ) {
			this.postalCodeData = newValue;
		},		
		setCesiumViewer( newValue ) {
			this.cesiumViewer = newValue;
		},
		setCurrentGridCell( newValue ) {
			this.currentGridCell = newValue;
		},
		setView( newValue ) {
			this.view = newValue;
		},
		setShowPlot( newValue ) {
			this.showPlot = newValue;
		},
		setShowVegetation( newValue ) {
			this.showVegetation = newValue;
		},
		setShowOtherNature( newValue ) {
			this.showOtherNature = newValue;
		},
		setPrint( newValue ) {
			this.print = newValue;
		},
		setPostalCode( newValue ) {
			this.postalcode = newValue;
		},
		setNameOfZone( newValue ) {
			this.nameOfZone = newValue;
		},
		setAverageHeatExposure( newValue ) {
			this.averageHeatExposure = newValue;
		},
		setAverageTreeArea( newValue ) {
			this.averageTreeArea = newValue;
		},
		reset() {
			this.showPlot = true;
			this.showVegetation = false;
			this.showOtherNature = false;
			this.print = true;
			this.postalcode = null;
			this.nameOfZone = null;
			this.averageHeatExposure = 0;
			this.averageTreeArea = 0;
			this.minKelvin = 287.123046875;
			this.maxKelvin = 313.70355224609375;			
			//			this.minKelvin = 287.123046875;
			//			this.maxKelvin = 315.011962890625;
			this.cesiumViewer = null;
			this.currentGridCell = null;
			this.postalCodeData = null;
		},
	},
} );