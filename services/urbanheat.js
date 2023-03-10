function findKayttotarkoitusHKI( kayttotarkoitus ) {

	switch ( kayttotarkoitus ){
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
			return 'n/a' 
		}
}

function setKayttoKayttotarkoitus ( properties, features ) {

    for ( let i = 0; i < features.length; i++ ) {
	
        if ( properties.ratu == features[ i ].properties.ratu ) {

            properties.avgheatexposuretobuilding = features[ i ].properties.avgheatexposuretobuilding;
            properties.kayttotarkoitus = findKayttotarkoitusHKI( features[ i ].properties.c_kayttark );

        }
    }
}

async function findUrbanHeatData( data, inhelsinki, postcode ) {

	if ( inhelsinki ) {

		const urbanheatdata = fetch( "https://geo.fvh.fi/r4c/collections/urban_heat_building/items?f=json&limit=2000&postinumero=" + postcode )
		.then( function( response ) {
			return response.json();
		  })
		.then( function( urbanheat ) {
	
			for ( let i = 0; i < data.features.length; i++ ) {
	
				let feature = data.features[ i ];
                setKayttoKayttotarkoitus( feature.properties, urbanheat.features );

			}
			
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