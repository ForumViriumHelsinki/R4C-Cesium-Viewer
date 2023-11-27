import Datasource from "./datasource.js"; 

export default class Controlpanel {
    constructor( viewer ) {
        this.viewer = viewer;
        this.dataSourceService = new Datasource( this.viewer );

    }
  
/**
 * Add EventListeners related to buildings
 */
addBuildingEventListeners() {
   document.getElementById('hideNewBuildingsToggle').addEventListener('change', this.filterBuildingsEvent);
   document.getElementById('hideNonSoteToggle').addEventListener('change', this.filterBuildingsEvent);
   document.getElementById('hideLowToggle').addEventListener('change', this.filterBuildingsEvent);
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