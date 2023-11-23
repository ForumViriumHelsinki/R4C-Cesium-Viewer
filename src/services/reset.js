import * as Cesium from "cesium";
import Datasource from "./datasource.js"; 
import Postalcodeview from "./postalcodeview.js"; 
import Gridview from "./gridview.js"; 
import Plot from "./plot.js";
import { useGlobalStore } from '../store.js';

export default class Reset {
    constructor( viewer ) {
      this.viewer = viewer;
      this.datasourceHandler = new Datasource( this.viewer );
      this.postalcodeview = new Postalcodeview( );
      this.gridview = new Gridview( );
      this.plots = new Plot( );
      this.store = useGlobalStore( );
    }
  
/**
 * Resets the objects displayed, camera orientation, and switches to their default state
 */
reset( ) {

  this.removeDataSourcesAndEntities( );
  this.resetViewer( );
  this.resetSwitches( );
  this.store.reset();
  // Load post code zones & energy availability tags
  this.datasourceHandler.loadGeoJsonDataSource( 0.2, 'assets/data/hki_po_clipped.json', 'PostCodes' );

  document.getElementById( 'printContainer' ).innerHTML =  "<i>Please click on a postcode area to load building and nature areas from the WFS server...</i>";

}

/**
* Resets the switches to their default state
*/
resetSwitches( ) {

  this.postalcodeview.setPostalCodeElementsDisplay( 'inline-block' );

  document.getElementById( "populationGridToggle" ).checked = false;
  document.getElementById( "showPlotToggle" ).checked = true;
  document.getElementById( "showVegetationToggle" ).checked = false;
  document.getElementById( "showOtherNatureToggle" ).checked = false;
  document.getElementById( "hideNonSoteToggle" ).checked = false;
  document.getElementById( "hideLowToggle" ).checked = false;
  document.getElementById( "hideNewBuildingsToggle" ).checked = false;
  document.getElementById( "printToggle" ).checked = true;
  document.getElementById( "hideNonSoteToggle" ).disabled = true;
  document.getElementById( "hideLowToggle" ).disabled = true;
  document.getElementById( "hideNewBuildingsToggle" ).disabled = true;
  document.getElementById( "showTreesToggle" ).checked = false;
  document.getElementById( "showSensorDataToggle" ).checked = false;
  document.getElementById( "switchViewToggle" ).checked = false;
  document.getElementById( "switchViewToggle" ).disabled = true;
  document.getElementById( "populationGridToggle" ).disabled = false;
  this.gridview.setGridElementsDisplay( 'none' );

  this.setPrintVisible( );
  this.plots.hideAllPlotElements( );

}

/**
* Removes all data sources and entities from the viewer
*/
removeDataSourcesAndEntities( ) {

  this.viewer.dataSources.removeAll( );
  this.viewer.entities.removeAll( );

}

/**
* Resets the viewer's camera to Helsinki with a specific orientation
*/
resetViewer( ) {
  // Fly the camera to Helsinki at the given longitude, latitude, and height.
  viewer.camera.flyTo({
      destination : Cesium.Cartesian3.fromDegrees( 24.931745, 60.190464, 35000 ), 
      orientation : {
          heading : Cesium.Math.toRadians( 0.0 ),
          pitch : Cesium.Math.toRadians( -85.0 ),
      }
  });

}
  
/**
 * This function sets the visibility of HTML elements related to printing and geocoder to "visible", making them visible on the webpage.  
 * 
 */
setPrintVisible( ) {
    document.getElementById( 'printContainer' ).style.visibility = 'visible';
    document.getElementById( 'searchcontainer' ).style.visibility = 'visible';
    document.getElementById( 'georefContainer' ).style.visibility = 'visible';
    document.getElementById( 'searchbutton' ).style.visibility = 'visible';
}

/**
 * Returns the selected text of a dropdown menu with the given element ID.
 * 
 * @param { string } elementId - The ID of the HTML element that represents the dropdown menu.
 * @returns { string } The selected text of the dropdown menu, or null if no option is selected.
 */
getSelectedText( elementId ) {

    const elt = document.getElementById( elementId );
  
    if ( elt.selectedIndex == -1 ) {

      return null;

    }
  
    return elt.options[ elt.selectedIndex ].text;

}


/**
 * Shows all plots and select elements
 * 
 * */
showAllPlots( ) {

    document.getElementById( 'plotContainer' ).style.visibility = 'visible';
    document.getElementById( 'plotSoSContainer' ).style.visibility = 'visible';
    document.getElementById( 'plotMaterialContainer' ).style.visibility = 'visible';

    // only show scatter plot selects if trees are not visible
    if ( !document.getElementById( "showTreesToggle" ).checked ) {

        document.getElementById( 'numericalSelect' ).style.visibility = 'visible';
        document.getElementById( 'categoricalSelect' ).style.visibility = 'visible'; 
       
    } else {

        toggleBearingSwitchesVisibility( 'visible' );

    }

}

}