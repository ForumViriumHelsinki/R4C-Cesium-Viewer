import * as Cesium from 'cesium';
import Datasource from './datasource.js'; 
import Building from './building.js';
import Plot from './plot.js';
import Traveltime from './traveltime.js';
import HSYBuilding from './hsybuilding.js';
import { findAddressForBuilding } from './address.js';
import ElementsDisplay from './elementsDisplay.js';
import { useGlobalStore } from '../stores/globalStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import Helsinki from './helsinki.js';
import CapitalRegion from './capitalRegion.js';
import Sensor from './sensor.js';
import Camera from './camera.js';
import ColdArea from './coldarea.js';
import { eventBus } from '../services/eventEmitter.js';

export default class FeaturePicker {
	constructor( ) {
		this.store = useGlobalStore();
		this.toggleStore = useToggleStore();
		this.propStore = usePropsStore();
		this.viewer = this.store.cesiumViewer;
		this.datasourceService = new Datasource();
		this.buildingService = new Building();
		this.helsinkiService = new Helsinki();
		this.capitalRegionService = new CapitalRegion();
		this.sensorService = new Sensor();
		this.buildingService = new Building();
		this.plotService = new Plot();
		this.traveltimeService = new Traveltime();
		this.hSYBuildingService = new HSYBuilding();
		this.elementsDisplayService = new ElementsDisplay();
		this.cameraService = new Camera();
		this.coldAreaService = new ColdArea();

	}
  
	/**
    * Processes the click event on the viewer
    * 
    * @param {Cesium.Viewer} viewer - The Cesium viewer object
    * @param {MouseEvent} event - The click event
    */
	processClick( event ) {
		console.log( 'Clicked at ' + String( event.x ) + ', ' + String( event.y ) );
		this.pickEntity( new Cesium.Cartesian2( event.x, event.y ) );
	}    
    
	/**
    * Picks the entity at the given window position in the viewer
    * 
    * @param { String } viewer - The Cesium viewer object
    * @param { String } windowPosition - The window position to pick the entity
    */
	pickEntity( windowPosition ) {
		let picked = this.viewer.scene.pick( windowPosition );
       
		if ( picked ) {
           
			let id = Cesium.defaultValue( picked.id, picked.primitive.id );
           
			if ( picked.id._polygon ) {
               
				if ( id instanceof Cesium.Entity ) {

					this.store.setPickedEntity( id );
					eventBus.emit( 'entityPrintEvent' );
                   
				}
               
				if ( picked.id.properties ) {
   
					this.handleFeatureWithProperties( picked.id );
                   
				}
			}
		}
	}
  
	async loadPostalCode() {

		this.setNameOfZone();
		this.elementsDisplayService.setSwitchViewElementsDisplay( 'inline-block' );    
		this.datasourceService.removeDataSourcesAndEntities();

		if ( !this.toggleStore.helsinkiView ) {

		//	this.elementsDisplayService.setHelsinkiElementsDisplay( 'none' );
		//	this.elementsDisplayService.setCapitalRegionElementsDisplay( 'inline-block' );
			await this.capitalRegionService.loadCapitalRegionElements();

		} else {
        
			this.helsinkiService.loadHelsinkiElements();
    
		}

		this.store.setLevel( 'postalCode' );

  
	}

	setNameOfZone() {
		
		const entitiesArray = this.propStore.postalCodeData ._entityCollection?._entities._array;

if (Array.isArray(entitiesArray)) {
  for (let i = 0; i < entitiesArray.length; i++) {
    const entity = entitiesArray[i];
    if (entity && entity._properties && entity._properties._nimi && typeof entity._properties._nimi._value !== 'undefined' && entity._properties._posno._value === this.store.postalcode) {
      this.store.setNameOfZone(entity._properties._nimi);
      break; // Exit the loop after finding the first match
    }
  }
}

	}
    
	handleBuildingFeature( properties ) {

		this.store.setLevel( 'building' );
		this.store.setPostalCode( properties._postinumero._value );
		this.toggleStore.helsinkiView ? eventBus.emit( 'hideHelsinki' ) : eventBus.emit( 'hideCapitalRegion' );
		eventBus.emit( 'showBuilding' );
		this.elementsDisplayService.setBuildingDisplay( 'none' );
		this.buildingService.resetBuildingOutline();
		this.buildingService.createBuildingCharts( properties.treeArea, properties._avg_temp_c, properties );

	}

	removeEntityByName( name ) {

		this.viewer.entities._entities._array.forEach( ( entity ) => {

			if ( entity.name === name ) {

				this.viewer.entities.remove( entity );

			}
		} );
	}
    
	/**
     * Handles the feature with properties
     * 
     * @param {Object} id - The ID of the picked entity
     */
	handleFeatureWithProperties( id ) {       
        
		this.removeEntityByName( 'coldpoint' );
		this.removeEntityByName( 'currentLocation' );
		this.datasourceService.removeDataSourcesByNamePrefix( 'TravelLabel' );

		this.propStore.setTreeArea( null );
		this.propStore.setHeatFloodVulnerability( id.properties ?? null );

		if ( id.properties.grid_id ) {
			this.propStore.setHeatFloodVulnerability( id.properties );
			eventBus.emit( 'createHeatFloodVulnerabilityChart' );
		}
    
		//If we find postal code, we assume this is an area & zoom in AND load the buildings for it.
		if ( id.properties.posno && this.store.level != 'building' ) {
            
			this.store.setPostalCode( id.properties.posno._value );
			this.cameraService.switchTo3DView();
			this.elementsDisplayService.setViewDisplay( 'none' );
			this.loadPostalCode();
    
		}
    
		if ( id.properties.asukkaita ) {
    

			const boundingBox = this.getBoundingBox( id );
			this.store.setCurrentGridCell( id );

			// Construct the URL for the WFS request with the bounding box
			if ( boundingBox ) {
				const bboxString = `${boundingBox.minLon},${boundingBox.minLat},${boundingBox.maxLon},${boundingBox.maxLat}`;
            
				// Replace 'postinumero' parameter with 'bbox' in your WFS request URL
				const Url = `/pygeoapi/collections/hsy_buildings/items?f=json&limit=2000&bbox=${bboxString}`;
            
				console.log( Url );
				// Now you can use this URL to make your WFS request
				this.hSYBuildingService.loadHSYBuildings( Url );	

			}

			//createDiagramForPopulationGrid( id.properties.index, id.properties.asukkaita );
    
		}
    
		if ( !id.properties.posno && id.entityCollection._entities._array[ 0 ]._properties._id && id.entityCollection._entities._array[ 0 ]._properties._id._value == 5879932 ) {
    
			this.traveltimeService.loadTravelTimeData( id.properties.id._value );
			this.traveltimeService.markCurrentLocation( id );
    
		}
    
		//See if we can find building floor areas
		if ( id.properties._avgheatexposuretobuilding ) {

			this.store.setBuildingAddress( findAddressForBuilding( id.properties ) );
    
			if ( id.properties._locationUnder40 ) {

				if ( id.properties._locationUnder40._value ) {

					this.coldAreaService.addColdPoint( id.properties._locationUnder40._value );

				}
    
			}

			this.handleBuildingFeature( id.properties );
    
		}
    
	}

	getBoundingBox( id ) {

		// Assuming `entity` is your Cesium Entity
		let boundingBox = null;

		if ( id.polygon ) {
			// Access the hierarchy of the polygon to get the positions
			const hierarchy = id.polygon.hierarchy.getValue();

			// Cesium entities may have positions defined in various ways; this example assumes a simple polygon
			if ( hierarchy ) {
				const positions = hierarchy.positions;

				// Convert positions to Cartographic to get longitude and latitude
				const cartographics = positions.map( position => Cesium.Cartographic.fromCartesian( position ) );
        
				// Find the minimum and maximum longitude and latitude
				let minLon = Number.POSITIVE_INFINITY, maxLon = Number.NEGATIVE_INFINITY;
				let minLat = Number.POSITIVE_INFINITY, maxLat = Number.NEGATIVE_INFINITY;

				cartographics.forEach( cartographic => {
					minLon = Math.min( minLon, cartographic.longitude );
					maxLon = Math.max( maxLon, cartographic.longitude );
					minLat = Math.min( minLat, cartographic.latitude );
					maxLat = Math.max( maxLat, cartographic.latitude );
				} );

				// Convert back to degrees
				minLon = Cesium.Math.toDegrees( minLon );
				maxLon = Cesium.Math.toDegrees( maxLon );
				minLat = Cesium.Math.toDegrees( minLat );
				maxLat = Cesium.Math.toDegrees( maxLat );

				// Now you have the bounding box corners
				boundingBox = {
					minLon: minLon,
					maxLon: maxLon,
					minLat: minLat,
					maxLat: maxLat
				};

				id.show = false;
			}
		}

		return boundingBox;

	}
}
