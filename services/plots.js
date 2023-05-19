/**
 * Creates SocioEconomics histogram for a postal code area.
 *
 * @param { object } sosData socioeconomic data used for creating the diagram
 */
function createSocioEconomicsDiagram( sosData ) {

	if ( sosData && showPlot ) {
	
		let x = [
			'Lack of Vegetation',
			'Apartment Heat Exposure',
			'Sum of Next 7',
			'Children & Elderly',
			'Vulnerable Children',
			'Vulnerable Elderly',
			'Small Apartments',
			'Low Education',
			'Low Income',
			'High Rental Rate'
		];	

		let y = [
			sosData.vegetation_rank, 
			sosData.apartment_heat_exposure_rank, 
			sosData.average_vul_rank,
			sosData.vulnerable_both_rank, 
			sosData.vulnerable_children_rank, 
			sosData.vulnerable_eldery_rank, 
			sosData.apart_size_rank, 
			sosData.educ_rank, 
			sosData.income_rank, 
			sosData.rental_rate_rank 
		]

		let text = [ 
			84 - sosData.vegetation_rank, 
			84 - sosData.apartment_heat_exposure_rank, 
			84 - sosData.average_vul_rank, 
			84 - sosData.vulnerable_both_rank, 
			84 - sosData.vulnerable_children_rank, 
			84 - sosData.vulnerable_eldery_rank, 
			84 - sosData.apart_size_rank, 
			84 - sosData.educ_rank, 
			84 - sosData.income_rank, 
			84 - sosData.rental_rate_rank 
		];

		let data = [
			{
				x: x,
				y: y,
				text: text,
				type: 'bar',
			}
		];
	
		if ( showPlot ) {
	
			document.getElementById( "plotSoSContainer" ).style.visibility = 'visible';
		}
	
		let layout = { 
			yaxis: {
				visible: false, 
				showticklabels: false
			},
			title: 'Vulnerability ranks (max=83) in ' + nameOfZone,
		};
	
		Plotly.newPlot( 'plotSoSContainer',  data, layout, { staticPlot: true } );
	}

}


/**
 * Creates scatter plot that always has average urban heat exposure to building at y-axis. Categorical attributes.
 *
 * @param { object } features dataset that contains building heat exposure and attributes of the building
 * @param { String } categorical name of categorical attribute
 * @param { String } numerical name of numerical attribute
 */
function createScatterPlot( features, categorical, numerical ) {

	if ( features.length > 0 && showPlot ) {

		const values = createUniqueValuesList( features, categorical );
		let data = [ ];
	
		for ( let i = 0; i < values.length; i++ ) {
	
			const dataWithHeat = addHeatForLabelAndX( values[ i ], features, categorical, numerical );
	
			const plotData = {
				x: dataWithHeat[ 1 ],
				y: dataWithHeat[ 0 ],
				name: values[ i ] + ' ' + dataWithHeat[ 2 ].toFixed( 2 ),
				type: 'scatter',
				mode: 'markers'
			};
	
			data.push( plotData );
		
		}
	
		document.getElementById( 'numericalSelect' ).style.visibility = 'visible';
		document.getElementById( 'categoricalSelect' ).style.visibility = 'visible';
		document.getElementById( "plotMaterialContainer" ).style.visibility = 'visible';
		  
		const layout = {
			scattermode: 'group',
			title: categorical,
			xaxis: {title: numerical },
			yaxis: {title: 'Heat'},
		};
		  
		Plotly.newPlot('plotMaterialContainer', data, layout);

	} else {
		
		document.getElementById( 'categoricalSelect' ).style.visibility = 'hidden';
		document.getElementById( 'numericalSelect' ).style.visibility = 'hidden';
		document.getElementById( "plotMaterialContainer" ).style.visibility = 'hidden';

	}

}

/**
 * Creates Urban Heat Exposure to buildings histogram for a postal code area
 *
 * @param { object } urbanHeatData urban heat data of a buildings in postal code area
 */
function createUrbanHeatHistogram( urbanHeatData ) {

	if ( urbanHeatData.length > 0 && showPlot ) {

		let trace = {
			x: urbanHeatData,
			type: 'histogram',
			name: 'average heat exposure to building',
			marker: {
				color: 'orange',
			},
		};
	
		if ( showPlot ) {
	
			document.getElementById( "plotContainer" ).style.visibility = 'visible';
		}
	
		let layout = { 
			title: 'Heat exposure to buildings in ' + nameOfZone,
			bargap: 0.05, 
		};
	
		Plotly.newPlot( 'plotContainer', [ trace ], layout );

	} else {
		
		document.getElementById( "plotContainer" ).style.visibility = 'hidden';

	}

}