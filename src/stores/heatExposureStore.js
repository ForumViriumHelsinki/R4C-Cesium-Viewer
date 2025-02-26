import { defineStore } from 'pinia';
import { useURLStore } from './urlStore.js';

export const useHeatExposureStore = defineStore( 'heatExposure', {
	state: () => ( {
		data: {}, // Stores the raw Postal code data
	} ),
	getters: {
		getDataById: ( state ) => ( postcode ) => {
			return state.data.find( ( item ) => item.id === postcode );
		},
	},
	actions: {
		// Function to load Heat Exposure  data
		async loadHeatExposure() {
			const urlStore = useURLStore(); // Get the URL from the store
			try {
				let data = null;

				if ( !data ) {
					data = await this.getAllHeatExposureData( urlStore.heatExposure() );
				}

				this.data = data;
              
			} catch ( error ) {
				console.error( 'Error fetching postal codedata:', error );
			}
		},

		// Function to fetch all PostalCode data
		async getAllHeatExposureData( requestUrl ) {
			try {

				const response = await fetch( requestUrl );
				if ( !response.ok ) throw new Error( `HTTP error! status: ${response.status}` );
				const data = await response.json();
				if ( !data || !data.features ) throw new Error( 'Invalid data structure' );
				return data.features;

			} catch ( error ) {

				console.error( 'Error fetching postal code data:', error );
				throw error; // Rethrow to handle it in the calling function

			}
		},

	},
} );
