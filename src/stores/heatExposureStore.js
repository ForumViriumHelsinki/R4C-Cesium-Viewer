import { defineStore } from 'pinia';
import { useURLStore } from './urlStore.js';

export const useHeatExposureStore = defineStore( 'heatExposure', {
	state: () => ( {
		data: null, // Stores the raw Postal code data
		error: null, // Stores any error that occurred during loading
	} ),
	getters: {
		getDataById: ( state ) => ( postcode ) => {
			// Safely handle case where data is null or empty
			if ( !state.data || !Array.isArray( state.data ) ) {
				return undefined;
			}
			return state.data.find( ( item ) => item.id === postcode );
		},
	},
	actions: {
		// Function to load Heat Exposure data
		async loadHeatExposure() {
			const urlStore = useURLStore(); // Get the URL from the store
			this.error = null; // Reset error state
			try {
				const data = await this.getAllHeatExposureData( urlStore.heatExposure() );
				this.data = data;
			} catch ( error ) {
				console.warn( 'Heat exposure data unavailable:', error.message );
				// Set data to empty array so app can continue without heat data
				this.data = [];
				this.error = error.message;
				// Don't rethrow - allow app to continue without heat exposure data
			}
		},

		// Function to fetch all PostalCode data
		async getAllHeatExposureData( requestUrl ) {
			const response = await fetch( requestUrl );

			// Handle HTTP errors gracefully
			if ( !response.ok ) {
				const errorMessage = `Heat exposure API error: ${response.status}`;
				console.warn( errorMessage );
				throw new Error( errorMessage );
			}

			// Try to parse JSON, handle parsing errors
			let data;
			try {
				data = await response.json();
			} catch ( parseError ) {
				console.warn( 'Failed to parse heat exposure response:', parseError );
				throw new Error( 'Invalid response format from heat exposure API' );
			}

			if ( !data || !data.features ) {
				console.warn( 'Heat exposure data has invalid structure' );
				throw new Error( 'Invalid data structure from heat exposure API' );
			}

			return data.features;
		},

	},
} );
