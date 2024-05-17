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


	emitHeatHistogram( ) {
		
		eventBus.$emit( 'newHeatHistogram' );

	}



	/**
 * The function emits event after user picks a postal code area from viewer
 *
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
 * 
 */
	emitScatterplotEvent( ) {

		eventBus.$emit( this.store.view == 'helsinki' ? 'newScatterPlot' : 'newHSYScatterPlot' );

	}

	/**
 * The function emits event after user chooses to view Espoo resident survey places
 * * 
 */
	emitSurveyScatterPlotEvent( ) {

		eventBus.$emit( 'newSurveyScatterPlot' );

	}


	/**
 * The function emits event after user picks a building from viewer
 *
 * 
 */
	emitBuildingHeatEvent(  ) {
		
		eventBus.$emit( 'newBuildingHeat' );   

	}

	/**
 * The function emits event after user picks a building from viewer
 *
 * 
 */
	emitBuildingTreeEvent( ) {

		eventBus.$emit( 'newBuildingTree' ); 

	}

	/**
 * The function emits an event after trees have been loaded
 *
 */
	emitTreeEvent( ) {

		eventBus.$emit( 'newNearbyTreeDiagram' );


	}

	/**
 * The function emits event after user selects grid view 
 *
 * 
 */
	emitGridViewEvent( ) {

		eventBus.$emit( 'createPopulationGrid' ); 

	} 


	/**
 * The function emits event after user selects postal view 
 *
 * 
 */
	emitPostalCodeViewEvent( ) {

		eventBus.$emit( 'initPostalCodeView' );

	}

	emitBuildingGridEvent( ) {

		eventBus.$emit( 'newBuildingGridChart' );

	}

	emitPieChartEvent( ) {

		eventBus.$emit( 'newPieChart' );

	}



}


