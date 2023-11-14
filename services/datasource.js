/**
 * This function to shows all datasources to user.
 *
 */
function showAllDataSources( ) {

    // Set the show property of all data sources to true to show the entities
    viewer.dataSources._dataSources.forEach( function( dataSource ) {

        dataSource.show = true;

    });  
}

/**
 * Get a data source from the Cesium viewer
 * 
 * @param { String } name name of the datasource
*/
function hideDataSourceByName( name ) {

    viewer.dataSources._dataSources.forEach( function( dataSource ) {
        if ( dataSource.name.startsWith( name ) ) { 
            dataSource.show = false;	
        }
    });
}

/**
 * Get a data source from the Cesium viewer
 * 
 * @param { String } name name of the datasource
 * @returns { Object } The found data source
*/
function getDataSourceByName( name ) {
    
    return viewer.dataSources._dataSources.find( ds => ds.name === name );

}

/**
 * Removes all data sources whose names start with the provided name prefix from the Cesium viewer.
 * 
 * @param {string} namePrefix The prefix of the data source names to remove.
 * @returns {Promise<void>} A promise that resolves when all matching data sources are removed.
 */
async function removeDataSourcesByNamePrefix( namePrefix ) {
    return new Promise( ( resolve, reject ) => {
        const dataSources = viewer.dataSources._dataSources;
        const removalPromises = [];

        for (const dataSource of dataSources) {
            if ( dataSource.name.startsWith( namePrefix ) ) {
                const removalPromise = new Promise(( resolveRemove, rejectRemove ) => {
                    viewer.dataSources.remove( dataSource, true );
                    viewer.dataSources.dataSourceRemoved.addEventListener( function onDataSourceRemoved() {
                        viewer.dataSources.dataSourceRemoved.removeEventListener( onDataSourceRemoved );
                        resolveRemove();
                    });
                });

                removalPromises.push( removalPromise );
            }
        }

        // Wait for all removal promises to resolve
        Promise.all( removalPromises )
            .then(() => {
                resolve();
            })
            .catch((error) => {
                reject( error );
            });
    });
}

/**
 * Loads GeoJson datasource polygons with the given opacity and return its entities.
 * 
 * @param {number} opacity - Opacity of the data source.
 * @param {string} url - URL of the GeoJSON data source.
 * @param {string} name - Name to assign to the data source.
 * 
 * @returns {Cesium.Entity[]} - Array of entities in the data source.
 */
function loadGeoJsonDataSource( opacity, url, name ) {
    // Load major district code zones
	console.log( "Loading: " + url );
	
    return new Promise((resolve, reject) => {
        Cesium.GeoJsonDataSource.load(url, {
            stroke: Cesium.Color.BLACK,
            fill: new Cesium.Color(0.3, 0.3, 0.3, opacity),
            strokeWidth: 8,
            clampToGround: false
        })
        .then(function (dataSource) {
            dataSource.name = name;
            viewer.dataSources.add(dataSource);
            
            const entities = dataSource.entities.values;
            resolve(entities);
        })
        .catch(function (error) {
            // Display any errors encountered while loading.
            console.log(error);
            reject(error);
        });
    });
}

function calculateDatasourcePropertyTotal( datasource, property ) {

    // Find the data source 
	const foundDataSource = getDataSourceByName( datasource );
    let total = 0;

	// If the data source isn't found, exit the function
	if ( !foundDataSource ) {
		return total;
	}

    // Iterate through the entities in the data source
    const entities = foundDataSource.entities.values;
    for ( const entity of entities ) {
        // Check if the entity has the specified property
        if ( entity.properties && entity.properties.hasOwnProperty( property ) ) {
            // Extract the property value and add it to the total
            const propertyValue = entity.properties[ property ].getValue();
            if ( !isNaN( propertyValue ) ) {

                total += propertyValue;

            }
        }
    }
    return total;

}