/**
 * Asynchronously load tree data from an API endpoint based on postcode
 * 
 * @param { String } postcode area's postal code
 */
async function loadTrees( postcode ) {

      // Construct the API endpoint URL
	let url = "https://geo.fvh.fi/r4c/collections/tree/items?f=json&limit=100000&postinumero=" + postcode ;

	try {

        // Attempt to retrieve the tree data from the local storage using the API endpoint URL as the key
		const value = await localforage.getItem( url );

         // If the tree data is already available in the local storage, add it to the Cesium map
		if ( value ) {

			console.log("found from cache");
			let datasource = JSON.parse( value )
			addTreesDataSource( datasource, postcode );

		} else {

            // Otherwise, fetch the tree data from the API endpoint and add it to the local storage
			loadTreesWithoutCache( url, postcode );

		}
	  	
	} catch ( err ) {
		// This code runs if there were any errors.
		console.log( err );
	}
}

/**
 * Add the tree data as a new data source to the Cesium
 * 
 * @param { object } data tree data
 * @param { String } postcode - The postal code to fetch the tree distance data for
 */
function addTreesDataSource( data, postcode ) {
	
	viewer.dataSources.add( Cesium.GeoJsonDataSource.load( data, {
		stroke: Cesium.Color.BLACK,
		fill: Cesium.Color.DARKGREEN,
		strokeWidth: 3,
		clampToGround: true
	}) )
	.then(function ( dataSource ) {
		
        // Set a name for the data source
		dataSource.name = "Trees";
		let entities = dataSource.entities.values;
		
        // Iterate over each entity in the data source and set its polygon material color based on the tree description
		for ( let i = 0; i < entities.length; i++ ) {
			
			let entity = entities[ i ];
			const description = entity.properties._kuvaus._value;
			setTreePolygonMaterialColor( entity, description );

		
		}

		fetchAndAddTreeDistanceData( postcode, data );

	})	
	.otherwise(function ( error ) {
		// Log any errors encountered while loading the data source
		console.log( error );
	});

}

/**
 * Fetch tree distance data from the provided URL and create a new dataset for plot that presents the cooldown effect on trees on buildings
 *
 * @param { string } postcode - The postal code to fetch the tree distance data for.
 * @param { object } treeData - The dataset containing tree information
 */
function fetchAndAddTreeDistanceData( postcode, treeData ) {
	// Fetch the tree data from the URL
	const url = "https://geo.fvh.fi/r4c/collections/tree_building_distance/items?f=json&limit=100000&postinumero=" + postcode;
	fetch( url )
	  .then( response => response.json() )
	  .then( data => {
		// Call function that combines datasets for plotting
		const sumPAlaM2Map = combineDistanceAndTreeData( data, treeData );
		const heatExpTreeArea = createTreeBuildingPlotMap( sumPAlaM2Map );
		const heatExpAverageTreeArea = extractKeysAndAverageTreeArea( heatExpTreeArea );
		createTreesNearbyBuildingsPlot( heatExpAverageTreeArea[ 0 ], heatExpAverageTreeArea[ 1 ], heatExpAverageTreeArea[ 2 ] );

	  })
	  .catch( error => {
		// Log any errors encountered while fetching the data
		console.log( "Error fetching tree distance data:", error );
	  });
}

/**
 * Extracts heat expsoure and calculates average tree_area from the heatTreeAverageMap.
 *
 * @param { Map } heatTreeAverageMap - The map containing heat exposure values as keys and tree_area/count as values.
 * 
 * @return { Array } An array containing three sub-arrays. The first sub-array contains all the keys from the map, and the second sub-array contains the calculated average tree_area for each key. Third one contains the count of buildings for the heat exposure value.
 */
function extractKeysAndAverageTreeArea( heatTreeAverageMap ) {
	const heatExpArray = [];
	const averageTreeAreaArray = [];
	const buildingCounts = [];

	heatTreeAverageMap.forEach( ( value, key ) => {
		heatExpArray.push( key );

		if ( value.tree_area == 0 ) {
	
			// setting the value to 1 if there is no tree area nearby
			averageTreeAreaArray.push( 1 );

		} else {

			averageTreeAreaArray.push( value.tree_area / value.count );

		}

		buildingCounts.push( value.count );

	});
  
	return [ heatExpArray, averageTreeAreaArray, buildingCounts ];

}

/**
 * Adds Urban Heat Exposure to tree area data.
 *
 * @param { Map } sumPAlaM2Map - The dataset containing tree information, mapped to building IDs.
 * 
 * @return { Map } A map for plotting that contains the aggregated tree_area and count of buildings for each heat exposure value.
 */
function createTreeBuildingPlotMap( sumPAlaM2Map ) {

	const heatTreeAverageMap = new Map();
	let totalCounter = 0;
	let totalTreeArea = 0;

	// Find the data source for buildings
	const buildingsDataSource = getDataSourceByName( "Buildings" );

	// If the data source isn't found, exit the function
	if ( !buildingsDataSource ) {
		return;
	}
	
	// Iterate over all entities in data source
	for ( let i = 0; i < buildingsDataSource._entityCollection._entities._array.length; i++ ) {
	
		let entity = buildingsDataSource._entityCollection._entities._array[ i ];
	
		// If entity has a heat exposure value, add it to the urbanHeatData array and add data for the scatter plot
		if ( entity._properties.avgheatexposuretobuilding && entity._properties._id && entity._properties._i_kokala && Number( entity._properties._i_kokala._value ) > 225 ) {

			const building_id = entity._properties._id._value;
			const heatExposure = entity._properties.avgheatexposuretobuilding._value.toFixed( 2 );
			let tree_area = sumPAlaM2Map.get( building_id );

			// Set tree area to 0
			if ( !tree_area ) {

				tree_area = 0;

			}
			
			if ( heatTreeAverageMap.has( heatExposure ) ) {

				let storedValues = heatTreeAverageMap.get( heatExposure )
				storedValues.tree_area = storedValues.tree_area + tree_area
				storedValues.count = storedValues.count + 1;


				heatTreeAverageMap.set( heatExposure, storedValues );
			
			} else {
				
				heatTreeAverageMap.set( heatExposure, { tree_area: tree_area, count: 1 } );

			}

			// Set tree_area as a property of the entity
			entity._properties.treeArea = tree_area;
			
			if ( tree_area > 225 ) {
				  
				// Highlight the building entity edges by changing its outlineColor and outlineWidth
				entity.polygon.outline = true; // Enable outline
				entity.polygon.outlineColor = Cesium.Color.GREEN; // Set outline color to red
				entity.polygon.outlineWidth = 3; // Set outline width to 3 (adjust as needed)
			} 

			// for calculating postal code average
			totalTreeArea += tree_area;
			totalCounter++;

		}
	}

	averageTreeArea = totalTreeArea / totalCounter;

	return heatTreeAverageMap;

}

/**
 * Combines the distance and tree datasets for plotting
 *
 * @param { object } distanceData - The dataset containing distance information
 * @param { object } treeData - The dataset containing tree information
 * 
 * @return { object } mapped data for plotting
 */
function combineDistanceAndTreeData( distanceData, treeData ) {

  	// Create a map to store the sum of 'p_ala_m2' for each 'kohde_id' in 'treeData'
  	const sumPAlaM2Map = new Map();

	for ( let i = 0, len = distanceData.features.length; i < len; i++ ) {

		const building_id = distanceData.features[ i ].properties.building_id;
		const tree_id = distanceData.features[ i ].properties.tree_id;

		for ( let j = 0, len = treeData.features.length; j < len; j++ ) {

			if ( tree_id === treeData.features[ j ].properties.kohde_id ) {

				const p_ala_m2 = treeData.features[ j ].properties.p_ala_m2;

				if ( sumPAlaM2Map.has( building_id ) ) {

					sumPAlaM2Map.set( building_id, sumPAlaM2Map.get( building_id ) + p_ala_m2 );
				
				} else {
					
					sumPAlaM2Map.set( building_id, p_ala_m2 );

				}

			}

		}			

	}

	return sumPAlaM2Map;

}
  
/**
 * Fetch tree data from the API endpoint and add it to the local storage
 * 
 * @param { String } url API endpoint's url
 * @param { String } postcode - The postal code to fetch the tree distance data for.
 */
function loadTreesWithoutCache( url, postcode ) {
	
	console.log("Not in cache! Loading: " + url );

	const response = fetch( url )
	.then( function( response ) {
	  return response.json();
	})
	.then( function( data ) {
		localforage.setItem( url, JSON.stringify( data ) );
		addTreesDataSource( data, postcode );
	})
	
}

/**
 * Set the polygon material color and extruded height for a given tree entity based on its description
 * 
 * @param { object } entity tree entity
 * @param { String } description description of tree entity
 */
function setTreePolygonMaterialColor( entity, description ) {

	switch ( description ){
		case "Puusto yli 20 m":
			entity.polygon.material = Cesium.Color.FORESTGREEN.withAlpha( 0.7 );
            entity.polygon.extrudedHeight = 22.5;
			break;
		case "puusto, 15 m - 20 m":
			entity.polygon.material = Cesium.Color.FORESTGREEN.withAlpha( 0.6 );
            entity.polygon.extrudedHeight = 17.5;
		case "puusto, 10 m - 15 m":
			entity.polygon.material = Cesium.Color.FORESTGREEN.withAlpha( 0.55 );
            entity.polygon.extrudedHeight = 12.5;
		case "puusto, 2 m - 10 m":
			entity.polygon.material = Cesium.Color.FORESTGREEN.withAlpha( 0.5 );
            entity.polygon.extrudedHeight = 6;
		}	

}