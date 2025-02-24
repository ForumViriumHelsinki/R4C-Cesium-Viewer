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
      		'2015-07-03': { min: 285.7481384277, max: 323.7531127930 },
      		'2016-06-03': { min: 273.0023498535, max: 326.4089050293 },
      		'2018-07-27': { min: 280.1904296875, max: 322.5089416504 },
      		'2019-06-05': { min: 284.0459594727, max: 323.6129760742 },
	    	'2020-06-23': { min: 291.6373901367, max: 325.2809753418 },
      		'2021-07-12': { min: 285.3448181152, max: 329.9294738770 },
      		'2022-06-28': { min: 291.5040893555, max: 332.2742309570 },
      		'2023-06-23': { min: 288.9166564941, max: 324.6862182617 },
      		'2024-06-26': { min: 284.6065368652, max: 323.5138549805 }, // TODO fix min temperature or better create function 
    	},
		heatDataDate: '2022-06-28',
		currentGridCell: null,
		cesiumViewer: null,
		buildingAddress: null,
		pickedEntity: null,
		isLoading: false,
		showBuildingInfo: true,
		isCameraRotated: false,
		navbarWidth: Math.min(Math.max(window.innerWidth * 0.375, 400), 800),	
	} ),
	actions: {
		setShowBuildingInfo( status ) {
			this.showBuildingInfo = status;
		},		
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