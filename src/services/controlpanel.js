import Datasource from "./datasource.js"; 
import Vegetation from "./vegetation.js"; 
import OtherNature from "./othernature.js"; 
import Building from "./building.js"; 
import Flood from "./flood.js"; 
import Plot from "./plot.js"; 
import Tree from "./tree.js"; 
import Sensor from "./sensor.js";
import View from "./view.js"; 
import EventEmitter from "./eventEmitter.js"
import { useGlobalStore } from '../stores/globalStore.js';


export default class Controlpanel {
    constructor( viewer ) {
        this.viewer = viewer;
        this.dataSourceService = new Datasource( this.viewer );
        this.vegetationService = new Vegetation( this.viewer );
        this.otherNatureService = new OtherNature( this.viewer );
        this.plotService = new Plot( );
        this.treeService = new Tree( this.viewer );
        this.floodService = new Flood( this.viewer );
        this.sensorService = new Sensor( this.viewer );
        this.viewService = new View( this.viewer );
        this.buildingService = new Building( this.viewer );
        this.store = useGlobalStore( );
        this.eventEmitterService = new EventEmitter( );

        this.filterBuildingsEvent = this.filterBuildingsEvent.bind(this);
        this.loadVegetationEvent = this.loadVegetationEvent.bind(this);
        this.loadOtherNatureEvent = this.loadOtherNatureEvent.bind(this);
        this.loadSensorDataEvent = this.loadSensorDataEvent.bind(this);
        this.switchViewEvent = this.switchViewEvent.bind(this);
        this.loadTreesEvent = this.loadTreesEvent.bind(this);
        this.printEvent = this.printEvent.bind(this);
        this.showPlotEvent = this.showPlotEvent.bind(this);
        this.loadFloodEvent = this.loadFloodEvent.bind(this);
        this.gridViewEvent = this.gridViewEvent.bind(this);

    }
  
/**
 * Add EventListeners related to buildings
 */
addEventListeners() {
    document.getElementById( 'hideNewBuildingsToggle' ).addEventListener('change', this.filterBuildingsEvent);
    document.getElementById( 'hideNonSoteToggle' ).addEventListener('change', this.filterBuildingsEvent);
    document.getElementById( 'hideLowToggle' ).addEventListener('change', this.filterBuildingsEvent);
    document.getElementById( 'showVegetationToggle' ).addEventListener('change', this.loadVegetationEvent);
    document.getElementById( 'showOtherNatureToggle' ).addEventListener('change', this.loadOtherNatureEvent);
    document.getElementById( 'showSensorDataToggle' ).addEventListener('change', this.loadSensorDataEvent);
    document.getElementById( 'switchViewToggle' ).addEventListener('change', this.switchViewEvent);
    document.getElementById( 'showTreesToggle' ).addEventListener('change', this.loadTreesEvent);
    document.getElementById( 'printToggle' ).addEventListener('change', this.printEvent);
    document.getElementById( 'showPlotToggle' ).addEventListener('change', this.showPlotEvent);
    document.getElementById( 'floodToggle').addEventListener('change', this.loadFloodEvent);
    document.getElementById( 'gridViewToggle').addEventListener('change', this.gridViewEvent);

}

/**
 * This function handles the toggle event for switching to grid view
 */
gridViewEvent( ) {

    const gridView = document.getElementById( "gridViewToggle" ).checked;

    if ( gridView ) {


        this.datasourceService.removeDataSourcesByNamePrefix('PostCodes');
        this.eventEmitterService.emitGridViewEvent( this.viewer );


    } else {

        this.eventEmitterService.emitPostalCodeViewEvent( this.viewer );

    }

}

/**
 * This function handles the toggle event for showing or hiding the flood layer on the map.
 *
 */
loadFloodEvent( ) {

    // Get the current state of the toggle button for showing flood.
    const showFlood = document.getElementById( "floodToggle" ).checked;

    if ( showFlood ) {

        // If the toggle button is checked, enable the toggle button for showing the flood heat map.
        //document.getElementById("showloadOtherNature").disabled = false;

        // If there is a postal code available, load the flood for that area.
        if ( this.store.postalcode && !this.dataSourceService.getDataSourceByName( "Flood" ) ) {

            this.floodService.loadFlood( this.store.postalcode );

        } else {
            
            this.dataSourceService.changeDataSourceShowByName( "Flood", true );
        }


    } else {

        this.dataSourceService.changeDataSourceShowByName( "Flood", false );

    }

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
    
    document.getElementById( 'printContainer' ).style.visibility = 'visible';
    document.getElementById( 'searchcontainer' ).style.visibility = 'visible';
    document.getElementById( 'georefContainer' ).style.visibility = 'visible';
    document.getElementById( 'searchbutton' ).style.visibility = 'visible';

    }

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
        	// Find the data source for buildings
	// const buildingDataSource = datasourceService.getDataSourceByName( "Buildings" );

     //   resetTreeEntites( );
     //   resetBuildingEntites( buildingDataSource );
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

filterBuildingsEvent() {

    const hideNonSote = document.getElementById( "hideNonSoteToggle" ).checked;
    const hideNewBuildings = document.getElementById( "hideNewBuildingsToggle" ).checked;
    const hideLow = document.getElementById( "hideLowToggle" ).checked;

  if ( this.dataSourceService ) {

    const buildingsDataSource = this.dataSourceService.getDataSourceByName("Buildings");

    if ( buildingsDataSource ) {

      if ( hideNonSote || hideNewBuildings || hideLow ) {

        this.buildingService.filterBuildings( buildingsDataSource );

      } else {

        this.buildingService.showAllBuildings( buildingsDataSource );

    }
    }
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

        this.viewService.switchTo2DView( );

    // If the "switch view"" toggle button is not checked.
    } else {

        this.viewService.switchTo3DView( );

    }

}




}