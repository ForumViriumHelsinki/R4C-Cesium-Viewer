
function setBuildingPolygonMaterialColor( entity, kayttotarkoitus ) {

	switch ( kayttotarkoitus ){
		case 2: // business
			entity.polygon.material = Cesium.Color.TOMATO;
			break;
		case 3: // holiday/cottage
			entity.polygon.material = Cesium.Color.YELLOW;
			break;
		case 4: // factory/production
			entity.polygon.material = Cesium.Color.BLACK; 
			break;
		case 5: // religous buildings
			entity.polygon.material = Cesium.Color.MEDIUMPURPLE;
			break;
		case 6: // open areas with roof, for example for parking cars and trash
			entity.polygon.material = Cesium.Color.MEDIUMAQUAMARINE;
			break;
		case 8: // // churches
			entity.polygon.material = Cesium.Color.HOTPINK;
			break;
		default: // residential
			entity.polygon.material = Cesium.Color.MIDNIGHTBLUE;
		}

}

function findMultiplierForFloorCount( kayttotarkoitus ) {

	switch ( kayttotarkoitus ){
		case 2: // business
			return 4.0;
		case 3: // holiday/cottage
			return 2.0;
		case 4: // factory/production
			return 5.4;
		case 5: // religous buildings
			return 4.0;
		case 6: // open areas with roof, for example for parking cars and trash
			return 3.0;
		case 8: // // churches
			return 8.1;
		default: // residential
			return 2.7 
		}

}

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

async function findUrbanHeatData( data, inhelsinki, postcode ) {

	if ( inhelsinki ) {

		const urbanheatdata = fetch( "https://geo.fvh.fi/r4c/collections/urban_heat_building/items?f=json&limit=2000&postinumero=" + postcode )
		.then( function( response ) {
			return response.json();
		  })
		.then( function( urbanheat ) {
	
			for ( let i = 0; i < data.features.length; i++ ) {
	
				let feature = data.features[ i ];
	
	
				for ( let j = 0; j < urbanheat.features.length; j++ ) {
	
					if ( feature.properties.ratu == urbanheat.features[ j ].properties.ratu ) {
		
						feature.properties.avgheatexposuretobuilding = urbanheat.features[ j ].properties.avgheatexposuretobuilding;
						feature.properties.kayttotarkoitus = findKayttotarkoitusHKI( urbanheat.features[ j ].properties.c_kayttark );
	
					}
				}
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

async function addBuildingsDataSource( data, inhelsinki ) {

	viewer.dataSources.add( Cesium.GeoJsonDataSource.load( data, {
		stroke: Cesium.Color.BLACK,
		fill: Cesium.Color.CRIMSON,
		strokeWidth: 3,
		clampToGround: true
	}) )
	.then( function ( dataSource ) {

		dataSource.name = "Buildings";
		var entities = dataSource.entities.values;

		if ( !inhelsinki ) {

			for ( let i = 0; i < entities.length; i++ ) {

				let entity = entities[ i ];
				const kayttotarkoitus = Number( entity.properties._kayttotarkoitus._value );
				const multiplier = findMultiplierForFloorCount( kayttotarkoitus )

				if ( entity.properties.kerrosluku != null ) {

					entity.polygon.extrudedHeight = entity.properties.kerrosluku._value * multiplier;

				}

				if ( kayttotarkoitus ) {

					setBuildingPolygonMaterialColor( entity, kayttotarkoitus );

				}	
				
			}

		} else {

            hideNonSote = document.getElementById( "hideNonSoteToggle" ).checked;

			for ( let i = 0; i < entities.length; i++ ) {

				let entity = entities[ i ];

				if ( entity.properties.avgheatexposuretobuilding ) {

					entity.polygon.material = new Cesium.Color( 1, 1 - entity.properties.avgheatexposuretobuilding._value, 0, entity.properties.avgheatexposuretobuilding._value );

				}

                if ( hideNonSote ) {
                       
                    if ( entity._properties._kayttotarkoitus == 'n/a' ) {
            
                        entity.show = false;
            
                    }
                
                }

			}

		}	
	})	
	.otherwise(function ( error ) {
		//Display any errrors encountered while loading.
		console.log( error );
	});

}

async function loadWFSBuildings( postcode ) {

	let HKIBuildingURL;

	console.log( "postal code", Number( postcode ) )

	let inhelsinki = false;

	if ( Number( postcode ) < 1000 ) {
		
		HKIBuildingURL = "https://kartta.hel.fi/ws/geoserver/avoindata/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=avoindata%3ARakennukset_alue_rekisteritiedot&outputFormat=application/json&srsName=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A4326&CQL_FILTER=postinumero%3D%27" + postcode + "%27";
		inhelsinki = true;

	} else {

		HKIBuildingURL = "https://geo.fvh.fi/r4c/collections/uusimaa_building/items?f=json&limit=100000&postinumeroalue=" + postcode;

	}

	try {
		const value = await localforage.getItem( HKIBuildingURL );
		// This code runs once the value has been loaded
		// from the offline store.

		if ( value ) {
			console.log("found from cache");

			let datasource = JSON.parse( value )
			await findUrbanHeatData( datasource, inhelsinki, postcode );

		} else {

			loadWFSBuildingsWithoutCache( HKIBuildingURL, inhelsinki, postcode );

		}
	  	
	} catch (err) {
		// This code runs if there were any errors.
		console.log(err);
	}
}

async function loadWFSBuildingsWithoutCache( url, inhelsinki, postcode ) {
	
	console.log("Not in cache! Loading: " + url );

	const response = fetch( url )
	.then( function( response ) {
	  return response.json();
	})
	.then( function( data ) {
		localforage.setItem( url, JSON.stringify( data ) );
		findUrbanHeatData( data, inhelsinki, postcode );
	})
	
}