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

    }
    
    if ( showPlot ) {

        if ( document.getElementById( 'plotContainer' ).textContent.includes( "plotly" ) ) { //This is a bit dirty...
    
            document.getElementById( 'plotContainer' ).style.visibility = 'visible';

        }

    }

}

function showNatureEvent( ) {

    showNature = document.getElementById( "showNatureToggle" ).checked;

    if ( showNature ) {

        if ( postalcode && viewer.dataSources._dataSources.length > 1 ) {

            loadNatureAreas( postalcode );

        }
        
        viewer.dataSources._dataSources.forEach( function( dataSource ) {

            dataSource.show = true;

        });

    } else {

        viewer.dataSources._dataSources.forEach( function( dataSource ) {

            if ( dataSource.name == "NatureAreas" ) {

                dataSource.show = false;	
                
            }
        });

    }

}

function hideNonSoteEvent( ) {

    hideNonSote = document.getElementById( "hideNonSoteToggle" ).checked;

    if ( hideNonSote ) {
        
        viewer.dataSources._dataSources.forEach( function( dataSource ) {
            
            if ( dataSource.name == "Buildings" ) {

                for ( let i = 0; i < dataSource._entityCollection._entities._array.length; i++ ) {

                    let entity = dataSource._entityCollection._entities._array[ i ];

                    if ( !entity._properties._avgheatexposuretobuilding || entity._properties._kayttotarkoitus == 'n/a') {

                        dataSource._entityCollection._entities._array[ i ].show = false;

                    }
                }						
            }
        });

    } else {

        viewer.dataSources._dataSources.forEach( function( dataSource ) {
            
            if ( dataSource.name == "Buildings" ) {

                for ( let i = 0; i < dataSource._entityCollection._entities._array.length; i++ ) {

                    dataSource._entityCollection._entities._array[ i ].show = true;

                }						
            }
        });
    }

}