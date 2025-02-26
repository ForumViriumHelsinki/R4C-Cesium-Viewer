import { defineStore } from 'pinia';
null

export const useSocioEconomicsStore = defineStore( 'socioEconomics', {
	state: () => ( {
		data: null, // Stores the raw Paavo data
		regionStatistics: null, // Stores min and max values for attributes
		helsinkiStatistics: null
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
			try {
				const response = await fetch( '/paavo' );
				if ( !response.ok ) throw new Error( `HTTP error! status: ${response.status}` );
				const data = await response.json(); // Parse as JSON
        
				this.addDataToStore( data );
				this.addRegionStatisticsToStore();
				this.addHelsinkiStatisticsToStore();
				this.calculateRegionTotal();
			} catch ( error ) {
				console.error( 'Error fetching Paavo data:', error ); 
			}
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

		calculateRegionTotal() {
    if (!this.data || this.data.length === 0) return;

    const attributesToSum = [
        'he_0_2', 'he_3_6', 'he_7_12', 'he_65_69', 'he_70_74', 'he_80_84', 'he_85_',
        'he_vakiy', 'pt_tyott', 'ko_perus', 'ko_ika18y', 'te_taly', 'te_vuok_as'
    ];
    
    const attributesToAverage = ['ra_as_kpa', 'hr_ktu'];
    
    let totalSums = {};
    let totalAverages = {};
    let count = this.data.length;
    
    // Initialize sums
    attributesToSum.forEach(attr => totalSums[attr] = 0);
    attributesToAverage.forEach(attr => totalAverages[attr] = 0);
    
    // Calculate sums and prepare averages
    this.data.forEach(item => {
        attributesToSum.forEach(attr => {
            if (item[attr] !== undefined) {
                totalSums[attr] += Number(item[attr]) || 0;
            }
        });
        
        attributesToAverage.forEach(attr => {
            if (item[attr] !== undefined) {
                totalAverages[attr] += Number(item[attr]) || 0;
            }
        });
    });
    
    // Compute averages
    attributesToAverage.forEach(attr => {
        totalAverages[attr] = count > 0 ? totalAverages[attr] / count : 0;
    });
    
    // Create the new "whole region" object
    const wholeRegionEntry = {
        nimi: "Whole Region",
        postinumeroalue: "99999",
        ...totalSums,
        ...totalAverages
    };
    
    // Append the new entry to the dataset
    this.data.push(wholeRegionEntry);
}

	},
} );
