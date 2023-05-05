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

    if ( event.target.value == 'showTrees' ) {
        
        showTrees();

    }
            
}
function showTrees( ) {

    const showTrees = document.getElementById( "showTreesToggle" ).checked;

    if ( showTrees ) {

        if ( postalcode ) {

            loadTrees( postalcode );

        }
        
        viewer.dataSources._dataSources.forEach( function( dataSource ) {

            dataSource.show = true;

        });

    } else {

        viewer.dataSources._dataSources.forEach( function( dataSource ) {

            if ( dataSource.name == "Trees" ) {

                dataSource.show = false;	
                
            }
        });

    }

}

function printEvent( ) {

    console.log( "Set the print to: " + String( document.getElementById( "printToggle" ).checked ) );
    const print = document.getElementById( "printToggle" ).checked;

    if ( !print ) {

        document.getElementById( 'printContainer' ).style.visibility = 'hidden';
        document.getElementById( 'searchcontainer' ).style.visibility = 'hidden';
        document.getElementById( 'georefContainer' ).style.visibility = 'hidden';
        document.getElementById( 'searchbutton' ).style.visibility = 'hidden';

    } else {

        setPrintVisible( );

    }

}

function showPlotEvent( ) {

    console.log("Set the showplot to: " + String(document.getElementById("showPlotToggle").checked));
    const showPlot = document.getElementById( "showPlotToggle" ).checked;
    
    if ( !showPlot ) {

        document.getElementById( 'plotContainer' ).style.visibility = 'hidden';
        document.getElementById( 'plotSoSContainer' ).style.visibility = 'hidden';
        document.getElementById( 'plotMaterialContainer' ).style.visibility = 'hidden';
        document.getElementById( 'numericalSelect' ).style.visibility = 'hidden';
        document.getElementById( 'categoricalSelect' ).style.visibility = 'hidden';

    }
    
    if ( showPlot ) {

        if ( document.getElementById( 'plotContainer' ).textContent.includes( "plotly" ) ) { //This is a bit dirty...
    
            document.getElementById( 'plotContainer' ).style.visibility = 'visible';
            document.getElementById( 'plotSoSContainer' ).style.visibility = 'visible';
            document.getElementById( 'plotMaterialContainer' ).style.visibility = 'visible';
            document.getElementById( 'numericalSelect' ).style.visibility = 'visible';
            document.getElementById( 'categoricalSelect' ).style.visibility = 'visible';

        }

    }

}

function showNatureEvent( ) {

    const showNature = document.getElementById( "showNatureToggle" ).checked;

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

    const currentNum = document.getElementById("numericalSelect").value
    const currentCat= document.getElementById("categoricalSelect").value

    viewer.dataSources._dataSources.forEach( function( dataSource ) {
            
        if ( dataSource.name == "Buildings" ) {

            let urbanHeatData = [ ];
            let urbanHeatDataAndMaterial = [ ];

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
                        addDataForScatterPlot( urbanHeatDataAndMaterial, entity, currentCat, currentNum, decodeCategorical( currentCat ), decodeNumerical( currentNum ) );

                    }
    
                }

            }	
            
            createUrbanHeatHistogram( urbanHeatData );
            createScatterPlot( urbanHeatDataAndMaterial, currentCat, currentNum );

        }
    });     
}

/**
 * Hides buildings with floor count under 7 and updates histogram & scatter plot
 *
 */
function hideLowBuildings( ) {

    const currentNum = document.getElementById("numericalSelect").value
    const currentCat= document.getElementById("categoricalSelect").value

    viewer.dataSources._dataSources.forEach( function( dataSource ) {
            
        if ( dataSource.name == "Buildings" ) {

            let urbanHeatData = [ ];
            let urbanHeatDataAndMaterial = [ ];

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
                        addDataForScatterPlot( urbanHeatDataAndMaterial, entity, currentCat, currentNum, decodeCategorical( currentCat ), decodeNumerical( currentNum ) );

                    }
    
                }

            }	
            
            createUrbanHeatHistogram( urbanHeatData );
            createScatterPlot( urbanHeatDataAndMaterial, currentCat, currentNum );

        }
    });     
}

/**
 * Creates data set needed for scatter plotting urban heat exposure
 *
 * @param { Object } features buildings in postal code area
 * @param { String } categorical name of categorical attribute for user
 * @param { String } numerical name of numerical attribute for user
 * @param { String } categoricalName name of numerical attribute in register
 * @param { String } numericalName name for numerical attribute in registery
 */
function addDataForScatterPlot( urbanHeatDataAndMaterial, entity, categorical, numerical, categoricalName, numericalName ) {
    
    if ( entity._properties.avgheatexposuretobuilding && entity._properties[ categoricalName ] && entity._properties[ numericalName ] && entity._properties[ categoricalName ]._value ) {

        let numbericalValue = entity._properties[ numericalName ]._value;

        if ( numericalName == 'c_valmpvm' && numbericalValue ) {

            numbericalValue = new Date().getFullYear() - Number( numbericalValue.slice( 0, 4 ));
        }

		const element = { heat: entity._properties.avgheatexposuretobuilding._value, [ categorical ]: entity._properties[ categoricalName ]._value, [ numerical ]: numbericalValue };
        urbanHeatDataAndMaterial.push( element );

    }

}


function showAllBuildings( ) {

    let urbanHeatData = [ ];
    let urbanHeatDataAndMaterial = [ ];

    const currentNum = document.getElementById("numericalSelect").value
    const currentCat= document.getElementById("categoricalSelect").value

    viewer.dataSources._dataSources.forEach( function( dataSource ) {
            
        if ( dataSource.name == "Buildings" ) {

            for ( let i = 0; i < dataSource._entityCollection._entities._array.length; i++ ) {

                dataSource._entityCollection._entities._array[ i ].show = true;
                let entity = dataSource._entityCollection._entities._array[ i ];
                // add data for updating histogram

                if ( dataSource._entityCollection._entities._array[ i ]._properties.avgheatexposuretobuilding ) {

                    urbanHeatData.push( entity._properties.avgheatexposuretobuilding._value );
                    addDataForScatterPlot( urbanHeatDataAndMaterial, entity, currentCat, currentNum, decodeCategorical( currentCat ), decodeNumerical( currentNum ) );

                }

            }
            
            createUrbanHeatHistogram( urbanHeatData );
            createScatterPlot( urbanHeatDataAndMaterial, currentCat, currentNum );

        }
    });    
}

function hideNonSoteEvent( ) {

    const hideNonSote = document.getElementById( "hideNonSoteToggle" ).checked;

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

    const hideLow = document.getElementById( "hideLowToggle" ).checked;

    if ( hideLow ) {
        
        document.getElementById( "hideNonSoteToggle" ).disabled = true;
        hideLowBuildings( );

    } else {

        document.getElementById( "hideNonSoteToggle" ).disabled = false;
        showAllBuildings( );

    }

}

function showNatureHeatEvent( ) {

    const showNatureHeat = document.getElementById( "showNatureHeatToggle" ).checked;

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

function decodeNumerical( numerical ) {

    switch ( numerical ) {
		case 'height': 
			return 'measured_height';
		case 'age': 
			return 'c_valmpvm';
		case 'area': 
			return 'i_kokala';
        case 'volume': 
			return 'i_raktilav';
        default:
            return numerical;            
	}
}

function decodeCategorical( categorical ) {

    switch ( categorical ) {
		case 'facade': 
			return 'c_julkisivu';
		case 'material': 
			return 'c_rakeaine';
        case 'roof type': 
			return 'roof_type';
        case 'usage': 
			return 'kayttotarkoitus';
        case 'type': 
			return 'tyyppi';
        case 'heating method': 
			return 'c_lammtapa';     
        case 'heating source': 
			return 'c_poltaine';                   
        default:
            return categorical;                 
	}
}