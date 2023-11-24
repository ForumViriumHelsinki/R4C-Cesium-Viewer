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
emitNewEvents( urbanHeatData, postcode, entites ) {

    if ( urbanHeatData ) {

        eventBus.$emit( 'urbanHeatDataChanged', urbanHeatData );

    }

        // exclude postikeskus postal code area
    if ( urbanHeatData && postcode != '00230' ) {

        eventBus.$emit( 'newSocioEconomicsDiagram', postcode );

    }
    
    // Assuming datasourceService is available and implemented similarly to addBuildingsDataSource

    if ( entites ) {

        eventBus.$emit( 'newScatterPlot', entites );

    }

}
  }


