/**
 * Creates SocioEconomics histogram for a postal code area.
 *
 * @param { object } sosData socioeconomic data used for creating the diagram
 */
function createSocioEconomicsDiagram( sosData ) {

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
	
		Plotly.newPlot( 'plotSoSContainer',  data, layout );
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

/**
 * Creates trees nearby buildings histogram
 *
 * @param { object } treeBuildingData nearby 
 */
function createTreesNearbyBuildingsScatterPlot( tree_areas, avgheatexps, buildings, noNearbyTrees ) {

	if ( tree_areas.length > 0 && showPlot ) {

		document.getElementById( 'numericalSelect' ).style.visibility = 'hidden';
		document.getElementById( 'categoricalSelect' ).style.visibility = 'hidden';

		const trace1 = {
			x: avgheatexps,
			y: tree_areas,
			mode: 'markers',
			type: 'scatter',
			name: 'Nearby Tree Area of Buildings',
			text: buildings,
			textfont : {
			  family:'Times New Roman'
			},
			marker: { 
				size: 12,
				color: 'green'
			 }
		};
		  
		const data = [ trace1 ];
		  
		const layout = {
			title:'Average heat exposure for buildings with no nearby trees: ' + noNearbyTrees,
			xaxis: { title: 'Average Heat Exposure' },
			yaxis: { title: 'Nearby Tree area' },
		};
		  
		Plotly.newPlot('plotMaterialContainer', data, layout);

	} else {
		
		document.getElementById( "plotMaterialContainer" ).style.visibility = 'hidden';

	}

}

/**
 * Create tree histogram.
 *
 */
function createTreeHistogram( treeArea, address, postinumero) {

    let trace1 = {
        x: [ 'nearby building' ],
        y: [ treeArea ],
        name: address,
        type: 'bar'
    };
      
    let trace2 = {
        x: [ 'average in postal code area' ],
        y: [ averageTreeArea ],
        name: postinumero,
        type: 'bar',
    };
      
    let data = [ trace1, trace2 ];
      
    let layout = { title: { text: 'Tree area comparison' }, barmode: 'group' };

    //Test plotting
    if ( showPlot ) {

        document.getElementById( "plotSoSContainer" ).style.visibility = 'visible';
    }

    Plotly.newPlot( 'plotSoSContainer', data, layout );

}