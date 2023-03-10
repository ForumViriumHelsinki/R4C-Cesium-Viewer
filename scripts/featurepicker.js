function processClick( viewer, event ) {
    console.log("Clicked at " + String( event.x ) + ", " + String( event.y ));
    pickEntity( viewer, new Cesium.Cartesian2( event.x, event.y ) );
}

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

        console.log( "properties ", picked.id.properties );
        console.log( "picked ", picked );

        let length = picked.id.properties.propertyNames.length;
        for ( let i = 0; i < length; ++i ) {

            toPrint = toPrint + picked.id.properties.propertyNames[ i ] + ": " + picked.id.properties[ picked.id.properties.propertyNames[ i ] ] + "<br/>";
            
        };
    }

    console.log(toPrint);

    toPrint = toPrint + "<br/><br/><i>Click on objects to retrieve information. Red points indicate energy data availability.</i>"
    document.getElementById('printContainer').innerHTML = toPrint;
    document.getElementById('printContainer').scroll({
          top: 1000,
          behavior: 'smooth'
    });
    
}

function handlePostalCodeFeature( postalcode, id ) {

    let bbox = findEntityBounds( id );
    let buffer = 0.000005 //Buffer for bounding box, somewhat complex as in radians...
    let rectangle = new Cesium.Rectangle( bbox[ 2 ] - buffer, bbox[ 0 ] - buffer, bbox[ 3 ] + buffer, bbox[ 1 ] + buffer );
        
    viewer.camera.flyTo({
        destination: rectangle,
        orientation:  {
            heading : Cesium.Math.toRadians( 0.0 ),
            pitch : Cesium.Math.toRadians( -90.0 ),
            roll : 0.0
        },
        duration: 5
    });

    console.log("Postal code area found!");
    viewer.dataSources.removeAll();
    viewer.entities.removeAll();
    
    if ( showNature ) {
        
        loadNatureAreas( postalcode );
    
    }

    loadWFSBuildings( postalcode );			    
    loadPostCodeZones( 0.0 );

}

function handleBuildingFeature( properties ) {

    console.log("Building found!");
        
    let data = [
        {
        labels: [ 'Kerrosala', 'Muu ala' ],
        values: [ parseInt( properties.i_kerrosala ), parseInt( properties.i_kokala ) - parseInt( properties.i_kerrosala ) ],
        type: 'pie'
      }
    ];

    let layout = { title: { text: 'Kerrosalan osuus kokonaisalasta' } };

    //Test plotting
    if ( showPlot ) {

        document.getElementById( "plotContainer" ).style.visibility = 'visible';
    }

    Plotly.newPlot( 'plotContainer', data, layout );

}

function handleFeatureWithProperties( id ) {                
    
    postalcode = id.properties.posno;

    //If we find postal code, we assume this is an area & zoom in AND load the buildings for it.
    if ( postalcode ) {
        
        handlePostalCodeFeature( postalcode, id );
    }

    //See if we can find building floor areas
    if ( id.properties.i_kokala ) {
        
        handleBuildingFeature( id.properties );

    }

}
    
function pickEntity( viewer, windowPosition ) {
    let picked = viewer.scene.pick( windowPosition );
    
    if ( picked ) {
        
        let id = Cesium.defaultValue( picked.id, picked.primitive.id );
        
        if ( picked.id._polygon ) {
            
            if ( id instanceof Cesium.Entity ) {
                
                printCesiumEntity( picked , id);
            }
            
            if ( picked.id.properties ) {

                handleFeatureWithProperties( picked.id );
                
            }
        }
    }
}