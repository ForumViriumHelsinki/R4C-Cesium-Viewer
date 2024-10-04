import Datasource from './datasource.js'; 
import Building from './building.js'; 
import UrbanHeat from './urbanheat.js'; 
import axios from 'axios';
import { eventBus } from './eventEmitter.js';
import { useGlobalStore } from '../stores/globalStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import * as turf from '@turf/turf';
import * as Cesium from 'cesium';
import { useToggleStore } from '../stores/toggleStore.js';
import { useBuildingStore } from '../stores/buildingStore.js';

const backendURL = import.meta.env.VITE_BACKEND_URL;

export default class HSYBuilding {
	constructor( ) {
		this.store = useGlobalStore();
		this.viewer = this.store.cesiumViewer;
		this.datasourceService = new Datasource();
		this.buildingService = new Building();
		this.urbanHeatService = new UrbanHeat();
	}

	async loadHSYBuildings( ) {

		const url = '/pygeoapi/collections/hsy_buildings/items?f=json&limit=5000&postinumero=' + this.store.postalcode;

		console.log( 'url',url );

		try {
			const cacheApiUrl = `${backendURL}/api/cache/get?key=${encodeURIComponent( url )}`;
			const cachedResponse = await axios.get( cacheApiUrl );
			const cachedData = cachedResponse.data;
  
			if ( cachedData ) {
				console.log( 'found from cache' );

				let entities = await this.datasourceService.addDataSourceWithPolygonFix( cachedData, 'Buildings ' + this.store.postalcode );
				this.setHSYBuildingAttributes( cachedData, entities );
			
			} else {

				this.loadHSYBuildingsWithoutCache( url );
			
			}

		} catch ( err ) {
		// This code runs if there were any errors.
			console.log( err );
		}

	}

	async loadHSYBuildingsWithoutCache( url ) {
		console.log( 'Not in cache! Loading: ' + url );
  
		try {
			const response = await fetch( url );
			const data = await response.json();

			if ( this.store.postalcode ) {

				axios.post( `${backendURL}/api/cache/set`, { key: url, value: data } );

			} else {

				await this.setGridAttributes( data.features );

			}

			let entities = await this.datasourceService.addDataSourceWithPolygonFix( data, 'Buildings ' + this.store.postalcode );
			this.setHSYBuildingAttributes( data, entities );
			return entities; // Return the processed entities or whatever you need here
	
		} catch ( error ) {
			console.error( 'Error loading buildings without cache:', error );
			return null; // Handle error case or return accordingly
		}
	}

	createGeoJsonPolygon() {
	// Assuming the entity is a polygon and you are using Cesium's PolygonHierarchy
		const cesiumPolygon = this.store.currentGridCell.polygon.hierarchy.getValue( Cesium.JulianDate.now() );

		const geoJsonPolygon = {
			type: 'Feature',
			properties: {},
			geometry: {
				type: 'Polygon',
				// Ensure coordinates are in Longitude, Latitude order for GeoJSON
				coordinates: [ cesiumPolygon.positions.map( cartesian => {
					const cartographic = Cesium.Cartographic.fromCartesian( cartesian );
					const longitude = Cesium.Math.toDegrees( cartographic.longitude );
					const latitude = Cesium.Math.toDegrees( cartographic.latitude );
					return [ longitude, latitude ];
				} ) ]
			}
		};

		return geoJsonPolygon;

	}

	setInitialAttributesForIntersectingBuilding( feature, weight, cellProps ) {

		const asukkaita = cellProps.asukkaita;
		feature.properties.pop_d_0_9 = weight * ( cellProps.ika0_9 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_10_19 = weight * ( cellProps.ika10_19 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_20_29 = weight * ( cellProps.ika20_29 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_30_39 = weight * ( cellProps.ika30_39 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_40_49  = weight * ( cellProps.ika40_49 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_50_59 = weight * ( cellProps.ika50_59 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_60_69 =  weight * ( cellProps.ika60_69 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_70_79 = weight * ( cellProps.ika70_79 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_over80 = weight *( cellProps.ika_yli80 / asukkaita ).toFixed( 4 );
	}

	approximateOtherAttributesForIntersectingBuilding( feature, weight, gridProps ) {

		for ( let i = 0; i < gridProps.length; i++ ) {

			const asukkaita = gridProps[ i ].asukkaita;
			feature.properties.pop_d_0_9 =  feature.properties.pop_d_0_9 + weight * ( gridProps[ i ].ika0_9 / asukkaita ).toFixed( 4 );
			feature.properties.pop_d_10_19 = feature.properties.pop_d_10_19 + weight * ( gridProps[ i ].ika10_19 / asukkaita ).toFixed( 4 );
			feature.properties.pop_d_20_29 = feature.properties.pop_d_20_29 + weight * ( gridProps[ i ].ika20_29 / asukkaita ).toFixed( 4 );
			feature.properties.pop_d_30_39 = feature.properties.pop_d_30_39 + weight * ( gridProps[ i ].ika30_39 / asukkaita ).toFixed( 4 );
			feature.properties.pop_d_40_49  = feature.properties.pop_d_40_49 + weight * ( gridProps[ i ].ika40_49 / asukkaita ).toFixed( 4 );
			feature.properties.pop_d_50_59 = feature.properties.pop_d_50_59 + weight * ( gridProps[ i ].ika50_59 / asukkaita ).toFixed( 4 );
			feature.properties.pop_d_60_69 =  feature.properties.pop_d_60_69 + weight * ( gridProps[ i ].ika60_69 / asukkaita ).toFixed( 4 );
			feature.properties.pop_d_70_79 = feature.properties.pop_d_70_79 + weight * ( gridProps[ i ].ika70_79 / asukkaita ).toFixed( 4 );
			feature.properties.pop_d_over80 = feature.properties.pop_d_over80 + weight *( gridProps[ i ].ika_yli80 / asukkaita ).toFixed( 4 );

		}

	}

	approximateAttributesForIntersectingBuildings( feature ) {

		const cellProps = this.store.currentGridCell.properties;
		// Assuming `feature` is your GeoJSON feature
		const featureBBox = turf.bbox( feature ); // Get the bounding box of the feature
		const bboxPolygon = turf.bboxPolygon( featureBBox ); // Convert the bbox to a polygon for intersection checks
		let gridProps = [];

		// Access the Cesium DataSource by name
		const populationGridDataSource = this.datasourceService.getDataSourceByName( 'PopulationGrid' );
		const entities = populationGridDataSource.entities.values;

		for ( let i = 0; i < entities.length; i++ ) {
			const entity = entities[i];

			if ( entity.properties._index._value !== cellProps._index._value ) {
				// Convert Cesium entity to GeoJSON for the intersection check
				const entityGeoJson = this.entityToGeoJson( entity ); // Implement this function based on entity type
        
				if ( turf.booleanIntersects( bboxPolygon, entityGeoJson ) ) {
					gridProps.push( entityGeoJson.properties );
				}

			} 

		}

		const weight = this.getWeight( gridProps.length );
		this.setInitialAttributesForIntersectingBuilding( feature, weight, cellProps );
		this.approximateOtherAttributesForIntersectingBuilding( feature, weight, gridProps );

	}

	setGridAttributesForWithinBuilding ( feature ) {

		const cellProps = this.store.currentGridCell.properties;
		const asukkaita = cellProps.asukkaita;
		feature.properties.pop_d_0_9 = ( cellProps.ika0_9 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_10_19 = ( cellProps.ika10_19 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_20_29 = ( cellProps.ika20_29 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_30_39 = ( cellProps.ika30_39 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_40_49  = ( cellProps.ika40_49 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_50_59 = ( cellProps.ika50_59 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_60_69 = ( cellProps.ika60_69 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_70_79 = ( cellProps.ika70_79 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_over80= ( cellProps.ika_yli80 / asukkaita ).toFixed( 4 );

	}


	async setGridAttributes( features ) {

		const geoJsonPolygon = this.createGeoJsonPolygon();

		for ( let i = 0; i < features.length; i++ ) {

			let feature = features[ i ];
			const isWithin = turf.booleanWithin( feature, geoJsonPolygon );

			if ( isWithin ) {

				this.setGridAttributesForWithinBuilding ( feature );

			} else {

				this.approximateAttributesForIntersectingBuildings( feature );
			
			}
		}
	}

	getWeight( length ) {

		switch ( length ) {
		case 0:
			return 1; 
		case 1:
			return 1/2;  
		case 2:
			return 1/3;     
		case 3:
			return 1/4;                                                                                                                                                                       
		}
	}

	entityToGeoJson( entity ) {
		if ( entity.polygon && entity.polygon.hierarchy ) {
			const positions = entity.polygon.hierarchy.getValue( Cesium.JulianDate.now() ).positions;
			const coordinates = positions.map( position => {
				const cartographic = Cesium.Cartographic.fromCartesian( position );
				const longitude = Cesium.Math.toDegrees( cartographic.longitude );
				const latitude = Cesium.Math.toDegrees( cartographic.latitude );
				return [ longitude, latitude ];
			} );
        
			// Ensure the polygon is closed by repeating the first coordinate at the end
			if ( coordinates.length > 0 && ( coordinates[0][0] !== coordinates[coordinates.length - 1][0] || coordinates[0][1] !== coordinates[coordinates.length - 1][1] ) ) {
				coordinates.push( coordinates[0] );
			}
        
			return {
				type: 'Feature',
				properties: entity.properties, // Add any relevant properties here
				geometry: {
					type: 'Polygon',
					coordinates: [ coordinates ] // Note: GeoJSON polygons expect an array of rings where the first ring is the exterior ring and any additional rings are interior holes.
				}
			};
		}
	}

	setHSYBuildingsHeight( entities ) {

		for ( let i = 0; i < entities.length; i++ ) {

			let entity = entities[ i ];

			if ( entity.polygon ) {
	
				if ( entity.properties.kerrosten_lkm != null && entity.properties.kerrosten_lkm._value < 999 ) {
	
					entity.polygon.extrudedHeight = entity.properties.kerrosten_lkm._value * 3.2;
		
				} else {

					entity.polygon.extrudedHeight = 2.7;
  
				}		
			
			}
		}
	}

	async calculateHSYUrbanHeatData( data, entities ) {

		const heatExposureData = this.urbanHeatService.calculateAverageExposure( data.features );
  		// Set the target date
  		const targetDate = '2021-02-18';

  		// Initialize avg_temp_cList
  		let avg_temp_cList = [];
  		const toggleStore = useToggleStore();

  	if ( toggleStore.capitalRegionCold ) {
			// If capitalRegionCold is true, map through entities and extract avg_temp_c based on heat_timeseries
			avg_temp_cList = entities
				.map( entity => {
					const heatTimeseries = entity.properties.heat_timeseries?._value || [];
					const foundEntry = heatTimeseries.find( ( { date } ) => date === targetDate );
					return foundEntry ? foundEntry.avg_temp_c : null;  // Handle case where no entry is found
				} )
				.filter( temp => temp != null );  // Filter out null or undefined values
		} else {
			// Otherwise, extract avg_temp_c directly from data features
			avg_temp_cList = data.features.map( feature => feature.properties.avg_temp_c );
		}

		setBuildingPropsAndEmitEvent( entities, heatExposureData, avg_temp_cList, data );

	}

	setHSYBuildingAttributes( data, entities ) {

		this.buildingService.setHeatExposureToBuildings( entities );
		this.setHSYBuildingsHeight( entities );
		this.store.postalcode && this.calculateHSYUrbanHeatData( data, entities );

	}

	/**
 * If hideNonSote switch is checked this function hides buildings based on value of c_kayttark
 *
 * @param { Object } entity Cesium entity
 */
	hideNonSoteBuilding( entity ) {

		const hideNonSote = this.toggleStore.hideNonSote;

		if ( hideNonSote ) {

			if ( !entity._properties.kayttarks || !entity._properties.kayttarks._value ) {

				entity.show = false;

			} else {

				const kayttotark = entity._properties.kayttarks._value;

				if ( !kayttotark != 'Yleinen rakennus' ) {

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

			if ( !entity._properties.kerrosten_lkm  || !entity._properties.kerrosten_lkm._value ) {

				entity.show = false;

			} else {

				const floorCount = Number( entity._properties.kerrosten_lkm._value );

				if ( floorCount < 7 ) {

					entity.show = false;
	
				}

			}
	
		}
	
	}
}

const setBuildingPropsAndEmitEvent = ( entities, heatExposureData, avg_temp_cList, data ) => {

	const propsStore = usePropsStore( );
	propsStore.setScatterPlotEntities( entities );
	propsStore.setPostalcodeHeatTimeseries( heatExposureData[ 1 ] );
	propsStore.setHeatHistogramData( avg_temp_cList );
	const buildingStore = useBuildingStore();
	buildingStore.setBuildingFeatures( data );
	eventBus.emit( 'showCapitalRegion' );

};
