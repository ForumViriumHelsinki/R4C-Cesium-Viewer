let addressData = null;

/**
 * Adds event listeners for user interactions
 */
 function addGeocodingEventListeners () {

    const searchField = document.getElementById( 'searchInput' );
    const searchButton = document.getElementById( 'searchButton' );
    const addressResult = document.getElementById( 'searchresults' );

    searchButton.addEventListener( 'click', checkSearch );
    searchField.addEventListener( 'keyup', filterSearchResults );
    addressResult.addEventListener( 'click', moveCameraToLocation );

}

/**
 * Processes the data found with geocoding API. Only results from Helsinki are included and only data useful for app is left in
 *
 * @param { object } data found data
 * @return { object } processed data
 */
function processAddressData ( data ) {

    let features = [];

    for ( let i = 0, len = data.length; i < len; i++ ) {

        // only include results from Helsinki
        if ( data[ i ][ 'properties' ][ 'locality' ] === 'Helsinki' || data[ i ][ 'properties' ][ 'localadmin' ] === 'Helsinki' ) {

            let row = { address: data[ i ][ 'properties' ][ 'name' ], latitude: data[ i ][ 'geometry' ][ 'coordinates'][ 1 ], longitude: data[ i ][ 'geometry' ][ 'coordinates'][ 0 ], postalcode: data[ i ].properties.postalcode };
            features.push( row );

        }


    }

    return features;

}

/**
 * Checks if there is only one value in searchresults and moves camera to the location
 */
function checkSearch () {

    if ( addressData.length === 1 ) {

        postalcode = addressData[ 0 ].postalcode;
        moveCameraAndReset( addressData[ 0 ].longitude, addressData[ 0 ].latitude, addressData[ 0 ].postalcode );
        document.getElementById( 'searchresults' ).innerHTML = '';

    }
}


/**
 * Function that filters search results
 */
async function filterSearchResults () {

    const searchresultscontainer = document.getElementById( 'searchresultscontainer' );
    const searchField = document.getElementById( 'searchInput' );
    searchresultscontainer.style.display = 'none';

    if ( searchField.value.length > 2 ) {

        let data = await fetch( 'https://api.digitransit.fi/geocoding/v1/autocomplete?text=' + searchField.value + '&digitransit-subscription-key=449738b35f49484c8f31cf4c03723d4d' )
        .then( function( response ) {
            return response.json();
          })
          .then( function( data ) {

            addressData = processAddressData( data[ 'features' ] );
            let streetAddresses = addressData.map( d => d.address );
            renderSearchResult( streetAddresses );
          });
    }

}

/**
 * Renders autocomplete search result
 *
 * @param { Array<String> } addresses shown to user
 */
function renderSearchResult ( addresses ) {

    let liElemet = '' ;

    for ( let i = 0; i < addresses.length; i++ ) {

        liElemet += `<dt>${ addresses[ i ] }</dt>`;

    }
    searchresultscontainer.style.display = 'block';
    document.getElementById( 'searchresults' ).innerHTML = liElemet;

}

/**
  * Finds coordinates for street address / search term and moves camera to the found coordinates
  *
  * @param { object } e event object from UI
  */
function moveCameraToLocation ( e ) {

    let lat;
    let long;
    let postcode;

    e = e || window.event;
    let target = e.target || e.srcElement;
    let text = target.textContent || target.innerText;

    for ( let i = 0; i < addressData.length; i++ ) {

        if ( addressData[ i ].address === text ) {

            lat = addressData[ i ].latitude;
            long = addressData[ i ].longitude;
            postcode = addressData[ i ].postalcode 
            break;

        }
    }

    findNameOfZone( postcode );
    moveCameraAndReset( long, lat, postcode );
    document.getElementById( 'searchresults' ).innerHTML = '';
    document.getElementById( 'searchInput' ).value = 'enter place or address';
}

// Moves camera to specified latitude, longitude coordinates
function moveCameraAndReset( longitude, latitude, postcode ) {

    viewer.camera.setView( {
        destination: Cesium.Cartesian3.fromDegrees( longitude, latitude - 0.0065, 500.0 ),
        orientation: {
            heading: 0.0,
            pitch: Cesium.Math.toRadians( -35.0 ),
            roll: 0.0
        }
    } );

    postalcode = postcode;
    createToPrint(postcode );
    loadPostalCode( postcode );

}

/**
  * Finds name of the new zone based on it's postal code
  *
  * @param { string } postalcode postal code of new zone
  */
function findNameOfZone( postalcode ) {

    const response = fetch( 'assets/data/Helsinki_postinumerot.geojson' )
    .then( function( response ) {
      return response.json();
    })
    .then( function( data ) {

        for ( let i = 0; i < data.features.length; i++ ) {

            if ( data.features[ i ].properties.posno == postalcode ) {

                nameOfZone = data.features[ i ].properties.nimi;
                break;

            }
        }
    })
}


/**
  * Creates content for printing from postal code properties
  *
  * @param { string } postalcode postal code of new zone
  */
function createToPrint( postalcode ) {

    let toPrint = "<u>Found following properties & values:</u><br/>";	

    viewer.dataSources._dataSources.forEach( function( dataSource ) {
            
        if ( dataSource.name == "PostCodes" ) {

            for ( let i = 0; i < dataSource._entityCollection._entities._array.length; i++ ) {

                let entity = dataSource._entityCollection._entities._array[ i ];

                if ( entity._properties._posno._value == postalcode ) {

                    let length = entity._properties._propertyNames.length;

                    for ( let i = 0; i < length; ++i ) {

                        toPrint = toPrint + entity._properties._propertyNames[ i ] + ": " + entity._properties[ entity._properties._propertyNames[ i ] ]._value + "<br/>";
                        
                    };                    
                    
                } 

            }						
        }
    }); 
    
    addToPrint( toPrint, postalcode)

}