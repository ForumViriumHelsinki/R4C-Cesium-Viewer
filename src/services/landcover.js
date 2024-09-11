import { useGlobalStore } from '../stores/globalStore.js';
import WMS from './wms.js';
import { eventBus } from './eventEmitter.js';

export default class Landcover {
	constructor( ) {
		this.store = useGlobalStore();
		this.viewer = this.store.cesiumViewer;
		this.wmsService = new WMS();
	}

	addLandcover( ) {

	    this.viewer.imageryLayers.add(
			this.wmsService.createHSYImageryLayer( )
		);

		eventBus.emit( 'showLandcover' ); 

	}

	removeLandcover() {

		eventBus.emit( 'hideLandcover' ); 
		this.viewer.imageryLayers.removeAll();

		this.viewer.imageryLayers.add(
			this.wmsService.createHelsinkiImageryLayer( 'avoindata:Karttasarja_PKS' ) );  

	}    
}