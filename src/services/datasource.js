import * as Cesium from "cesium";

export default class GeoJSONDataSource {
  constructor(viewer) {
    this.viewer = viewer;
  }

  // Function to show all data sources
  showAllDataSources() {
    this.viewer.dataSources._dataSources.forEach((dataSource) => {
      dataSource.show = true;
    });
  }

  // Function to hide a data source by name
  hideDataSourceByName(name) {
    this.viewer.dataSources._dataSources.forEach(( dataSource ) => {
      if ( dataSource.name.startsWith( name ) ) {
        dataSource.show = false;
      }
    });
  }

  // Function to get a data source by name
  getDataSourceByName(name) {
    return this.viewer.dataSources._dataSources.find((ds) => ds.name === name);
  }

  // Function to remove data sources by name prefix
  async removeDataSourcesByNamePrefix(namePrefix) {
    return new Promise( ( resolve, reject ) => {
        const dataSources = this.viewer.dataSources._dataSources;
        const removalPromises = [];

        for (const dataSource of dataSources) {
            if ( dataSource.name.startsWith( namePrefix ) ) {
                const removalPromise = new Promise(( resolveRemove, rejectRemove ) => {
                    this.viewer.dataSources.remove( dataSource, true );
                    this.viewer.dataSources.dataSourceRemoved.addEventListener( function onDataSourceRemoved() {
                        this.viewer.dataSources.dataSourceRemoved.removeEventListener( onDataSourceRemoved );
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

  // Function to load GeoJSON data source
  loadGeoJsonDataSource(opacity, url, name) {
    return new Promise((resolve, reject) => {
      Cesium.GeoJsonDataSource.load(url, {
        stroke: Cesium.Color.BLACK,
        fill: new Cesium.Color(0.3, 0.3, 0.3, opacity),
        strokeWidth: 8,
        clampToGround: false,
      })
        .then((dataSource) => {
          dataSource.name = name;
          this.viewer.dataSources.add(dataSource);

          const entities = dataSource.entities.values;
          resolve(entities);
        })
        .catch((error) => {
          console.log(error);
          reject(error);
        });
    });
  }

  // Function to calculate property total from a data source
  calculateDataSourcePropertyTotal( datasource, property ) {
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

async addDataSourceWithName(data, name) {
  try {
    const dataSource = await this.viewer.dataSources.add(
      Cesium.GeoJsonDataSource.load(data, {
        stroke: Cesium.Color.BLACK,
        fill: Cesium.Color.CRIMSON,
        strokeWidth: 3,
        clampToGround: true,
      })
    );

    dataSource.name = name;
    let entities = dataSource.entities.values;
    return entities; // Return entities once loaded and processed
  } catch (error) {
    // Display any errors encountered while loading.
    console.log(error);
    return null; // Return null or handle error accordingly
  }
}

/**
 * Removes duplicate data sources from the Cesium viewer.
 * 
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
async removeDuplicateDataSources( ) {
    return new Promise((resolve, reject) => {
        const dataSources = this.viewer.dataSources._dataSources;
        const uniqueDataSources = {};

        for (let i = 0; i < dataSources.length; i++) {
            const dataSource = dataSources[i];

            if (!uniqueDataSources[dataSource.name] || uniqueDataSources[dataSource.name].index > i) {
                // Store or replace the data source if it's the first occurrence or has a smaller index
                uniqueDataSources[dataSource.name] = {
                    dataSource: dataSource,
                    index: i
                };
            }
        }

        // Clear all existing data sources
        this.viewer.dataSources.removeAll();

        // Add the unique data sources back to the viewer
        const addPromises = [];
        for (const name in uniqueDataSources) {
            const dataSource = uniqueDataSources[name].dataSource;
            const addPromise = this.viewer.dataSources.add(dataSource);
            addPromises.push(addPromise);
        }

        // Wait for all data sources to be added
        Promise.all(addPromises)
            .then(() => {
                resolve();
            })
            .catch((error) => {
                reject(error);
            });
    });
}

/**
 * Removes the data source by name from the Cesium viewer
 * 
 */
removeDataSourceByName( name ) {
    // Find the data source named 'MajorDistricts' in the viewer
    const majorDistrictsDataSource = this.getDataSourceByName( name );

    // If the data source is found, remove it
    if ( majorDistrictsDataSource ) {

        this.viewer.dataSources.remove( majorDistrictsDataSource, true );    

    }
}

}