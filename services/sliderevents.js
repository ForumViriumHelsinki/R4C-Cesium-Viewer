/**
 * This function is triggered by a slider event and it checks the value of the slider to determine which function to execute
 *
 * @param { Object } event the slider event
 */
function sliderEvents( event ) {
		
    // If the slider value is "print", call the printEvent function.
    if ( event.target.value == 'print' ) {

        printEvent();

    }
      
    // If the slider value is "showPlot", call the showPlotEvent function.
    if ( event.target.value == 'showPlot' ) {

        showPlotEvent();

    }	

    // If the slider value is "showVegetation", call the showVegetationEvent function.
    if ( event.target.value == 'showVegetation' ) {

        showVegetationEvent();

    }

    // If the slider value is "showOtherNature", call the showOtherNatureEvent function.
    if ( event.target.value == 'showOtherNature' ) {

        showOtherNatureEvent();
    
    }

    // If the slider value is "hideNonSote", call the hideNonSoteEvent function.
    if ( event.target.value == 'hideNonSote' ) {
        
        hideNonSoteEvent();

    }	

    // If the slider value is "hideLow", call the hideLowEvent function.
    if ( event.target.value == 'hideLow' ) {
        
        hideLowEvent();

    }	

    // If the slider value is "showTrees", call the showTrees function.
    if ( event.target.value == 'showTrees' ) {
        
        showTrees();

    }

    // If the slider value is "showSensorData", call the showSensorData function.
    if ( event.target.value == 'showSensorData' ) {
        
        showSensorData();

    }  
    
    // If the slider value is "switchView", call the switchView function.
    if ( event.target.value == 'switchView' ) {
        
        switchView();
    
    }  
            
}

/**
 * This function to show or hide tree entities on the map based on the toggle button state
 *
 */
function showTrees( ) {

    // Get the state of the showTrees toggle button
    const showTrees = document.getElementById( "showTreesToggle" ).checked;

    // If showTrees toggle is on
    if ( showTrees ) {

        // If a postal code is available, load trees for that postal code
        if ( postalcode ) {

            loadTrees( postalcode );

        } 
        
    } else { // If showTrees toggle is off
        
        hideDataSourceByName( "Trees" );
        document.getElementById( 'numericalSelect' ).style.visibility = 'visible';
        document.getElementById( 'categoricalSelect' ).style.visibility = 'visible';
        selectAttributeForScatterPlot( );

    }

}

/**
 * This function to show or hide sensordata entities on the map based on the toggle button state
 *
 */
function showSensorData( ) {

    // Get the state of the showSensorData toggle button
    const showSensorData = document.getElementById( "showSensorDataToggle" ).checked;

    // If showSensorData toggle is on
    if ( showSensorData ) {
        
        loadSensorData( postalcode );
        
    } else { 
        
        hideDataSourceByName( "SensorData" );

    }

}

/**
 * This function to shows all datasources to user.
 *
 */
function showAllDataSources( ) {

    // Set the show property of all data sources to true to show the entities
    viewer.dataSources._dataSources.forEach( function( dataSource ) {

        dataSource.show = true;

    });  
}

/**
 * This function is called when the Object details button is clicked
 *
 */
function printEvent( ) {

    console.log( "Set the print to: " + String( document.getElementById( "printToggle" ).checked ) );
    const print = document.getElementById( "printToggle" ).checked;

    // If print is not selected, hide the print container, search container, georeference container, and search button
    if ( !print ) {

        document.getElementById( 'printContainer' ).style.visibility = 'hidden';
        document.getElementById( 'searchcontainer' ).style.visibility = 'hidden';
        document.getElementById( 'georefContainer' ).style.visibility = 'hidden';
        document.getElementById( 'searchbutton' ).style.visibility = 'hidden';

    } else { // Otherwise, make the print container visible

        setPrintVisible( );

    }

}

/**
 * This function is called when the "Display Plot" toggle button is clicked
 *
 */
function showPlotEvent( ) {

    // Get the value of the "Show Plot" toggle button
    const showPlots = document.getElementById( "showPlotToggle" ).checked;
    
    // Hide the plot and its controls if the toggle button is unchecked
    if ( !showPlots ) {

        showPlot = false;
        hideAllPlots( );

    } else { // Otherwise, show the plot and its controls if the toggle button is checked and the plot is already loaded

        showAllPlots( );
        showPlot = true;

    }

}

/**
 * This function handles the toggle event for showing or hiding the vegetation layer on the map.
 *
 */
function showVegetationEvent( ) {

    // Get the current state of the toggle button for showing nature areas.
    const showVegetation = document.getElementById( "showVegetationToggle" ).checked;

    if ( showVegetation ) {

        // If the toggle button is checked, enable the toggle button for showing the nature area heat map.
        //document.getElementById("showVegetationHeatToggle").disabled = false;

        // If there is a postal code available, load the nature areas for that area.
        if ( postalcode && !getDataSourceByName("Vegetation") ) {

            loadVegetation( postalcode );

        } else {

            showAllDataSources( );
        }

    } else {

        hideDataSourceByName( "Vegetation" );

    }

}

/**
 * This function handles the toggle event for showing or hiding the nature areas layer on the map.
 *
 */
function showOtherNatureEvent( ) {

    // Get the current state of the toggle button for showing nature areas.
    const showloadOtherNature = document.getElementById( "showOtherNatureToggle" ).checked;

    if ( showloadOtherNature ) {

        // If the toggle button is checked, enable the toggle button for showing the nature area heat map.
        //document.getElementById("showloadOtherNature").disabled = false;

        // If there is a postal code available, load the nature areas for that area.
        if ( postalcode && !getDataSourceByName( "OtherNature" ) ) {

            loadOtherNature( postalcode );

        } else {

            showAllDataSources( );
        }


    } else {

        hideDataSourceByName( "OtherNature" );

    }

}

/**
 * Hide non-SOTE buildings and update the histograms and scatter plot based on the selected numerical and categorical data
 */
function hideNonSoteBuildings() {

    const buildingsDataSource = getDataSourceByName( "Buildings" );
    const soteBuildings = filterSoteBuildings( buildingsDataSource );
    const urbanHeatData = mapUrbanHeatData( soteBuildings );
    const urbanHeatDataAndMaterial = [];
    const currentCat = document.getElementById( "categoricalSelect" ).value;
    const currentNum =  document.getElementById( "numericalSelect" ).value;
    const hideNonSote = document.getElementById( "hideNonSoteToggle" ).checked;
    const hideLowToggle = document.getElementById( "hideLowToggle" ).checked;

    // Process the entities in the buildings data source and populate the urbanHeatDataAndMaterial array with scatter plot data
    processEntitiesForScatterPlot( buildingsDataSource.entities.values, urbanHeatDataAndMaterial, currentCat, currentNum, hideNonSote, hideLowToggle );
    
    updateBuildingsVisibility( buildingsDataSource, soteBuildings );

    createScatterPlot( urbanHeatDataAndMaterial, getSelectedText( "categoricalSelect" ), getSelectedText( "numericalSelect" ) );
    createUrbanHeatHistogram( urbanHeatData );    

  }
  
/**
 * Get a data source from the Cesium viewer
 * 
 * @param { String } name name of the datasource
 * @returns { Object } The found data source
*/
function getDataSourceByName( name ) {
    
    return viewer.dataSources._dataSources.find( ds => ds.name === name );

}

/**
 * Get a data source from the Cesium viewer
 * 
 * @param { String } name name of the datasource
*/
function hideDataSourceByName( name ) {

    viewer.dataSources._dataSources.forEach( function( dataSource ) {
        if ( dataSource.name == name ) {
            dataSource.show = false;	
        }
    });
}
  
  /**
   * Filter out non-SOTE buildings from the given data source
   * 
   * @param { Object } dataSource The data source containing buildings
   * @returns { Object[ ] } An array of SOTE buildings
   */
function filterSoteBuildings( dataSource ) {

    return dataSource.entities.values.filter( entity => {
      const kayttotark = Number( entity._properties.c_kayttark._value );
      return kayttotark === 511 || kayttotark === 131 || ( kayttotark > 212 && kayttotark < 240 );
    });

}

  /**
   * Filter out buildings with floor count 6 or less from the given data source
   * 
   * @param { Object } dataSource The data source containing buildings
   * @returns { Object[ ] } An array of SOTE buildings
   */
function filterTallBuildings( dataSource ) {

    return dataSource.entities.values.filter( entity => {
        if ( entity._properties.i_kerrlkm ) {
            return Number( entity._properties.i_kerrlkm._value ) > 6;
        }
    });
    
}
  
/**
 * Get an array of urban heat data from the given array of entities
 * @param { Object[ ] } entities An array of entities with the "avgheatexposuretobuilding" property
 * @returns { Object[ ] } An array of urban heat data
 */
function mapUrbanHeatData( entities ) {
    
    return entities.map( entity => entity._properties.avgheatexposuretobuilding._value );

}
  
  /**
   * Get an array of urban heat data and material from the given array of entities
   * 
   * @param { Object[ ] } entities An array of entities with the "avgheatexposuretobuilding" and "c_kayttark" properties
   * @returns {Object[ ]} An array of objects containing "urban heat" and "material" properties
   */
function mapUrbanHeatDataAndMaterial( entities ) {

    return entities.map( entity => {

      const kayttotark = Number( entity._properties.c_kayttark._value );
      const material = kayttotark === 511 ? "Material A" :
                       kayttotark === 131 ? "Material B" :
                       "Other";
      const urbanHeat = entity._properties.avgheatexposuretobuilding._value;

      return { "material": material, "urban heat": urbanHeat };
    
    });
}
  
/**
 * Show/hide entites based on whether they are in the given array of entities
 * 
 * @param { Object } dataSource The data source containing the entites to show/hide
 * @param { Object[ ] } entitiesToShow An array of entities to show
 */
function updateBuildingsVisibility( dataSource, entitiesToShow ) {
    
    dataSource.entities.values.forEach( entity => {
      if ( entitiesToShow.includes( entity ) ) {

        entity.show = true;

      } else {

        entity.show = false;

      }
    });
}

/**
 * Hides buildings with floor count under 7 and updates histogram & scatter plot
 *
 */
function hideLowBuildings( ) {

    // Get the current numerical and categorical select values
    const currentNum = document.getElementById("numericalSelect").value
    const currentCat= document.getElementById("categoricalSelect").value
    const hideNonSote = document.getElementById( "hideNonSoteToggle" ).checked;
    const hideLowToggle = document.getElementById( "hideLowToggle" ).checked;
    

    // Find the data source for buildings
    const buildingsDataSource = getDataSourceByName( "Buildings" );

    // If the data source isn't found, exit the function
    if ( !buildingsDataSource ) {
        return;
    }

    const tallBuildings = filterTallBuildings( buildingsDataSource );
    const urbanHeatData = mapUrbanHeatData( tallBuildings );

    // Initialize array to hold data for scatter plot
    let urbanHeatDataAndMaterial = [ ];

    // Process the entities in the buildings data source and populate the urbanHeatDataAndMaterial array with scatter plot data
    processEntitiesForScatterPlot( buildingsDataSource.entities.values, urbanHeatDataAndMaterial, currentCat, currentNum, hideNonSote, hideLowToggle );
    
    updateBuildingsVisibility( buildingsDataSource, tallBuildings );

    createScatterPlot( urbanHeatDataAndMaterial, getSelectedText( "categoricalSelect" ), getSelectedText( "numericalSelect" ) );
    createUrbanHeatHistogram( urbanHeatData );    
      
}

/**
 * This function creates a data set required for scatter plotting urban heat exposure.
 *
 * @param { Object } features buildings in postal code area
 * @param { String } categorical name of categorical attribute displayed for user
 * @param { String } numerical name of numerical attribute displayed for user
 * @param { String } categoricalName name of numerical attribute in register
 * @param { String } numericalName name of numerical attribute in registery
 */
function addDataForScatterPlot( urbanHeatDataAndMaterial, entity, categorical, numerical, categoricalName, numericalName ) {
    
    // Check if entity has the required properties.
    if ( entity._properties.avgheatexposuretobuilding && entity._properties[ categoricalName ] && entity._properties[ numericalName ] && entity._properties[ categoricalName ]._value ) {

         // Get the numerical value from the entity properties.
        let numbericalValue = entity._properties[ numericalName ]._value;

        // If the numerical attribute is c_valmpvm, convert it to a number.
        if ( numericalName == 'c_valmpvm' && numbericalValue ) {

            numbericalValue = new Date().getFullYear() - Number( numbericalValue.slice( 0, 4 ));

        }

        if ( entity._properties._i_kokala && Number( entity._properties._i_kokala._value ) > 225 ) {

            // Create an object with the required properties and add it to the urbanHeatDataAndMaterial array.
            const element = { heat: entity._properties.avgheatexposuretobuilding._value, [ categorical ]: entity._properties[ categoricalName ]._value, [ numerical ]: numbericalValue };
            urbanHeatDataAndMaterial.push( element );

        }

    }

}

/**
* Shows all buildings and updates the histograms and scatter plot
*
*/
function showAllBuildings( ) {

    // Initialize arrays for data
    let urbanHeatData = [ ];
    let urbanHeatDataAndMaterial = [ ];

    // Get current numerical and categorical values from select elements
    const currentNum = document.getElementById("numericalSelect").value
    const currentCat= document.getElementById("categoricalSelect").value

    // Find the data source for buildings
    const buildingsDataSource = getDataSourceByName( "Buildings" );

    // If the data source isn't found, exit the function
    if ( !buildingsDataSource ) {
        return;
    }

    // Iterate over all entities in data source
    for ( let i = 0; i < buildingsDataSource._entityCollection._entities._array.length; i++ ) {

        // Show the entity
        buildingsDataSource._entityCollection._entities._array[ i ].show = true;
        let entity = buildingsDataSource._entityCollection._entities._array[ i ];

        // If entity has a heat exposure value, add it to the urbanHeatData array and add data for the scatter plot
        if ( buildingsDataSource._entityCollection._entities._array[ i ]._properties.avgheatexposuretobuilding ) {

            urbanHeatData.push( entity._properties.avgheatexposuretobuilding._value );
            addDataForScatterPlot( urbanHeatDataAndMaterial, entity, getSelectedText( "categoricalSelect" ), getSelectedText( "numericalSelect" ), currentCat, currentNum );

            }

    }

    // Create/update the urban heat histogram and scatter plot
    updateHistogramAndScatterPlot( urbanHeatData, urbanHeatDataAndMaterial );    
       
}


/**
* Hides or shows non-SOTE buildings based on whether the hideNonSoteToggle checkbox is checked
*
*/
function hideNonSoteEvent( ) {

    const hideNonSote = document.getElementById( "hideNonSoteToggle" ).checked;

    if ( hideNonSote ) {

         // disable hideLowToggle checkbox
        document.getElementById("hideLowToggle").disabled = true;
         // hide non-SOTE buildings
        hideNonSoteBuildings( );

    } else {

        // show all buildings
        showAllBuildings( );
        // enable hideLowToggle checkbox
        document.getElementById("hideLowToggle").disabled = false;

    }

}


/**
 * This function is called when the user clicks on the "hide low" toggle button.
 *
 */
function hideLowEvent( ) {

    // Get the status of the "hide low" toggle button.
    const hideLow = document.getElementById( "hideLowToggle" ).checked;

    // If the "hide low" toggle button is checked.
    if ( hideLow ) {

        // Disable the "hide non-SOTE" toggle button and hide low buildings.
        document.getElementById( "hideNonSoteToggle" ).disabled = true;
        hideLowBuildings( );

    // If the "hide low" toggle button is not checked.
    } else {

        // Enable the "hide non-SOTE" toggle button and show all buildings.
        document.getElementById( "hideNonSoteToggle" ).disabled = false;
        showAllBuildings( );

    }

}

/**
 * Updates the urban heat histogram and scatter plot
 * 
 * @param {Array} urbanHeatData - the array of heat exposure data for the histogram
 * @param {Array} urbanHeatDataAndMaterial - the array of data for the scatter plot
 */
function updateHistogramAndScatterPlot( urbanHeatData, urbanHeatDataAndMaterial ) {

    createUrbanHeatHistogram( urbanHeatData );
    createScatterPlot( urbanHeatDataAndMaterial, getSelectedText( "categoricalSelect" ), getSelectedText( "numericalSelect" ) );

}

/**
 * This function is called when the user clicks on the "switch view" toggle button.
 *
 */
function switchView( ) {

    // Get the status of the "switch view" toggle button.
    const switchView = document.getElementById( "switchViewToggle" ).checked;

    // If the "switch view" toggle button is checked.
    if ( switchView ) {

        switchTo2DView( );

    // If the "switch view"" toggle button is not checked.
    } else {

        switchTo3DView( );

    }

}

// Function to switch to 2D view
function switchTo2DView() {

    // Find the data source for postcodes
    const postCodesDataSource = viewer.dataSources._dataSources.find( ds => ds.name === "PostCodes" );
    
    // Iterate over all entities in the postcodes data source.
    for ( let i = 0; i < postCodesDataSource._entityCollection._entities._array.length; i++ ) {
        
        let entity = postCodesDataSource._entityCollection._entities._array[ i ];
        
        // Check if the entity posno property matches the postalcode.
        if ( entity._properties._posno._value  == postalcode ) {
        
                // TODO create function that takes size of postal code area and possibile location by the sea into consideration and sets y and z based on thse values
                viewer.camera.flyTo( {
                    destination: Cesium.Cartesian3.fromDegrees( entity._properties._center_x._value, entity._properties._center_y._value, 3500 ),
                    orientation: {
                        heading: Cesium.Math.toRadians( 0.0 ),
                        pitch: Cesium.Math.toRadians( -90.0 ),
                    },
                    duration: 3
                });
            
        }
    }

    const labelElement = document.getElementById("switchViewLabel");
    labelElement.innerHTML = "Switch to 3D";

}
  
// Function to switch back to 3D view
function switchTo3DView() {
    // Find the data source for postcodes
    const postCodesDataSource = viewer.dataSources._dataSources.find( ds => ds.name === "PostCodes" );
    
    // Iterate over all entities in the postcodes data source.
    for ( let i = 0; i < postCodesDataSource._entityCollection._entities._array.length; i++ ) {
        
        let entity = postCodesDataSource._entityCollection._entities._array[ i ];
        
        // Check if the entity posno property matches the postalcode.
        if ( entity._properties._posno._value  == postalcode ) {
        
                // TODO create function that takes size of postal code area and possibile location by the sea into consideration and sets y and z based on thse values
                viewer.camera.flyTo( {
                    destination: Cesium.Cartesian3.fromDegrees( entity._properties._center_x._value, entity._properties._center_y._value - 0.025, 2000 ),
                    orientation: {
                        heading: 0.0,
                        pitch: Cesium.Math.toRadians( -35.0 ),
                        roll: 0.0
                    },
                    duration: 3
                });
            
        }
    }

    const labelElement = document.getElementById("switchViewLabel");
    labelElement.innerHTML = "Switch to 2D";
}