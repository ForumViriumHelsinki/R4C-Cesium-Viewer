import Datasource from "./datasource.js"; 
import Vegetation from "./vegetation.js"; 
import OtherNature from "./othernature.js"; 
import { useGlobalStore } from '../store.js';

export default class Controlpanel {
    constructor( viewer ) {
        this.viewer = viewer;
        this.dataSourceService = new Datasource( this.viewer );
        this.vegetationService = new Vegetation( this.viewer );
        this.otherNatureService = new OtherNature( this.viewer );
        this.store = useGlobalStore( );

        this.filterBuildingsEvent = this.filterBuildingsEvent.bind(this);
        this.loadVegetationEvent = this.loadVegetationEvent.bind(this);
        this.loadOtherNatureEvent = this.loadOtherNatureEvent.bind(this);

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

            this.dataSourceService.showAllDataSources( );
        }


    } else {

        this.dataSourceService.hideDataSourceByName( "OtherNature" );

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

            this.dataSourceService.showAllDataSources( );
        }

    } else {

        this.dataSourceService.hideDataSourceByName( "Vegetation" );

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

}