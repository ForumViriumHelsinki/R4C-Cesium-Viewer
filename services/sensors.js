/**
 * Fetches latest sensor data
 * 
 */
async function loadSensorData( ) {

	const data = fetch( "https://bri3.fvh.io/opendata/r4c/r4c_last.geojson" )
    .then( response => response.json())
    .then( data => {
      // Create a Cesium data source
      var dataSource = new Cesium.GeoJsonDataSource();
  
      // Load the GeoJSON data into the data source
      dataSource.load( data, {
        markerColor: Cesium.Color.ORANGE, // Customize the marker color if desired
        clampToGround: true // Set to true to clamp entities to the ground
      });
	
		addSensorDataSource( data );

		//	return response.json();
		}).catch(
            ( e ) => {
	
				console.log( 'something went wrong', e );
	
			}
		);
}


/**
 * Adds the data to viewer's datasources
 *
 * @param { Array<Object> }  data 
 * 
 */
function addSensorDataSource( data ) {

    // Add the data source to the viewer
    viewer.dataSources.add( Cesium.GeoJsonDataSource.load( data, {
		stroke: Cesium.Color.BLACK,
		fill: Cesium.Color.DARKGREEN,
		strokeWidth: 3,
		clampToGround: true
	}) )
	.then( function ( dataSource ) {
		
        // Set a name for the data source
        dataSource.name = "SensorData";
        let entities = dataSource.entities.values;
        
		
        // Iterate over the entities and add labels for "temp_air" and "rh_air"
	    for ( let i = 0; i < entities.length; i++ ) {
			
		    let entity = entities[ i ];
            let measurement = entity.properties._measurement._value;

            if ( measurement ) {
                let tempAir = measurement.temp_air;
                let rhAir = measurement.rh_air;
                
                if ( tempAir !== undefined && rhAir !== undefined ) {
                    entity.label = {
                        text: 'Temp: ' + tempAir.toFixed( 2 ) + '°C\nRH: ' + rhAir.toFixed( 2 ) + '%',
                        showBackground: true,
                        font: '14px sans-serif',
                        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
                        verticalOrigin: Cesium.VerticalOrigin.TOP,
                        pixelOffset: new Cesium.Cartesian2(8, -8),
                        fillColor: Cesium.Color.BLUE,
                        showBackground: true,
                        backgroundColor: Cesium.Color.YELLOW
                    };
                }
            }
		}
	})	
	.otherwise(function ( error ) {
		// Log any errors encountered while loading the data source
		console.log( error );
	});

}