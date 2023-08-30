/**
 * Processes the click event on the viewer
 * 
 * @param {Cesium.Viewer} viewer - The Cesium viewer object
 * @param {MouseEvent} event - The click event
 */
function processClick( viewer, event ) {
    console.log("Clicked at " + String( event.x ) + ", " + String( event.y ));
    pickEntity( viewer, new Cesium.Cartesian2( event.x, event.y ) );
}

/**
 * Prints the properties of the picked Cesium entity
 * 
 * @param {Object} picked - The picked Cesium entity
 * @param {Object} id - The ID of the picked entity
 */
function printCesiumEntity( picked, id ) {

    document.getElementById( 'printContainer' ).scroll({
        top: 0,
        behavior: 'instant'
    });
    
    if ( picked.id._polygon && picked.id.properties ) {
        var toPrint = "<u>Found following properties & values:</u><br/>";	

        //Highlight for clicking...
        let oldMaterial = id.polygon.material;
        id.polygon.material = new Cesium.Color( 1, 0.5, 0.5, 0.8 );
        setTimeout(() => { id.polygon.material = oldMaterial }, 500 );

        let length = picked.id.properties.propertyNames.length;
        for ( let i = 0; i < length; ++i ) {

            toPrint = toPrint + picked.id.properties.propertyNames[ i ] + ": " + picked.id.properties[ picked.id.properties.propertyNames[ i ] ] + "<br/>";
            
        };
    }

    console.log(toPrint);
    
    addToPrint( toPrint, picked.id.properties.posno )
    
}

/**
 * Adds the provided content to the print container
 * 
 * @param {string} toPrint - The content to be added to the print container
 * @param {string} postno - The postal code associated with the content
 */
function addToPrint( toPrint, postno ) {

    if ( postno ) {

        toPrint = toPrint + "<br/><br/><i>Click on objects to retrieve information.</i>"

    } else {

        toPrint = toPrint + "<br/><br/><i>If average urban heat exposure of building is over 0.5 the nearest location with under 0.4 heat exposure is shown on map.</i>"

    }

    document.getElementById('printContainer').innerHTML = toPrint;
    document.getElementById('printContainer').scroll({
          top: 1000,
          behavior: 'smooth'
    });
}

function handlePostalCodeFeature( postcode ) {

    // Find the data source for postcodes
    const postCodesDataSource = viewer.dataSources._dataSources.find( ds => ds.name === "PostCodes" );
    
    // Iterate over all entities in the postcodes data source.
    for ( let i = 0; i < postCodesDataSource._entityCollection._entities._array.length; i++ ) {
        
        let entity = postCodesDataSource._entityCollection._entities._array[ i ];
        
        // Check if the entity posno property matches the postalcode.
        if ( entity._properties._posno._value  == postcode ) {
        
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
            
                document.getElementById( "switchViewToggle" ).disabled = false;
                loadPostalCode( postcode );
        }
    }

}

function loadPostalCode( postcode ) {

    document.getElementById( "hideNonSoteToggle" ).disabled = false;
    document.getElementById( "hideLowToggle" ).disabled = false;
    document.getElementById( "showTreesToggle" ).disabled = false;

    if ( document.getElementById( "printToggle" ).checked ) {

        setPrintVisible( );

    }

    console.log("Postal code area found!");

    removeDataSourcesAndEntities();
    
    if ( showVegetation ) {
        
        loadNatureAreas( postcode );
    
    }

    if ( document.getElementById( "showSensorDataToggle" ).checked ) {

        loadSensorData( postalcode );

    }

    loadWFSBuildings( postcode );	

    loadPostCodeZones( 0.0 );

    // add laajasalo flood data
    if ( postcode == '00870' || postcode == '00850' || postcode == '00840' || postcode == '00590' ) {

        loadFloodData( );

    }   


}

function handleBuildingFeature( buildingHeatExposure, address, postinumero, treeArea ) {

    // document.getElementById( "plotSoSContainer" ).style.visibility = 'hidden';
    document.getElementById( 'categoricalSelect' ).style.visibility = 'hidden';
    document.getElementById( 'numericalSelect' ).style.visibility = 'hidden';
    toggleBearingSwitchesVisibility( 'hidden' );

    document.getElementById( 'plotMaterialContainer' ).style.visibility = 'hidden';

    if (  document.getElementById( "showTreesToggle" ).checked ) {

        if ( treeArea ) {

            createTreeHistogram( treeArea, address, postinumero );
    
        } else {
    
            createTreeHistogram( 0, address, postinumero );
    
        }

    }

    createBuildingHistogram( buildingHeatExposure, address, postinumero );

    postalcode = postinumero;

}

function addColdPoint( location ) {

    const coordinates = location.split(","); 

    viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees( coordinates[ 1 ], coordinates[ 0 ] ),
        name: "coldpoint",
        point: {
          show: true, 
          color: Cesium.Color.ROYALBLUE, 
          pixelSize: 15, 
          outlineColor: Cesium.Color.LIGHTYELLOW, 
          outlineWidth: 5, 
        },
      });

}

function removeColdPoint( ) {

    viewer.entities._entities._array.forEach( function( entity ) {

        if ( entity.name == "coldpoint" ) {

            viewer.entities.remove( entity );
            
        }
    });
    

}

/**
 * Handles the feature with properties
 * 
 * @param {Object} id - The ID of the picked entity
 */
function handleFeatureWithProperties( id ) {                
    
    postalcode = id.properties.posno;
    nameOfZone = id.properties.nimi;
    removeColdPoint( );

    //If we find postal code, we assume this is an area & zoom in AND load the buildings for it.
    if ( postalcode ) {
        
        handlePostalCodeFeature( postalcode, id );
    }

    //See if we can find building floor areas
    if ( id.properties._avgheatexposuretobuilding ) {

        let address = 'n/a'

        if ( id.properties.katunimi_suomi ) {

            address = id.properties.katunimi_suomi + ' ' + id.properties.osoitenumero

        }

        if ( id.properties._locationUnder40 ) {

            if ( id.properties._locationUnder40._value  ) {
                
                addColdPoint( id.properties._locationUnder40._value );
            
            }

        }
        
        handleBuildingFeature( id.properties._avgheatexposuretobuilding._value, address, id.properties._postinumero._value, id.properties.treeArea );

    }

}
    

/**
 * Picks the entity at the given window position in the viewer
 * 
 * @param { String } viewer - The Cesium viewer object
 * @param { String } windowPosition - The window position to pick the entity
 */
function pickEntity( viewer, windowPosition ) {
    let picked = viewer.scene.pick( windowPosition );
    
    if ( picked ) {
        
        let id = Cesium.defaultValue( picked.id, picked.primitive.id );
        
        if ( picked.id._polygon ) {
            
            if ( id instanceof Cesium.Entity ) {
                
                printCesiumEntity( picked , id );
            }
            
            if ( picked.id.properties ) {

                hidePlotlyIfNatureFeatureIsClicked( picked.id.properties.category );
                handleFeatureWithProperties( picked.id );
                
            }
        }
    }
}

/**
 * Hides the plot container if the nature feature is clicked; otherwise, shows the plot container if the show plot toggle is checked
 * 
 * @param {string} category - The category of the picked entity
 */
function hidePlotlyIfNatureFeatureIsClicked( category ) {

    if ( category ) {

        document.getElementById( 'plotContainer' ).style.visibility = 'hidden';

    } else {

        if ( document.getElementById( "showPlotToggle" ).checked ) {

            document.getElementById( 'plotContainer' ).style.visibility = 'visible';

        }

    }
}