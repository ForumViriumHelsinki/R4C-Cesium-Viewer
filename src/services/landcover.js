import { useGlobalStore } from '../stores/globalStore.js';
import WMS from './wms.js';
import EventEmitter from './eventEmitter.js';
import Plot from './plot.js';

export default class Landcover {
	constructor( ) {
		this.store = useGlobalStore();
		this.viewer = this.store.cesiumViewer;
		this.wmsService = new WMS();
	}

	addLandcover() {

	    this.viewer.imageryLayers.add(
			this.wmsService.createHSYImageryLayer()
		);

		this.viewer.imageryLayers.remove( 'avoindata:Karttasarja_PKS', true );
        this.emitLandcoverEvent();

	}

    emitLandcoverEvent() {

        const eventEmitterService = new EventEmitter();
		eventEmitterService.emitPieChartEvent( );  
    }

	removeLandcover() {

        const plotService = new Plot();
		plotService.toggleLandCoverChart( 'hidden' );
		this.viewer.imageryLayers.removeAll();

		this.viewer.imageryLayers.add(
			this.wmsService.createHelsinkiImageryLayer( 'avoindata:Karttasarja_PKS' ) );  

	}    
}