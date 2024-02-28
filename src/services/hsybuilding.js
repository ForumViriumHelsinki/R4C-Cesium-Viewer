import Datasource from "./datasource.js"; 
import Building from "./building.js"; 
import UrbanHeat from "./urbanheat.js"; 
import axios from 'axios';
import EventEmitter from "./eventEmitter.js"
import { useGlobalStore } from '../stores/globalStore.js';
const backendURL = import.meta.env.VITE_BACKEND_URL;

export default class HSYBuilding {
  constructor( viewer ) {
    this.viewer = viewer;
    this.datasourceService = new Datasource( this.viewer );
    this.buildingService = new Building( this.viewer );
    this.urbanHeatService = new UrbanHeat( this.viewer );
    this.eventEmitterService = new EventEmitter( );
	this.store = useGlobalStore( );

  }

async loadHSYBuildings( postcode ) {

	let url;

    url = "https://geo.fvh.fi/r4c/collections/hsy_buildings/items?f=json&limit=5000&postinumero=" + postcode;

	try {
		const cacheApiUrl = `${backendURL}/api/cache/get?key=${encodeURIComponent(url)}`;
		const cachedResponse = await axios.get( cacheApiUrl );
		const cachedData = cachedResponse.data;
  
		if (cachedData) {
		  	console.log("found from cache");

			await this.setAvgTempInCelsius( cachedData.features );
            let entities = await this.datasourceService.addDataSourceWithPolygonFix( cachedData, 'Buildings' );
			this.setHSYBuildingAttributes( cachedData, entities, postcode );
			
		} else {

			this.loadHSYBuildingsWithoutCache( url, postcode );
			
		}
	  	
	} catch (err) {
		// This code runs if there were any errors.
		console.log(err);
	}

	if ( document.getElementById( "showTreesToggle" ).checked ) {
	
		this.treeService.loadTrees( postcode );

	}

}

async loadHSYBuildingsWithoutCache(url, postcode) {
    console.log("Not in cache! Loading: " + url);
  
    try {
		const response = await fetch( url );
		const data = await response.json();

		if ( postcode ) {

			axios.post( `${backendURL}/api/cache/set`, { key: url, value: data });

		} else {

			await this.setGridAttributes( data.features );

		}

		await this.setAvgTempInCelsius( data.features );
        let entities = await this.datasourceService.addDataSourceWithPolygonFix(data, 'Buildings');
		this.setHSYBuildingAttributes( data, entities, postcode );
 

      	return entities; // Return the processed entities or whatever you need here
	
    } catch ( error ) {
      	console.error("Error loading buildings without cache:", error);
      	return null; // Handle error case or return accordingly
    }
  }


  async setGridAttributes( features ) {

	const gridProps = this.store.currentGridCell.properties;

	console.log("cell", this.store.currentGridCell)

	for ( let i = 0; i < features.length; i++ ) {

		let feature = features[ i ];
		const asukkaita = gridProps.asukkaita;
		feature.properties.pop_d_0_9 = ( gridProps.ika0_9 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_10_19 = ( gridProps.ika10_19 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_20_29 = ( gridProps.ika20_29 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_30_39 = ( gridProps.ika30_39 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_40_49  = ( gridProps.ika40_49 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_50_59 = ( gridProps.ika50_59 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_60_69 = ( gridProps.ika60_69 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_70_79 = ( gridProps.ika70_79 / asukkaita ).toFixed( 4 );
		feature.properties.pop_d_over80= ( gridProps.ika_yli80 / asukkaita ).toFixed( 4 );


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

async calculateHSYUrbanHeatData( data, entities, postcode ) {

    let urbanHeatData = this.urbanHeatService.calculateAverageExposure(data.features);

	const avgTempCList = data.features.map(feature => feature.properties.avgTempC);
    this.eventEmitterService.emitHeatHistogram( avgTempCList );
    this.eventEmitterService.emitHSYScatterPlotEvent( entities );
	this.eventEmitterService.emitSocioEconomicsEvent( postcode );

}

setHSYBuildingAttributes( data, entities, postcode ) {

	this.buildingService.setHeatExposureToBuildings(entities);
	this.setHSYBuildingsHeight(entities);

	if ( postcode ) {

		this.calculateHSYUrbanHeatData( data, entities, postcode );

	}

}

async setAvgTempInCelsius( features ) {


	for ( let i = 0; i < features.length; i++ ) {

		let feature = features[ i ];
		let normalizedIndex = feature.properties.avgheatexposuretobuilding;

		// Convert normalized index back to Kelvin
		let tempInKelvin = normalizedIndex * (this.store.maxKelvin - this.store.minKelvin) + this.store.minKelvin;

		// Convert Kelvin to Celsius
		feature.properties.avgTempC = tempInKelvin - 273.15;

	}
}
}