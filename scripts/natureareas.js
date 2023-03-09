
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
	  	
	} catch (err) {
		// This code runs if there were any errors.
		console.log(err);
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
			
			if ( category ) {
				//colors of nature area enity are set based on it's category
				setNatureAreaPolygonMaterialColor( entity, category )
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
			 						
	switch ( category ){
		case "jarvi":
			entity.polygon.material = Cesium.Color.DEEPSKYBLUE;
			break;
		case "suo":
			entity.polygon.material = Cesium.Color.DARKOLIVEGREEN;
			break;
		case "matalikko":
			entity.polygon.material = new Cesium.Color( 138, 241, 254, 1 ); 
			break;
		case "puisto":
			entity.polygon.material = Cesium.Color.LIGHTGREEN;
			break;
		case "vesikivikko":
			entity.polygon.material = Cesium.Color.LIGHTSTEELBLUE;
			break;
		case "niitty":
			entity.polygon.material = Cesium.Color.YELLOWGREEN;
			break;
		case "luonnonsuojelualue": 
			entity.polygon.material = Cesium.Color.DARKGREEN;
			break;	
		case "hietikko":
			entity.polygon.material = Cesium.Color.BURLYWOOD;
			break;
		case "kallioalue": 
			entity.polygon.material = Cesium.Color.DARKGREY;
			break;	
		case "maatuvavesialue": 
			entity.polygon.material = Cesium.Color.DARKKHAKI;
			break;	
		case "kivikko": 
			entity.polygon.material = Cesium.Color.GREY;
			break;	
		case "suojaalue": 
			entity.polygon.material = new Cesium.Color( 0, 100, 0, 0.2 );
			break;
		case "soistuma": 
			entity.polygon.material = Cesium.Color.DARKSEAGREEN;
			break;	
		case "meri": 
			entity.polygon.material = Cesium.Color.DODGERBLUE;
			break;
		case "luonnonpuisto": 
			entity.polygon.material = Cesium.Color.LIMEGREEN;
			break;
		case "kansallispuisto": 
			entity.polygon.material = Cesium.Color.FORESTGREEN;
			break;
		case "tulvaalue": 
			entity.polygon.material = Cesium.Color.PURPLE;
			break;	
		case "virtavesialue": 
			entity.polygon.material = Cesium.Color.CYAN;
			break;																																			
		default:
			entity.polygon.material = Cesium.Color.DARKGREEN;
		}	

}