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