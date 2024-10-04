import * as Cesium from 'cesium';
import { usePropsStore } from '../stores/propsStore';
import { useGlobalStore } from '../stores/globalStore';

export default class Wms {
	constructor() {

	}

	createHelsinkiImageryLayer( layerName ) {
		const provider = new Cesium.WebMapServiceImageryProvider( {
			url : 'https://kartta.hel.fi/ws/geoserver/avoindata/ows?SERVICE=WMS&',
			layers : layerName,
			proxy: new Cesium.DefaultProxy( '/proxy/' )
		} );
        
		return new Cesium.ImageryLayer( provider );
	}

	createHSYImageryLayer( layers ) {
		// Define the backend proxy URL
		const backendURL = import.meta.env.VITE_BACKEND_URL; // Ensure this is set correctly in your .env file

		// Construct the proxy URL with the full WMS request URL encoded as a query parameter
		const proxyUrl = `${backendURL}/wms/proxy`;

		// Use the proxy URL in the WebMapServiceImageryProvider
		const provider = new Cesium.WebMapServiceImageryProvider( {
			url: proxyUrl, // Point this to your backend proxy
			layers: layers ? layers : createLayersForHsyLandcover( )
		} );
    
		return new Cesium.ImageryLayer( provider );
	}

	reCreateHSYImageryLayer( layer ) {

		const store = useGlobalStore();

		store.cesiumViewer.imageryLayers.removeAll();
		store.cesiumViewer.imageryLayers.add(
			this.createHSYImageryLayer( layer )
		);		
	}

}

const createLayersForHsyLandcover = ( ) => {
	const store = usePropsStore();
	const year = store.hsyYear;
	const layerNames = [
		'asuminen_ja_maankaytto:maanpeite_avokalliot',
		'asuminen_ja_maankaytto:maanpeite_merialue',
		'asuminen_ja_maankaytto:maanpeite_muu_avoin_matala_kasvillisuus',
		'asuminen_ja_maankaytto:maanpeite_muu_vetta_lapaisematon_pinta',
		'asuminen_ja_maankaytto:maanpeite_paallystamaton_tie',
		'asuminen_ja_maankaytto:maanpeite_paallystetty_tie',
		'asuminen_ja_maankaytto:maanpeite_paljas_maa',
		'asuminen_ja_maankaytto:maanpeite_pellot',
		'asuminen_ja_maankaytto:maanpeite_puusto_10_15m',
		'asuminen_ja_maankaytto:maanpeite_puusto_15_20m',
		'asuminen_ja_maankaytto:maanpeite_puusto_2_10m',
		'asuminen_ja_maankaytto:maanpeite_puusto_yli20m',
		'asuminen_ja_maankaytto:maanpeite_vesi'
	];

	const layers = layerNames.map( name => `${ name }_${ year }` ).join( ',' );

	return layers;
};