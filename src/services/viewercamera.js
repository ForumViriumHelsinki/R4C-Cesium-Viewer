import * as Cesium from 'cesium';
import { useGlobalStore } from '../stores/globalStore.js';

export default class Viewercamera {
	constructor( ) {
		this.store = useGlobalStore();
		this.viewer = this.store.cesiumViewer;
	}

	flyCamera3D( lat, long , z ) {

		this.viewer.camera.flyTo( {
			destination: Cesium.Cartesian3.fromDegrees( lat, long , z ),
			orientation: {
				heading: 0.0,
				pitch: Cesium.Math.toRadians( -35.0 ),
				roll: 0.0
			},
			duration: 1
		} );
	}

	setCameraView( longitude,  latitude ) {

		this.viewer.camera.setView( {
			destination: Cesium.Cartesian3.fromDegrees( longitude, latitude - 0.0065, 500.0 ),
			orientation: {
				heading: 0.0,
				pitch: Cesium.Math.toRadians( -35.0 ),
				roll: 0.0
			}
		} );
	}
}