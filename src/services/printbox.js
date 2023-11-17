export default class Printbox {

    constructor( viewer ) {
        this.viewer = viewer;  
    }

    /**
     * Changes the display of gird elements when user switches between postal code and grid view
     */
    setGridElementsDisplay( display ) {
        const elements = [
            'natureGridSwitch',
            'natureGridLabel',
            'travelTimeSwitch',
            'travelTimeLabel'
        ];
    
        elements.forEach(( elementId ) => {
            const element = document.getElementById( elementId );
            if (element) {
    
                element.style.display = display;
            
            }
        });
    }

    /**
  * Creates content for printing from postal code properties
  *
  * @param { string } postalcode postal code of new zone
  */
createToPrint( postalcode ) {

    let toPrint = "<u>Found following properties & values:</u><br/>";	

    this.viewer.dataSources._dataSources.forEach( function( dataSource ) {
            
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
    
    this.addToPrint( toPrint, postalcode)

}

/**
 * Adds the provided content to the print container
 * 
 * @param {string} toPrint - The content to be added to the print container
 * @param {string} postno - The postal code associated with the content
 */
addToPrint( toPrint, postno ) {

    if ( postno ) {

        toPrint = toPrint + "<br/><br/><i>Click on objects to retrieve information.</i>"

    } else {

        toPrint = toPrint + "<br/><br/><i>If average urban heat exposure of building is over 0.5 the nearest location with under 0.4 heat exposure is shown on map.</i>"

    }

    document.getElementById('printContainer').innerHTML = toPrint;
    document.getElementById('printContainer').scroll({
          top: 1000,
          behavior: 'smooth'
    });
}

/**
 * This function sets the visibility of HTML elements related to printing to "visible", making them visible on the webpage.  
 * 
 */
setPrintVisible( ) {
    document.getElementById( 'printContainer' ).style.visibility = 'visible';
}

}