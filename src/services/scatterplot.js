import * as Cesium from "cesium";
import { VuePlotly } from 'vue3-plotly'

export default class Urbanheat {
  constructor( viewer ) {
    this.viewer = viewer;
  }

  /**
 * Creates data set needed for scatter plotting urban heat exposure
 *
 * @param { Object } features buildings in postal code area
 * @param { String } categorical name of categorical attribute for user
 * @param { String } numerical name of numerical attribute for user
 * @param { String } categoricalName name of numerical attribute in register
 * @param { String } numericalName name for numerical attribute in registery
 * @return { object }  data set for plotting
 */
createDataSetForScatterPlot( features, categorical, numerical, categoricalName, numericalName ) {

	let urbanHeatDataAndMaterial = [ ];

	for ( let i = 0; i < features.length; i++ ) {

		if ( features[ i ].properties.avgheatexposuretobuilding && features[ i ].properties[ categoricalName ] && features[ i ].properties[ numericalName ] && features[ i ].properties.area_m2 && Number( features[ i ].properties.area_m2 ) > 225 ) {
			
			let element = { heat: features[ i ].properties.avgheatexposuretobuilding, [ categorical ]:  features[ i ].properties[ categoricalName ], [ numerical ]: features[ i ].properties[ numericalName ] };
			urbanHeatDataAndMaterial.push( element );

		}

	}
	
	console.log("number of buildings added to scatterplot:", urbanHeatDataAndMaterial.length );


	return urbanHeatDataAndMaterial;

}
}