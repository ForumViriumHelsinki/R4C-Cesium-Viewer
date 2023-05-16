/**
 * Finds the purpose of a building in Helsinki based on code included in wfs source data
 * Code list: https://kartta.hel.fi/avoindata/dokumentit/Rakennusrekisteri_avoindata_metatiedot_20160601.pdf
 *
 * @param { String } kayttotarkoitus code for purpose
 * @return { String } purpose of building
 */
function decodeKayttotarkoitusHKI( kayttotarkoitus ) {

	switch ( kayttotarkoitus ) {
		case '011': 
			return 'Yhden asunnon talot';
		case '012': 
			return 'Kahden asunnon talot';
		case '013': 
			return 'Muut pientalot';
		case '021': 
			return 'Rivitalot';
		case '022': 
			return 'Ketjutalot';
		case '032': 
			return 'Luhtitalot';
		case '039': 
			return 'Muut kerrostalot';			
		case '041': 
			return 'Vapaa-ajan asunnot';
		case '111': 
			return 'Myymälähallit';
		case '112': 
			return 'Liike- ja tavaratalot';
		case '119': 
			return 'Myymälärakennukset';	
		case '121': 
			return 'Hotellit';				
		case '123': 
			return 'Loma- lepo- ja virkistyskodit';		
		case '124': 
			return 'Vuokrattavat lomamökit';				
		case '129': 
			return 'Muu majoitusliike';	
		case '131': 
			return 'Asuntolat, vanhusten yms';			
		case '139': 
			return 'Muut majoitusrakennukset';				
		case '141': 
			return 'Ravintolat, baarit yms';		
		case '151': 
			return 'Toimistorakennukset';
		case '161': 
			return 'Asemat ja terminaalit';	
		case '162': 
			return 'Kulkuneuvojen rakennukset';			
		case '163': 
			return 'Pysäköintitalot';		
		case '164': 
			return 'Tietoliikenteen rakennukset';	
		case '169': 
			return 'Muut liikenteen rakennukset';												
		case '211': 
			return 'Keskussairaalat';
		case '213': 
			return 'Muut sairaalat';
		case '214': 
			return 'Terveyskeskukset';
		case '215': 
			return 'Erityis terveydenhoito';
		case '219': 
			return 'Muu terveydenhoito';
		case '221': 
			return 'Vanhainkodit';
		case '222': 
			return 'Lastenkodit, koulukodit';
		case '223': 
			return 'Kehitysvammaisten hoito';
		case '229': 
			return 'Muut huoltolaitokset';
		case '231': 
			return 'Lasten päiväkodit';
		case '239': 
			return 'Muut sosiaalitoimi';
		case '241': 
			return 'Vankilat';	
		case '311': 
			return 'Teatterit, konsertti yms';		
		case '312': 
			return 'Elokuvateatterit';		
		case '322': 
			return 'Kirjastot';			
		case '323': 
			return 'Museot, taidegalleriat';
		case '324': 
			return 'Näyttelyhallit';	
		case '331': 
			return 'Seurain-, nuoriso- yms';	
		case '341': 
			return 'Kirkot, kappelit yms';	
		case '342': 
			return 'Seurakuntatalot';				
		case '349': 
			return 'Muut uskonnolliset yhteisöt';	
		case '351': 
			return 'Jäähallit';
		case '352': 
			return 'Uimahallit';	
		case '353': 
			return 'Tennis, squash yms';	
		case '354': 
			return 'Monitoimi/urheiluhallit';	
		case '359': 
			return 'Muut urheilu';				
		case '369': 
			return 'Muut kokoontumisrakennukset';	
		case '511': 
			return 'Peruskoulut, lukiot ja muut';
		case '521': 
			return 'Ammatilliset oppilaitokset';		
		case '531': 
			return 'Korkeakoulurakennukset';				
		case '532': 
			return 'Tutkimuslaitosrakennukset';	
		case '541': 
			return 'Järjestöjen opetus';
		case '549': 
			return 'Muut opetusrakennukset';		
		case '611': 
			return 'Voimalaitosrakennukset';		
		case '613': 
			return 'Yhdyskuntatekniikka';				
		case '691': 
			return 'Teollisuushallit';	
		case '692': 
			return 'Teollisuus- ja pienteollisuus';
		case '699': 
			return 'Muut teollisuus/tuotanto';			
		case '711': 
			return 'Teollisuusvarastot';		
		case '712': 
			return 'Kauppavarastot';				
		case '719': 
			return 'Muut varastorakennukset';	
		case '721': 
			return 'Paloasemat';
		case '722': 
			return 'Väestönsuojat';	
		case '729': 
			return 'Muu palo- ja pelastustoiminta';		
		case '811': 
			return 'Navetat, sikalat, kanalat yms';				
		case '819': 
			return 'Eläinsuojat';	
		case '891': 
			return 'Viljarakennukset';
		case '892': 
			return 'Kasvihuoneet';	
		case '893': 
			return 'Turkistarhat';		
		case '899': 
			return 'Muu maa/metsä/kala';						
		case '931': 
			return 'Saunarakennukset';	
		case '941': 
			return 'Talousrakennukset';				
		default:
			return kayttotarkoitus;
		}

}

/**
 * Sets attributes from API data source to building data source
 * 
 * Finds the purpose of a building in Helsinki based on code included in wfs source data
 * Code list: https://kartta.hel.fi/avoindata/dokumentit/Rakennusrekisteri_avoindata_metatiedot_20160601.pdf
 *
 * @param { Object } properties of a building
 * @param { Object } features Urban Heat Exposure buildings dataset
 */
function setAttributesFromApiToBuilding ( properties, features ) {

    for ( let i = 0; i < features.length; i++ ) {

		// match building based on Helsinki id
        if ( properties.id == features[ i ].properties.hki_id ) {

			if ( features[ i ].properties.avgheatexposuretobuilding ) {

				properties.avgheatexposuretobuilding = features[ i ].properties.avgheatexposuretobuilding;

			}

			if ( features[ i ].properties.distancetounder40 ) {

				properties.distanceToUnder40 = features[ i ].properties.distancetounder40;

			}

			if ( features[ i ].properties.distancetounder40 ) {

				properties.locationUnder40 = features[ i ].properties.locationunder40;

			}

			if ( features[ i ].properties.year_of_construction ) {

				properties.year_of_construction = features[ i ].properties.year_of_construction;

			}

			if ( features[ i ].properties.measured_height ) {

				properties.measured_height = features[ i ].properties.measured_height;

			}

			if ( features[ i ].properties.roof_type ) {

				properties.roof_type = features[ i ].properties.roof_type;

			}

            properties.kayttotarkoitus = decodeKayttotarkoitusHKI( features[ i ].properties.c_kayttark );
			properties.c_julkisivu = decodeFacade( properties.c_julkisivu );
			properties.c_rakeaine = decodeMaterial( properties.c_rakeaine );
			properties.c_lammtapa = decodeHeatingMethod( properties.c_lammtapa );
			properties.c_poltaine = decodeHeatingSource( properties.c_poltaine );

			features.splice( i, 1 );
			break;
        }
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
 * Creates SocioEconomics histogram for a postal code area.
 *
 * @param { object } sosData socioeconomic data used for creating the diagram
 */
function createSocioEconomicsDiagram( sosData ) {

	if ( sosData && showPlot ) {
		let x = [ 'vegetation', 'apart heat expsoure', 'sum of next 7', 'vulnerable both', 'children', 'eldery', 'size of apartments', 'level of education', 'income', 'rental rate' ];
		let y = [ 84 - sosData.vegetation_rank, sosData.apartment_heat_exposure_rank, sosData.average_vul_rank ,sosData.vulnerable_both_rank, sosData.vulnerable_children_rank, sosData.vulnerable_eldery_rank, sosData.apart_size_rank, sosData.educ_rank, sosData.income_rank, sosData.rental_rate_rank ]
		let text = [ sosData.vegetation_rank, 84 - sosData.apartment_heat_exposure_rank, 84 - sosData.average_vul_rank, 84 - sosData.vulnerable_both_rank, 84 - sosData.vulnerable_children_rank, 84 - sosData.vulnerable_eldery_rank, 84 - sosData.apart_size_rank, 84 - sosData.educ_rank, 84 - sosData.income_rank, 85 - sosData.rental_rate_rank ];

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
 * Calculate average Urban Heat exposure to buildings in postal code area
 *
 * @param { Object } features buildings in postal code area
 */
function calculateAverageExposure( features ) {

	let count = 0;
	let total = 0;
	let urbanHeatData = [ ];

	for ( let i = 0; i < features.length; i++ ) {

		if ( features[ i ].properties.avgheatexposuretobuilding ) {

			total = total + features[ i ].properties.avgheatexposuretobuilding;
			count++;
			urbanHeatData.push( features[ i ].properties.avgheatexposuretobuilding );

		}

	}

	if ( count != 0 ) {

		averageHeatExposure = total / count;
		createUrbanHeatHistogram( urbanHeatData );
		let urbanHeatDataAndMaterial = createDataSetForScatterPlot( features, 'facade', 'height', 'c_julkisivu', 'measured_height' );
		createScatterPlot( urbanHeatDataAndMaterial, 'facade', 'height' );

	}
}

/**
 * Creates data set needed for scatter plotting urban heat exposure
 *
 * @param { Object } features buildings in postal code area
 * @param { String } categorical name of categorical attribute for user
 * @param { String } numerical name of numerical attribute for user
 * @param { String } categoricalName name of numerical attribute in register
 * @param { String } numericalName name for numerical attribute in registery
 * @return { object } data set for plotting
 */
function createDataSetForScatterPlot( features, categorical, numerical, categoricalName, numericalName ) {

	let urbanHeatDataAndMaterial = [ ];

	for ( let i = 0; i < features.length; i++ ) {

		if ( features[ i ].properties.avgheatexposuretobuilding && features[ i ].properties[ categoricalName ] && features[ i ].properties[ numericalName ] ) {
			
			let element = { heat: features[ i ].properties.avgheatexposuretobuilding, [ categorical ]:  features[ i ].properties[ categoricalName ], [ numerical ]: features[ i ].properties[ numericalName ] };
			urbanHeatDataAndMaterial.push( element );

		}

	}	

	return urbanHeatDataAndMaterial;

}

/**
 * Decodes facade material https://kartta.hel.fi/avoindata/dokumentit/2017-01-10_Rakennusaineisto_avoindata_koodistot.pdf
 *
 * @param { String } facade value code for facade material.'
 * @return { String } face material
 */
function decodeFacade( facade ) {

	switch ( facade ) {
		case '1': 
			return 'concrete';
		case '2': 
			return 'brick';
		case '3': 
			return 'metal';
		case '4': 
			return 'stone';
		case '5': 
			return 'wood';
		case '6': 
			return 'glass';
		case '7': 
			return 'other';
		default:
			return facade;  				
	}

}

/**
 * Decodes building material https://kartta.hel.fi/avoindata/dokumentit/2017-01-10_Rakennusaineisto_avoindata_koodistot.pdf
 *
 * @param { String } material value code for building material.'
 * @return { String } building material
 */
function decodeMaterial( material ) {

	switch ( material ) {
		case '1': 
			return 'concrete';
		case '2': 
			return 'brick';
		case '3': 
			return 'steel';
		case '4': 
			return 'wood';
		case '5': 
			return 'other';
		default:
			return material;  		
	}

}

/**
 * Fetches heat vulnerable demographic data from pygeoapi for postal code.
 *
 * @param { String } postcode postal code of the area
 */
function findSocioEconomicsData( postcode ) {

	const response = fetch( "https://geo.fvh.fi/r4c/collections/heat_vulnerable_demographic/items?f=json&limit=1&postinumero=" + postcode )
	.then( function( response ) {
		return response.json();
	})
	.then( function( data ) {
			
		createSocioEconomicsDiagram( data.features[ 0 ].properties );
	
	})
	
}

/**
 * Fetches heat exposure data from pygeoapi for postal code.
 * 
 * @param { object } data of buildings from city wfs
 * @param { boolean } inhelsinki informs if the area is within Helsinki
 * @param { String } postcode postal code of the area
 */
function findUrbanHeatData( data, inhelsinki, postcode ) {

	if ( inhelsinki ) {

		const urbanheatdata = fetch( "https://geo.fvh.fi/r4c/collections/urban_heat_building/items?f=json&limit=2000&postinumero=" + postcode )
		.then( function( response ) {
			return response.json();
		  })
		.then( function( urbanheat ) {
	
			for ( let i = 0; i < data.features.length; i++ ) {
	
				let feature = data.features[ i ];
                setAttributesFromApiToBuilding( feature.properties, urbanheat.features );

			}

			addMissingHeatData( data.features, urbanheat.features  );
			calculateAverageExposure( data.features );
			addBuildingsDataSource( data, inhelsinki );

		//	return response.json();
		  }).catch(
			( e ) => {
	
				console.log( 'something went wrong', e );
	
			}
		);

	} else {

		addBuildingsDataSource( data, inhelsinki );

	}

	// exclude postikeskus postal code area
	if ( postcode != '00230' ) {

		findSocioEconomicsData( postcode );

	}

}

/**
 * Adds urban heat exposure data that did not match in previous phase.
 * 
 * @param { object } features the buildings from city wfs
 * @param { object } heat urban heat exposure data from pygeoapi
 */
function addMissingHeatData( features, heat ) {

	for ( let i = 0; i < heat.length; i++ ) {
	
		features.push( heat[ i ] );

	}

}

/**
 * The function adds heat exposure data for given category value. 
 *
 * @param { String } valeu value of category
 * @param { object } features dataset that contains building heat exposure and attributes of the building
 * @param { String } categorical name of categorical attribute
 * @param { String } numerical name of numerical attribute
 * @return { object } Object that contains list of heat exposures and numerical values, and average heat exposure
 */
function addHeatForLabelAndX( value, features, categorical, numerical ) {

	let heatList = [ ];
	let numericalList = [ ];
	let average = 0;
	let sum = 0;

	for ( let i = 0; i < features.length; i++ ) {

		if ( features[ i ][ categorical ] == value ) {

			heatList.push( features[ i ].heat );
			numericalList.push( features[ i ][ numerical ] );
			sum = sum + features[ i ].heat;

		}
	
	}
	
	// calculate average heat exposure
	average = sum / heatList.length;

	return [ heatList, numericalList, average ];

}

/**
 * The function finds all unique values for given category.
 *
 * @param { object } features dataset that contains building heat exposure and attributes of the building
 * @param { String } category value code for facade material
 * @return { Array<String> } List containing all unique values for the category
 */
function createUniqueValuesList( features, category ) {

	let uniqueValues = [ ];
	
	for ( let i = 0; i < features.length; i++ ) {

		let value = features[ i ][ category ] 

		if ( !uniqueValues.includes( value ) ) {

			uniqueValues.push( value );

		}
	
	}
	
	return uniqueValues;

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

function decodeHeatingMethod( heatingMethod ) {

	switch ( heatingMethod ) {
		case '1': 
			return 'central water';
		case '2': 
			return 'central air';
		case '3': 
			return 'electricity';
        case '4': 
			return 'oven';
		case '5': 
			return 'no fixed heating';			
        default:
            return heatingMethod;  
	}

}

function decodeHeatingSource( heatingSource ) {

	switch ( heatingSource ) {
		case '1': 
			return 'district';
		case '2': 
			return 'light fuel oil';
		case '3': 
			return 'heavy fuel oil';
        case '4': 
			return 'electricity';
		case '5': 
			return 'gas';		
		case '6': 
			return 'coal';
		case '7': 
			return 'wood';
		case '8': 
			return 'peat';
        case '9': 
			return 'ground-source';
		case '10': 
			return 'other';					
        default:
            return heatingSource;  
	}

}