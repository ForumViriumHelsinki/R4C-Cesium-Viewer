import Datasource from "./datasource.js"; 
import * as Cesium from "cesium";
import localforage from 'localforage';

export default class Flood {
  constructor( viewer ) {
    this.datasourceService = new Datasource( viewer );
  }

  /**
 * Loads othernature data for a given postcode asynchronously
 * 
 * @param {string} postcode - The postcode for which to load othernature data
 * @returns {Promise} - A promise that resolves once the data has been loaded
 */
async loadFlood( postcode ) {

	let url = "https://geo.fvh.fi/r4c/collections/flood_data/items?f=json&limit=20000&postinumero=" + postcode ;

	try {
		const value = await localforage.getItem( url );
		// This code runs once the value has been loaded
		// from the offline store.

		if ( value ) {
			console.log("found from cache");

			let datasource = JSON.parse( value )
		  	this.addFloodDataSource( datasource );

		} else {

			this.loadFloodWithoutCache( url );

		}
	  	
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
async addFloodDataSource( data ) {
	
    let entities = await this.datasourceService.addDataSourceWithPolygonFix(data, 'Flood');
    this.setColorAndMaterial( entities );

}

/**
 * Loads othernature data from the provided URL without using cache
 * 
 * @param {string} url - The URL from which to load othernature data
 */
loadFloodWithoutCache( url ) {

    console.log("Not in cache! Loading: " + url );

    const response = fetch( url )
        .then( (response) => response.json() )
        .then( (data) => {
			localforage.setItem( url, JSON.stringify( data ) );
            this.addFloodDataSource( data );
        });
	
}

/**
 * Finds and sets color and the material for each entity in the datasource
 *
 * @param { Array<Object> }  entities in the datasource
 * 
 */
setColorAndMaterial( entities ) {

    for ( let i = 0; i < entities.length; i++ ) {

        let entity = entities[ i ];

        if ( entity.properties.water && entity.polygon ) {

            let value = this.findFloodColor( Number( entity.properties.water._value ) );
            entity.polygon.material = Cesium.Color.fromCssColorString( value );
            let material = this.findMaterial( Number( entity.properties.material._value ) );
            entity.properties.material = material;
            entity.polygon.extrudedHeight = entity.properties.water._value * 0.1;


        } 

    }

}

/**
 * Finds the material based on flood feature's material code
 *
 * @param { number  } material code
 * @return { string } material
 */
findMaterial( value ) {

    switch ( value ) {
        case 1:
            return 'Tie';  
        case 2:
            return 'Apuaineiston mukainen rakennus';     
        case 3:
            return 'Muu vettä läpäisemätön pinta';  
        case 4:
            return 'Pellot';  
        case 5:
            return 'Muu avoin matala kasvillisuus';  
        case 6:
            return 'Puusto 2-10 m';     
        case 7:
            return 'Puusto 10-15 m';  
        case 8:
            return 'Puusto 15-20 m';
        case 9:
            return 'Puusto >20 m';
        case 10:
            return 'Paljas maa';
        case 11:
            return 'Vesi';                                                                                                                                                                      
    }
}


/**
 * Finds the hex code based on flood feature's water level
 *
 * @param { number  } water value
 * @return { string } hex color code
 */
findFloodColor( value ) {

    switch ( true ) {
    
        case value >= 1.0:
            return '#311465'; 
        case value >= 0.9:
            return '#00008B';              
        case value >= 0.8:
            return '#0052A2';     
        case value >= 0.7:
            return '#1b7ced';  
        case value >= 0.6:
            return '#19BDFF';  
        case value >= 0.5:
            return '#37C6FF';  
        case value >= 0.4:
            return '#55CEFF';     
        case value>= 0.3:
            return '#73D7FF';  
        case value >= 0.2:
            return '#91E0FF';
        case value >= 0.1:
            return '#A5E5FF';  
                                                                                                                                                                    
    }
}

updateFloodSwitch( display ) {

    let switchElement = document.getElementById('floodSwitch');
    let labelElement = document.getElementById('floodLabel');

    switchElement.style.display = display;
    labelElement.style.display = display;

}

}