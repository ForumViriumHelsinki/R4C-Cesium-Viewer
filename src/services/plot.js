export default class Plot {

/**
 * Hides all plots and select elements
 * 
 * */
hideAllPlotElements( ) {

    document.getElementById( 'plotContainer' ).style.visibility = 'hidden';
    document.getElementById( 'plotSoSContainer' ).style.visibility = 'hidden';
    document.getElementById( 'numericalSelect' ).style.visibility = 'hidden';
    document.getElementById( 'categoricalSelect' ).style.visibility = 'hidden';
    this.toggleBearingSwitchesVisibility( 'hidden' );
    document.getElementById( 'plotMaterialContainer' ).style.visibility = 'hidden';
    document.getElementById( 'categoricalSelect' ).value = 'c_julkisivu';
    document.getElementById( 'numericalSelect' ).value = 'measured_height';

}

/**
 * Toggle visibility of tree bearing switches
 * 
 * @param {string} status - The desired visibility status ("visible" or "hidden")
 */
toggleBearingSwitchesVisibility( status ) {

    const switchContainers = [ 'All', 'South', 'West', 'East', 'North' ];
  
    for ( const direction of switchContainers ) {

      const switchContainer = document.getElementById( `bearing${direction}SwitchContainer` );
      switchContainer.style.visibility = status;

    }
}

}