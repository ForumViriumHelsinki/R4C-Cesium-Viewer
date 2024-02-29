import * as Cesium from "cesium";
import Datasource from "./datasource.js"; 
import Urbanheat from "./urbanheat.js"; 
import Tree from "./tree.js"; 
import axios from 'axios';
import { useGlobalStore } from '../stores/globalStore.js';
import EventEmitter from "./eventEmitter.js"
import PrintBoxService from "./printbox.js"; 
const backendURL = import.meta.env.VITE_BACKEND_URL;

export default class Building {
  constructor( viewer ) {
    this.viewer = viewer;
    this.datasourceService = new Datasource( this.viewer );
	this.treeService = new Tree( this.viewer );
    this.urbanheatService = new Urbanheat( this.viewer );
	this.store = useGlobalStore( );
	this.eventEmitterService = new EventEmitter( );
	this.printBoxService = new PrintBoxService( this.viewer );
  }


/**
 * Set building entities heat exposure to original
 *
 * @param { Object } entities Cesium entities
 */
 removeNearbyTreeEffect( entities ) {

	for ( let i = 0; i < entities.length; i++ ) {

		let entity = entities[ i ];
		this.setBuildingEntityPolygon( entity );

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
 * Submits events for creating building charts
 *  
 * @param { Number } buildingHeatExposure building heat exposure index
 * @param { String } address address of the building
 * @param { String } postinumero postal code of the building
 * @param { Number } treeArea nearby tree area of building
 * @param { Number } avgTempC average surface temperature of building in Celsius
 */
createBuildingCharts( buildingHeatExposure, address, postinumero, treeArea, avgTempC, buildingProps  ) {

	if (   this.store.view == 'helsinki' && document.getElementById( "showTreesToggle" ).checked ) {
    
		if ( treeArea ) {

			this.eventEmitterService.emitBuildingTreeEvent( treeArea, address, postinumero );    
	
		} else {
	
			this.eventEmitterService.emitBuildingTreeEvent( 0, address, postinumero  );    
	
		}

	}

	if ( this.store.view == 'helsinki' ) {

		this.eventEmitterService.emitBuildingHeatEvent( buildingHeatExposure, address, postinumero );    

	} else {

		if ( this.store.view == 'capitalRegion' ) {

			this.eventEmitterService.emitBuildingHeatEvent( avgTempC._value, address, postinumero );    

		} else {

			this.eventEmitterService.emitBuildingGridEvent( buildingProps  );
		}

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

	if ( this.store.view == 'helsinki' ) {

		this.hideNonSoteBuilding( entity );
		this.hideLowBuilding( entity );

	} 
	
	if ( this.store.view == 'grid' ) {

		if ( !entity._properties._kayttarks  || entity._properties._kayttarks._value !== 'Asuinrakennus' ) {

			entity.show = false;

		}	
	}


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

	let url;

	console.log( "postal code", Number( postcode ) )
    url = "https://kartta.hel.fi/ws/geoserver/avoindata/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=avoindata%3ARakennukset_alue_rekisteritiedot&outputFormat=application/json&srsName=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A4326&CQL_FILTER=postinumero%3D%27" + postcode + "%27";

	try {
		const cacheApiUrl = `${backendURL}/api/cache/get?key=${encodeURIComponent(url)}`;
		const cachedResponse = await axios.get( cacheApiUrl );
		const cachedData = cachedResponse.data;
  
		if (cachedData) {
		  	console.log("found from cache");

			const entities = await this.urbanheatService.findUrbanHeatData( cachedData, postcode );
			this.setHeatExposureToBuildings(entities);
      	this.setHelsinkiBuildingsHeight(entities);
			
		} else {

			this.loadBuildingsWithoutCache( url, postcode );
			
		}
	  	
	} catch (err) {
		// This code runs if there were any errors.
		console.log(err);
	}

	if ( document.getElementById( "showTreesToggle" ).checked ) {
	
		this.treeService.loadTrees( postcode );

	}

}

async loadBuildingsWithoutCache(url, postcode) {
    console.log("Not in cache! Loading: " + url);
  
    try {
		const response = await fetch( url );
		const data = await response.json();
		axios.post( `${backendURL}/api/cache/set`, { key: url, value: data });

      	const entities = await this.urbanheatService.findUrbanHeatData( data, postcode );
  
      	this.setHeatExposureToBuildings( entities );
      	this.setHelsinkiBuildingsHeight( entities );
	  
      
      	return entities; // Return the processed entities or whatever you need here
    } catch ( error ) {
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
	const buildingDataSource = this.datasourceService.getDataSourceByName( "Buildings" );

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

/**
 * Filter buildings from the given data source based on UI toggle switches.
 * 
 */
 filterBuildings( buildingsDataSource ) {

        // If the data source isn't found, exit the function
    if ( !buildingsDataSource ) {
        return;
    }


    const hideNewBuildings = document.getElementById( "hideNewBuildingsToggle" ).checked;
    const hideNonSote = document.getElementById( "hideNonSoteToggle" ).checked;
    const hideLow = document.getElementById( "hideLowToggle" ).checked;

    buildingsDataSource.entities.values.forEach(( entity ) => {

        if ( hideNewBuildings ) {
            // Filter out buildings built before summer 2018
            const cutoffDate = new Date( "2018-06-01T00:00:00" ).getTime();
            if ( entity._properties._c_valmpvm && typeof entity._properties._c_valmpvm._value === 'string' ) {

                const c_valmpvm = new Date( entity._properties._c_valmpvm._value ).getTime();

                if ( c_valmpvm >= cutoffDate ) {

                    entity.show = false;

                }
            } else {

                entity.show = false;
    
            }
        }

        if ( hideNonSote ) {
            // Filter out non-SOTE buildings

            if ( entity._properties._c_kayttark ) {

                const kayttotark = Number( entity._properties.c_kayttark._value );

                if ( !kayttotark != 511 && !kayttotark != 131 && !( kayttotark > 212 && kayttotark < 240 ) ) {
    
                    entity.show = false;
        
                } 

            } else {

                entity.show = false;
    
            }
        }

        if ( hideLow ) {
            // Filter out buildings with fewer floors
            if ( entity._properties._i_kerrlkm ) {

                if ( entity._properties._i_kerrlkm && Number( entity._properties._i_kerrlkm._value ) <= 6 ) {

                    entity.show = false;
    
                }
                
            } else {

                entity.show = false;
    
            }
        }

    });

}
/**
* Shows all buildings and updates the histograms and scatter plot
*
*/
showAllBuildings( buildingsDataSource ) {
    // If the data source isn't found, exit the function
    if ( !buildingsDataSource ) {
        return;
    }

    // Iterate over all entities in data source
    for ( let i = 0; i < buildingsDataSource._entityCollection._entities._array.length; i++ ) {

        // Show the entity
        buildingsDataSource._entityCollection._entities._array[ i ].show = true;

    }

 
}

highlightBuildingsInViewer( temps ) {
	// Find the data source for buildings
	const buildingDataSource = this.datasourceService.getDataSourceByName( "Buildings" );

	// If the data source isn't found, exit the function
	if ( !buildingDataSource ) {
		return;
	}    const entities = buildingDataSource.entities.values;

    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];

		if ( this.store.view == 'capitalRegion' ) {

			this.outlineByTemperature( entity, 'avgTempC', temps );

		} else {

			this.outlineByTemperature( entity, 'avgheatexposuretobuilding', temps );

		}

    }
}

resetBuildingOutline( ) {
	// Find the data source for buildings
	const buildingDataSource = this.datasourceService.getDataSourceByName( "Buildings" );

	// If the data source isn't found, exit the function
	if ( !buildingDataSource ) {
		return;
	}    const entities = buildingDataSource.entities.values;

    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];

		this.polygonOutlineToBlack( entity );
    }
}

outlineByTemperature( entity, property, values ) {

    if ( entity._properties[ property ] && values.includes( entity._properties[ property ]._value)) {

		this.polygonOutlineToBlue( entity );

	} else {

		this.polygonOutlineToBlack( entity );

	}

}



highlightBuildingInViewer( id ) {
	// Find the data source for buildings
	const buildingDataSource = this.datasourceService.getDataSourceByName( "Buildings" );

	// If the data source isn't found, exit the function
	if ( !buildingDataSource ) {
		return;
	}    const entities = buildingDataSource.entities.values;

    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];

		if ( this.store.view == 'helsinki' ) {

			this.outlineById( entity, 'id', id );

		} else {

			this.outlineById( entity, 'kiitun', id );

		}
    }
}

outlineById( entity, property, id ) {

	if ( entity._properties[ property ] && entity._properties[ property ]._value === id ) {

		this.polygonOutlineToBlue( entity );
		this.printBoxService.printCesiumEntity( entity );

	} else {

		this.polygonOutlineToBlack( entity );

	}

}

polygonOutlineToBlue( entity ) {

	entity.polygon.outline = true;
	entity.polygon.outlineColor = Cesium.Color.BLUE;
	entity.polygon.outlineWidth = 20;

}

polygonOutlineToBlack( entity ) {

	entity.polygon.outlineColor = Cesium.Color.BLACK;
	entity.polygon.outlineWidth = 8;

}
}