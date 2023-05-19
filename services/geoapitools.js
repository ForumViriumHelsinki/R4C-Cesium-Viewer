
/**
 * Resets the objects displayed, camera orientation, and switches to their default state
 */
function reset( ) {

    removeDataSourcesAndEntities();
    resetViewer( );
    resetSwitches( );
    postalcode = null;
    // Load post code zones & energy availability tags
	loadPostCodeZones( 0.2 );
	
	document.getElementById( 'printContainer' ).innerHTML =  "<i>Please click on a postcode area to load building and nature areas from the WFS server...</i>";

}

/**
 * Resets the switches to their default state
 */
function resetSwitches( ) {

	document.getElementById( "showPlotToggle" ).checked = true;
	document.getElementById( "showVegetationToggle" ).checked = false;
    document.getElementById( "showOtherNatureToggle" ).checked = false;
	document.getElementById( "printToggle" ).checked = true;
    document.getElementById( "hideNonSoteToggle" ).checked = false;	
    document.getElementById( "hideLowToggle" ).checked = false;	
    document.getElementById( "hideNonSoteToggle" ).disabled = true;
    document.getElementById( "hideLowToggle" ).disabled = true;
    document.getElementById( "showTreesToggle" ).checked = false;
    setPrintVisible( );
    hideAllPlots( );    

  	showPlot = true;
    showVegetation = false;
    showOtherNature = false;
	hideNonSote = false;
    hideLow = false;
	print = true;

}

/**
 * Removes all data sources and entities from the viewer
 */
function removeDataSourcesAndEntities( ) {

    viewer.dataSources.removeAll( );
    viewer.entities.removeAll( );

}

/**
 * Resets the viewer's camera to Helsinki with a specific orientation
 */
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

/**
 * Loads postal code zone polygons with the given opacity
 * 
 * @param {number} opacity - The opacity of the polygons (range from 0 to 1)
 */
function loadPostCodeZones( opacity ) {
    // Load postal code zones
    const HKIPostCodesURL = 'assets/data/hki_po_clipped.json';
	console.log( "Loading: " + HKIPostCodesURL );
	
	let promisePostCodes = Cesium.GeoJsonDataSource.load( HKIPostCodesURL, {
  		stroke: Cesium.Color.BLACK,
  		fill: new Cesium.Color( 0.3, 0.3, 0.3, opacity ),
  		strokeWidth: 8,
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

/**
 * Finds the bounding box of an entity and returns the latitude and longitude bounds
 * 
 * @param {Cesium.Entity} element - The entity to find the bounds for
 * @returns {number[]} - An array containing the latitude and longitude bounds in the order [latMIN, latMAX, lonMIN, lonMAX]
 */	
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

/**
 * This function sets the visibility of HTML elements related to printing and geocoder to "visible", making them visible on the webpage.  
 * 
 */
function setPrintVisible( ) {
    document.getElementById( 'printContainer' ).style.visibility = 'visible';
    document.getElementById( 'searchcontainer' ).style.visibility = 'visible';
    document.getElementById( 'georefContainer' ).style.visibility = 'visible';
    document.getElementById( 'searchbutton' ).style.visibility = 'visible';
}

/**
 * Returns the selected text of a dropdown menu with the given element ID.
 * 
 * @param { string } elementId - The ID of the HTML element that represents the dropdown menu.
 * @returns { string } The selected text of the dropdown menu, or null if no option is selected.
 */
function getSelectedText( elementId ) {

    const elt = document.getElementById( elementId );
  
    if ( elt.selectedIndex == -1 ) {

      return null;

    }
  
    return elt.options[ elt.selectedIndex ].text;

}


/**
 * Shows all plots and select elements
 * 
 * */
function showAllPlots( ) {

    document.getElementById( 'plotContainer' ).style.visibility = 'visible';
    document.getElementById( 'plotSoSContainer' ).style.visibility = 'visible';
    document.getElementById( 'plotMaterialContainer' ).style.visibility = 'visible';
    document.getElementById( 'numericalSelect' ).style.visibility = 'visible';
    document.getElementById( 'categoricalSelect' ).style.visibility = 'visible'; 

}

/**
 * Hides all plots and select elements
 * 
 * */
function hideAllPlots( ) {

    document.getElementById( 'plotContainer' ).style.visibility = 'hidden';
    document.getElementById( 'plotSoSContainer' ).style.visibility = 'hidden';
    document.getElementById( 'numericalSelect' ).style.visibility = 'hidden';
    document.getElementById( 'categoricalSelect' ).style.visibility = 'hidden';
    document.getElementById( 'plotMaterialContainer' ).style.visibility = 'hidden';
    document.getElementById( 'categoricalSelect' ).value = 'c_julkisivu';
    document.getElementById( 'numericalSelect' ).value = 'measured_height';


}

/**
 * Hides all plots and select elements
 * 
 * */
function hideAllPlots( ) {

    document.getElementById( 'plotContainer' ).style.visibility = 'hidden';
    document.getElementById( 'plotSoSContainer' ).style.visibility = 'hidden';
    document.getElementById( 'numericalSelect' ).style.visibility = 'hidden';
    document.getElementById( 'categoricalSelect' ).style.visibility = 'hidden';
    document.getElementById( 'plotMaterialContainer' ).style.visibility = 'hidden';
    document.getElementById( 'categoricalSelect' ).value = 'c_julkisivu';
    document.getElementById( 'numericalSelect' ).value = 'measured_height';


}
