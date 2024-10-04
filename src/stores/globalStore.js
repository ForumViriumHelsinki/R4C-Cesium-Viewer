import { defineStore } from 'pinia';

export const useGlobalStore = defineStore( 'global', {
	state: () => ( {
		view: 'capitalRegion',
		postalcode: null,
		nameOfZone: null,
		averageHeatExposure: 0,
		averageTreeArea: 0,
		level: 'city',
		minKelvin: 287.123046875,
		maxKelvin: 313.70355224609375,
		minKelvinCold: 246.72064208984375,
		maxKelvinCold: 266.2488708496094,
		heatDataDate: '23.06.2023',
		currentGridCell: null,
		cesiumViewer: null,
		buildingAddress: null,
		pickedEntity: null,
		isLoading: false,
	} ),
	actions: {
		setIsLoading( isLoading ) {
			this.isLoading = isLoading;
		},
		setHeatDataDate( date ) {
			this.heatDataDate = date;
		},	
		setLevel( level ) {
			this.level = level;
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
		setPickedEntity( picked ) {
			this.pickedEntity = picked;
		},		
	},
} );