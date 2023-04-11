async function loadNatureAreas( postcode ) {

	let url = "https://geo.fvh.fi/r4c/collections/uusimaa_nature_area/items?f=json&limit=100000&postinumeroalue=" + postcode ;

	try {
		const value = await localforage.getItem( url );
		// This code runs once the value has been loaded
		// from the offline store.

		if ( value ) {
			console.log("found from cache");

			let datasource = JSON.parse( value )
			addNatureDataSource( datasource );

		} else {

			loadNatureAreasWithoutCache( url );

		}
	  	
	} catch ( err ) {
		// This code runs if there were any errors.
		console.log( err );
	}
}


function addNatureDataSource( data ) {
	
	viewer.dataSources.add( Cesium.GeoJsonDataSource.load( data, {
		stroke: Cesium.Color.BLACK,
		fill: Cesium.Color.DARKGREEN,
		strokeWidth: 3,
		clampToGround: true
	}) )
	.then(function ( dataSource ) {
		
		dataSource.name = "NatureAreas";
		let entities = dataSource.entities.values;
		
		for ( let i = 0; i < entities.length; i++ ) {
			
			let entity = entities[ i ];
			const category = entity.properties._category._value;

			showNatureHeat = document.getElementById( "showNatureHeatToggle" ).checked;

			if ( showNatureHeat ) {
				
				if ( entity.properties._avgheatexposuretoarea._value ) {

					entity.polygon.material = new Cesium.Color( 1, 1 - entity.properties._avgheatexposuretoarea._value, 0, entity.properties._avgheatexposuretoarea._value );
	
				}		
			} else {
		
				if ( category ) {
					//colors of nature area enity are set based on it's category
					setNatureAreaPolygonMaterialColor( entity, category )
				}
		
			}
		
		}
	})	
	.otherwise(function ( error ) {
		//Display any errrors encountered while loading.
		console.log( error );
	});

}

function loadNatureAreasWithoutCache( url ) {
	
	console.log("Not in cache! Loading: " + url );

	const response = fetch( url )
	.then( function( response ) {
	  return response.json();
	})
	.then( function( data ) {
		localforage.setItem( url, JSON.stringify( data ) );
		addNatureDataSource( data );
	})
	
}

function setNatureAreaPolygonMaterialColor( entity, category ) {

	let a = entity.properties.avgheatexposuretoarea._value;

	if ( !a ) {

		a = 0;
	}
			 						
	switch ( category ){
		case "jarvi":
			entity.polygon.material = Cesium.Color.DEEPSKYBLUE.withAlpha( a );
			break;
		case "suo":
			entity.polygon.material = Cesium.Color.DARKOLIVEGREEN.withAlpha( a );
			break;
		case "matalikko":
			entity.polygon.material = new Cesium.Color( 138, 241, 254, a ); 
			break;
		case "puisto":
			entity.polygon.material = Cesium.Color.LIGHTGREEN.withAlpha( a );
			break;
		case "vesikivikko":
			entity.polygon.material = Cesium.Color.LIGHTSTEELBLUE.withAlpha( a );
			break;
		case "niitty":
			entity.polygon.material = Cesium.Color.YELLOWGREEN.withAlpha( a );
			break;
		case "luonnonsuojelualue": 
			entity.polygon.material = Cesium.Color.DARKGREEN.withAlpha( a );
			break;	
		case "hietikko":
			entity.polygon.material = Cesium.Color.BURLYWOOD.withAlpha( a );
			break;
		case "kallioalue": 
			entity.polygon.material = Cesium.Color.DARKGREY.withAlpha( a );
			break;	
		case "maatuvavesialue": 
			entity.polygon.material = Cesium.Color.DARKKHAKI.withAlpha( a );
			break;	
		case "kivikko": 
			entity.polygon.material = Cesium.Color.GREY.withAlpha( a );
			break;	
		case "suojaalue": 
			entity.polygon.material = new Cesium.Color( 0, 100, 0, a );
			break;
		case "soistuma": 
			entity.polygon.material = Cesium.Color.DARKSEAGREEN.withAlpha( a );
			break;	
		case "meri": 
			entity.polygon.material = Cesium.Color.DODGERBLUE.withAlpha( a );
			break;
		case "luonnonpuisto": 
			entity.polygon.material = Cesium.Color.LIMEGREEN.withAlpha( a );
			break;
		case "kansallispuisto": 
			entity.polygon.material = Cesium.Color.FORESTGREEN.withAlpha( a );
			break;
		case "tulvaalue": 
			entity.polygon.material = Cesium.Color.PURPLE.withAlpha( a );
			break;	
		case "virtavesialue": 
			entity.polygon.material = Cesium.Color.CYAN.withAlpha( a );
			break;																																			
		default:
			entity.polygon.material = Cesium.Color.DARKGREEN.withAlpha( a );
		}	

}