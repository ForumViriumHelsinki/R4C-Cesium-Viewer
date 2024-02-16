import { defineStore } from 'pinia';
const backendURL = import.meta.env.VITE_BACKEND_URL;

export const useHeatExposureStore = defineStore('heatExposure', {
  state: () => ({
    data: {}, // Stores the raw Postal code data
  }),
  getters: {
    getDataById: (state) => (postcode) => {
        return state.data.find((item) => item.id === postcode);
    },
    getData: (state) => state.data,
  },
  actions: {
    // Function to load Heat Exposure  data
    async loadHeatExposure() {
        const requestUrl = "https://geo.fvh.fi/r4c/collections/heatexposure/items?f=json&limit=1000";

        try {

            let data = await this.getDataFromCache( requestUrl );

            if ( !data ) {
    
                data = await this.getAllHeatExposureData(requestUrl);
    
            }

            this.data = data;
              
        } catch (error) {
        console.error('Error fetching postal codedata:', error);
      }
    },

        // Function to fetch all Paavo data from redis cache
        async getDataFromCache(requestUrl) {
          // Assuming backendURL is defined globally or imported
          const cacheApiUrl = `${backendURL}/api/cache/get?key=${encodeURIComponent(requestUrl)}`;
          const response = await fetch(cacheApiUrl);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
          return await response.json();
      },

    // Function to fetch all PostalCode data
    async getAllHeatExposureData(requestUrl) {
        try {

          const response = await fetch(requestUrl);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          if (!data || !data.features) throw new Error("Invalid data structure");
          return data.features;

        } catch (error) {

          console.error('Error fetching postal code data:', error);
          throw error; // Rethrow to handle it in the calling function

        }
    },

  },
});