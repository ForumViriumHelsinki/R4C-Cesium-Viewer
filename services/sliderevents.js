function sliderEvents( event ) {
		
    if ( event.target.value == 'print' ) {

        printEvent();

    }
        
    if ( event.target.value == 'showPlot' ) {

        showPlotEvent();

    }	

    if ( event.target.value == 'showNature' ) {

        showNatureEvent();

    }

    if ( event.target.value == 'hideNonSote' ) {
        
        hideNonSoteEvent();

    }	

    if ( event.target.value == 'hideLow' ) {
        
        hideLowEvent();

    }	

    if ( event.target.value == 'showNatureHeat' ) {
        
        showNatureHeatEvent();

    }
            
}

function printEvent( ) {

    console.log( "Set the print to: " + String( document.getElementById( "printToggle" ).checked ) );
    print = document.getElementById( "printToggle" ).checked;

    if ( !print ) {

        document.getElementById( 'printContainer' ).style.visibility = 'hidden';

    } else {

        document.getElementById( 'printContainer' ).style.visibility = 'visible';

    }

}

function showPlotEvent( ) {

    console.log("Set the showplot to: " + String(document.getElementById("showPlotToggle").checked));
    showPlot = document.getElementById( "showPlotToggle" ).checked;
    
    if ( !showPlot ) {

        document.getElementById( 'plotContainer' ).style.visibility = 'hidden';
        document.getElementById( 'plotSoSContainer' ).style.visibility = 'hidden';

    }
    
    if ( showPlot ) {

        if ( document.getElementById( 'plotContainer' ).textContent.includes( "plotly" ) ) { //This is a bit dirty...
    
            document.getElementById( 'plotContainer' ).style.visibility = 'visible';
            document.getElementById( 'plotSoSContainer' ).style.visibility = 'visible';

        }

    }

}

function showNatureEvent( ) {

    showNature = document.getElementById( "showNatureToggle" ).checked;

    if ( showNature ) {

        document.getElementById("showNatureHeatToggle").disabled = false;

        if ( postalcode ) {

            loadNatureAreas( postalcode );

        }
        
        viewer.dataSources._dataSources.forEach( function( dataSource ) {

            dataSource.show = true;

        });

    } else {

        document.getElementById("showNatureHeatToggle").checked = false;
        document.getElementById("showNatureHeatToggle").disabled = true;

        viewer.dataSources._dataSources.forEach( function( dataSource ) {

            if ( dataSource.name == "NatureAreas" ) {

                dataSource.show = false;	
                
            }
        });

    }

}

function hideNonSoteBuildings( ) {

    viewer.dataSources._dataSources.forEach( function( dataSource ) {
            
        if ( dataSource.name == "Buildings" ) {

            let urbanHeatData = [ ];

            for ( let i = 0; i < dataSource._entityCollection._entities._array.length; i++ ) {

                let entity = dataSource._entityCollection._entities._array[ i ];

                if ( !entity._properties.c_kayttark ) {
	
                    entity.show = false;
        
                } else {
    
                    const kayttotark = Number( entity._properties.c_kayttark._value );
    
                    if ( !kayttotark != 511 && !kayttotark != 131 && !( kayttotark > 212 && kayttotark < 240 ) ) {
        
                        entity.show = false;
            
                    } else {
                        
                        // add data for updating histogram
                        urbanHeatData.push( entity._properties.avgheatexposuretobuilding._value );

                    }
    
                }

            }	
            
            createUrbanHeatHistogram( urbanHeatData );

        }
    });     
}

/**
 * Hides buildings with floor count under 7 and updates histogram
 *
 */
function hideLowBuildings( ) {

    viewer.dataSources._dataSources.forEach( function( dataSource ) {
            
        if ( dataSource.name == "Buildings" ) {

            let urbanHeatData = [ ];

            for ( let i = 0; i < dataSource._entityCollection._entities._array.length; i++ ) {

                let entity = dataSource._entityCollection._entities._array[ i ];

                if ( !entity._properties.i_kerrlkm ) {
	
                    entity.show = false;
        
                } else {
    
                    const floorCount = Number( entity._properties.i_kerrlkm._value );
    
                    if ( floorCount < 7 ){
        
                        entity.show = false;
            
                    } else {
                        
                        // add data for updating histogram
                        urbanHeatData.push( entity._properties.avgheatexposuretobuilding._value );

                    }
    
                }

            }	
            
            createUrbanHeatHistogram( urbanHeatData );

        }
    });     
}

function showAllBuildings( ) {

    let urbanHeatData = [ ];

    viewer.dataSources._dataSources.forEach( function( dataSource ) {
            
        if ( dataSource.name == "Buildings" ) {

            for ( let i = 0; i < dataSource._entityCollection._entities._array.length; i++ ) {

                dataSource._entityCollection._entities._array[ i ].show = true;
                // add data for updating histogram
                urbanHeatData.push( dataSource._entityCollection._entities._array[ i ]._properties.avgheatexposuretobuilding._value );

            }
            
            createUrbanHeatHistogram( urbanHeatData );

        }
    });    
}

function hideNonSoteEvent( ) {

    hideNonSote = document.getElementById( "hideNonSoteToggle" ).checked;

    if ( hideNonSote ) {
        
        document.getElementById("hideLowToggle").disabled = true;
        hideNonSoteBuildings( );

    } else {

        showAllBuildings( );
        document.getElementById("hideLowToggle").disabled = false;

    }

}


/**
 * Event that results in either all buildings to be shown or only tall buildings to be shown
 *
 */
function hideLowEvent( ) {

    hideLow = document.getElementById( "hideLowToggle" ).checked;

    if ( hideLow ) {
        
        document.getElementById( "hideNonSoteToggle" ).disabled = true;
        hideLowBuildings( );

    } else {

        document.getElementById( "hideNonSoteToggle" ).disabled = false;
        showAllBuildings( );

    }

}

function showNatureHeatEvent( ) {

    showNatureHeat = document.getElementById( "showNatureHeatToggle" ).checked;

    if ( showNatureHeat ) {
        
        showNatureAreaHeat( );

    } else {

        hideNatureAreaHeat( );

    }

}

 
function showNatureAreaHeat( ) {

    viewer.dataSources._dataSources.forEach( function( dataSource ) {
            
        if ( dataSource.name == "NatureAreas" ) {

            for ( let i = 0; i < dataSource._entityCollection._entities._array.length; i++ ) {

                let entity = dataSource._entityCollection._entities._array[ i ];

                if ( entity._properties._avgheatexposuretoarea._value ) {

                    entity.polygon.material = new Cesium.Color( 1, 1 - entity._properties._avgheatexposuretoarea._value, 0, entity._properties._avgheatexposuretoarea._value );

                }
            }						
        }
    });     
}

function hideNatureAreaHeat( ) {

    viewer.dataSources._dataSources.forEach( function( dataSource ) {
            
        if ( dataSource.name == "NatureAreas" ) {

            for ( let i = 0; i < dataSource._entityCollection._entities._array.length; i++ ) {

                let entity = dataSource._entityCollection._entities._array[ i ];

                if ( entity._properties._category ) {

                    setNatureAreaPolygonMaterialColor( entity, entity._properties._category._value );

                }
            }						
        }
    });     
}