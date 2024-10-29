import { defineStore } from 'pinia';

export const useGlobalStore = defineStore( 'global', {
	state: () => ( {
		view: 'capitalRegion',
		postalcode: null,
		nameOfZone: null,
		averageHeatExposure: 0,
		averageTreeArea: 0,
		level: 'start',
    	minMaxKelvin: {
      		'2015-07-03': { min: 285.7481384, max: 323.7531128 },
      		'2018-07-27': { min: 280.3028564, max: 322.5027161 },
	    	'2021-02-18': { min: 246.72064208984375, max: 266.2488708496094 },
      		'2021-07-12': { min: 285.3197937, max: 330.1052856 },
      		'2022-06-28': { min: 291.5029602, max: 332.3135986 },
      		'2023-06-23': { min: 287.1230469, max: 313.7035522 },
      		'2024-05-25': { min: 247.1928711, max: 328.0393066 },
    	},
		heatDataDate: '2023-06-23',
		currentGridCell: null,
		cesiumViewer: null,
		buildingAddress: null,
		pickedEntity: null,
		isLoading: false,
		isCameraRotated: false,
		navbarWidth: Math.min(Math.max(window.innerWidth * 0.375, 400), 800),
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
    	toggleCameraRotation() {
      		this.isCameraRotated = !this.isCameraRotated;
   	 	},					
	},
} );