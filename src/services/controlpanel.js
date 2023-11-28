import Datasource from "./datasource.js"; 
import Vegetation from "./vegetation.js"; 
import OtherNature from "./othernature.js"; 
import Plot from "./plot.js"; 
import Tree from "./tree.js"; 
import Sensor from "./sensor.js"; 
import { useGlobalStore } from '../store.js';
import * as Cesium from "cesium"

export default class Controlpanel {
    constructor( viewer ) {
        this.viewer = viewer;
        this.dataSourceService = new Datasource( this.viewer );
        this.vegetationService = new Vegetation( this.viewer );
        this.otherNatureService = new OtherNature( this.viewer );
        this.plotService = new Plot( );
        this.treeService = new Tree( this.viewer );
        this.sensorService = new Sensor( this.viewer );
        this.store = useGlobalStore( );

        this.filterBuildingsEvent = this.filterBuildingsEvent.bind(this);
        this.loadVegetationEvent = this.loadVegetationEvent.bind(this);
        this.loadOtherNatureEvent = this.loadOtherNatureEvent.bind(this);
        this.loadSensorDataEvent = this.loadSensorDataEvent.bind(this);
        this.switchViewEvent = this.switchViewEvent.bind(this);
        this.loadTreesEvent = this.loadTreesEvent.bind(this);
        this.printEvent = this.printEvent.bind(this);
        this.showPlotEvent = this.showPlotEvent.bind(this);

    }
  
/**
 * Add EventListeners related to buildings
 */
addEventListeners() {
    document.getElementById('hideNewBuildingsToggle').addEventListener('change', this.filterBuildingsEvent);
    document.getElementById('hideNonSoteToggle').addEventListener('change', this.filterBuildingsEvent);
    document.getElementById('hideLowToggle').addEventListener('change', this.filterBuildingsEvent);
    document.getElementById('showVegetationToggle').addEventListener('change', this.loadVegetationEvent);
    document.getElementById('showOtherNatureToggle').addEventListener('change', this.loadOtherNatureEvent);
    document.getElementById('showSensorDataToggle').addEventListener('change', this.loadSensorDataEvent);
    document.getElementById('switchViewToggle').addEventListener('change', this.switchViewEvent);
    document.getElementById('showTreesToggle').addEventListener('change', this.loadTreesEvent);
    document.getElementById('printToggle').addEventListener('change', this.printEvent);
    document.getElementById('showPlotToggle').addEventListener('change', this.showPlotEvent);

}

/**
 * This function is called when the "Display Plot" toggle button is clicked
 *
 */
showPlotEvent( ) {

    // Get the value of the "Show Plot" toggle button
    const showPlots = document.getElementById( "showPlotToggle" ).checked;
    
    // Hide the plot and its controls if the toggle button is unchecked
    if ( !showPlots ) {

        this.plotService.hideAllPlots( );

    } else { // Otherwise, show the plot and its controls if the toggle button is checked and the plot is already loaded

        this.plotService.showAllPlots( );

    }

}

/**
 * This function is called when the Object details button is clicked
 *
 */
printEvent( ) {

    const print = document.getElementById( "printToggle" ).checked;

    // If print is not selected, hide the print container, search container, georeference container, and search button
    if ( !print ) {

        document.getElementById( 'printContainer' ).style.visibility = 'hidden';
        document.getElementById( 'searchcontainer' ).style.visibility = 'hidden';
        document.getElementById( 'georefContainer' ).style.visibility = 'hidden';
        document.getElementById( 'searchbutton' ).style.visibility = 'hidden';

    } else { // Otherwise, make the print container visible

        this.setPrintVisible( );

    }

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
 * This function to show or hide sensordata entities on the map based on the toggle button state
 *
 */
loadSensorDataEvent( ) {

    // Get the state of the showSensorData toggle button
    const showSensorData = document.getElementById( "showSensorDataToggle" ).checked;

    // If showSensorData toggle is on
    if ( showSensorData ) {
        
        this.sensorService.loadSensorData( );
        
    } else { 
        
        this.dataSourceService.changeDataSourceShowByName( "SensorData", false );

    }

}

/**
 * This function to show or hide tree entities on the map based on the toggle button state
 *
 */
loadTreesEvent( ) {

    // Get the state of the showTrees toggle button
    const showTrees = document.getElementById( "showTreesToggle" ).checked;

    // If showTrees toggle is on
    if ( showTrees ) {

        // If a postal code is available, load trees for that postal code
        if ( this.store.postalcode  && !this.dataSourceService.getDataSourceByName( "Trees" )  ) {

            this.treeService.loadTrees( this.store.postalcode );

        } else {
            
            this.dataSourceService.changeDataSourceShowByName( "Trees", true );
        }
        
    } else { // If showTrees toggle is off
        
        this.dataSourceService.changeDataSourceShowByName( "Trees", false );
     //   resetTreeEntites( );
     //   resetBuildingEntites( );
     //   selectAttributeForScatterPlot( );

    }

}

/**
 * This function handles the toggle event for showing or hiding the nature areas layer on the map.
 *
 */
loadOtherNatureEvent( ) {

    // Get the current state of the toggle button for showing nature areas.
    const showloadOtherNature = document.getElementById( "showOtherNatureToggle" ).checked;

    if ( showloadOtherNature ) {

        // If the toggle button is checked, enable the toggle button for showing the nature area heat map.
        //document.getElementById("showloadOtherNature").disabled = false;

        // If there is a postal code available, load the nature areas for that area.
        if ( this.store.postalcode && !this.dataSourceService.getDataSourceByName( "OtherNature" ) ) {

            this.otherNatureService.loadOtherNature( this.store.postalcode );

        } else {
            
            this.dataSourceService.changeDataSourceShowByName( "OtherNature", true );
        }


    } else {

        this.dataSourceService.changeDataSourceShowByName( "OtherNature", false );

    }

}

/**
 * This function handles the toggle event for showing or hiding the vegetation layer on the map.
 *
 */
loadVegetationEvent( ) {

    // Get the current state of the toggle button for showing nature areas.
    const showVegetation = document.getElementById( "showVegetationToggle" ).checked;

    if ( showVegetation ) {

        // If the toggle button is checked, enable the toggle button for showing the nature area heat map.
        //document.getElementById("showVegetationHeatToggle").disabled = false;

        // If there is a postal code available, load the nature areas for that area.
        if ( this.store.postalcode && !this.dataSourceService.getDataSourceByName("Vegetation") ) {

            this.vegetationService.loadVegetation( this.store.postalcode );

        } else {
            
            this.dataSourceService.changeDataSourceShowByName( "Vegetation", true );

        }

    } else {

        this.dataSourceService.changeDataSourceShowByName( "Vegetation", false );

    }

}

filterBuildingsEvent = () => {

    const hideNonSote = document.getElementById( "hideNonSoteToggle" ).checked;
    const hideNewBuildings = document.getElementById( "hideNewBuildingsToggle" ).checked;
    const hideLow = document.getElementById( "hideLowToggle" ).checked;

    if ( hideNonSote || hideNewBuildings || hideLow ) {

        this.filterBuildings( );

    } else {

        this.showAllBuildings( );

    }

}

/**
 * Filter buildings from the given data source based on UI toggle switches.
 * 
 */
 filterBuildings = () => {

    // Find the data source for buildings
    const buildingsDataSource = this.dataSourceService.getDataSourceByName( "Buildings" );
        // If the data source isn't found, exit the function
    if ( !buildingsDataSource ) {
        return;
    }


    const hideNewBuildings = document.getElementById( "hideNewBuildingsToggle" ).checked;
    const hideNonSote = document.getElementById( "hideNonSoteToggle" ).checked;
    const hideLow = document.getElementById( "hideLowToggle" ).checked;

    buildingsDataSource.entities.values.forEach(( entity ) => {

        if ( hideNewBuildings ) {
            // Filter out buildings built before summer 2018
            const cutoffDate = new Date( "2018-06-01T00:00:00" ).getTime();
            if ( entity._properties._c_valmpvm && typeof entity._properties._c_valmpvm._value === 'string' ) {

                const c_valmpvm = new Date( entity._properties._c_valmpvm._value ).getTime();

                if ( c_valmpvm >= cutoffDate ) {

                    entity.show = false;

                }
            } else {

                entity.show = false;
    
            }
        }

        if ( hideNonSote ) {
            // Filter out non-SOTE buildings

            if ( entity._properties._c_kayttark ) {

                const kayttotark = Number( entity._properties.c_kayttark._value );

                if ( !kayttotark != 511 && !kayttotark != 131 && !( kayttotark > 212 && kayttotark < 240 ) ) {
    
                    entity.show = false;
        
                } 

            } else {

                entity.show = false;
    
            }
        }

        if ( hideLow ) {
            // Filter out buildings with fewer floors
            if ( entity._properties._i_kerrlkm ) {

                if ( entity._properties._i_kerrlkm && Number( entity._properties._i_kerrlkm._value ) <= 6 ) {

                    entity.show = false;
    
                }
                
            } else {

                entity.show = false;
    
            }
        }

    });

}
/**
* Shows all buildings and updates the histograms and scatter plot
*
*/
showAllBuildings( ) {

    const buildingsDataSource = this.dataSourceService.getDataSourceByName( "Buildings" );

    // If the data source isn't found, exit the function
    if ( !buildingsDataSource ) {
        return;
    }

    // Iterate over all entities in data source
    for ( let i = 0; i < buildingsDataSource._entityCollection._entities._array.length; i++ ) {

        // Show the entity
        buildingsDataSource._entityCollection._entities._array[ i ].show = true;

    }

 
}

/**
 * This function is called when the user clicks on the "switch view" toggle button.
 *
 */
switchViewEvent( ) {

    // Get the status of the "switch view" toggle button.
    const switchView = document.getElementById( "switchViewToggle" ).checked;

    // If the "switch view" toggle button is checked.
    if ( switchView ) {

        this.switchTo2DView( );

    // If the "switch view"" toggle button is not checked.
    } else {

        this.switchTo3DView( );

    }

}

// Function to switch to 2D view
switchTo2DView() {

    // Find the data source for postcodes
    const postCodesDataSource = this.dataSourceService.getDataSourceByName( "PostCodes" );
    
    // Iterate over all entities in the postcodes data source.
    for ( let i = 0; i < postCodesDataSource._entityCollection._entities._array.length; i++ ) {
        
        let entity = postCodesDataSource._entityCollection._entities._array[ i ];
        
        // Check if the entity posno property matches the postalcode.
        if ( entity._properties._posno._value  == this.store.postalcode ) {
        
                // TODO create function that takes size of postal code area and possibile location by the sea into consideration and sets y and z based on thse values
                this.viewer.camera.flyTo( {
                    destination: Cesium.Cartesian3.fromDegrees( entity._properties._center_x._value, entity._properties._center_y._value, 3500 ),
                    orientation: {
                        heading: Cesium.Math.toRadians( 0.0 ),
                        pitch: Cesium.Math.toRadians( -90.0 ),
                    },
                    duration: 3
                });
            
        }
    }

    // change label
    this.changeLabel( "switchViewLabel", "3D view" );

}
  
// Function to switch back to 3D view
switchTo3DView() {
    // Find the data source for postcodes
    const postCodesDataSource = this.dataSourceService.getDataSourceByName( "PostCodes" );
    
    // Iterate over all entities in the postcodes data source.
    for ( let i = 0; i < postCodesDataSource._entityCollection._entities._array.length; i++ ) {
        
        let entity = postCodesDataSource._entityCollection._entities._array[ i ];
        
        // Check if the entity posno property matches the postalcode.
        if ( entity._properties._posno._value  == this.store.postalcode ) {
        
                // TODO create function that takes size of postal code area and possibile location by the sea into consideration and sets y and z based on thse values
                this.viewer.camera.flyTo( {
                    destination: Cesium.Cartesian3.fromDegrees( entity._properties._center_x._value, entity._properties._center_y._value - 0.025, 2000 ),
                    orientation: {
                        heading: 0.0,
                        pitch: Cesium.Math.toRadians( -35.0 ),
                        roll: 0.0
                    },
                    duration: 3
                });
            
        }
    }

    // change label
    this.changeLabel( "switchViewLabel", "2D view" );

}

/**
 * Gets label element by id and changes it 
 * 
 * @param { String } id - The Cesium viewer object
 * @param { String } text - The window position to pick the entity
 */
changeLabel( id, text ) {

    const labelElement = document.getElementById( id );
    labelElement.innerHTML = text;

}

}