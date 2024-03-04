import * as Cesium from "cesium";
import Datasource from "./datasource.js"; 
import Viewercamera from "./viewercamera.js"; 

export default class Populationgrid {
    constructor( viewer ) {
      this.datasourceService = new Datasource( viewer );
      this.cameraService = new Viewercamera( viewer );
      this.gridArea = 62500;
    }

/**
 * Set population grid entities heat exposure
 *
 * @param { Object } entities Cesium entities
 */
setHeatExposureToGrid( entities ) {

	for ( let i = 0; i < entities.length; i++ ) {

		let entity = entities[ i ];
		this.setGridEntityPolygon( entity );

	}
}

/**
 * Set grid entity polygon
 *
 * @param { Object } entity grid entity
 */
setGridEntityPolygon( entity ) {

	if ( entity.properties.averageheatexposure && entity.polygon ) {

		entity.polygon.material = new Cesium.Color( 1, 1 - entity.properties.averageheatexposure._value, 0, entity.properties.averageheatexposure._value );

	} else {

		if ( entity.polygon ) {
			
			entity.show = false;

		}
	}

}

/**
 * Set grid entity polygon
 *
 * @param { Object } entity grid entity
 */
setGridEntityPolygonToGreen( entity ) {

    let water = 0;
    let vegetation = 0;
    let trees = 0;

	if ( entity.properties.water_m2 ) {

        water = entity.properties.water_m2._value;

	} 

    if ( entity.properties.vegetation_m2 ) {

        vegetation = entity.properties.vegetation_m2._value;

	} 

    if ( entity.properties.tree_cover_m2 ) {

        trees = entity.properties.tree_cover_m2._value;

	}

    const greenIndex = ( water + vegetation + trees ) / this.gridArea;
    entity.polygon.material = new Cesium.Color( 1 - greenIndex, 1, 0, greenIndex );

}

setGridHeight( entities ) {

	for ( let i = 0; i < entities.length; i++ ) {

		let entity = entities[ i ];

		if ( entity.polygon ) {

			if ( entity.properties.asukkaita ) {

				entity.polygon.extrudedHeight = entity.properties.asukkaita._value / 4;
	
			} 
		}
	}
}


/**
 * Get data array for a specific grid unit
 * 
 * @param { string } index - index of grid unit
 * @param { string } datasource - name of the datasource
 * @returns { Array } Data array for the specified grid unit
 */
getGridDataForUnit( index, datasource ) {

    // Find the data source 
	const foundDataSource = this.datasourceService.getDataSourceByName( datasource );

	// If the data source isn't found, exit the function
	if ( !foundDataSource ) {

		return 0;

	}

    let data = [ ]; 

     // Iterate through the entities in the data source
     const entities = foundDataSource.entities.values;
     for ( const entity of entities ) {

         if ( entity.properties && entity.properties.hasOwnProperty( 'index' ) ) {

             const propertyValue = entity.properties[ 'index' ].getValue();
    
              // Check if the entity index matches given index
             if ( propertyValue == index ) {

                const tree_cover_m2 = entity.properties[ 'tree_cover_m2' ].getValue();
                const vegetation_m2 = entity.properties[ 'vegetation_m2' ].getValue();
                const averageheatexposure = entity.properties[ 'averageheatexposure' ].getValue();
 
                data.push( averageheatexposure, tree_cover_m2 / gridArea, vegetation_m2 / gridArea );
 
             }
         }
     }

    return data; // Return the final data array

}

/**
 * Get data array for a whole city
 * 
 * @returns { Array } Data array for the specified grid unit
 */
getGridDataForCity( datasource ) {

    // Find the data source 
	const foundDataSource = this.datasourceService.getDataSourceByName( datasource );

	// If the data source isn't found, exit the function
	if ( !foundDataSource ) {

		return 0;

	}

    let data = [ ]; 

    const entitiesLength = foundDataSource.entities.values.length;
    const totalArea =  entitiesLength * gridArea
    const total_tree_cover_m2 = this.datasourceService.calculateDatasourcePropertyTotal( datasource,  'tree_cover_m2' );
    const total_vegetation_m2 = this.datasourceService.calculateDatasourcePropertyTotal( datasource,  'vegetation_m2' ); 
    const averageheatexposure = this.datasourceService.calculateDatasourcePropertyTotal( datasource,  'averageheatexposure' );
    
    data.push( averageheatexposure / entitiesLength, total_tree_cover_m2 / totalArea, total_vegetation_m2 / totalArea ); 
  
    return data; // Return the final data array

}

async createPopulationGrid( ) {

    this.datasourceService.removeDataSourcesAndEntities();
    this.cameraService.flyCamera3D( 24.991745, 60.045, 12000 );

    try {

        const entities = await this.datasourceService.loadGeoJsonDataSource(
            0.1,
            'assets/data/hsy_populationgrid.json',
            'PopulationGrid'
        );
        
        this.setHeatExposureToGrid(entities);

        if ( !document.getElementById( "travelTimeToggle" ).checked ) {
    
            this.setGridHeight( entities );

        } else {

            document.getElementById( "travelTimeToggle" ).checked = false;

        }

    } catch (error) {
        
        console.error(error);
    }
}

}