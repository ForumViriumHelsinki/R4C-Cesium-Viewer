import { reactive } from 'vue';

export const eventBus = reactive({
    listeners: {},
    $on(event, callback) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
    },
    $emit(event, ...args) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(callback => callback(...args));
      }
    },
  });

  export default class EventEmitter {

    constructor(  ) {

    }

/**
 * The function emits events after user picks a postal code area from viewer
 *
 * @param { object } urbanHeatData urban heat data of a buildings in postal code area
 * @param { String } postcode postcode of area
 * @param { object } entites entities of a buildings in postal code area
 * 
 */
emitPostalCodeEvents( urbanHeatData, entites ) {

    if ( urbanHeatData ) {

        this.emitHeatHistogram( urbanHeatData );

    }
  
    // Assuming datasourceService is available and implemented similarly to addBuildingsDataSource

    if ( entites ) {

        eventBus.$emit( 'newScatterPlot', entites );

    }

}

emitHeatHistogram( urbanHeatData ) {

  if ( urbanHeatData ) {

      eventBus.$emit( 'newHeatHistogram', urbanHeatData );

  }

}



/**
 * The function emits event after user picks a postal code area from viewer
 *
 * @param { String } postcode postcode of area
 * 
 */
emitSocioEconomicsEvent(  postcode ) {

  eventBus.$emit( 'newSocioEconomicsDiagram', postcode );

}

/**
 * The function emits event after user picks a postal code area from viewer
 *
 * @param { String } postcode postcode of area
 * 
 */
emitHSYScatterPlotEvent( postcode ) {

  eventBus.$emit( 'newHSYScatterPlot', postcode );

}


/**
 * The function emits event after user picks a building from viewer
 *
 * @param { Number } buildingHeatExposure urban heat data of a building in postal code area
 * @param { String } address the address of building
 * @param { String } postinumero the postal code area
 * 
 */
emitBuildingHeatEvent( buildingHeatExposure, address, postinumero  ) {

if ( buildingHeatExposure ) {

    eventBus.$emit( 'newBuildingHeat', buildingHeatExposure, address, postinumero  );

}       

}

/**
 * The function emits event after user picks a building from viewer
 *
 * @param { Number } treeArea building tree area
 * @param { String } address the address of building
 * @param { String } postinumero the postal code area
 * 
 */
emitBuildingTreeEvent( treeArea, address, postinumero  ) {

    eventBus.$emit( 'newBuildingTree', treeArea, address, postinumero  ); 

}

/**
 * The function emits an event after trees have been loaded
 *
 * @param { String } data tree-building-distance data
 * @param { Object } entities the tree entities of postal code area
 * @param { Object } buildingDataSource - The postal code area buildings datasource
 */
emitTreeEvent( data, entities, buildingDataSource ) {

if ( data ) {

    eventBus.$emit( 'newNearbyTreeDiagram', data, entities, buildingDataSource );

}       

}

/**
 * The function emits event after user selects grid view 
 *
 * @param { Object } viewer Cesium viewer
 * 
 */
emitGridViewEvent( viewer  ) {

  eventBus.$emit( 'createPopulationGrid', viewer ); 

} 

/**
 * The function emits event after user selects grid view 
 *
 * @param { Object } viewer Cesium viewer
 * 
 */
emitCapitalRegionViewEvent( viewer  ) {

  eventBus.$emit( 'loadCapitalRegionView', viewer ); 

}

/**
 * The function emits event after user selects postal view 
 *
 * @param { Object } viewer Cesium viewer
 * 
 */
emitPostalCodeViewEvent( viewer  ) {

  eventBus.$emit( 'initPostalCodeView', viewer );

}


}


