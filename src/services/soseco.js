import * as Cesium from "cesium";
import plotly from "plotly";

export default class Urbanheat {
  constructor( viewer ) {
    this.viewer = viewer;
  }

/**
 * Fetches heat vulnerable demographic data from pygeoapi for postal code.
 *
 * @param { String } postcode postal code of the area
 */
findSocioEconomicsData( postcode ) {

	const response = fetch( "https://geo.fvh.fi/r4c/collections/heat_vulnerable_demographic/items?f=json&limit=1&postinumero=" + postcode )
	.then( function( response ) {
		return response.json();
	})
	.then( function( data ) {
			
		createDiagram( data.features[ 0 ].properties );
	
	})
	
}

/**
 * Creates SocioEconomics histogram for a postal code area.
 *
 * @param { object } sosData socioeconomic data used for creating the diagram
 */
createDiagram( sosData ) {

	if ( sosData && showPlot ) {
	
		let x = [
			'% not vegetation',
			'Apartment Heat Exposure',
			'% of Children & Elderly',
			'% of Children',
			'% of  Elderly',
			'Small Apartment',
			'% with Basic Education',
			'Lack of Income',
			'% of Rentals'
		];	

		let y = [
			1 - sosData.vegetation.toFixed( 3 ), 
			sosData.apartment_heat_exposure.toFixed( 3 ), 
			sosData.vulnerable_both.toFixed( 3 ), 
			sosData.vulnerable_children.toFixed( 3 ), 
			sosData.vulnerable_eldery.toFixed( 3 ), 
			1 - sosData.avg_apart_size.toFixed( 3 ), 
			1 - sosData.educ.toFixed( 3 ), 
			1 - sosData.income.toFixed( 3 ), 
			sosData.rental_rate.toFixed( 3 ) 
		]

		let data = [
			{
				x: x,
				y: y,
				type: 'bar',
			}
		];
	
		if ( showPlot ) {
	
			document.getElementById( "plotSoSContainer" ).style.visibility = 'visible';
		}
	
		let layout = { 
			title: 'Vulnerability in ' + nameOfZone,
		};
	
		plotly.newPlot( 'plotSoSContainer',  data, layout );
	}

}
}