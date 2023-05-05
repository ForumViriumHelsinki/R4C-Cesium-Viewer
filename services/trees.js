async function loadTrees( postcode ) {

	let url = "https://geo.fvh.fi/r4c/collections/tree/items?f=json&limit=100000&postinumero=" + postcode ;

	try {
		const value = await localforage.getItem( url );
		// This code runs once the value has been loaded
		// from the offline store.

		if ( value ) {
			console.log("found from cache");

			let datasource = JSON.parse( value )
			addTreesDataSource( datasource );

		} else {

			loadTreesWithoutCache( url );

		}
	  	
	} catch ( err ) {
		// This code runs if there were any errors.
		console.log( err );
	}
}

function addTreesDataSource( data ) {
	
	viewer.dataSources.add( Cesium.GeoJsonDataSource.load( data, {
		stroke: Cesium.Color.BLACK,
		fill: Cesium.Color.DARKGREEN,
		strokeWidth: 3,
		clampToGround: true
	}) )
	.then(function ( dataSource ) {
		
		dataSource.name = "Trees";
		let entities = dataSource.entities.values;
		
		for ( let i = 0; i < entities.length; i++ ) {
			
			let entity = entities[ i ];
			const description = entity.properties._kuvaus._value;
			setTreePolygonMaterialColor( entity, description );

		
		}
	})	
	.otherwise(function ( error ) {
		//Display any errrors encountered while loading.
		console.log( error );
	});

}

function loadTreesWithoutCache( url ) {
	
	console.log("Not in cache! Loading: " + url );

	const response = fetch( url )
	.then( function( response ) {
	  return response.json();
	})
	.then( function( data ) {
		localforage.setItem( url, JSON.stringify( data ) );
		addTreesDataSource( data );
	})
	
}

function setTreePolygonMaterialColor( entity, description ) {

	switch ( description ){
		case "Puusto yli 20 m":
			entity.polygon.material = Cesium.Color.FORESTGREEN.withAlpha( 0.7 );
            entity.polygon.extrudedHeight = 22.5;
			break;
		case "puusto, 15 m - 20 m":
			entity.polygon.material = Cesium.Color.FORESTGREEN.withAlpha( 0.8 );
            entity.polygon.extrudedHeight = 17.5;
		case "puusto, 10 m - 15 m":
			entity.polygon.material = Cesium.Color.FORESTGREEN.withAlpha( 0.9 );
            entity.polygon.extrudedHeight = 12.5;
		case "puusto, 2 m - 10 m":
			entity.polygon.material = Cesium.Color.FORESTGREEN.withAlpha( 1 );
            entity.polygon.extrudedHeight = 6;
		}	

}