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

function handleBuildingFeature( buildingHeatExposure, address, postinumero ) {

    console.log("Building found!");

    let trace1 = {
        x: [ 'to building' ],
        y: [ buildingHeatExposure ],
        name: address,
        type: 'bar'
    };
      
    let trace2 = {
        x: [ 'average in postal code area' ],
        y: [ averageHeatExposure ],
        name: postinumero,
        type: 'bar',
    };
      
    let data = [ trace1, trace2 ];
      
    let layout = { title: { text: 'Urban Heat Exposure Comparison' }, barmode: 'group' };

    //Test plotting
    if ( showPlot ) {

        document.getElementById( "plotContainer" ).style.visibility = 'visible';
    }

    Plotly.newPlot( 'plotContainer', data, layout );

}

function handleFeatureWithProperties( id ) {                
    
    postalcode = id.properties.posno;
    nameOfZone = id.properties.nimi;

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
        
        handleBuildingFeature( id.properties._avgheatexposuretobuilding._value, address, id.properties._postinumero._value );

    }

}
    
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

function hidePlotlyIfNatureFeatureIsClicked( category ) {

    if ( category ) {

        document.getElementById( 'plotContainer' ).style.visibility = 'hidden';

    } else {

        if ( document.getElementById( "showPlotToggle" ).checked ) {

            document.getElementById( 'plotContainer' ).style.visibility = 'visible';

        }

    }
}