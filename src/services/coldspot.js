import * as Cesium from 'cesium';
import { useGlobalStore } from '../stores/globalStore.js';


export default class ColdSpot {
	constructor( ) {
		this.store = useGlobalStore();
		this.viewer = this.store.cesiumViewer;
    }

    	addColdPoint( location ) {
    
		const coordinates = location.split( ',' ); 
    
		this.viewer.entities.add( {
			position: Cesium.Cartesian3.fromDegrees( Number( coordinates[ 1 ] ), Number( coordinates[ 0 ] ) ),
			name: 'coldpoint',
			point: {
				show: true, 
				color: Cesium.Color.ROYALBLUE, 
				pixelSize: 15, 
				outlineColor: Cesium.Color.LIGHTYELLOW, 
				outlineWidth: 5, 
			},
		} );
    
	}
}