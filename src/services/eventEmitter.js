import { reactive } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';

export const eventBus = reactive( {
	listeners: {},
	$on( event, callback ) {
		if ( !this.listeners[event] ) {
			this.listeners[event] = [];
		}
		this.listeners[event].push( callback );
	},
	$emit( event, ...args ) {
		if ( this.listeners[event] ) {
			this.listeners[event].forEach( callback => callback( ...args ) );
		}
	},
} );

export default class EventEmitter {

	constructor() {
		this.store = useGlobalStore();
	}

	/**
 * The function emits events after user picks a postal code area from viewer
 *
 * @param { object } urbanHeatData urban heat data of a buildings in postal code area
 * @param { String } postcode postcode of area
 * @param { object } entities entities of a buildings in postal code area
 * 
 */
	emitPostalCodeEvents( urbanHeatData, entities ) {

		if ( urbanHeatData ) {

			this.emitHeatHistogram( urbanHeatData );

		}
  
		// Assuming datasourceService is available and implemented similarly to addBuildingsDataSource

		if ( entities ) {

			eventBus.$emit( 'newScatterPlot', entities );

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
	emitSocioEconomicsEvent() {

		const postcode = this.store.postalcode;

		if ( !postcode !== '00230' || !postcode !== '02290' || !postcode !== '01770' ) {

			eventBus.$emit( 'newSocioEconomicsDiagram', postcode );

		}

	}

	/**
 * The function emits event after user picks a postal code area from viewer
 *
 * @param { Object } entites entites
 * 
 */
	emitScatterPlotEvent( entities ) {

		eventBus.$emit( this.store.view == 'helsinki' ? 'newScatterPlot' : 'newHSYScatterPlot', entities );

	}


	/**
 * The function emits event after user picks a building from viewer
 *
 * @param { Number } buildingHeatExposure urban heat data of a building in postal code area
 * @param { String } address the address of building
 * @param { String } postinumero the postal code area
 * 
 */
	emitBuildingHeatEvent( buildingHeatExposure, address, postinumero ) {

		if ( buildingHeatExposure ) {

			eventBus.$emit( 'newBuildingHeat', buildingHeatExposure, address, postinumero );

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
	emitBuildingTreeEvent( treeArea, address, postinumero ) {

		eventBus.$emit( 'newBuildingTree', treeArea, address, postinumero ); 

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
	emitGridViewEvent( ) {

		eventBus.$emit( 'createPopulationGrid' ); 

	} 

	/**
 * The function emits event after user selects grid view 
 *
 * @param { Object } viewer Cesium viewer
 * 
 */
	emitCapitalRegionViewEvent( viewer ) {

		eventBus.$emit( 'loadCapitalRegionView', viewer ); 

	}

	/**
 * The function emits event after user selects postal view 
 *
 * @param { Object } viewer Cesium viewer
 * 
 */
	emitPostalCodeViewEvent( ) {

		eventBus.$emit( 'initPostalCodeView' );

	}

	emitBuildingGridEvent( buildingProps ) {

		eventBus.$emit( 'createBuildingGrid', buildingProps );

	}



}


