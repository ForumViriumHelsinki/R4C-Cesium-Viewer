import * as Cesium from 'cesium';
import { useGlobalStore } from '../stores/globalStore.js';

export default class Printbox {

	constructor( ) {
		this.store = useGlobalStore();
		this.viewer = this.store.cesiumViewer;
	}

	/**
    * Prints the properties of the picked Cesium entity
    * 
    * @param {Object} id - The ID of the picked entity
    */
	printCesiumEntity( id ) {

		document.getElementById( 'printContainer' ).scroll( {
			top: 0,
			behavior: 'instant'
		} );

		if ( id._polygon && id.properties ) {
			var toPrint = '<u>Found following properties & values:</u><br/>';	

			//Highlight for clicking...
			let oldMaterial = id.polygon.material;
			id.polygon.material = new Cesium.Color( 1, 0.5, 0.5, 0.8 );
			setTimeout( () => { id.polygon.material = oldMaterial; }, 5000 );

			let length = id.properties.propertyNames.length;
			for ( let i = 0; i < length; ++i ) {

										if ( goodForPrint( id.properties, i ) ) {

				toPrint = toPrint + id.properties.propertyNames[ i ] + ': ' + id.properties[ id.properties.propertyNames[ i ] ] + '<br/>';
}
			}
		}

		console.log( toPrint );

		this.addToPrint( toPrint, id.properties.posno );    

	}

	/**
    * Adds the provided content to the print container
    * 
    * @param {string} toPrint - The content to be added to the print container
    * @param {string} postno - The postal code associated with the content
    */  
	addToPrint( toPrint, postno ) {

		if ( postno ) {

			toPrint = toPrint + '<br/><br/><i>Click on objects to retrieve information.</i>';
    
		} else {
    
			toPrint = toPrint + '<br/><br/><i>If average urban heat exposure of building is over 0.5 the areas with under 0.4 heat exposure is shown on map.</i>';
    
		}
    
		document.getElementById( 'printContainer' ).innerHTML = toPrint;
		document.getElementById( 'printContainer' ).scroll( {
			top: 1000,
			behavior: 'smooth'
		} );    
	}

	/**
  * Creates content for printing from postal code properties
  *
  * @param { string } postalcode postal code of new zone
  */
	createToPrint( postalcode ) {

		let toPrint = '<u>Found following properties & values:</u><br/>';	

		this.viewer.dataSources._dataSources.forEach( function( dataSource ) {
            
			if ( dataSource.name == 'PostCodes' ) {

				for ( let i = 0; i < dataSource._entityCollection._entities._array.length; i++ ) {

					let entity = dataSource._entityCollection._entities._array[ i ];

					if ( entity._properties._posno._value == postalcode ) {

						let length = entity._properties._propertyNames.length;

						for ( let i = 0; i < length; ++i ) {

										if ( goodForPrint( id.properties, i ) ) {


							toPrint = toPrint + entity._properties._propertyNames[ i ] + ': ' + entity._properties[ entity._properties._propertyNames[ i ] ]._value + '<br/>';
                        }
						}                    
                    
					} 

				}						
			}
		} ); 
    
		this.addToPrint( toPrint, postalcode );

	}



}

const goodForPrint = ( properties, i ) => {

	return !properties.propertyNames[ i ].includes( 'fid' ) && !properties.propertyNames[ i ].includes( '_id' ) && !properties.propertyNames[ i ].includes( 'value' ) && properties.propertyNames[ i ] != 'id' && properties[ properties.propertyNames[ i ] ]._value;

};