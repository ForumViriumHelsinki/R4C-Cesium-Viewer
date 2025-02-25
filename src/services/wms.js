import * as Cesium from 'cesium';
import { usePropsStore } from '../stores/propsStore';

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

}