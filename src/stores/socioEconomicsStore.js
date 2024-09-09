import { defineStore } from 'pinia';
const backendURL = import.meta.env.VITE_BACKEND_URL;
import axios from 'axios';

export const useSocioEconomicsStore = defineStore( 'socioEconomics', {
	state: () => ( {
		data: {}, // Stores the raw Paavo data
		regionStatistics: {}, // Stores min and max values for attributes
		helsinkiStatistics: {}
	} ),
	getters: {
		getDataByPostcode: ( state ) => ( postcode ) => {
			return state.data.find( ( item ) => item.postinumeroalue === postcode );
		},
		getDataByNimi: ( state ) => ( nimi ) => {
			return state.data.find( ( item ) => item.nimi === nimi );
		},    
		getNimiForCapital: ( state ) => () => {
			return state.data.map( item => item.nimi ).sort();
		},
		getNimiForHelsinki: ( state ) => () => {
			return state.data.filter( item => item.kunta === '091' ).map( item => item.nimi ).sort();
		},
	},
	actions: {
		// Function to load Paavo data
		async loadPaavo() {
			// replace all this with call to backend
			try {
				const response = await fetch( 'https://geo.fvh.fi/paavo' ); // Fetch directly
				if ( !response.ok ) throw new Error( `HTTP error! status: ${response.status}` );
				const data = await response.json(); // Parse as JSON
        
				this.addDataToStore( data );
				this.addRegionStatisticsToStore();
				this.addHelsinkiStatisticsToStore();
			} catch ( error ) {
				console.error( 'Error fetching Paavo data:', error ); 
			}
		},

		// Function to fetch all Paavo data from redis cache
		async getDataFromCache( requestUrl ) {
			// Assuming backendURL is defined globally or imported
			const cacheApiUrl = `${backendURL}/api/cache/get?key=${encodeURIComponent( requestUrl )}`;
			const response = await fetch( cacheApiUrl );
			if ( !response.ok ) throw new Error( `HTTP error! status: ${response.status}` );

			return await response.json();
		},

		// Function to fetch all Paavo data
		async getAllPaavoData( requestUrl ) {
			try {
				const response = await fetch( requestUrl );
				if ( !response.ok ) throw new Error( `HTTP error! status: ${response.status}` );
				const data = await response.json();
				if ( !data || !data.features ) throw new Error( 'Invalid data structure' );
				return data;
			} catch ( error ) {
				console.error( 'Error fetching socio-economic data:', error );
				throw error; // Rethrow to handle it in the calling function
			}
		},

		// Function to add data to store and calculate statistics
		addPaavoDataToStore( data ) {
			// Filter out rows where postinumeroalue is "00230", then map the rest
			this.data = data.features.filter( feature => ![ '00230', '02290', '01770' ].includes( feature.properties.postinumeroalue ) ).map( feature => feature.properties );

			// Example statistics calculation (adjust according to actual data attributes)
			this.regionStatistics = {
				// Assuming 'someAttribute' is part of your data, replace with actual attribute names
				ra_as_kpa: {
					min: Math.min( ...this.data.map( item => Number( item.ra_as_kpa ) ) ),
					max: Math.max( ...this.data.map( item => Number( item.ra_as_kpa ) ) ),
				},
				hr_ktu: {
					min: Math.min( ...this.data.map( item => Number( item.hr_ktu ) ) ),
					max: Math.max( ...this.data.map( item => Number( item.hr_ktu ) ) ),
				},                             
				// Add more attributes as needed
			};

			// Filter data for Helsinki (kunta = "091")
			const helsinkiData = this.data.filter( item => item.kunta === '091' );

			// Helsinki specific statistics
			this.helsinkiStatistics = {
				ra_as_kpa: {
					min: helsinkiData.length > 0 ? Math.min( ...helsinkiData.map( item => Number( item.ra_as_kpa ) ) ) : null,
					max: helsinkiData.length > 0 ? Math.max( ...helsinkiData.map( item => Number( item.ra_as_kpa ) ) ) : null,
				},
				hr_ktu: {
					min: helsinkiData.length > 0 ? Math.min( ...helsinkiData.map( item => Number( item.hr_ktu ) ) ) : null,
					max: helsinkiData.length > 0 ? Math.max( ...helsinkiData.map( item => Number( item.hr_ktu ) ) ) : null,
				},
			};
      
		},

		addDataToStore( data ) {
			// Filter out rows where postinumeroalue is "00230", "02290", "01770", then map the rest
			this.data = data.features.filter( feature => ![ '00230', '02290', '01770' ].includes( feature.properties.postinumeroalue ) ).map( feature => feature.properties );
        
		},

		// Function to add data to store and calculate statistics
		addRegionStatisticsToStore() {
			// Example statistics calculation (adjust according to actual data attributes)
			this.regionStatistics = {
				// Assuming 'someAttribute' is part of your data, replace with actual attribute names
				ra_as_kpa: {
					min: Math.min( ...this.data.map( item => Number( item.ra_as_kpa ) ) ),
					max: Math.max( ...this.data.map( item => Number( item.ra_as_kpa ) ) ),
				},
				hr_ktu: {
					min: Math.min( ...this.data.map( item => Number( item.hr_ktu ) ) ),
					max: Math.max( ...this.data.map( item => Number( item.hr_ktu ) ) ),
				},                             
			};
              
		},

		// Function to add data to store and calculate statistics
		addHelsinkiStatisticsToStore() {
			// Filter data for Helsinki (kunta = "091")
			const helsinkiData = this.data.filter( item => item.kunta === '091' );
        
			// Helsinki specific statistics
			this.helsinkiStatistics = {
				ra_as_kpa: {
					min: helsinkiData.length > 0 ? Math.min( ...helsinkiData.map( item => Number( item.ra_as_kpa ) ) ) : null,
					max: helsinkiData.length > 0 ? Math.max( ...helsinkiData.map( item => Number( item.ra_as_kpa ) ) ) : null,
				},
				hr_ktu: {
					min: helsinkiData.length > 0 ? Math.min( ...helsinkiData.map( item => Number( item.hr_ktu ) ) ) : null,
					max: helsinkiData.length > 0 ? Math.max( ...helsinkiData.map( item => Number( item.hr_ktu ) ) ) : null,
				},
			};
              
		},
	},
} );