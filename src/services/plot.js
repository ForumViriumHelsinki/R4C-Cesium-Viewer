export default class Plot {


    constructor(  ) {

    }
  

/**
 * Toggle visibility of plot elements visible at postal code level
 * 
 * */
togglePostalCodePlotVisibility( status ) {

    document.getElementById( 'heatHistogramContainer' ).style.visibility = status;
    document.getElementById( 'socioeonomicsContainer' ).style.visibility = status;
    document.getElementById( 'numericalSelect' ).style.visibility = status;
    document.getElementById( 'categoricalSelect' ).style.visibility = status;
    document.getElementById( 'scatterPlotContainer' ).style.visibility = status;
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