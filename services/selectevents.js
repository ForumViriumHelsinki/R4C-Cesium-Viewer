function selectEvents( event ) {
		
    if ( event.target.id  == 'categoricalSelect' ) {
        
        selectCategorical( event.target.value);

    }	

    if ( event.target.id == 'numericalSelect' ) {
        
        selectNumerical( event.target.value );

    }
            
}

function selectNumerical( newNumerical ) {

    const currentCat= document.getElementById( "categoricalSelect" ).value

    viewer.dataSources._dataSources.forEach( function( dataSource ) {
            
        if ( dataSource.name == "Buildings" ) {

            let urbanHeatDataAndMaterial = [ ];

            for ( let i = 0; i < dataSource._entityCollection._entities._array.length; i++ ) {

                const entity = dataSource._entityCollection._entities._array[ i ];
                const hideNonSote = document.getElementById( "hideNonSoteToggle" ).checked;
                const hideLowToggle = document.getElementById( "hideLowToggle" ).checked;

                if ( hideNonSote ) {

                    scatterForSoteBuildings( urbanHeatDataAndMaterial, entity, currentCat, newNumerical );

                }                 
                
                if ( hideLowToggle ) {

                    scatterForTallBuildings( urbanHeatDataAndMaterial, entity, currentCat, newNumerical );

                }

                if ( !hideNonSote && !hideLowToggle ) {

                    addDataForScatterPlot( urbanHeatDataAndMaterial, entity, currentCat, newNumerical, decodeCategorical( currentCat ), decodeNumerical( newNumerical ) );

                }

            }	
            
            createScatterPlot( urbanHeatDataAndMaterial, currentCat, newNumerical );

        }
    }); 

}

function scatterForSoteBuildings( urbanHeatDataAndMaterial, entity, categorical, numerical ) {

    if ( entity._properties.c_kayttark  && entity._properties.c_kayttark._value ) {

        const kayttotark = Number( entity._properties.c_kayttark._value );

        if ( kayttotark == 511 || !kayttotark == 131 || ( kayttotark > 212 && kayttotark < 240 ) ) {

            addDataForScatterPlot( urbanHeatDataAndMaterial, entity, categorical, numerical, decodeCategorical( categorical ), decodeNumerical( numerical ) );
    
        }

    } 
     
}

function scatterForTallBuildings( urbanHeatDataAndMaterial, entity, categorical, numerical ) {

    if ( entity._properties.i_kerrlkm  && entity._properties.i_kerrlkm._value ) {

        const floorCount = Number( entity._properties.i_kerrlkm._value );

        if ( floorCount > 6  ) {

            addDataForScatterPlot( urbanHeatDataAndMaterial, entity, categorical, numerical, decodeCategorical( categorical ), decodeNumerical( numerical ) );

        }

    }
     
}

function selectCategorical( newCategorical ) {

    const currentNum= document.getElementById( "numericalSelect" ).value

    viewer.dataSources._dataSources.forEach( function( dataSource ) {
            
        if ( dataSource.name == "Buildings" ) {

            let urbanHeatDataAndMaterial = [ ];

            for ( let i = 0; i < dataSource._entityCollection._entities._array.length; i++ ) {

                const entity = dataSource._entityCollection._entities._array[ i ];
                const hideNonSote = document.getElementById( "hideNonSoteToggle" ).checked;
                const hideLowToggle = document.getElementById( "hideLowToggle" ).checked;

                if ( hideNonSote ) {

                    scatterForSoteBuildings( urbanHeatDataAndMaterial, entity, newCategorical, currentNum );

                }                 
                
                if ( hideLowToggle ) {

                    scatterForTallBuildings( urbanHeatDataAndMaterial, entity, newCategorical, currentNum );

                }

                if ( !hideNonSote && !hideLowToggle ) {

                    addDataForScatterPlot( urbanHeatDataAndMaterial, entity, newCategorical, currentNum, decodeCategorical( newCategorical ), decodeNumerical( currentNum ) );

                }
        
            }	

            createScatterPlot( urbanHeatDataAndMaterial, newCategorical, currentNum );       
            
        }
    }); 

}