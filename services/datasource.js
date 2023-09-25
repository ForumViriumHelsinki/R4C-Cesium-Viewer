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
        .otherwise(function (error) {
            // Display any errors encountered while loading.
            console.log(error);
            reject(error);
        });
    });
}