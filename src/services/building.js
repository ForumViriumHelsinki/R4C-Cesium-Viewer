import * as Cesium from 'cesium';
import Datasource from './datasource.js'; 
import Urbanheat from './urbanheat.js'; 
import Tree from './tree.js'; 
import axios from 'axios';
import { useGlobalStore } from '../stores/globalStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import EventEmitter from './eventEmitter.js';

const backendURL = import.meta.env.VITE_BACKEND_URL;

export default class Building {
	constructor( ) {
		this.store = useGlobalStore();
		this.toggleStore = useToggleStore();
		this.propsStore = usePropsStore();
		this.viewer = this.store.cesiumViewer;
		this.datasourceService = new Datasource();
		this.treeService = new Tree();
		this.urbanheatService = new Urbanheat();
		this.eventEmitterService = new EventEmitter();
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
 * @param { Number } treeArea nearby tree area of building
 * @param { Number } avg_temp_c average surface temperature of building in Celsius
 */
	createBuildingCharts( buildingHeatExposure, treeArea, avg_temp_c, buildingProps ) {

		if ( this.store.view == 'helsinki' && this.toggleStore.showTrees ) {
    
			if ( treeArea ) {
				
				this.propsStore.setTreeArea( treeArea );
				this.eventEmitterService.emitBuildingTreeEvent( );    
	
			} else {
	
				this.eventEmitterService.emitBuildingTreeEvent( 0 );    
	
			}

		}

		if ( this.store.view == 'helsinki' ) {

			this.propsStore.setBuildingHeatExposure( buildingHeatExposure );
			this.eventEmitterService.emitBuildingHeatEvent( );    

		} else {

			if ( this.store.view == 'capitalRegion' ) {

				this.propsStore.setBuildingHeatExposure( avg_temp_c._value );

				if ( buildingProps.heat_timeseries ) {
				
					this.propsStore.setBuildingHeatTimeseries( buildingProps.heat_timeseries._value );

				}

 				this.eventEmitterService.emitBuildingHeatEvent( );    

			} else {

				this.propsStore.setGridBuildingProps( buildingProps );

				this.eventEmitterService.emitBuildingGridEvent( );
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

		const hideNonSote = this.toggleStore.hideNonSote;

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

		const hideLow = this.toggleStore.hideLow;

		if ( hideLow ) {

			if ( !entity._properties.i_kerrlkm  || !entity._properties.i_kerrlkm._value ) {

				entity.show = false;

			} else {

				const floorCount = Number( entity._properties.i_kerrlkm._value );

				if ( floorCount < 7 ) {

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

	async loadBuildings( ) {
		
		const url = 'https://kartta.hel.fi/ws/geoserver/avoindata/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=avoindata%3ARakennukset_alue_rekisteritiedot&outputFormat=application/json&srsName=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A4326&CQL_FILTER=postinumero%3D%27' + this.store.postalcode + '%27';

		try {
			const cacheApiUrl = `${backendURL}/api/cache/get?key=${encodeURIComponent( url )}`;
			const cachedResponse = await axios.get( cacheApiUrl );
			const cachedData = cachedResponse.data;
  
			if ( cachedData ) {
				console.log( 'found from cache' );

				const entities = await this.urbanheatService.findUrbanHeatData( cachedData );
				this.setHeatExposureToBuildings( entities );
				this.setHelsinkiBuildingsHeight( entities );
			
			} else {

				this.loadBuildingsWithoutCache( url );

			}

		} catch ( err ) {
		// This code runs if there were any errors.
			console.log( err );
		}

		if ( this.toggleStore.showTrees ) {
	
			this.treeService.loadTrees( );

		}

	}

	async loadBuildingsWithoutCache( url ) {
		console.log( 'Not in cache! Loading: ' + url );
  
		try {
			const response = await fetch( url );
			const data = await response.json();
			axios.post( `${backendURL}/api/cache/set`, { key: url, value: data } );

			const entities = await this.urbanheatService.findUrbanHeatData( data );
			this.setHeatExposureToBuildings( entities );
			this.setHelsinkiBuildingsHeight( entities );

			return entities; // Return the processed entities or whatever you need here
		} catch ( error ) {
			console.error( 'Error loading buildings without cache:', error );
			return null; // Handle error case or return accordingly
		}
	}

	/**
 * Finds building datasource and resets building entities polygon
 *
 */
	resetBuildingEntities() {

		// Find the data source for buildings
		const buildingDataSource = this.datasourceService.getDataSourceByName( 'Buildings ' + this.store.postalcode );

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

		const hideNewBuildings = this.toggleStore.hideNewBuildings;
		const hideNonSote = this.toggleStore.hideNonSote;
		const hideLow = this.toggleStore.hideLow;

		buildingsDataSource.entities.values.forEach( ( entity ) => {

			if ( hideNewBuildings ) {
				// Filter out buildings built before summer 2018
				const cutoffDate = new Date( '2018-06-01T00:00:00' ).getTime();
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
				this.soteBuildings( entity );

			}

			if ( hideLow ) {
				// Filter out buildings with fewer floors
				this.lowBuildings( entity );

			}

		} );

	}

	soteBuildings( entity ) {

		if ( this.store.view == 'helsinki' ) {

			const kayttotark = entity._properties._c_kayttark ? Number( entity._properties.c_kayttark._value ) : null;
			entity.show = kayttotark && ( kayttotark == 511 || kayttotark == 131 || ( kayttotark > 210 && kayttotark < 240 ) );

		} else {

			const kayttotark = entity._properties._kayttarks && entity._properties._kayttarks._value;
			entity.show = kayttotark == 'Yleinen rakennus';

		}

	}

	lowBuildings( entity ) {
		
		let property = this.store.view == 'helsinki' ? '_i_kerrlkm' : '_kerrosten_lkm';

		// Filter out buildings with fewer floors
		if ( entity._properties[ property ] ) {

			if ( entity._properties[ property ] && Number( entity._properties[ property ]._value ) <= 6 ) {

				entity.show = false;
    
			}
                
		} else {

			entity.show = false;
    
		}		
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
		const buildingDataSource = this.datasourceService.getDataSourceByName( 'Buildings ' + this.store.postalcode );

		// If the data source isn't found, exit the function
		if ( !buildingDataSource ) {
			return;
		}    const entities = buildingDataSource.entities.values;

		for ( let i = 0; i < entities.length; i++ ) {
			const entity = entities[i];

			if ( this.store.view == 'capitalRegion' ) {

				this.outlineByTemperature( entity, 'avg_temp_c', temps );

			} else {

				this.outlineByTemperature( entity, 'avgheatexposuretobuilding', temps );

			}

		}
	}

	resetBuildingOutline() {
	// Find the data source for buildings
		const buildingDataSource = this.datasourceService.getDataSourceByName( 'Buildings ' + this.store.postalcode );

		// If the data source isn't found, exit the function
		if ( !buildingDataSource ) {
			return;
		}    const entities = buildingDataSource.entities.values;

		for ( let i = 0; i < entities.length; i++ ) {
			const entity = entities[i];

			this.polygonOutlineToBlack( entity );
		}
	}

	outlineByTemperature( entity, property, values ) {

		if ( entity._properties[ property ] && values.includes( entity._properties[ property ]._value ) ) {

			this.polygonOutlineToBlue( entity );

		} else {

			this.polygonOutlineToBlack( entity );

		}

	}



	highlightBuildingInViewer( id ) {
	// Find the data source for buildings
		const buildingDataSource = this.datasourceService.getDataSourceByName( 'Buildings ' + this.store.postalcode );

		// If the data source isn't found, exit the function
		if ( !buildingDataSource ) {
			return;
		}    const entities = buildingDataSource.entities.values;

		for ( let i = 0; i < entities.length; i++ ) {
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
			this.store.setPickedEntity( entity );
			this.eventEmitterService.emitEntityPrintEvent( );

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