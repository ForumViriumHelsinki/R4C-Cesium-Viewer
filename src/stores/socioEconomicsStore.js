import { defineStore } from 'pinia';
const backendURL = import.meta.env.VITE_BACKEND_URL;

export const useSocioEconomicsStore = defineStore('socioEconomics', {
  state: () => ({
    data: [], // Stores the raw Paavo data
    regionStatistics: {}, // Stores min and max values for attributes
    helsinkiStatistics: {}
  }),
  getters: {
    getDataByPostcode: (state) => (postcode) => {
        return state.data.find((item) => item.postinumeroalue === postcode);
    },
    getRegionStatistics: (state) => state.regionStatistics,
    getHelsinkiStatistics: (state) => state.helsinkiStatistics,
  },
  actions: {
    // Function to load Paavo data
    async loadPaavo() {
      const wfsUrl = 'https://geo.stat.fi/geoserver/postialue/wfs';
      const params = new URLSearchParams({
          service: 'WFS',
          request: 'GetFeature',
          typename: 'postialue:pno_tilasto_2024',
          version: '2.0.0',
          outputFormat: 'application/json',
          CQL_FILTER: `kunta IN ('091','092','049','235')` // Ensure proper URL encoding
        });

      const requestUrl = `${wfsUrl}?${params.toString()}`;

      try {
        // Assuming backendURL is defined globally or imported
        const cacheApiUrl = `${backendURL}/api/cache/get?key=${encodeURIComponent(requestUrl)}`;
        const response = await fetch(cacheApiUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const cachedData = await response.json();

        if (cachedData) {
            this.data = cachedData;
            console.log("found from cache");

        } else {

            this.data = await this.getAllPaavoData(requestUrl);

        }

        this.addPaavoDataToStore(this.data);

      } catch (error) {
        console.error('Error fetching socio-economic data:', error);
      }
    },

    // Function to fetch all Paavo data
    async getAllPaavoData(requestUrl) {
        try {
          const response = await fetch(requestUrl);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          if (!data || !data.features) throw new Error("Invalid data structure");
          return data;
        } catch (error) {
          console.error('Error fetching socio-economic data:', error);
          throw error; // Rethrow to handle it in the calling function
        }
      },

    // Function to add data to store and calculate statistics
    addPaavoDataToStore( data ) {
    // Filter out rows where postinumeroalue is "00230", then map the rest
        this.data = data.features.filter( feature => ![ "00230", "02290", "01770" ].includes( feature.properties.postinumeroalue ) ).map( feature => feature.properties );

      // Example statistics calculation (adjust according to actual data attributes)
        this.regionStatistics = {
        // Assuming 'someAttribute' is part of your data, replace with actual attribute names
            ra_as_kpa: {
                min: Math.min(...this.data.map(item => Number(item.ra_as_kpa))),
                max: Math.max(...this.data.map(item => Number(item.ra_as_kpa))),
            },
            hr_ktu: {
                min: Math.min(...this.data.map(item => Number(item.hr_ktu))),
                max: Math.max(...this.data.map(item => Number(item.hr_ktu))),
            },                             
        // Add more attributes as needed
        };

        // Filter data for Helsinki (kunta = "091")
        const helsinkiData = this.data.filter(item => item.kunta === "091");

        // Helsinki specific statistics
        this.helsinkiStatistics = {
            ra_as_kpa: {
                min: helsinkiData.length > 0 ? Math.min(...helsinkiData.map(item => Number(item.ra_as_kpa))) : null,
                max: helsinkiData.length > 0 ? Math.max(...helsinkiData.map(item => Number(item.ra_as_kpa))) : null,
            },
            hr_ktu: {
                min: helsinkiData.length > 0 ? Math.min(...helsinkiData.map(item => Number(item.hr_ktu))) : null,
                max: helsinkiData.length > 0 ? Math.max(...helsinkiData.map(item => Number(item.hr_ktu))) : null,
            },
        };
      
    },
  },
});