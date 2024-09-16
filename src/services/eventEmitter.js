import mitt from 'mitt'; // Import mitt

export const eventBus = mitt(); // Create a mitt instance

export default class EventEmitter {

	constructor() {
	}


	/**
 * The function emits event after user chooses to view Espoo resident survey places
 * * 
 */
	emitSurveyScatterPlotEvent( ) {

		eventBus.emit( 'newSurveyScatterPlot' );

	}

	/**
 * The function emits event after user selects grid view 
 *
 * 
 */
	emitGridViewEvent( ) {

		eventBus.emit( 'createPopulationGrid' ); 

	} 


	/**
 * The function emits event after user selects postal view 
 *
 * 
 */
	emitPostalCodeViewEvent( ) {
		eventBus.emit( 'initPostalCodeView' );

	}

	emitBuildingGridEvent( ) {

		eventBus.emit( 'newBuildingGridChart' );

	}

	emitPieChartEvent( ) {

		eventBus.emit( 'newPieChart' );

	}

	emitEntityPrintEvent( ) {

		eventBus.emit( 'entityPrintEvent' );

	}

	emitGeocodingPrintEvent( ) {

		eventBus.emit( 'geocodingPrintEvent' );

	}	

}


