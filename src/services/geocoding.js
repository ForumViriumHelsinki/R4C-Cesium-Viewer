import Resetui from "./reset.js"; 
import Viewercamera from "./viewercamera.js"; 
import PrintBox from "./printbox.js"; 
import FeaturePicker from "./featurepicker.js"; 

export default class Geocoding {
    constructor( viewer ) {
      this.viewer = viewer;
      this.resetui = new Resetui( this.viewer );
      this.viewercamera = new Viewercamera( this.viewer );
      this.printBox = new PrintBox( this.viewer );
      this.featurePicker = new FeaturePicker( this.viewer );
      this.addressData = null;
    }
    
/**
 * Adds event listeners for user interactions
 */
addGeocodingEventListeners () {

    const searchField = document.getElementById( 'searchInput' );
    const searchButton = document.getElementById( 'searchButton' );
    const addressResult = document.getElementById( 'searchresults' );

    searchButton.addEventListener( 'click', this.checkSearch );
    searchField.addEventListener( 'keyup', this.filterSearchResults );
    addressResult.addEventListener( 'click', this.moveCameraToLocation );

}

/**
 * Checks if there is only one value in searchresults and moves camera to the location
 */
checkSearch = ( ) => {

    if ( this.addressData.length === 1 ) {

        this.$postalcode = this.addressData[ 0 ].postalcode;
        this.moveCameraAndReset( this.addressData[ 0 ].longitude, this.addressData[ 0 ].latitude, this.addressData[ 0 ].postalcode );
        document.getElementById( 'searchresults' ).innerHTML = '';

    }
}

/**
 * Processes the data found with geocoding API. Only results from Helsinki are included and only data useful for app is left in
 *
 * @param { object } data found data
 * @return { object } processed data
 */
processAddressData = ( data ) => {

    let features = [];

    for ( let i = 0, len = data.length; i < len; i++ ) {

        // only include results from Helsinki
        if ( ( data[ i ][ 'properties' ][ 'locality' ] === 'Helsinki' || data[ i ][ 'properties' ][ 'localadmin' ] === 'Helsinki' ) && data[ i ].properties.postalcode ) {

            let row = { address: data[ i ][ 'properties' ][ 'name' ], latitude: data[ i ][ 'geometry' ][ 'coordinates'][ 1 ], longitude: data[ i ][ 'geometry' ][ 'coordinates'][ 0 ], postalcode: data[ i ].properties.postalcode };
            features.push( row );

        }


    }

    return features;

}

/**
 * Function that filters search results
 */
filterSearchResults = async () => {

    const searchresultscontainer = document.getElementById( 'searchresultscontainer' );
    const searchField = document.getElementById( 'searchInput' );
    searchresultscontainer.style.display = 'none';

    if ( searchField.value.length > 2 ) {

        try {
            let response = await fetch( 'https://api.digitransit.fi/geocoding/v1/autocomplete?text=' + searchField.value + '&digitransit-subscription-key=449738b35f49484c8f31cf4c03723d4d' );
            let data = await response.json();

            // Use arrow functions to maintain the component's context
            this.addressData = this.processAddressData (data['features'] );
            let streetAddresses = this.addressData.map( d => d.address );
            this.renderSearchResult( streetAddresses );
        } catch (error) {
            console.error(error);
        }
    }

}

/**
  * Finds coordinates for street address / search term and moves camera to the found coordinates
  *
  * @param { object } e event object from UI
  */
moveCameraToLocation = ( e ) => {

    let lat;
    let long;
    let postcode;

    e = e || window.event;
    let target = e.target || e.srcElement;
    let text = target.textContent || target.innerText;

    for ( let i = 0; i < this.addressData.length; i++ ) {

        if ( this.addressData[ i ].address === text ) {

            lat = this.addressData[ i ].latitude;
            long = this.addressData[ i ].longitude;
            postcode = this.addressData[ i ].postalcode 
            break;

        }
    }

    this.findNameOfZone( postcode );
    this.moveCameraAndReset( long, lat, postcode );
    document.getElementById( 'searchresults' ).innerHTML = '';
    document.getElementById( 'searchInput' ).value = 'enter place or address';
}

/**
 * Renders autocomplete search result
 *
 * @param { Array<String> } addresses shown to user
 */
renderSearchResult ( addresses ) {

    let liElemet = '' ;

    for ( let i = 0; i < addresses.length; i++ ) {

        liElemet += `<dt>${ addresses[ i ] }</dt>`;

    }
    searchresultscontainer.style.display = 'block';
    document.getElementById( 'searchresults' ).innerHTML = liElemet;

}

// Moves camera to specified latitude, longitude coordinates
moveCameraAndReset( longitude, latitude, postcode ) {

    this.viewercamera.setCameraView( longitude, latitude );
    this.resetui.resetSwitches( );
    this.$postalcode = postcode;
    this.printBox.createToPrint( postcode );
    this.featurePicker.loadPostalCode( postcode );

}

/**
  * Finds name of the new zone based on it's postal code
  *
  * @param { string } postalcode postal code of new zone
  */
findNameOfZone( postalcode ) {

    // Find the data source for postcodes
    const postCodesDataSource = this.viewer.dataSources._dataSources.find( ds => ds.name === "PostCodes" );

    if ( !postCodesDataSource ) {

        return;

    }
    
    // Iterate over all entities in the postcodes data source.
    for ( let i = 0; i < postCodesDataSource._entityCollection._entities._array.length; i++ ) {
    
        let entity = postCodesDataSource._entityCollection._entities._array[ i ];
    
        // Check if the entity posno property matches the postalcode.
        if ( entity._properties._posno._value  == postalcode ) {
    
            this.$nameOfZone = entity._properties._nimi._value;
            break;
        }
    }
}

/**
 * This function sets the visibility of HTML elements related to geocoder to "visible", making them visible on the webpage.  
 * 
 */
setGeocodingVisible( ) {
    document.getElementById( 'printContainer' ).style.visibility = 'visible';
    document.getElementById( 'searchcontainer' ).style.visibility = 'visible';
    document.getElementById( 'georefContainer' ).style.visibility = 'visible';
    document.getElementById( 'searchbutton' ).style.visibility = 'visible';
}

}