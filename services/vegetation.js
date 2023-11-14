/**
 * Loads vegetation data for a given postcode asynchronously
 * 
 * @param {string} postcode - The postcode for which to load vegetation data
 * @returns {Promise} - A promise that resolves once the data has been loaded
 */
async function loadVegetation( postcode ) {

	let url = "https://geo.fvh.fi/r4c/collections/vegetation/items?f=json&limit=10000&postinumero=" + postcode ;

	try {
		const value = await localforage.getItem( url );
		// This code runs once the value has been loaded
		// from the offline store.

		if ( value ) {
			console.log("found from cache");

			let datasource = JSON.parse( value )
			addVegetationDataSource( datasource );

		} else {

			loadVegetationWithoutCache( url );

		}
	  	
	} catch ( err ) {
		// This code runs if there were any errors.
		console.log( err );
	}
}

/**
 * Adds a vegetation data source to the viewer
 * 
 * @param {Object} data - The vegetation data to be added as a data source
 */
function addVegetationDataSource( data ) {
	
	viewer.dataSources.add( Cesium.GeoJsonDataSource.load( data, {
		stroke: Cesium.Color.BLACK,
		fill: Cesium.Color.LIGHTGREEN,
		strokeWidth: 3,
		clampToGround: true
	}) )
	.then(function ( dataSource ) {
		
		dataSource.name = "Vegetation";
		let entities = dataSource.entities.values;
		
		for ( let i = 0; i < entities.length; i++ ) {
			
			let entity = entities[ i ];
			const category = entity.properties._koodi._value;

			showVegetationHeat = false;

			if ( showVegetationHeat ) {
				
				if ( entity.properties._avgheatexposuretoarea._value ) {

					entity.polygon.material = new Cesium.Color( 1, 1 - entity.properties._avgheatexposuretoarea._value, 0, entity.properties._avgheatexposuretoarea._value );
	
				}		
			} else {
		
				if ( category ) {
					//colors of nature area enity are set based on it's category
					setVegetationPolygonMaterialColor( entity, category )
				}
		
			}
		
		}
	})	
	.catch(function ( error ) {
		//Display any errrors encountered while loading.
		console.log( error );
	});

}

/**
 * Loads vegetation data from the provided URL without using cache
 * 
 * @param {string} url - The URL from which to load vegetation data
 */
function loadVegetationWithoutCache( url ) {
	
	console.log("Not in cache! Loading: " + url );

	const response = fetch( url )
	.then( function( response ) {
	  return response.json();
	})
	.then( function( data ) {
		localforage.setItem( url, JSON.stringify( data ) );
		addVegetationDataSource( data );
	})
	
}

/**
 * Sets the polygon material color for a vegetation entity based on its category
 * 
 * @param {Object} entity - The vegetation entity
 * @param {string} category - The category of the vegetation entity
 */
function setVegetationPolygonMaterialColor( entity, category ) {
	 						
	switch ( category ){
		case "212":
			entity.polygon.extrudedHeight = 0.1;
			entity.polygon.material = Cesium.Color.LIGHTGREEN.withAlpha( 0.5 );
			break;
		case "211":
			entity.polygon.extrudedHeight = 0.5;
			entity.polygon.material = Cesium.Color.GREENYELLOW.withAlpha( 0.5 );
			break;
		case "510":
			entity.polygon.material = Cesium.Color.DEEPSKYBLUE.withAlpha( 0.5 );
			break;
		case "520":
			entity.polygon.material = Cesium.Color.DODGERBLUE.withAlpha( 0.5 );
			break;
	}	

}