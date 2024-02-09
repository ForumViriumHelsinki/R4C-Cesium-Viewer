import { defineStore } from 'pinia';
const backendURL = import.meta.env.VITE_BACKEND_URL;

export const usePostalCodeStore = defineStore('postalCode', {
  state: () => ({
    data: [], // Stores the raw Postal code data
  }),
  getters: {
    getDataById: (state) => (postcode) => {
        return state.data.find((item) => item.id === postcode);
    },
    getData: (state) => state.data,
  },
  actions: {
    // Function to load PostalCode data
    async loadPostalCode() {
        const url = "https://geo.fvh.fi/r4c/collections/postalcode/items?f=json&limit=1000";

        try {
            const cacheApiUrl = `${backendURL}/api/cache/get?key=${encodeURIComponent(url)}`;
            const cachedResponse = await fetch(cacheApiUrl);
            const cachedData = cachedResponse.data;
    
            if ( cachedData ) {
        
                    console.log("found from cache");
                    this.data = cachedData.features;
    
            } else {
    
               this.getAllPostalCodeData( url ).features;
    
            }
              
        } catch (error) {
        console.error('Error fetching postal codedata:', error);
      }
    },

    // Function to fetch all PostalCode data
    async getAllPostalCodeData(requestUrl) {
        try {

          const response = await fetch(requestUrl);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          if (!data || !data.features) throw new Error("Invalid data structure");
          this.data = data.features;

        } catch (error) {

          console.error('Error fetching postal code data:', error);
          throw error; // Rethrow to handle it in the calling function

        }
    },

  },
});