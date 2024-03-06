import Datasource from './datasource.js'; 
import { useGlobalStore } from '../stores/globalStore.js';
import * as Cesium from 'cesium';

export default class View {
	constructor( viewer ) {
		this.viewer = viewer;
		this.dataSourceService = new Datasource( this.viewer );
		this.store = useGlobalStore();
	}

	// Function to switch to 2D view
	switchTo2DView() {

		// Find the data source for postcodes
		const postCodesDataSource = this.dataSourceService.getDataSourceByName( 'PostCodes' );
    
		// Iterate over all entities in the postcodes data source.
		for ( let i = 0; i < postCodesDataSource._entityCollection._entities._array.length; i++ ) {
        
			let entity = postCodesDataSource._entityCollection._entities._array[ i ];
        
			// Check if the entity posno property matches the postalcode.
			if ( entity._properties._posno._value  == this.store.postalcode ) {
        
				// TODO create function that takes size of postal code area and possibile location by the sea into consideration and sets y and z based on thse values
				this.viewer.camera.flyTo( {
					destination: Cesium.Cartesian3.fromDegrees( entity._properties._center_x._value, entity._properties._center_y._value, 3500 ),
					orientation: {
						heading: Cesium.Math.toRadians( 0.0 ),
						pitch: Cesium.Math.toRadians( -90.0 ),
					},
					duration: 3
				} );
            
			}
		}

		// change label
		this.changeLabel( 'switchViewLabel', '3D view' );

	}
  
	// Function to switch back to 3D view
	switchTo3DView() {
		// Find the data source for postcodes
		const postCodesDataSource = this.dataSourceService.getDataSourceByName( 'PostCodes' );
    
		// Iterate over all entities in the postcodes data source.
		for ( let i = 0; i < postCodesDataSource._entityCollection._entities._array.length; i++ ) {
        
			let entity = postCodesDataSource._entityCollection._entities._array[ i ];
        
			// Check if the entity posno property matches the postalcode.
			if ( entity._properties._posno._value  == this.store.postalcode ) {
        
				// TODO create function that takes size of postal code area and possibile location by the sea into consideration and sets y and z based on thse values
				this.viewer.camera.flyTo( {
					destination: Cesium.Cartesian3.fromDegrees( entity._properties._center_x._value, entity._properties._center_y._value - 0.025, 2000 ),
					orientation: {
						heading: 0.0,
						pitch: Cesium.Math.toRadians( -35.0 ),
						roll: 0.0
					},
					duration: 3
				} );
            
			}
		}

		// change label
		this.changeLabel( 'switchViewLabel', '2D view' );

	}

	/**
 * Gets label element by id and changes it 
 * 
 * @param { String } id - The Cesium viewer object
 * @param { String } text - The window position to pick the entity
 */
	changeLabel( id, text ) {

		const labelElement = document.getElementById( id );
		labelElement.innerHTML = text;

	}


}