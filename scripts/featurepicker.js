function processClick( viewer, event ) {
    console.log("Clicked at " + String( event.x ) + ", " + String( event.y ));
    pickEntity( viewer, new Cesium.Cartesian2( event.x, event.y ) );
}
    
function pickEntity( viewer, windowPosition ) {
    let picked = viewer.scene.pick( windowPosition );
    
    if ( picked ) {
        
        let id = Cesium.defaultValue( picked.id, picked.primitive.id );
        
        if ( picked.id._polygon ) {

            let bbox = findEntityBounds( picked.id );
            let buffer = 0.000005 //Buffer for bounding box, somewhat complex as in radians...
            
            if ( id instanceof Cesium.Entity ) {
                
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
            
            if ( picked.id.properties ) {
                
                //If we find postal code, we assume this is an area & zoom in AND load the buildings for it.
                if ( picked.id.properties.postinumeroalue ) {
                    
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
                    postalcode = picked.id.properties.postinumeroalue;
                    viewer.dataSources.removeAll();
                    viewer.entities.removeAll();
                    
                    if ( showNature ) {
                        
                        loadNatureAreas( picked.id.properties.postinumeroalue );
                    
                    }

                    console.log( picked.id.properties.postinumeroalue );
                    loadWFSBuildings( picked.id.properties.postinumeroalue );			    
                    loadPostCodeZones( 0.0, viewer );
                }
        
                //See if we can find building floor areas
                if ( picked.id.properties.i_kokala ) {
                    
                    console.log("Building found!");
                    
                    let data = [
                        {
                            labels: [ 'Kerrosala', 'Muu ala' ],
                        values: [ parseInt(picked.id.properties.i_kerrosala), parseInt( picked.id.properties.i_kokala ) - parseInt( picked.id.properties.i_kerrosala ) ],
                        type: 'pie'
                      }
                    ];
            
                    let layout = { title: { text: 'Kerrosalan osuus kokonaisalasta' } };
                
                    //Test plotting
                    if ( showPlot ) {
                        document.getElementById("plotContainer").style.visibility = 'visible';
                    }
                    Plotly.newPlot( 'plotContainer', data, layout );
            
                }
            }
        }
    }
}