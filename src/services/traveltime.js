import Datasource from "./datasource.js"; 
import * as Cesium from "cesium";

export default class Traveltime {
  constructor( viewer ) {
    this.viewer = viewer;
    this.datasourceService = new Datasource( viewer );
  }


/**
 * Fetches data from API Features based on grid from_id value
 * 
 * @param { NUmber } from_id
 */
async loadTravelTimeData( from_id ) {

	fetch( "https://geo.fvh.fi/r4c/collections/hki_travel_time/items?f=json&limit=2&from_id=" + from_id )
    .then( function( response ) {
        loadGeoJsonDataSource( 0.0, 'assets/data/populationgrid.json', 'PopulationGrid' );

        return response.json();
	})
    .then( function( traveltimedata ) {

        addTravelTimeLabels( traveltimedata.features[ 0 ].properties.travel_data, from_id );

		//	return response.json();
		}).catch(
            ( e ) => {
	
				console.log( 'something went wrong', e );
	
			}
		);
}

addTravelTimeLabels(traveldata, from_id) {

    const geoJsonData = {
        type: "FeatureCollection",
        features: []
      };

    const dataSourceTravelLabel = new Cesium.CustomDataSource('TravelLabel');
    this.viewer.dataSources.add(dataSourceTravelLabel);

    const dataSource = this.viewer.dataSources.getByName('TravelTimeGrid');

    if (dataSource) {
        const entities = dataSource[ 0 ]._entityCollection._entities._array;

        entities.forEach(function (entity) {
            if (entity.polygon) {
                const entityId = entity.properties.id.getValue();

                // Find the corresponding data in your traveldata
                const matchingData = traveldata.find(function (data) {
                    return Number(data.to_id) === Number(entityId);
                });

                if (matchingData) {

                    const hierarchy = entity.polygon.hierarchy.getValue().positions;

                    // Calculate the center of the polygon's vertices
                    const boundingSphere = Cesium.BoundingSphere.fromPoints(hierarchy);
                    const centerCartesian = boundingSphere.center;
                    
                    // Convert the center to latitude and longitude in degrees
                    const centerLL84 = Cesium.Cartographic.fromCartesian(centerCartesian);
                    const centerLatitude = Cesium.Math.toDegrees(centerLL84.latitude);
                    const centerLongitude = Cesium.Math.toDegrees(centerLL84.longitude);

                    // Create the GeoJSON feature with the center coordinates
                    const feature = {
                      type: "Feature",
                      geometry: {
                        type: "Point",
                        coordinates: [centerLongitude, centerLatitude] // Replace "coordinates area" with the actual coordinates
                      },
                      properties: {
                        time: Number( matchingData.pt_m_walk_avg ).toFixed( 0 ),
                        id: Number(matchingData.to_id)
                      }
                    };
                    
                    geoJsonData.features.push(feature);
                }
            }
        });
    } else {
        console.error("TravelTimeGrid data source not found.");
    }
    
    this.removeTravelTimeGridAndAddDataGrid();
    this.addTravelLabelDataSource( geoJsonData );

}

removeTravelTimeGridAndAddDataGrid( ) {

    this.datasourceService.removeDataSourcesByNamePrefix( 'TravelTimeGrid' );

    if ( document.getElementById( "natureGridToggle" ).checked ) {
    
        natureGrid( );
    
    } else {

        populationGrid( );
    
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
    });

    // Add the data source to the viewer
    this.viewer.dataSources.add( Cesium.GeoJsonDataSource.load( data, {

	}) )
	.then( function ( dataSource ) {
		
        // Set a name for the data source
        dataSource.name = "TravelLabel";
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
                        scaleByDistance: new Cesium.NearFarScalar(4000, 1, 80000, 0.0)

                    };
                
            }

            entity.billboard = undefined; // Remove any billboard icon
            entity.point = undefined; // Remove any point marker
            entity.polyline = undefined; // Remove any polyline
            entity.polygon = undefined; // Remove any polygon

		}
	})	
	.catch(function ( error ) {
		// Log any errors encountered while loading the data source
		console.log( error );
	});

}

}