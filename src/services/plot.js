import { useGlobalStore } from '../store.js';

export default class Plot {


    constructor(  ) {
      this.store = useGlobalStore( );
    }
  

/**
 * Shows all plots and select elements
 * 
 * */
showAllPlots( ) {

  if ( this.store.level === 'postalCode') {

    document.getElementById( 'heatHistogramContainer' ).style.visibility = 'visible';
    document.getElementById( 'socioeonomicsContainer' ).style.visibility = 'visible';
    document.getElementById( 'scatterPlotContainer' ).style.visibility = 'visible';

    // only show scatter plot selects if trees are not visible
    if ( !document.getElementById( "showTreesToggle" ).checked ) {

        document.getElementById( 'numericalSelect' ).style.visibility = 'visible';
        document.getElementById( 'categoricalSelect' ).style.visibility = 'visible'; 
       
    } else {

        this.toggleBearingSwitchesVisibility( 'visible' );

    }
  }

    if ( this.store.level === 'building' ) {


    document.getElementById( 'buildingChartContainer' ).style.visibility = 'visible';

}
}

/**
 * Hides all plots and select elements
 * 
 * */
hideAllPlots( ) {

    document.getElementById( 'heatHistogramContainer' ).style.visibility = 'hidden';
    document.getElementById( 'socioeonomicsContainer' ).style.visibility = 'hidden';
    document.getElementById( 'buildingChartContainer' ).style.visibility = 'hidden';
    document.getElementById( 'numericalSelect' ).style.visibility = 'hidden';
    document.getElementById( 'categoricalSelect' ).style.visibility = 'hidden';
    this.toggleBearingSwitchesVisibility( 'hidden' );
    document.getElementById( 'scatterPlotContainer' ).style.visibility = 'hidden';
    document.getElementById( 'categoricalSelect' ).value = 'c_julkisivu';
    document.getElementById( 'numericalSelect' ).value = 'measured_height';

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