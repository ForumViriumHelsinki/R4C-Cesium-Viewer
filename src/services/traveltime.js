import Datasource from './datasource.js'; 
import Populationgrid from './populationgrid.js';
import * as Cesium from 'cesium';
import { useGlobalStore } from '../stores/globalStore.js';
import { useToggleStore } from '../stores/toggleStore.js';

export default class Traveltime {
	constructor( ) {
		this.toggleStore = useToggleStore();
		this.store = useGlobalStore();
		this.viewer = this.store.cesiumViewer;
		this.datasourceService = new Datasource();
		this.populationGridService = new Populationgrid();
	}


	/**
 * Fetches data from API Features based on grid from_id value
 * 
 * @param { NUmber } from_id
 */
	async loadTravelTimeData( from_id ) {

		fetch( '/pygeoapi/collections/hki_travel_time/items?f=json&limit=2&from_id=' + from_id )
			.then( ( response ) => {
				return response.json();
			} )
			.then( ( traveltimedata ) => {
				this.addTravelTimeLabels( traveltimedata.features[0].properties.travel_data );
			} )
			.catch( ( e ) => {
				console.log( 'something went wrong', e );
			} );
	}

	addTravelTimeLabels( traveldata ) {

		const geoJsonData = {
			type: 'FeatureCollection',
			features: []
		};

		const dataSourceTravelLabel = new Cesium.CustomDataSource( 'TravelLabel' );
		this.viewer.dataSources.add( dataSourceTravelLabel );

		const dataSource = this.viewer.dataSources.getByName( 'TravelTimeGrid' );

		if ( dataSource ) {
			const entities = dataSource[ 0 ]._entityCollection._entities._array;

			entities.forEach( function ( entity ) {
				if ( entity.polygon ) {
					const entityId = entity.properties.id.getValue();

					// Find the corresponding data in your traveldata
					const matchingData = traveldata.find( function ( data ) {
						return Number( data.to_id ) === Number( entityId );
					} );

					if ( matchingData ) {

						const hierarchy = entity.polygon.hierarchy.getValue().positions;

						// Calculate the center of the polygon's vertices
						const boundingSphere = Cesium.BoundingSphere.fromPoints( hierarchy );
						const centerCartesian = boundingSphere.center;
                    
						// Convert the center to latitude and longitude in degrees
						const centerLL84 = Cesium.Cartographic.fromCartesian( centerCartesian );
						const centerLatitude = Cesium.Math.toDegrees( centerLL84.latitude );
						const centerLongitude = Cesium.Math.toDegrees( centerLL84.longitude );

						// Create the GeoJSON feature with the center coordinates
						const feature = {
							type: 'Feature',
							geometry: {
								type: 'Point',
								coordinates: [ centerLongitude, centerLatitude ] // Replace "coordinates area" with the actual coordinates
							},
							properties: {
								time: Number( matchingData.pt_m_walk_avg ).toFixed( 0 ),
								id: Number( matchingData.to_id )
							}
						};
                    
						geoJsonData.features.push( feature );
					}
				}
			} );
		} else {
			console.error( 'TravelTimeGrid data source not found.' );
		}
    
		this.removeTravelTimeGridAndAddDataGrid();
		this.addTravelLabelDataSource( geoJsonData );

	}

	async removeTravelTimeGridAndAddDataGrid() {

		this.datasourceService.removeDataSourcesByNamePrefix( 'TravelTimeGrid' );
		await this.populationGridService.createPopulationGrid();

		if ( this.toggleStore.travelTime ) {
    
			const dataSource = this.datasourceService.getDataSourceByName( 'PopulationGrid' );

			if ( !dataSource ) {
				console.error( 'Data source with name PopulationGrid not found.' );
				return [];
			}
    
			// Get the entities of the data source
			const entities = dataSource.entities.values;

			for ( let i = 0; i < entities.length; i++ ) {

				let entity = entities[ i ];
				this.populationGridService.setGridEntityPolygonToGreen( entity );
    
			}

			this.toggleStore.travelTime = false;
    
		} 

	}


	/**
 * Adds the data to viewer's datasources
 *
 * @param { Array<Object> }  data 
 * 
 */
	addTravelLabelDataSource( data ) {

		var dataSource = new Cesium.GeoJsonDataSource();
  
		// Load the GeoJSON data into the data source
		dataSource.load( data, {
			markerColor: Cesium.Color.ORANGE, // Customize the marker color if desired
			clampToGround: true // Set to true to clamp entities to the ground
		} );

		// Add the data source to the viewer
		this.viewer.dataSources.add( Cesium.GeoJsonDataSource.load( data, {

		} ) )
			.then( function ( dataSource ) {
		
				// Set a name for the data source
				dataSource.name = 'TravelLabel';
				const entities = dataSource.entities.values;
        
		
				// Iterate over the entities and add labels for "temp_air" and "rh_air"
				for ( let i = 0; i < entities.length; i++ ) {
			
					let entity = entities[ i ];
					const time = entity._properties._time._value;

					if ( time ) {

						entity.label = {
							text: time.toString(), 
							showBackground: false,
							font: '24px sans-serif',
							horizontalOrigin : Cesium.HorizontalOrigin.CENTER,
							verticalOrigin : Cesium.VerticalOrigin.CENTER,
							fillColor: Cesium.Color.BLACK,
							backgroundColor: Cesium.Color.WHITE,
							eyeOffset: new Cesium.Cartesian3( 0, 20, -20 ),
							scaleByDistance: new Cesium.NearFarScalar( 4000, 1, 80000, 0.0 )

						};
                
					}

					entity.billboard = undefined; // Remove any billboard icon
					entity.point = undefined; // Remove any point marker
					entity.polyline = undefined; // Remove any polyline
					entity.polygon = undefined; // Remove any polygon

				}
			} )	
			.catch( function ( error ) {
				// Log any errors encountered while loading the data source
				console.log( error );
			} );

	}

	markCurrentLocation( entity ) {
    
		const hierarchy = entity.polygon.hierarchy.getValue().positions;
    
		// Calculate the center of the polygon's vertices
		const boundingSphere = Cesium.BoundingSphere.fromPoints( hierarchy );
		const centerCartesian = boundingSphere.center;
    
		this.viewer.entities.add( {
			position: centerCartesian,
			name: 'currentLocation',
			point: {
				show: true, 
				color: Cesium.Color.BLACK, 
				pixelSize: 42, 
				outlineColor: Cesium.Color.BLACK, 
				outlineWidth: 14, 
				eyeOffset: new Cesium.Cartesian3( 0, 200, -200 ),
				scaleByDistance: new Cesium.NearFarScalar( 4000, 1, 40000, 0.0 )
			},
		} );
    
    
	}

}
