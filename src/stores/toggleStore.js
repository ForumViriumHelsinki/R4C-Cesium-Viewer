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
	} ),
	getters: {
		getPostalCode: ( state ) => state.postalCode,
		getNatureGrid: ( state ) => state.natureGrid,
		getTravelTime: ( state ) => state.travelTime,
		getResetGrid: ( state ) => state.resetGrid,   
		getGridView: ( state ) => state.gridView,    
		getCapitalRegionView: ( state ) => state.capitalRegionView,
		getShowPlot: ( state ) => state.showPlot,
		getPrint: ( state ) => state.print,
		getShowVegetation: ( state ) => state.showVegetation,
		getShowOtherNature: ( state ) => state.showOtherNature,
		getHideNewBuildings: ( state ) => state.hideNewBuildings,
		getHideNonSote: ( state ) => state.hideNonSote,
		getHideLow: ( state ) => state.hideLow,
		getShowTrees: ( state ) => state.showTrees,
		getHideColdAreas: ( state ) => state.hideColdAreas,
		getLandCover: ( state ) => state.landCover,
		getSwitchView: ( state ) => state.switchView,
		getShowSensorData: ( state ) => state.showSensorData,
		getSurveyPlaces: ( state ) => state.surveyPlaces,
	},
	actions: {
		setPostalCode( show ) {
			this.postalCode = show;
		},
		setNatureGrid( show ) {
			this.natureGrid = show;
		},
		setTravelTime( time ) {
			this.travelTime = time;
		},  
		setResetGrid( rested ) {
			this.resetGrid = rested;
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
		setPrint( print ) {
			this.print = print;
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
		setShowTrees( show ) {
			this.showTrees = show;
		}, 
		setHideColdAreas( show ) {
			this.hideColdAreas = show;
		},		   
		setLandCover( enabled ) {
			this.landCover = enabled;
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
		// Reset function
		resetStore() {
			this.postalCode = false;
			this.natureGrid = false;
			this.travelTime = false;
			this.resetGrid = false;
			this.gridView = false;
			this.showPlot = true;
			this.print = true;
			this.showVegetation = false;
			this.showOtherNature = false;
			this.hideNewBuildings = false;
			this.hideNonSote = false;
			this.hideLow = false;
			this.showTrees = false;
			this.hideColdAreas = false;
			this.switchView = false;
			this.showSensorData  = false;
			this.surveyPlaces  = false;
		},
	},
} );