import { defineStore } from 'pinia';

export const useGlobalStore = defineStore( 'global', {
	state: () => ( {
		view: 'helsinki',
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
		buildingAddress: null,
	} ),
	actions: {
		setPostalCodeData( postalCodeData ) {
			this.postalCodeData = postalCodeData;
		},		
		setCesiumViewer( viewer ) {
			this.cesiumViewer = viewer;
		},
		setCurrentGridCell( currentGridCell ) {
			this.currentGridCell = currentGridCell;
		},
		setView( view ) {
			this.view = view;
		},
		setPostalCode( postalcode ) {
			this.postalcode = postalcode;
		},
		setNameOfZone( nameOfZone ) {
			this.nameOfZone = nameOfZone;
		},
		setAverageHeatExposure( averageHeatExposure ) {
			this.averageHeatExposure = averageHeatExposure;
		},
		setAverageTreeArea( averageTreeArea ) {
			this.averageTreeArea = averageTreeArea;
		},
		setBuildingAddress( buildingAddress ) {
			this.buildingAddress = buildingAddress;
		},		
	},
} );