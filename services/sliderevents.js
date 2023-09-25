/**
 * This function is triggered by a slider event and it checks the value of the slider to determine which function to execute
 *
 * @param { Object } event the slider event
 */
function sliderEvents( event ) {

    const eventValue = event.target.value;

    switch ( eventValue ){
		case "print":                   // If the slider value is "print", call the printEvent function.
    
            printEvent();

		case "showPlot":                // If the slider value is "showPlot", call the showPlotEvent function.
            
            showPlotEvent();

		case "showVegetation":

            showVegetationEvent();      // If the slider value is "showVegetation", call the showVegetationEvent function.

		case "showOtherNature":

            showOtherNatureEvent();      // If the slider value is "showVegetation", call the showVegetationEvent function.

		case "filterBuildings":
            
            filterBuildingsEvent();         // If the slider value is "filterBuildings", call the filterBuildingsEvent function.           

        case "showTrees":

            showTrees();                // If the slider value is "showTrees", call the showTrees function. 

        case "showSensorData":

            showSensorData();           // If the slider value is "showSensorData", call the showSensorData function.
 
        case "switchView":

            switchView();               // If the slider value is "switchView", call the switchView function.    
        
        case "populationGrid":                // If the slider value is "populationGrid", call the populationGrid function.
            
            populationGrid();                    

	}	
}

/**
 * This function to switch between population grid and postal code area view
 *
 */
function populationGrid( ) {

    // Get the state of the populationGrid toggle button
    const populationGrid = document.getElementById( "populationGridToggle" ).checked;

    // If populationGrid toggle is on
    if ( populationGrid ) {

        setPostalCodeElementsDisplay( 'none' );
        removeDataSourcesByNamePrefix( 'PostCodes' );
        flyCamera3D( 24.991745, 60.045, 12000 );
        loadGeoJsonDataSource( 0.1, 'assets/data/populationgrid.json', 'PopulationGrid' )
        .then( function ( entities ) {

            // Use the entities here
            setHeatExposureToGrid( entities );
            setGridHeight( entities );

        })
        .catch( function ( error ) {
            // Handle errors here
            console.error( error) ;
        });


    } else { 

        setPostalCodeElementsDisplay( 'inline-block' );
        removeDataSourcesByNamePrefix( 'PopulationGrid' );
        loadGeoJsonDataSource( 0.2, 'assets/data/hki_po_clipped.json', 'PostCodes' );

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
        resetTreeEntites( );
        resetBuildingEntites( );
        selectAttributeForScatterPlot( );

    }

}

/**
 * Gets label element by id and changes it 
 * 
 * @param { String } id - The Cesium viewer object
 * @param { String } text - The window position to pick the entity
 */
function changeLabel( id, text ) {

    const labelElement = document.getElementById( id );
    labelElement.innerHTML = text;

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
 * Hide buildings based on silder values and update the histograms and scatter plot based on the selected numerical and categorical data
 */
function hideBuildings() {
    
    // Find the data source for buildings
    const buildingsDataSource = getDataSourceByName( "Buildings" );

    // If the data source isn't found, exit the function
    if ( !buildingsDataSource ) {
        return;
    }

    const includedBuildings = filterBuildings( buildingsDataSource );
    const urbanHeatData = mapUrbanHeatData( includedBuildings );

    let urbanHeatDataAndMaterial = [];
    // Process the entities in the buildings data source and populate the urbanHeatDataAndMaterial array with scatter plot data
    processEntitiesForScatterPlot( buildingsDataSource.entities.values, urbanHeatDataAndMaterial );
    createScatterPlot( urbanHeatDataAndMaterial, getSelectedText( "categoricalSelect" ), getSelectedText( "numericalSelect" ) );
    createUrbanHeatHistogram( urbanHeatData );    

}

/**
 * Filter buildings from the given data source based on UI toggle switches.
 * 
 * @param {Object} dataSource The data source containing buildings
 * @returns {Object[]} An array of filtered buildings
 */
function filterBuildings( dataSource ) {

    const hideNewBuildings = document.getElementById( "hideNewBuildingsToggle" ).checked;
    const hideNonSote = document.getElementById( "hideNonSoteToggle" ).checked;
    const hideLow = document.getElementById( "hideLowToggle" ).checked;

    const filteredBuildings = dataSource.entities.values.filter( entity => {
        let passFilter = true;

        if ( hideNewBuildings ) {
            // Filter out buildings built before summer 2018
            const cutoffDate = new Date( "2018-06-01T00:00:00" ).getTime();
            if ( entity._properties._c_valmpvm && typeof entity._properties._c_valmpvm._value === 'string' ) {

                const c_valmpvm = new Date( entity._properties._c_valmpvm._value ).getTime();

                if ( c_valmpvm >= cutoffDate ) {

                    passFilter = false;
                    entity.show = false;

                }
            } else {

                passFilter = false;
                entity.show = false;
    
            }
        }

        if ( hideNonSote ) {
            // Filter out non-SOTE buildings

            if ( entity._properties._c_kayttark ) {

                const kayttotark = Number( entity._properties.c_kayttark._value );

                if ( !kayttotark != 511 && !kayttotark != 131 && !( kayttotark > 212 && kayttotark < 240 ) ) {
    
                    entity.show = false;
                    passFilter = false;
        
                }
                
            } else {

                entity.show = false;
                passFilter = false;
    
            }
        }

        if ( hideLow ) {
            // Filter out buildings with fewer floors
            if ( entity._properties._i_kerrlkm ) {

                if ( entity._properties._i_kerrlkm && Number( entity._properties._i_kerrlkm._value ) <= 6 ) {

                    entity.show = false;
                    passFilter = false;
    
                }
                
            } else {

                entity.show = false;
                passFilter = false;
    
            }
        }

        return passFilter;
    });

    return filteredBuildings;
}

  
/**
 * Get an array of urban heat data from the given array of entities
 * @param { Object[ ] } entities An array of entities with the "avgheatexposuretobuilding" property
 * @returns { Object[ ] } An array of urban heat data
 */
function mapUrbanHeatData( entities ) {
    
    return entities.map( entity => entity._properties._avgheatexposuretobuilding._value );

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

        if ( entity._properties._area_m2 && Number( entity._properties._area_m2._value ) > 225 ) {

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
* Hides or shows buildings based on whether the hideNonSoteToggle checkbox is checked
*
*/
function filterBuildingsEvent( ) {

    const hideNonSote = document.getElementById( "hideNonSoteToggle" ).checked;
    const hideNewBuildings = document.getElementById( "hideNewBuildingsToggle" ).checked;
    const hideLow = document.getElementById( "hideLowToggle" ).checked;

    if ( hideNonSote || hideNewBuildings || hideLow ) {

        hideBuildings( );

    } else {

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

    // change label
    changeLabel( "switchViewLabel", "3D view" );

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

    // change label
    changeLabel( "switchViewLabel", "2D view" );

}

/**
 * Setups tree bearing switches. Only one of the switch can be turned on same time,
 * so when user turns on one switch rest are turned off.
 * 
 * */
function setupBearingSwitches() {

    const switches = [ 'All', 'South', 'West', 'East', 'North' ];
  
    for ( const direction of switches ) {

      const switchContainer = document.getElementById( `bearing${ direction }SwitchContainer` );
      const toggle = switchContainer.querySelector( `#bearing${ direction }Toggle` );
      
      toggle.addEventListener( 'click', () => {

        for ( const otherDirection of switches) {
    
          if ( direction !== otherDirection ) {

            const otherSwitchContainer = document.getElementById( `bearing${ otherDirection }SwitchContainer` );
            const otherToggle = otherSwitchContainer.querySelector( `#bearing${ otherDirection }Toggle` );
            otherToggle.checked = false;

          }
        }

        resetBuildingEntites( );
        resetTreeEntites( );
        fetchAndAddTreeDistanceData( postalcode );

      });
  
      // Set the 'All' switch to checked by default
      if ( direction === 'All' ) {
        toggle.checked = true;
      }
    }
}

/**
 * Toggle visibility of tree bearing switches
 * 
 * @param {string} status - The desired visibility status ("visible" or "hidden")
 */
function toggleBearingSwitchesVisibility( status ) {

    const switchContainers = [ 'All', 'South', 'West', 'East', 'North' ];
  
    for ( const direction of switchContainers ) {

      const switchContainer = document.getElementById( `bearing${direction}SwitchContainer` );
      switchContainer.style.visibility = status;

    }
  }