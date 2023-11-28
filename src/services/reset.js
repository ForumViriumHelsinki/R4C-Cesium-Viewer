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
      this.plotsService = new Plot( );
      this.store = useGlobalStore( );
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

  this.plotsService.togglePostalCodePlotVisibility( 'hidden' );

}

/**
* Removes all data sources and entities from the viewer
*/
removeDataSourcesAndEntities( ) {

  this.viewer.dataSources.removeAll( );
  this.viewer.entities.removeAll( );

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


}