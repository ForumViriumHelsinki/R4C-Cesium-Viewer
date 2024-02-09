import axios from 'axios';
const backendURL = import.meta.env.VITE_BACKEND_URL;

export default class SocioEconomics {
  constructor( ) {
}

/**
 * Loads Paavo data e asynchronously
 * 
 * @returns {Promise} - A promise that resolves once the data has been loaded
 */
async loadPaavo(  ) {

    const wfsUrl = 'https://geo.stat.fi/geoserver/postialue/wfs';
    const params = new URLSearchParams({
        service: 'WFS',
        request: 'GetFeature',
        typename: 'postialue:pno_tilasto_2024',
        version: '2.0.0',
        outputFormat: 'application/json', // Ensure the response is in JSON format
        CQL_FILTER: 'kunta IN ("091", "092", "049", "235")'
    });
  
    const requestUrl = `${wfsUrl}?${params.toString()}`;

	try {
		const cacheApiUrl = `${backendURL}/api/cache/get?key=${encodeURIComponent(requestUrl)}`;
		const cachedResponse = await axios.get( cacheApiUrl );
		const cachedData = cachedResponse.data;

		if ( cachedData ) {
			console.log("found from cache");

		  	this.addPaavoDataToStore( cachedData );

		} else {

			let dataFromAPI = this.getAllPaavoData( requestUrl );
            this.addPaavoDataToStore( dataFromAPI );

		}
	  	
	} catch ( err ) {
		// This code runs if there were any errors.
		console.log( err );
	}
}

/**
 * Fetches all Paavo data asynchronously from stats.fi wfs
 * 
 * @param {string} postcode - The postcode for which to load othernature data
 * 
 * @returns {Promise} - A promise that resolves once the data has been loaded
 */
async getAllPaavoData( requestUrl ) {

    const wfsUrl = 'https://geo.stat.fi/geoserver/postialue/wfs';
    const params = new URLSearchParams({
        service: 'WFS',
        request: 'GetFeature',
        typename: 'postialue:pno_tilasto_2024',
        version: '2.0.0',
        outputFormat: 'application/json', // Ensure the response is in JSON format
        CQL_FILTER: 'kunta IN ("091", "092", "049", "235")'
    });
  
    const requestUrl = `${wfsUrl}?${params.toString()}`;
  
    try {
        const response = await fetch(requestUrl);
      if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
      }
        const data = await response.json();
        console.log( data.features[ 0 ].properties );
        return data; // Return the fetched data
    } catch (error) {
        console.error('Error fetching socio-economic data:', error);
        return null; // Return null or appropriate error handling
    }
}

/**
 * This function adds the min and max values for each attribute in the dataset to Pinia Store
 * 
 * @param {Object} data - The Paavo data
 * 
 */
addPaavoDataToStore( data ) {

}

}