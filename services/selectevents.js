function selectEvents( event ) {
		
    if ( event.target.id  == 'categoricalSelect' ) {
        
        selectCategorical( event.target.value);

    }	

    if ( event.target.id == 'numericalSelect' ) {
        
        selectNumerical( event.target.value );

    }
            
}

function selectNumerical( newNumerical ) {

    let currentCat= document.getElementById( "categoricalSelect" ).value

    viewer.dataSources._dataSources.forEach( function( dataSource ) {
            
        if ( dataSource.name == "Buildings" ) {

            let urbanHeatDataAndMaterial = [ ];

            for ( let i = 0; i < dataSource._entityCollection._entities._array.length; i++ ) {

                let entity = dataSource._entityCollection._entities._array[ i ];
                addDataForScatterPlot( urbanHeatDataAndMaterial, entity, currentCat, newNumerical, decodeCategorical( currentCat ), decodeNumerical( newNumerical ) );

            }	
            
            createScatterPlot( urbanHeatDataAndMaterial, currentCat, newNumerical );

        }
    }); 

}

function selectCategorical( newCategorical ) {

    let currentNum= document.getElementById( "numericalSelect" ).value

    viewer.dataSources._dataSources.forEach( function( dataSource ) {
            
        if ( dataSource.name == "Buildings" ) {

            let urbanHeatDataAndMaterial = [ ];

            for ( let i = 0; i < dataSource._entityCollection._entities._array.length; i++ ) {

                let entity = dataSource._entityCollection._entities._array[ i ];
                addDataForScatterPlot( urbanHeatDataAndMaterial, entity, newCategorical, currentNum, decodeCategorical( newCategorical ), decodeNumerical( currentNum ) );
        
            }	

            createScatterPlot( urbanHeatDataAndMaterial, newCategorical, currentNum );       
            
        }
    }); 

}