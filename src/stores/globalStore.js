import { defineStore } from 'pinia';

export const useGlobalStore = defineStore('global', {
  state: () => ({
    showPlot: true,
    showVegetation: false,
    showOtherNature: false,
    print: true,
    postalcode: null,
    nameOfZone: null,
    averageHeatExposure: 0,
    averageTreeArea: 0,
    level: 'city',
  }),
  getters: {
    getShowPlot: (state) => state.showPlot,
    getShowVegetation: (state) => state.showVegetation,
    getShowOtherNature: (state) => state.showOtherNature,
    getPrint: (state) => state.print,
    getPostalCode: (state) => state.postalcode,
    getNameOfZone: (state) => state.nameOfZone,
    getAverageHeatExposure: (state) => state.averageHeatExposure,
    getAverageTreeArea: (state) => state.averageTreeArea,
    getLevel: (state) => state.level,
  },
  actions: {
    setShowPlot(newValue) {
      this.showPlot = newValue;
    },
    setShowVegetation(newValue) {
      this.showVegetation = newValue;
    },
    setShowOtherNature(newValue) {
      this.showOtherNature = newValue;
    },
    setPrint(newValue) {
      this.print = newValue;
    },
    setPostalCode(newValue) {
      this.postalcode = newValue;
    },
    setNameOfZone(newValue) {
      this.nameOfZone = newValue;
    },
    setAverageHeatExposure(newValue) {
      this.averageHeatExposure = newValue;
    },
    setAverageTreeArea(newValue) {
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
        this.averageTreeArea = 'city';
    },
  },
});