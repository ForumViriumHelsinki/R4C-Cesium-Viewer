
const gridArea = 62500;

/**
 * Changes the display of postal code elements when user switches between postal code and population view
 */
function setPostalCodeElementsDisplay( display ) {
    const elements = [
        'showVegetationSwitch',
        'showVegetationLabel',
        'showOtherNatureSwitch',
        'showOtherNatureLabel',
        'hideNewBuildingsSwitch',
        'hideNewBuildingsLabel',
        'hideNonSoteSwitch',
        'hideNonSoteLabel',
        'hideLowSwitch',
        'hideLowLabel',
        'showTreesSwitch',
        'showTreesLabel',
        'switchViewSwitch',
        'switchViewLabel',
        'georefContainer'
    ];

    elements.forEach(( elementId ) => {
        const element = document.getElementById( elementId );
        if (element) {

            element.style.display = display;
        
        }
    });
}

/**
 * Changes the display of gird elements when user switches between postal code and grid view
 */
function setGridElementsDisplay( display ) {
    const elements = [
        'natureGridSwitch',
        'natureGridLabel'
    ];

    elements.forEach(( elementId ) => {
        const element = document.getElementById( elementId );
        if (element) {

            element.style.display = display;
        
        }
    });
}

/**
 * Set population grid entities heat exposure
 *
 * @param { Object } entities Cesium entities
 */
function setHeatExposureToGrid( entities ) {

	for ( let i = 0; i < entities.length; i++ ) {

		let entity = entities[ i ];
		setGridEntityPolygon( entity );

	}
}

/**
 * Set grid entity polygon
 *
 * @param { Object } entity grid entity
 */
function setGridEntityPolygon( entity ) {

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
function setGridEntityPolygonToGreen( entity ) {

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

    const greenIndex = ( water + vegetation + trees ) / gridArea;
    entity.polygon.material = new Cesium.Color( 1 - greenIndex, 1, 0, greenIndex );

}

function setGridHeight( entities ) {

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
function getGridDataForUnit( index, datasource ) {

    // Find the data source 
	const foundDataSource = getDataSourceByName( datasource );

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
function getGridDataForCity( datasource ) {

    // Find the data source 
	const foundDataSource = getDataSourceByName( datasource );

	// If the data source isn't found, exit the function
	if ( !foundDataSource ) {

		return 0;

	}

    let data = [ ]; 

    const entitiesLength = foundDataSource.entities.values.length;
    const totalArea =  entitiesLength * gridArea
    const total_tree_cover_m2 = calculateDatasourcePropertyTotal( datasource,  'tree_cover_m2' );
    const total_vegetation_m2 = calculateDatasourcePropertyTotal( datasource,  'vegetation_m2' ); 
    const averageheatexposure = calculateDatasourcePropertyTotal( datasource,  'averageheatexposure' );
    
    data.push( averageheatexposure / entitiesLength, total_tree_cover_m2 / totalArea, total_vegetation_m2 / totalArea ); 
  
    return data; // Return the final data array

}
