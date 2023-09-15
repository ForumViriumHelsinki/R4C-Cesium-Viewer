/**
 * A function for handling select events.
 * 
 */
function selectEvents( event ) {
		
    if ( event.target.id  == 'categoricalSelect' || event.target.id == 'numericalSelect' ) {
        
        selectAttributeForScatterPlot( );

    }	
            
}

/**
 * A function to add urban heat data and material data for the given entity if it is a SOTE building.
 * 
 * @param { Array } urbanHeatDataAndMaterial - The array to store the urban heat data and material data.
 * @param { Object } entity - The entity to add the data for.
 * @param { String } categorical - The current categorical data.
 * @param { String } numerical - The current numerical data.
*/
function scatterForSoteBuildings( urbanHeatDataAndMaterial, entity, categorical, numerical ) {

    // Check if the entity has the usage value
    if ( entity._properties.c_kayttark  && entity._properties.c_kayttark._value ) {

        const kayttotark = Number( entity._properties.c_kayttark._value );

        // Check if the entity is a SOTE building.
        if ( kayttotark == 511 || kayttotark == 131 || ( kayttotark > 212 && kayttotark < 240 ) ) {

            // Add urban heat data and material data for the entity.
            addDataForScatterPlot( urbanHeatDataAndMaterial, entity, getSelectedText( "categoricalSelect" ), getSelectedText( "numericalSelect" ), categorical, numerical );
    
        }

    } 
     
}

/**
 * A function to add urban heat data and material data for the given entity if it is a tall building.
 * 
 * @param { Array } urbanHeatDataAndMaterial - The array to store the urban heat data and material data.
 * @param { Object } entity - The entity to add the data for.
 * @param { String } categorical - The current categorical data.
 * @param { String } numerical - The current numerical data.
*/
function scatterForTallBuildings( urbanHeatDataAndMaterial, entity, categorical, numerical ) {

        // Check if the entity has the floor count value
    if ( entity._properties.i_kerrlkm  && entity._properties.i_kerrlkm._value ) {

        const floorCount = Number( entity._properties.i_kerrlkm._value );

        // Check if the entity is a tall building.
        if ( floorCount > 6  ) {

            // Add urban heat data and material data for the entity.
            addDataForScatterPlot( urbanHeatDataAndMaterial, entity, getSelectedText( "categoricalSelect" ), getSelectedText( "numericalSelect" ), categorical, numerical );

        }

    }
     
}

/**
 * A function to add urban heat data and material data for the given entity if it is building built before June 2018.
 * 
 * @param { Array } urbanHeatDataAndMaterial - The array to store the urban heat data and material data.
 * @param { Object } entity - The entity to add the data for.
 * @param { String } categorical - The current categorical data.
 * @param { String } numerical - The current numerical data.
*/
function scatterForOldBuildings( urbanHeatDataAndMaterial, entity, categorical, numerical ) {

    // Check if the entity has the floor count value
    if ( entity._properties.c_valmpvm  && entity._properties.c_valmpvm._value ) {

        const date = new Date( entity._properties.c_valmpvm._value );

        // Define the target date (June 1, 2018)
        const targetDate = new Date("2018-06-01T00:00:00");

        // Check if the date is before June 1, 2018
        if ( date < targetDate ) {

            console.log("The date is after May 31, 2018.");
            // Add urban heat data and material data for the entity.
            addDataForScatterPlot( urbanHeatDataAndMaterial, entity, getSelectedText( "categoricalSelect" ), getSelectedText( "numericalSelect" ), categorical, numerical );

        }
    }
}

/**
 * A function to handle change of categorical or numerical value in the scatter plot
 * 
 */
function selectAttributeForScatterPlot( ) {
    // Find the data source for buildings
    const buildingsDataSource = viewer.dataSources._dataSources.find( ds => ds.name === "Buildings" );

    // If the data source isn't found, exit the function
    if ( !buildingsDataSource ) {
        return;
    }

    const urbanHeatDataAndMaterial = [];

    // Process the entities in the buildings data source and populate the urbanHeatDataAndMaterial array with scatter plot data
    processEntitiesForScatterPlot( buildingsDataSource.entities.values, urbanHeatDataAndMaterial );
    // Create a scatter plot with the updated data
    console.log("number of buildings added to scatterplot:", urbanHeatDataAndMaterial.length );
    createScatterPlot( urbanHeatDataAndMaterial, getSelectedText( "categoricalSelect" ), getSelectedText( "numericalSelect" ) );
}

/**
 * A function to process entities for scatter plot data
 * 
 * @param { Array } entities - Array of entities to process
 * @param { Array } urbanHeatDataAndMaterial - Array to store scatter plot data
 * @param { String } categorical - The categorical variable selected by the user
 * @param { String } numerical - The numerical variable selected by the user
 * @param { boolean } hideNonSote - Whether to hide non-SOTE buildings in the scatter plot
 * @param { boolean } hideLowToggle - Whether to hide short buildings in the scatter plot
 */
function processEntitiesForScatterPlot( entities, urbanHeatDataAndMaterial ) {

    const numerical = document.getElementById("numericalSelect").value
    const categorical = document.getElementById("categoricalSelect").value
    const hideNonSote = document.getElementById( "hideNonSoteToggle" ).checked;
    const hideLowToggle = document.getElementById( "hideLowToggle" ).checked;

    entities.forEach( entity => {

      if ( hideNonSote ) {

        scatterForSoteBuildings( urbanHeatDataAndMaterial, entity, categorical, numerical );

      }

      if ( hideLowToggle)  {

        scatterForTallBuildings( urbanHeatDataAndMaterial, entity, categorical, numerical );
    
      }

      if ( document.getElementById( "hideNewBuildingsToggle" ).checked )  {

        scatterForOldBuildings( urbanHeatDataAndMaterial, entity, categorical, numerical );
    
      }

      if ( !hideNonSote && !hideLowToggle && !document.getElementById( "hideNewBuildingsToggle" ).checked ) {

        addDataForScatterPlot( urbanHeatDataAndMaterial, entity, getSelectedText( "categoricalSelect" ), getSelectedText( "numericalSelect" ), categorical, numerical );

      }
    });
}
