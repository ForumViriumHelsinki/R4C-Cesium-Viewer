import Datasource from "./datasource.js"; 
import * as Cesium from "cesium";
import axios from 'axios';

export default class Vegetation {
  constructor( viewer ) {
    this.datasourceService = new Datasource( viewer );
  }



/**
 * Loads vegetation data for a given postcode asynchronously
 * 
 * @param {string} postcode - The postcode for which to load vegetation data
 * @returns {Promise} - A promise that resolves once the data has been loaded
 */
async loadVegetation(postcode) {
    let url = "https://geo.fvh.fi/r4c/collections/vegetation/items?f=json&limit=10000&postinumero=" + postcode;

    try {
      const cacheApiUrl = `http://localhost:3000/api/cache/get?key=${encodeURIComponent(url)}`;
      const cachedResponse = await axios.get( cacheApiUrl );
      const cachedData = cachedResponse.data;

      if ( cachedData ) {

        console.log("found from cache");
        this.addVegetationDataSource( cachedData );

      } else {

        this.loadVegetationWithoutCache( url);

      }
    } catch (err) {
      console.log(err);
    }
  }

/**
 * Adds a vegetation data source to the viewer
 * 
 * @param {Object} data - The vegetation data to be added as a data source
 */
async addVegetationDataSource ( data ) {

    let entities = await this.datasourceService.addDataSourceWithPolygonFix(data, 'Vegetation');
	
    for ( let i = 0; i < entities.length; i++ ) {
			
		let entity = entities[ i ];
		const category = entity.properties._koodi._value;
            
        if ( category ) {
			//colors of nature area enity are set based on it's category
			this.setVegetationPolygonMaterialColor( entity, category )
		}	
	}
}

/**
 * Loads vegetation data from the provided URL without using cache
 * 
 * @param {string} url - The URL from which to load vegetation data
 */
loadVegetationWithoutCache( url ) {
    console.log("Not in cache! Loading: " + url);

    fetch( url )
      .then( response => response.json() )
      .then( data => {
        axios.post( 'http://localhost:3000/api/cache/set', { key: url, value: data });
        this.addVegetationDataSource( data );
      })
      .catch( error => {
        console.log( "Error loading vegetation:", error );
      });
}

/**
 * Sets the polygon material color for a vegetation entity based on its category
 * 
 * @param {Object} entity - The vegetation entity
 * @param {string} category - The category of the vegetation entity
 */
setVegetationPolygonMaterialColor( entity, category ) {
	 						
	switch ( category ){
		case "212":
			entity.polygon.extrudedHeight = 0.1;
			entity.polygon.material = Cesium.Color.LIGHTGREEN.withAlpha( 0.5 );
			break;
		case "211":
			entity.polygon.extrudedHeight = 0.5;
			entity.polygon.material = Cesium.Color.GREENYELLOW.withAlpha( 0.5 );
			break;
		case "510":
			entity.polygon.material = Cesium.Color.DEEPSKYBLUE.withAlpha( 0.5 );
			break;
		case "520":
			entity.polygon.material = Cesium.Color.DODGERBLUE.withAlpha( 0.5 );
			break;
	}	
}
}