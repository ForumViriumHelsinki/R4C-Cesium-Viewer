import * as Cesium from 'cesium';
import axios from 'axios';
import Datasource from './datasource.js'; 
import { useGlobalStore } from '../stores/globalStore.js';
import ElementsDisplay from './elementsDisplay.js';

export default class ColdArea {
	constructor( ) {
		this.datasourceService = new Datasource();
		this.elementsDisplayService = new ElementsDisplay();
		this.store = useGlobalStore();

	}

	addColdPoint( location ) {
    
		const coordinates = location.split( ',' ); 
    
		this.store.cesiumViewer.entities.add( {
			position: Cesium.Cartesian3.fromDegrees( Number( coordinates[ 1 ] ), Number( coordinates[ 0 ] ) ),
			name: 'coldpoint',
			point: {
				show: true, 
				color: Cesium.Color.ROYALBLUE, 
				pixelSize: 15, 
				outlineColor: Cesium.Color.LIGHTYELLOW, 
				outlineWidth: 5, 
			},
		} );
    
	}

	/**
 * Loads ColdArea data for a given postcode asynchronously
 * 
 * @returns {Promise} - A promise that resolves once the data has been loaded
 */
	async loadColdAreas( ) {
		const url = '/pygeoapi/collections/coldarea/items?f=json&limit=100000&posno=' + this.store.postalcode;
		this.store.setIsLoading( true );

		fetch( url )
			.then( response => response.json() )
			.then( data => { this.addColdAreaDataSource( data ); } )
			.catch( error => { console.log( 'Error loading ColdAreas:', error ); } );
	}

	/**
 * Adds a ColdArea data source to the viewer
 * 
 * @param {Object} data - The ColdArea data to be added as a data source
 */
	async addColdAreaDataSource ( data ) {

		let entities = await this.datasourceService.addDataSourceWithPolygonFix( data, 'ColdAreas' );

		if ( entities ) {

			this.elementsDisplayService.setColdAreasElementsDisplay( 'inline-block' );
			for ( let i = 0; i < entities.length; i++ ) {
			
				let entity = entities[ i ];
            
				if ( entity._properties._heatexposure && entity.polygon ) {

					entity.polygon.material = new Cesium.Color( 1, 1 - entity._properties._heatexposure._value, 0, entity._properties._heatexposure._value );
					entity.polygon.outlineColor = Cesium.Color.BLACK; 
					entity.polygon.outlineWidth = 3; 
	
				}
			}
		}

		this.store.setIsLoading( false );

	}
}
