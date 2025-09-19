import { defineStore } from 'pinia';

export const useURLStore = defineStore('url', {
  state: () => ({
    imagesBase: '/ndvi_public',
    helsinkiWMS: 'https://kartta.hel.fi/ws/geoserver/avoindata/ows?SERVICE=WMS&',
    pygeoapiBase: '/pygeoapi/collections', // Base URL for pygeoapi collections (proxied through /pygeoapi)
    wmsProxy: '/wms/proxy'
  }),
  getters: {
    coldAreas: (state) => (postinumero) => {
        return `${state.pygeoapiBase}/coldarea/items?f=json&limit=100000&posno=${postinumero}`;
    }, 
    collectionUrl: (state) => (collection, limit = 35000) => {
      return `${state.pygeoapiBase}${collection}/items?f=json&limit=${limit}`;
    },     
    heatExposure: (state) => ( limit = 1000 ) => {
      return `${state.pygeoapiBase}/heatexposure_optimized/items?f=json&limit=${limit}`; // New getter
    },
    hkiTravelTime: (state) => ( from_id, limit = 2) => {
      return `${state.pygeoapiBase}/hki_travel_time/items?f=json&limit=${limit}&from_id=${from_id}`;
    },          
    hsyBuildings: (state) => (postinumero, limit = 10000) => { 
      return `${state.pygeoapiBase}/hsy_buildings_optimized/items?f=json&limit=${limit}&postinumero=${postinumero}`;
    },     
    hsyGridBuildings: (state) => (bboxString, limit = 2000) => {
      return `${state.pygeoapiBase}/hsy_buildings_optimized/items?f=json&limit=${limit}&bbox=${bboxString}`;
    },
    landcoverToParks: (state) => (gridId, limit = 2) => {
      return `${state.pygeoapiBase}/adaptation_landcover/items?f=json&limit=${limit}&grid_id=${gridId}`;
    },    
    ndviTiffUrl: (state) => (ndviDate) => {
      return `${state.imagesBase}/ndvi_${ndviDate}.tiff`;
    },
    otherNature: (state) => (postinumero, limit = 10000) => {
      return `${state.pygeoapiBase}/othernature/items?f=json&limit=${limit}&postinumero=${postinumero}`;
    },
    tree: (state) => (postinumero, koodi, limit = 100000) => {
      return `${state.pygeoapiBase}/tree/items?f=json&limit=${limit}&postinumero=${postinumero}&koodi=${koodi}`;
    },
    treeBuildingDistance: (state) => (postinumero, limit = 100000) => {
      return `${state.pygeoapiBase}/tree_building_distance/items?f=json&limit=${limit}&postinumero=${postinumero}`;
    },
    urbanHeatHelsinki: (state) => (postinumero, limit = 2000) => {
      return `${state.pygeoapiBase}/urban_heat_building/items?f=json&limit=${limit}&postinumero=${postinumero}`;
    }   
  }
});