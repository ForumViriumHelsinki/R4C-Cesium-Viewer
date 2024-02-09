import Decoding from "./decoding.js";
import EventEmitter from "./eventEmitter.js"
import Datasource from "./datasource.js"; 
import { useGlobalStore } from '../stores/globalStore.js';

export default class Urbanheat {
  constructor( viewer ) {
	this.viewer = viewer;
    this.decodingService = new Decoding( );
    this.datasourceService = new Datasource( viewer );
    this.store = useGlobalStore( );
	this.eventEmitterService = new EventEmitter( );

  }

  /**
 * Sets attributes from API data source to building data source
 * 
 * Finds the purpose of a building in Helsinki based on code included in wfs source data
 * Code list: https://kartta.hel.fi/avoindata/dokumentit/Rakennusrekisteri_avoindata_metatiedot_20160601.pdf
 *
 * @param { Object } properties of a building
 * @param { Object } features Urban Heat Exposure buildings dataset
 */
setAttributesFromApiToBuilding ( properties, features ) {

    for ( let i = 0; i < features.length; i++ ) {

		// match building based on Helsinki id
        if ( properties.id == features[ i ].properties.hki_id ) {

			if ( features[ i ].properties.avgheatexposuretobuilding ) {

				properties.avgheatexposuretobuilding = features[ i ].properties.avgheatexposuretobuilding;

			}

			if ( features[ i ].properties.distancetounder40 ) {

				properties.distanceToUnder40 = features[ i ].properties.distancetounder40;

			}

			if ( features[ i ].properties.distancetounder40 ) {

				properties.locationUnder40 = features[ i ].properties.locationunder40;

			}

			if ( features[ i ].properties.year_of_construction ) {

				properties.year_of_construction = features[ i ].properties.year_of_construction;

			}

			if ( features[ i ].properties.measured_height ) {

				properties.measured_height = features[ i ].properties.measured_height;

			}

			if ( features[ i ].properties.roof_type ) {

				properties.roof_type = features[ i ].properties.roof_type;

			}

			if ( features[ i ].properties.area_m2 ) {

				properties.area_m2 = features[ i ].properties.area_m2;

			}

			if ( features[ i ].properties.roof_median_color ) {

				properties.roof_median_color = this.decodingService.getColorValue( features[ i ].properties.roof_median_color );

			}

			if ( features[ i ].properties.roof_mode_color ) {

				properties.roof_mode_color = this.decodingService.getColorValue( features[ i ].properties.roof_mode_color );

			}

            properties.kayttotarkoitus = this.decodingService.decodeKayttotarkoitusHKI( features[ i ].properties.c_kayttark );
			properties.c_julkisivu = this.decodingService.decodeFacade( properties.c_julkisivu );
			properties.c_rakeaine = this.decodingService.decodeMaterial( properties.c_rakeaine );
			properties.c_lammtapa = this.decodingService.decodeHeatingMethod( properties.c_lammtapa );
			properties.c_poltaine = this.decodingService.decodeHeatingSource( properties.c_poltaine );

			features.splice( i, 1 );
			break;
        }
    }
}

/**
 * Calculate average Urban Heat exposure to buildings in postal code area
 *
 * @param { Object } features buildings in postal code area
 */
calculateAverageExposure( features ) {

	let count = 0;
	let total = 0;
	let urbanHeatData = [ ];

	for ( let i = 0; i < features.length; i++ ) {

		if ( features[ i ].properties.avgheatexposuretobuilding ) {

			total = total + features[ i ].properties.avgheatexposuretobuilding;
			count++;
			urbanHeatData.push( features[ i ].properties.avgheatexposuretobuilding );

		}

	}

	if ( count != 0 ) {

		this.store.averageHeatExposure = total / count;

		return urbanHeatData;

	}
}

/**
 * Fetches heat exposure data from pygeoapi for postal code.
 * 
 * @param { object } data of buildings from city wfs
 * @param { String } postcode postal code of the area
 */
async findUrbanHeatData( data, postcode ) {

    try {
        const response = await fetch("https://geo.fvh.fi/r4c/collections/urban_heat_building/items?f=json&limit=2000&postinumero=" + postcode);
        const urbanheat = await response.json();
    
        for (let i = 0; i < data.features.length; i++) {
          let feature = data.features[i];
          this.setAttributesFromApiToBuilding(feature.properties, urbanheat.features);
        }
    
        this.addMissingHeatData(data.features, urbanheat.features);
        let urbanHeatData = this.calculateAverageExposure(data.features);
		let entites = await this.datasourceService.addDataSourceWithPolygonFix(data, 'Buildings');
		this.eventEmitterService.emitPostalCodeEvents( urbanHeatData, entites );

		if ( postcode._value !== '00230' ) {

			this.eventEmitterService.emitSocioEconomicsEvent( postcode );

		}

		return entites;

      } catch (error) {
        console.error("Error finding urban heat data:", error);
        return null; // Handle error case or return accordingly
      }

}

/**
 * Adds urban heat exposure data that did not match in previous phase.
 * 
 * @param { object } features the buildings from city wfs
 * @param { object } heat urban heat exposure data from pygeoapi
 */
addMissingHeatData( features, heat ) {

	for ( let i = 0; i < heat.length; i++ ) {
	
		features.push( heat[ i ] );

	}

}

/**
 * The function adds heat exposure data for given category value. 
 *
 * @param { String } valeu value of category
 * @param { object } features dataset that contains building heat exposure and attributes of the building
 * @param { String } categorical name of categorical attribute
 * @param { String } numerical name of numerical attribute
 * @return { object } Object that contains list of heat exposures and numerical values, and average heat exposure
 */
addHeatForLabelAndX( value, features, categorical, numerical ) {

	let heatList = [ ];
	let numericalList = [ ];
	let average = 0;
	let sum = 0;

	for ( let i = 0; i < features.length; i++ ) {

		if ( features[ i ][ categorical ] == value ) {

			heatList.push( features[ i ].heat );
			numericalList.push( features[ i ][ numerical ] );
			sum = sum + features[ i ].heat;

		}
	
	}
	
	// calculate average heat exposure
	average = sum / heatList.length;

	return [ heatList, numericalList, average ];

}

/**
 * The function finds all unique values for given category.
 *
 * @param { object } features dataset that contains building heat exposure and attributes of the building
 * @param { String } category value code for facade material
 * @return { Array<String> } List containing all unique values for the category
 */
createUniqueValuesList( features, category ) {

	let uniqueValues = [ ];
	
	for ( let i = 0; i < features.length; i++ ) {

		let value = features[ i ][ category ] 

		if ( !uniqueValues.includes( value ) ) {

			uniqueValues.push( value );

		}
	
	}
	
	return uniqueValues;

}
}