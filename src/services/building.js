import * as Cesium from "cesium";
import localforage from "localforage";
import Datasource from "./datasource.js"; 
import Urbanheat from "./urbanheat.js"; 

export default class Building {
  constructor( viewer ) {
    this.viewer = viewer;
    this.datasourceService = new Datasource( this.viewer );
    this.urbanheatService = new Urbanheat( this.viewer );
  }

  setBuildingPolygonMaterialColor( entity, kayttotarkoitus ) {

	switch ( kayttotarkoitus ) {
		case 2: // business
			entity.polygon.material = Cesium.Color.TOMATO;
			break;
		case 3: // holiday/cottage
			entity.polygon.material = Cesium.Color.YELLOW;
			break;
		case 4: // factory/production
			entity.polygon.material = Cesium.Color.BLACK; 
			break;
		case 5: // religous buildings
			entity.polygon.material = Cesium.Color.MEDIUMPURPLE;
			break;
		case 6: // open areas with roof, for example for parking cars and trash
			entity.polygon.material = Cesium.Color.MEDIUMAQUAMARINE;
			break;
		case 8: // // churches
			entity.polygon.material = Cesium.Color.HOTPINK;
			break;
		default: // residential
			entity.polygon.material = Cesium.Color.MIDNIGHTBLUE;
		}

}

 findMultiplierForFloorCount( kayttotarkoitus ) {

	switch ( kayttotarkoitus ) {
		case 2: // business
			return 4.0;
		case 3: // holiday/cottage
			return 2.0;
		case 4: // factory/production
			return 5.4;
		case 5: // religous buildings
			return 4.0;
		case 6: // open areas with roof, for example for parking cars and trash
			return 3.0;
		case 8: // // churches
			return 8.1;
		default: // residential
			return 2.7 
		}

}

findAndSetOutsideHelsinkiBuildingsColor( entities ) {

	for ( let i = 0; i < entities.length; i++ ) {

		let entity = entities[ i ];
		const kayttotarkoitus = Number( entity.properties._kayttotarkoitus._value );
		const multiplier = this.findMultiplierForFloorCount( kayttotarkoitus )

		if ( entity.properties.kerrosluku != null ) {

			entity.polygon.extrudedHeight = entity.properties.kerrosluku._value * multiplier;

		}

		if ( kayttotarkoitus ) {

			this.setBuildingPolygonMaterialColor( entity, kayttotarkoitus );

		}	
		
	}
}

/**
 * Set building entities heat exposure
 *
 * @param { Object } entities Cesium entities
 */
 setHeatExposureToBuildings( entities ) {

	for ( let i = 0; i < entities.length; i++ ) {

		let entity = entities[ i ];
		this.setBuildingEntityPolygon( entity );

	}
}

/**
 * Set building entity polygon
 *
 * @param { Object } entity building entity
 */
 setBuildingEntityPolygon( entity ) {

	if ( entity.properties.avgheatexposuretobuilding && entity.polygon ) {

		entity.polygon.material = new Cesium.Color( 1, 1 - entity.properties.avgheatexposuretobuilding._value, 0, entity.properties.avgheatexposuretobuilding._value );

	} else {

		if ( entity.polygon ) {
			
			entity.polygon.material = new Cesium.Color( 0, 0, 0, 0 );

		}
	}

	this.hideNonSoteBuilding( entity );
	this.hideLowBuilding( entity );

}

/**
 * If hideNonSote switch is checked this function hides buildings based on value of c_kayttark
 *
 * @param { Object } entity Cesium entity
 */
 hideNonSoteBuilding( entity ) {

	const hideNonSote = document.getElementById( "hideNonSoteToggle" ).checked;

	if ( hideNonSote ) {
			   
		if ( !entity._properties.c_kayttark  || !entity._properties.c_kayttark._value ) {

			entity.show = false;

		} else {

			const kayttotark = Number( entity._properties.c_kayttark._value );

			if ( !kayttotark != 511 && !kayttotark != 131 && !( kayttotark > 212 && kayttotark < 240 ) ) {

				entity.show = false;
	
			}

		}
	
	}
}

/**
 * If hideLow switch is checked this function hides buildings based on their floor count
 *
 * @param { Object } entity Cesium entity
 */
 hideLowBuilding( entity ) {

	const hideLow = document.getElementById( "hideLowToggle" ).checked;

	if ( hideLow ) {
			   
		if ( !entity._properties.i_kerrlkm  || !entity._properties.i_kerrlkm._value ) {

			entity.show = false;

		} else {

			const floorCount = Number( entity._properties.i_kerrlkm._value );

			if ( floorCount < 7  ) {

				entity.show = false;
	
			}

		}
	
	}
	
}

 setHelsinkiBuildingsHeight( entities ) {

	for ( let i = 0; i < entities.length; i++ ) {

		let entity = entities[ i ];

		if ( entity.polygon ) {

			if ( entity.properties.measured_height ) {

				entity.polygon.extrudedHeight = entity.properties.measured_height._value;
	
			} else {
	
				if ( entity.properties.i_kerrlkm != null ) {
	
					entity.polygon.extrudedHeight = entity.properties.i_kerrlkm._value * 3.2;
		
				}
		
				if ( entity.properties.i_kerrlkm == null ) {
		
					entity.polygon.extrudedHeight = 2.7;
		
				}		
			}
		}
	}
}

async loadBuildings( postcode ) {

	let HKIBuildingURL;

	console.log( "postal code", Number( postcode ) )
    HKIBuildingURL = "https://kartta.hel.fi/ws/geoserver/avoindata/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=avoindata%3ARakennukset_alue_rekisteritiedot&outputFormat=application/json&srsName=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A4326&CQL_FILTER=postinumero%3D%27" + postcode + "%27";

	try {
	//	const value = await localforage.getItem( HKIBuildingURL );
		// This code runs once the value has been loaded
		// from the offline store.

	//	if ( value ) {
	//		console.log("found from cache");

	//		let datasource = JSON.parse( value )
	//		await this.findUrbanHeatData( datasource, postcode );

	//	} else {

			this.loadBuildingsWithoutCache( HKIBuildingURL, postcode );

	//	}
	  	
	} catch (err) {
		// This code runs if there were any errors.
		console.log(err);
	}

	if ( document.getElementById( "showTreesToggle" ).checked ) {
	
		loadTrees( postcode );

	}

}

async loadBuildingsWithoutCache(url, postcode) {
    console.log("Not in cache! Loading: " + url);
  
    try {
      const response = await fetch(url);
      const data = await response.json();
  
      await this.datasourceService.addDataSourceWithName(data, "Buildings");
      const entities = await this.urbanheatService.findUrbanHeatData(data, postcode);
  
      this.setHeatExposureToBuildings(entities);
      this.setHelsinkiBuildingsHeight(entities);
      
      return entities; // Return the processed entities or whatever you need here
    } catch (error) {
      console.error("Error loading buildings without cache:", error);
      return null; // Handle error case or return accordingly
    }
  }

/**
 * Finds building datasource and resets building entities polygon
 *
 */
resetBuildingEntites( ) {

	// Find the data source for buildings
	const buildingDataSource = datasourceService.getDataSourceByName( "Buildings" );

	// If the data source isn't found, exit the function
	if ( !buildingDataSource ) {
		return;
	}

	for ( let i = 0; i < buildingDataSource._entityCollection._entities._array.length; i++ ) {
        
		let entity = buildingDataSource._entityCollection._entities._array[ i ];


		entity.polygon.outlineColor = Cesium.Color.BLACK; 
		entity.polygon.outlineWidth = 3; 

		if ( entity._properties._avgheatexposuretobuilding && entity.polygon ) {

			entity.polygon.material = new Cesium.Color( 1, 1 - entity._properties._avgheatexposuretobuilding._value, 0, entity._properties._avgheatexposuretobuilding._value );
	
		} else {
	
			if ( entity.polygon ) {
				
				entity.polygon.material = new Cesium.Color( 0, 0, 0, 0 );
	
			}
		}

	}

}

}