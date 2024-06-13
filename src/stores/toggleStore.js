import { defineStore } from 'pinia';

export const useToggleStore = defineStore( 'toggle', {
	state: () => ( {
		postalCode: false,
		natureGrid: false,
		travelTime: false,
		resetGrid: false,
		gridView: false,
		capitalRegionView: false,
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
		showSensorData: false,  
		surveyPlaces: false,
		hsyYear: 2022                                                
	} ),
	actions: {
		setPostalCode( enabled ) {
			this.postalCode = enabled;
		},
		setNatureGrid( enabled ) {
			this.natureGrid = enabled;
		},
		setTravelTime( enabled ) {
			this.travelTime = enabled;
		},  
		setResetGrid( enabled ) {
			this.resetGrid = enabled;
		},      
		setGridView( enabled ) {
			this.gridView = enabled;
		},
		setCapitalRegionView( enabled ) {
			this.capitalRegionView = enabled;
		},
		setShowPlot( enabled ) {
			this.showPlot = enabled;
		},
		setPrint( enabled ) {
			this.print = enabled;
		},
		setShowVegetation( show ) {
			this.showVegetation = show;
		},
		setShowOtherNature( show ) {
			this.showOtherNature = show;
		},    
		setHideNewBuildings( hide ) {
			this.hideNewBuildings = hide;
		},
		setHideNonSote( hide ) {
			this.hideNonSote = hide;
		},
		setHideLow( hide ) {
			this.hideLow = hide;
		},
		setShowTrees( treesVisible ) {
			this.showTrees = treesVisible;
		}, 
		setHideColdAreas( coldAreasHidden ) {
			this.hideColdAreas = coldAreasHidden;
		},		   
		setLandCover( showLandCover ) {
			this.landCover = showLandCover;
		},
		setSwitchView( switchView ) {
			this.switchView = switchView;
		},
		setShowSensorData( show ) {
			this.showSensorData = show;
		},
		setSurveyPlaces( show ) {
			this.surveyPlaces = show;
		},
		setHSYYear( year ) {
			this.hsyYear = year;
		},			
	},
} );