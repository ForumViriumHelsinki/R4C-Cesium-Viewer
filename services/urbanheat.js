/**
 * Finds the purpose of a building in Helsinki based on code included in wfs source data
 * Code list: https://kartta.hel.fi/avoindata/dokumentit/Rakennusrekisteri_avoindata_metatiedot_20160601.pdf
 *
 * @param { String } kayttotarkoitus code for purpose
 * @return { String } purpose of building
 */
function findKayttotarkoitusHKI( kayttotarkoitus ) {

	switch ( kayttotarkoitus ) {
		case '211': 
			return 'Keskussairaalat';
		case '213': 
			return 'Muut sairaalat';
		case '214': 
			return 'Terveyskeskukset';
		case '215': 
			return 'Terveydenhoidon erityislaitokset (mm. kuntoutuslaitokset)';
		case '219': 
			return 'Muut terveydenhoitorakennukset';
		case '221': 
			return 'Vanhainkodit';
		case '222': 
			return 'Lastenkodit, koulukodit';
		case '223': 
			return 'Kehitysvammaisten hoitolaitokset';
		case '229': 
			return 'Muut huoltolaitosrakennukset';
		case '231': 
			return 'Lasten päiväkodit';
		case '239': 
			return 'Muut sosiaalitoimen rakennukset';		
		case '511': 
			return 'Peruskoulut, lukiot ja muut';
		case '521': 
			return 'Ammatilliset oppilaitokset';					
		default:
			return 'n/a';
		}
}

/**
 * Finds the purpose of a building in Helsinki based on code included in wfs source data
 * Code list: https://kartta.hel.fi/avoindata/dokumentit/Rakennusrekisteri_avoindata_metatiedot_20160601.pdf
 *
 * @param { Object } properties of a building
 * @param { Object } features Urban Heat Exposure buildings dataset
 */
function setKayttoKayttotarkoitusAndAverageHeatExposureToBuilding ( properties, features ) {

    for ( let i = 0; i < features.length; i++ ) {

		// match building based on Helsinki id
        if ( properties.id == features[ i ].properties.hki_id ) {

            properties.avgheatexposuretobuilding = features[ i ].properties.avgheatexposuretobuilding;
			properties.distanceToUnder40 = features[ i ].properties.distancetounder40;
			properties.locationUnder40 = features[ i ].properties.locationunder40;
            properties.kayttotarkoitus = findKayttotarkoitusHKI( features[ i ].properties.c_kayttark );
			features.splice( i, 1 );
			break;
        }
    }
}

/**
 * Creates Urban Heat Exposure to buildings histogram for a postal code area
 *
 * @param { Object } urbanHeatData urban heat data of a buildings in postal code area
 */
function createUrbanHeatHistogram( urbanHeatData ) {

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

}

/**
 * Creates SocioEconomics histogram for a postal code area
 *
 */
function createSocioEconomicsDiagram( sosData ) {

	if ( sosData ) {
		let x = [ 'vulnerable both', 'vulnerable children', 'vulnerable eldery', 'apartment size', 'low education', 'low income' ];
		let y = [ sosData.vulnerable_both_rank, sosData.vulnerable_children_rank, sosData.vulnerable_eldery_rank, sosData.apart_size_rank, sosData.educ_rank, sosData.income_rank ]

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
			title: 'Heat vulnerability ranks (max=84) in ' + nameOfZone,
		};
	
		Plotly.newPlot( 'plotSoSContainer',  data, layout );
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
		
		const response = fetch( 'assets/data/stats_po_uh.json' )
		.then( function( response ) {
		  return response.json();
		})
		.then( function( data ) {
			for ( let i = 0; i < data.features.length; i++ ) {

				if ( data.features[ i ].properties.postinumeroalue == postalcode ) {
	
					createSocioEconomicsDiagram( data.features[ i ].properties );
					break;
	
				}
			}
		})

	}
}

function findUrbanHeatData( data, inhelsinki, postcode ) {

	if ( inhelsinki ) {

		const urbanheatdata = fetch( "https://geo.fvh.fi/r4c/collections/urban_heat_building/items?f=json&limit=2000&postinumero=" + postcode )
		.then( function( response ) {
			return response.json();
		  })
		.then( function( urbanheat ) {
	
			for ( let i = 0; i < data.features.length; i++ ) {
	
				let feature = data.features[ i ];
                setKayttoKayttotarkoitusAndAverageHeatExposureToBuilding( feature.properties, urbanheat.features );

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

}

function addMissingHeatData( features, heat ) {

	for ( let i = 0; i < heat.length; i++ ) {
	
		features.push( heat[ i ] );

	}

	let count = 0;


	for ( let i = 0; i < features.length; i++ ) {

		if ( Number( features[ i ].properties.c_kayttark ) < 40 ) {
			count++;
		}
	
	}

}