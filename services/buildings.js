
function setBuildingPolygonMaterialColor( entity, kayttotarkoitus ) {

	switch ( kayttotarkoitus ) {
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

	switch ( kayttotarkoitus ) {
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

function findAndSetOutsideHelsinkiBuildingsColor( entities ) {

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
}

function setHeatExposureToBuildings( entities ) {

	for ( let i = 0; i < entities.length; i++ ) {

		let entity = entities[ i ];

		if ( entity.properties.avgheatexposuretobuilding && entity.polygon ) {

			entity.polygon.material = new Cesium.Color( 1, 1 - entity.properties.avgheatexposuretobuilding._value, 0, entity.properties.avgheatexposuretobuilding._value );

		} else {

			if ( entity.polygon ) {
				
				entity.polygon.material = new Cesium.Color( 0, 0, 0, 0 );
			}
		}

		hideNonSoteBuilding( entity );
		hideLowBuilding( entity );

	}
}


/**
 * If hideNonSote switch is checked this function hides buildings based on value of c_kayttark
 *
 * @param { Object } entity Cesium entity
 */
function hideNonSoteBuilding( entity ) {

	const hideNonSote = document.getElementById( "hideNonSoteToggle" ).checked;

	if ( hideNonSote ) {
			   
		if ( !entity._properties.c_kayttark  || !entity._properties.c_kayttark._value ) {

			entity.show = false;

		} else {

			const kayttotark = Number( entity._properties.c_kayttark._value );

			if ( !kayttotark != 511 && !kayttotark != 131 && !( kayttotark > 212 && kayttotark < 240 ) ) {

				entity.show = false;
	
			}

		}
	
	}
}

/**
 * If hideLow switch is checked this function hides buildings based on their floor count
 *
 * @param { Object } entity Cesium entity
 */
function hideLowBuilding( entity ) {

	const hideLow = document.getElementById( "hideLowToggle" ).checked;

	if ( hideLow ) {
			   
		if ( !entity._properties.i_kerrlkm  || !entity._properties.i_kerrlkm._value ) {

			entity.show = false;

		} else {

			const floorCount = Number( entity._properties.i_kerrlkm._value );

			if ( floorCount < 7  ) {

				entity.show = false;
	
			}

		}
	
	}
	
}

function setHelsinkiBuildingsHight( entities ) {

	for ( let i = 0; i < entities.length; i++ ) {

		let entity = entities[ i ];

		if ( entity.properties.measured_height ) {

			entity.polygon.extrudedHeight = entity.properties.measured_height._value;

		} else {

			if ( entity.properties.i_kerrlkm && entity.polygon ) {

				entity.polygon.extrudedHeight = entity.properties.i_kerrlkm._value * 3.2;
	
			} else {
	
				entity.polygon.extrudedHeight = 2.7;
	
			}
		}
		
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

			findAndSetOutsideHelsinkiBuildingsColor( entities );

		} else {

			setHeatExposureToBuildings( entities );
			setHelsinkiBuildingsHight( entities );

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