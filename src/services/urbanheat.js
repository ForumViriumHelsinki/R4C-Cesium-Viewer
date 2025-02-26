import Decoding from './decoding.js';
import Datasource from './datasource.js'; 
import { useGlobalStore } from '../stores/globalStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import { useBuildingStore } from '../stores/buildingStore.js';
import { useURLStore } from '../stores/urlStore.js';

export default class Urbanheat {
	constructor( ) {
		this.store = useGlobalStore();
		this.viewer = this.store.cesiumViewer;
		this.datasourceService = new Datasource( );
        this.urlStore = useURLStore();
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
		let heatTimeseries = [ ];
		const toggleStore = useGlobalStore();
		const inHelsinki = toggleStore.helsinkiView;
		const targetDate = this.store.heatDataDate;

		for ( let i = 0; i < features.length; i++ ) {

			if ( !inHelsinki ) {

				if ( features[ i ].properties.heat_timeseries ) {

        			const properties = features[i].properties;
        			const heatTimeseriesValue = properties.heat_timeseries || null;
        			const heatExposureValue = inHelsinki 
            			? properties.avgheatexposuretobuilding 
            			: heatTimeseriesValue?.find(({ date }) => date === targetDate)?.avgheatexposure;

        			if ( heatExposureValue ) {

            			total += heatExposureValue;
            			count++;
            			urbanHeatData.push(heatExposureValue);

        			}

        			if ( heatTimeseriesValue)  {

            			filterHeatTimeseries(properties);
            			heatTimeseries.push(heatTimeseriesValue);

        			}
				}
			}
		}

		if ( count != 0 ) {

			this.store.setAverageHeatExposure( total / count );

			return [ urbanHeatData, heatTimeseries ];

		}
	}

	setPropertiesAndCreateCharts( entities, features ) {

		const propsStore = usePropsStore();
		const heatData = this.calculateAverageExposure( features );
		propsStore.setHeatHistogramData( heatData[ 0 ] );
		propsStore.setScatterPlotEntities( entities );

	}

	/**
 * Fetches heat exposure data from pygeoapi for postal code.
 * 
 * @param { object } data of buildings from city wfs
 */
	async findUrbanHeatData( data ) {

		const buildingStore = useBuildingStore();
		const postcode = this.store.postalcode;
		buildingStore.setBuildingFeatures( data );

		try {
			const response = await fetch( this.urlStore.urbanHeatHelsinki( postcode ) );
			const urbanheat = await response.json();

			for ( let i = 0; i < data.features.length; i++ ) {
				let feature = data.features[ i ];
				setAttributesFromApiToBuilding( feature.properties, urbanheat.features );
			}
    
			addMissingHeatData( data.features, urbanheat.features );
			let entities = await this.datasourceService.addDataSourceWithPolygonFix( data, 'Buildings ' + postcode );
			this.setPropertiesAndCreateCharts( entities, data.features );

			return entities;

		} catch ( error ) {
			console.error( 'Error finding urban heat data:', error );
			return null; // Handle error case or return accordingly
		}

	}

}

/**
 * Adds urban heat exposure data that did not match in previous phase.
 * 
 * @param { object } features the buildings from city wfs
 * @param { object } heat urban heat exposure data from pygeoapi
 */

const addMissingHeatData = ( features, heat ) => {

	for ( let i = 0; i < heat.length; i++ ) {
	
		features.push( heat[ i ] );

	}

};

/**
 * Sets attributes from API data source to building data source
 * 
 * Finds the purpose of a building in Helsinki based on code included in wfs source data
 * Code list: https://kartta.hel.fi/avoindata/dokumentit/Rakennusrekisteri_avoindata_metatiedot_20160601.pdf
 *
 * @param { Object } properties of a building
 * @param { Object } features Urban Heat Exposure buildings dataset
 */
const setAttributesFromApiToBuilding = ( properties, features ) => {

	const decodingService = new Decoding();

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

				properties.roof_median_color = decodingService.getColorValue( features[ i ].properties.roof_median_color );

			}

			if ( features[ i ].properties.roof_mode_color ) {

				properties.roof_mode_color = decodingService.getColorValue( features[ i ].properties.roof_mode_color );

			}

			properties.kayttotarkoitus = decodingService.decodeKayttotarkoitusHKI( features[ i ].properties.c_kayttark );
			properties.c_julkisivu = decodingService.decodeFacade( properties.c_julkisivu );
			properties.c_rakeaine = decodingService.decodeMaterial( properties.c_rakeaine );
			properties.c_lammtapa = decodingService.decodeHeatingMethod( properties.c_lammtapa );
			properties.c_poltaine = decodingService.decodeHeatingSource( properties.c_poltaine );

			features.splice( i, 1 );
			break;
		}
	}
};

const filterHeatTimeseries = ( buildingProps ) => {

  if ( buildingProps.kavu && typeof buildingProps.kavu === 'number' && buildingProps.kavu > 2015 ) {
    const cutoffYear = buildingProps.kavu;
    buildingProps.heat_timeseries = buildingProps.heat_timeseries.filter(entry => {
      const entryYear = new Date(entry.date).getFullYear();
      return entryYear >= cutoffYear;
    });
  }
}
