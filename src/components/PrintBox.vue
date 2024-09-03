<template>

	<div id="printContainer">
        <i>Please click on areas to retrieve more information</i>
	</div>

</template>
  
<script>
import { GridImageryProvider } from 'cesium';
import { eventBus } from '../services/eventEmitter.js';
import { useGlobalStore } from '../stores/globalStore.js';

export default {
	mounted() {
		this.unsubscribe = eventBus.$on( 'entityPrintEvent', this.entityPrint );
		this.unsubscribe = eventBus.$on( 'geocodingPrintEvent', this.geocodingPrint );
		this.store = useGlobalStore();
	},
	beforeUnmount() {
		this.unsubscribe();
	},
	methods: {
	/**
    * Prints the properties of the picked Cesium entity
    * 
    */
	entityPrint( ) {

		const entity = this.store.pickedEntity;

		const view = this.store.view;

		document.getElementById( 'printContainer' ).scroll( {
			top: 0,
			behavior: 'instant'
		} );

		if ( entity._polygon && entity.properties ) {

			//Highlight for clicking...
			let oldMaterial = entity.polygon.material;
			entity.polygon.material = new Cesium.Color( 1, 0.5, 0.5, 0.8 );
			setTimeout( () => { entity.polygon.material = oldMaterial; }, 5000 );
			printEntity( entity, entity.properties.posno, view );
		}

	},

	/**
  * Creates content for printing from postal code properties
  *
  */
	geocodingPrint( ) {

		const store = new useGlobalStore();	
		store.cesiumViewer.dataSources._dataSources.forEach( function( dataSource ) {
            
			if ( dataSource.name == 'PostCodes' ) {

				findPostalcodeEntity( dataSource, store.postalcode );
						
			}
		} ); 
	},
	},
};

const findPostalcodeEntity = ( dataSource, currentPostcode ) => {


				for ( let i = 0; i < dataSource._entityCollection._entities._array.length; i++ ) {

					let entity = dataSource._entityCollection._entities._array[ i ];

					if ( entity._properties._posno._value == currentPostcode ) {
						
						printEntity( entity );

					} 

				}

}

const printEntity = ( entity, postno, view ) => {

		let toPrint = '<u>Found following properties & values:</u><br/>';


						let length = entity._properties._propertyNames.length;

						for ( let i = 0; i < length; ++i ) {


			if ( goodForPrint( entity._properties, i ) ) {
				if ( typeof entity._properties[ entity._properties._propertyNames[ i ] ]._value === 'number' ) {

					toPrint = toPrint + entity._properties._propertyNames[ i ]  + ': ' +  entity._properties[ entity._properties._propertyNames[ i ] ]._value.toFixed( 2 ) + '<br/>';

				} else {

							toPrint = toPrint + entity._properties._propertyNames[ i ] + ': ' + entity._properties[ entity._properties._propertyNames[ i ] ]._value + '<br/>';

				}
			}

						}   

						addToPrint( toPrint, postno, view );           

}

const goodForPrint = ( properties, i ) => {

	return !properties.propertyNames[ i ].includes( 'fid' ) && !properties.propertyNames[ i ].includes( '_id' ) 
		&& !properties.propertyNames[ i ].includes( 'value' ) && properties.propertyNames[ i ] != 'id' 
		&& !properties.propertyNames[ i ].includes( '_x' ) && !properties.propertyNames[ i ].includes( '_y' )
		&& properties[ properties.propertyNames[ i ] ]._value && !properties.propertyNames[ i ].endsWith( 'id' )
		&& !properties.propertyNames[ i ].includes( 'gml_parent_property' ) ;

};

	/**
    * Adds the provided content to the print container
    * 
    * @param {string} toPrint - The content to be added to the print container
    * @param {string} postno - The postal code associated with the content
    */  
const addToPrint = ( toPrint, postno, view ) => {

		if ( postno  || view === 'grid' ) {

			toPrint = toPrint + '<br/><br/><i>Click on objects to retrieve information.</i>';
    
		} else {
    
			toPrint = toPrint + '<br/><br/><i>If average urban heat exposure of building is over 0.5 the areas with under 0.4 heat exposure is shown on map.</i>';
    
		}
    
		document.getElementById( 'printContainer' ).innerHTML = toPrint;
		document.getElementById( 'printContainer' ).scroll( {
			top: 1000,
			behavior: 'smooth'
		} );    
};
</script>

<style>
#printContainer
{
	bottom: 55px; 
	right: 1px;
	width: 380px; 
	height: 120px; 
	position: fixed; 
	border: 1px solid black; 
	box-shadow: 3px 5px 5px black; 
	background: white;
	visibility: visible;
	
	font-size: smaller;
	font-family: Monospace;
	
	padding: 10px;
	overflow-y: scroll;
}
</style>