import * as Cesium from 'cesium';
import { useGlobalStore } from '../stores/globalStore.js';

export default class Camera {
	constructor( ) {
		this.store = useGlobalStore();
		this.viewer = this.store.cesiumViewer;
		this.isRotated = false;  // Keep track of rotation state
	}

	init() {
		this.viewer.camera.setView( {
			destination: Cesium.Cartesian3.fromDegrees( 24.931745, 60.190464, 35000 ),
			orientation: {
				heading: Cesium.Math.toRadians( 0.0 ),
				pitch: Cesium.Math.toRadians( -85.0 ),
				roll: 0.0,
			},
		} );
	}

	// Function to switch to 2D view
	switchTo2DView() {

		// Find the data source for postcodes
		const postCodesDataSource = this.viewer.dataSources._dataSources.find( ds => ds.name === 'PostCodes' );
    
		// Iterate over all entities in the postcodes data source.
		for ( let i = 0; i < postCodesDataSource._entityCollection._entities._array.length; i++ ) {
        
			let entity = postCodesDataSource._entityCollection._entities._array[ i ];
        
			// Check if the entity posno property matches the postalcode.
			if ( entity._properties._posno._value  == this.store.postalcode ) {
        
				// TODO create function that takes size of postal code area and possibile location by the sea into consideration and sets y and z based on thse values
				this.viewer.camera.flyTo( {
					destination: Cesium.Cartesian3.fromDegrees( entity._properties._center_x._value, entity._properties._center_y._value, 3500 ),
					orientation: {
						heading: Cesium.Math.toRadians( 0.0 ),
						pitch: Cesium.Math.toRadians( -90.0 ),
					},
					duration: 3
				} );
            
			}
		}

		// change label
		// this.changeLabel( 'switchViewLabel', '2D view' );

	}
  
	// Function to switch back to 3D view
	switchTo3DView() {
		// Find the data source for postcodes
		const postCodesDataSource = this.viewer.dataSources._dataSources.find( ds => ds.name === 'PostCodes' );
    
		// Iterate over all entities in the postcodes data source.
		for ( let i = 0; i < postCodesDataSource._entityCollection._entities._array.length; i++ ) {
        
			let entity = postCodesDataSource._entityCollection._entities._array[ i ];
        
			// Check if the entity posno property matches the postalcode.
			if ( entity._properties._posno._value  == this.store.postalcode ) {
        
				// TODO create function that takes size of postal code area and possibile location by the sea into consideration and sets y and z based on thse values
				this.viewer.camera.flyTo( {
					destination: Cesium.Cartesian3.fromDegrees( entity._properties._center_x._value, entity._properties._center_y._value - 0.025, 2000 ),
					orientation: {
						heading: 0.0,
						pitch: Cesium.Math.toRadians( -35.0 ),
						roll: 0.0
					},
					duration: 3
				} );
            
			}
		}

		// change label
		// this.changeLabel( 'switchViewLabel', '2D view' );

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

		const store = useGlobalStore();
		store.cesiumViewer.camera.setView( {
			destination: Cesium.Cartesian3.fromDegrees( longitude, latitude - 0.0065, 500.0 ),
			orientation: {
				heading: 0.0,
				pitch: Cesium.Math.toRadians( -35.0 ),
				roll: 0.0
			}
		} );
	}

	rotate180Degrees() {
		const camera = this.viewer.camera;
		const scene = this.viewer.scene;

		// Get the center of the screen
		const screenWidth = scene.canvas.clientWidth;
		const screenHeight = scene.canvas.clientHeight;
		const centerX = screenWidth / 2;
		const centerY = screenHeight / 2;

		// Get the ellipsoid point (longitude, latitude) at the center of the screen
		const ellipsoid = scene.globe.ellipsoid;
		const centerCartesian = camera.pickEllipsoid(new Cesium.Cartesian2(centerX, centerY), ellipsoid);

		// If the point is on the globe, convert to geographic coordinates
		if (centerCartesian) {
			const centerCartographic = Cesium.Cartographic.fromCartesian(centerCartesian);
			const longitude = Cesium.Math.toDegrees(centerCartographic.longitude);
			let latitude = Cesium.Math.toDegrees(centerCartographic.latitude);
     		 // Adjust latitude based on the rotation state from the global store
      		if ( this.store.isCameraRotated ) {
        		latitude -= 0.015;  // Move latitude back for second rotation
      		} else {
        		latitude += 0.015;  // Adjust latitude for first rotation
      		}

			// Now, rotate the camera 180 degrees around this center point
			const currentHeading = camera.heading;
			const newHeading = currentHeading + Math.PI; // Rotate 180 degrees

			// Set the camera view
			this.viewer.camera.setView({
				destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 1200.0),
				orientation: {
					heading: newHeading,
					pitch: Cesium.Math.toRadians(-35.0),
					roll: 0.0
				}
			});

      		// Toggle the rotation state in the Pinia store
      		this.store.toggleCameraRotation();

		} else {
			console.log("No ellipsoid point was found at the center of the screen.");
		}
	}
}