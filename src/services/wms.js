import * as Cesium from 'cesium';
import { useURLStore } from '../stores/urlStore.js';

export default class Wms {
	constructor() {

	}

	createHelsinkiImageryLayer( layerName ) {
		const urlStore = useURLStore();
		const provider = new Cesium.WebMapServiceImageryProvider( {
			url : urlStore.helsinkiWMS,
			layers : layerName,
			proxy: new Cesium.DefaultProxy( '/proxy/' )
		} );
        
		return new Cesium.ImageryLayer( provider );
	}

}