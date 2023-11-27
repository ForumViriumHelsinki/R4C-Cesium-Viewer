import Datasource from "./datasource.js"; 
import * as Cesium from "cesium";

export default class Othernature {
  constructor( viewer ) {
    this.datasourceService = new Datasource( viewer );
  }

  /**
 * Loads othernature data for a given postcode asynchronously
 * 
 * @param {string} postcode - The postcode for which to load othernature data
 * @returns {Promise} - A promise that resolves once the data has been loaded
 */
async loadOtherNature( postcode ) {

	let url = "https://geo.fvh.fi/r4c/collections/othernature/items?f=json&limit=10000&postinumero=" + postcode ;

	try {
		//const value = await localforage.getItem( url );
		// This code runs once the value has been loaded
		// from the offline store.

		//if ( value ) {
		//	console.log("found from cache");

		//	let datasource = JSON.parse( value )
		//	addOtherNatureDataSource( datasource );

		//} else {

			this.loadOtherNatureWithoutCache( url );

		//}
	  	
	} catch ( err ) {
		// This code runs if there were any errors.
		console.log( err );
	}
}

/**
 * Adds a othernature data source to the viewer
 * 
 * @param {Object} data - The othernature data to be added as a data source
 */
async addOtherNatureDataSource( data ) {
	
    let entities = await this.datasourceService.addDataSourceWithName(data, 'OtherNature');

		
		for ( let i = 0; i < entities.length; i++ ) {
			
			let entity = entities[ i ];
			const category = entity.properties._koodi._value;
            
            if ( category ) {
				//colors of nature area enity are set based on it's category
				this.setOtherNaturePolygonMaterialColor( entity, category )
			}

		}
	


}

/**
 * Loads othernature data from the provided URL without using cache
 * 
 * @param {string} url - The URL from which to load othernature data
 */
loadOtherNatureWithoutCache( url ) {

    console.log("Not in cache! Loading: " + url );

    const response = fetch( url )
        .then( (response) => response.json() )
        .then( (data) => {
            this.addOtherNatureDataSource( data );
        });
	
}

/**
 * Sets the polygon material color for a othernature entity based on its category
 * 
 * @param {Object} entity - The othernature entity
 * @param {string} category - The category of the othernature entity
 */
setOtherNaturePolygonMaterialColor( entity, category ) {
	 						
	switch ( category ){
		case "310":
			entity.polygon.material = Cesium.Color.LIGHTGREY.withAlpha( 0.5 );
			break;
		case "410":
			entity.polygon.material = Cesium.Color.SANDYBROWN.withAlpha( 0.5 );
			break;
		case "130":
			entity.polygon.material = Cesium.Color.ROSYBROWN.withAlpha( 0.5 );
			break;
		}	

}

}