// Resets the objects displayed and camera orientation
function reset( ) {

    removeDataSourcesAndEntities();
    resetViewer( );
    resetSwitches( );
    // Load post code zones & energy availability tags
	loadPostCodeZones( 0.2 );
	
	document.getElementById( 'printContainer' ).innerHTML =  "<i>Please click on a postcode area to load building and nature areas from the WFS server...</i>";

}

// Resets the switches
function resetSwitches( ) {

	document.getElementById( 'plotContainer' ).style.visibility = 'hidden';
    document.getElementById( "plotSoSContainer" ).style.visibility = 'hidden';
	document.getElementById( "showPlotToggle" ).checked = true;
	document.getElementById( "showNatureToggle" ).checked = false;
	document.getElementById( "printToggle" ).checked = true;
    document.getElementById( "showNatureHeatToggle" ).checked = false;	
    document.getElementById( "hideNonSoteToggle" ).checked = false;	
    document.getElementById( "hideLowToggle" ).checked = false;	
    document.getElementById("showNatureHeatToggle").disabled = true;

  	showPlot = true;
	showNature = false;
    showNatureHeat = false;
	hideNonSote = false;
    hideLow = false;
	print = true;

}

function removeDataSourcesAndEntities( ) {

    viewer.dataSources.removeAll( );
    viewer.entities.removeAll( );

}

// Resets the objects displayed and camera orientation
function resetViewer( ) {
    // Fly the camera to Helsinki at the given longitude, latitude, and height.
    viewer.camera.flyTo({
        destination : Cesium.Cartesian3.fromDegrees( 24.941745, 60.165464, 35000 ), 
        orientation : {
            heading : Cesium.Math.toRadians( 0.0 ),
            pitch : Cesium.Math.toRadians( -85.0 ),
        }
    });

}

// Loads postal code zone polygons, opacity given as float from 0 - 1
function loadPostCodeZones( opacity ) {
    // Load postal code zones
    const HKIPostCodesURL = 'assets/data/Helsinki_postinumerot.geojson';
	console.log( "Loading: " + HKIPostCodesURL );
	
	let promisePostCodes = Cesium.GeoJsonDataSource.load( HKIPostCodesURL, {
  		stroke: Cesium.Color.BLACK,
  		fill: new Cesium.Color( 0.3, 0.3, 0.3, opacity ),
  		strokeWidth: 5,
		clampToGround: false
	})
	.then( function ( dataSource ) {
        dataSource.name = "PostCodes";
		viewer.dataSources.add( dataSource );
		let entities = dataSource.entities.values;
	})	
	.otherwise( function ( error ) {
      //Display any errrors encountered while loading.
      console.log( error );
    });
}

	
function findEntityBounds( element ) {
	
    let i = 0;

    //These hold the bounding box
    let latMIN = 0;
    let latMAX = 0;
    let lonMIN = 0;
    let lonMAX = 0;

	//viewer.dataSources._dataSources[0].entities._entities._array[0]._polygon._hierarchy._value.positions[0]
    while ( i < element._polygon._hierarchy._value.positions.length ) {

        //Assemble lat & lon from entity position
        let posDeg = Cesium.Cartographic.fromCartesian( element._polygon._hierarchy._value.positions[ i ] );

        //First run
        if ( i == 0 ) {
            latMIN = posDeg.latitude;
            latMAX = posDeg.latitude;
            lonMIN = posDeg.longitude;
            lonMAX = posDeg.longitude;
        }
        
        if ( posDeg.latitude < latMIN ) {
            latMIN = posDeg.latitude;
        }

        if ( posDeg.latitude > latMAX ) {
            latMAX = posDeg.latitude;
        }

        if ( posDeg.longitude < lonMIN ) {
            lonMIN = posDeg.longitude;
        }

        if ( posDeg.longitude > lonMAX ) {
            lonMAX = posDeg.longitude;
        }
      
        i++;
    }

    return [ latMIN, latMAX, lonMIN - 0.0002, lonMAX - 0.0002 ];
}