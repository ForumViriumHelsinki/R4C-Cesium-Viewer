/**
 * Fetches data from API Features based on postal code value
 * 
 */
async function loadFloodData( ) {

	const urbanheatdata = fetch( "https://geo.fvh.fi/r4c/collections/flood_data/items?f=json&limit=20000&postinumero=" + postalcode )
    .then( function( response ) {
        return response.json();
	})
    .then( function( flooddata ) {
	
		addFloodDataSource( flooddata );

		//	return response.json();
		}).catch(
            ( e ) => {
	
				console.log( 'something went wrong', e );
	
			}
		);
}


/**
 * Adds the data to viewer's datasources
 *
 * @param { Array<Object> }  data 
 * 
 */
async function addFloodDataSource( data ) {

	viewer.dataSources.add( Cesium.GeoJsonDataSource.load( data, {
		stroke: Cesium.Color.BLACK,
		fill: Cesium.Color.DEEPSKYBLUE,
		strokeWidth: 3,
		clampToGround: true
	}) )
	.then( function ( dataSource ) {

		dataSource.name = "Floods";
		let entities = dataSource.entities.values;
        setColorAndMaterial( entities );

	})	
	.otherwise(function ( error ) {
		//Display any errrors encountered while loading.
		console.log( error );
	});

}

/**
 * Finds and sets color and the material for each entity in the datasource
 *
 * @param { Array<Object> }  entities in the datasource
 * 
 */
function setColorAndMaterial( entities ) {

    for ( let i = 0; i < entities.length; i++ ) {

        let entity = entities[ i ];

        if ( entity.properties.water && entity.polygon ) {

            let value = findFloodColor( Number( entity.properties.water._value ) );
            entity.polygon.material = Cesium.Color.fromCssColorString( value );
            let material = findMaterial( Number( entity.properties.material._value ) );
            entity.properties.material = material;
            entity.polygon.extrudedHeight = entity.properties.water._value;


        } 

    }

}

/**
 * Finds the material based on flood feature's material code
 *
 * @param { number  } material code
 * @return { string } material
 */
function findMaterial( value ) {

    switch ( value ) {
        case 1:
            return 'Tie';  
        case 2:
            return 'Apuaineiston mukainen rakennus';     
        case 3:
            return 'Muu vettä läpäisemätön pinta';  
        case 4:
            return 'Pellot';  
        case 5:
            return 'Muu avoin matala kasvillisuus';  
        case 6:
            return 'Puusto 2-10 m';     
        case 7:
            return 'Puusto 10-15 m';  
        case 8:
            return 'Puusto 15-20 m';
        case 9:
            return 'Puusto >20 m';
        case 10:
            return 'Paljas maa';
        case 11:
            return 'Vesi';                                                                                                                                                                      
    }
}


/**
 * Finds the hex code based on flood feature's water level
 *
 * @param { number  } water value
 * @return { string } hex color code
 */
function findFloodColor( value ) {

    switch ( true ) {
    
        case value >= 1.0:
            return '#311465'; 
        case value >= 0.9:
            return '#00008B';              
        case value >= 0.8:
            return '#0052A2';     
        case value >= 0.7:
            return '#1b7ced';  
        case value >= 0.6:
            return '#19BDFF';  
        case value >= 0.5:
            return '#37C6FF';  
        case value >= 0.4:
            return '#55CEFF';     
        case value>= 0.3:
            return '#73D7FF';  
        case value >= 0.2:
            return '#91E0FF';
        case value >= 0.1:
            return '#A5E5FF';  
                                                                                                                                                                    
    }
}