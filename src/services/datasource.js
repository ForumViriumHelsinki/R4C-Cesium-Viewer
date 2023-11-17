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
}