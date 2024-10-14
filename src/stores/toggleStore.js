import { defineStore } from 'pinia';

export const useToggleStore = defineStore('toggle', {
  state: () => ({
    postalCode: false,
    natureGrid: false,
    travelTime: false,
    resetGrid: false,
    gridView: false,
    helsinkiView: false,
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
    surveyPlaces: false,
    capitalRegionCold: false,
  }),
  actions: {
    setCapitalRegionCold(enabled) {
      this.capitalRegionCold = enabled;
    },    
    setPostalCode(enabled) {
      this.postalCode = enabled;
    },
    setNatureGrid(enabled) {
      this.natureGrid = enabled;
    },
    setTravelTime(enabled) {
      this.travelTime = enabled;
    },  
    setResetGrid(enabled) {
      this.resetGrid = enabled;
    },      
    setGridView(enabled) {
      this.gridView = enabled;
    },
    setHelsinkiView(enabled) {
      this.helsinkiView = enabled;
    },
    setShowPlot(enabled) {
      this.showPlot = enabled;
    },
    setPrint(enabled) {
      this.print = enabled;
    },
    setShowVegetation(show) {
      this.showVegetation = show;
    },
    setShowOtherNature(show) {
      this.showOtherNature = show;
    },    
    setHideNewBuildings(hide) {
      this.hideNewBuildings = hide;
    },
    setHideNonSote(hide) {
      this.hideNonSote = hide;
    },
    setHideLow(hide) {
      this.hideLow = hide;
    },
    setShowTrees(treesVisible) {
      this.showTrees = treesVisible;
    }, 
    setHideColdAreas(coldAreasHidden) {
      this.hideColdAreas = coldAreasHidden;
    },      
    setLandCover(showLandCover) {
      this.landCover = showLandCover;
    },
    setSwitchView(switchView) {
      this.switchView = switchView;
    },
    setSurveyPlaces(show) {
      this.surveyPlaces = show;
    },

    // Add reset method
    reset() {
      this.$reset(); // Pinia has a built-in $reset function which resets state to initial values
    }
  },
});
