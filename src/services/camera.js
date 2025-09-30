import * as Cesium from 'cesium';
import { useGlobalStore } from '../stores/globalStore.js';

/**
 * Camera Service
 * Manages CesiumJS camera operations including view modes, navigation, zoom, rotation,
 * and focus on geographic areas. Provides utilities for 2D/3D view transitions
 * and postal code-based camera positioning.
 *
 * @class Camera
 */
export default class Camera {
	/**
	 * Creates a Camera service instance
	 */
	constructor( ) {
		this.store = useGlobalStore();
		this.viewer = this.store.cesiumViewer;
		this.isRotated = false;  // Track rotation state for 180° rotations
	}

	/**
	 * Initializes the camera to default Helsinki region view
	 * Sets camera position to Helsinki capital region with top-down perspective.
	 *
	 * @returns {void}
	 */
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

	/**
	 * Switches camera to 2D top-down view of the current postal code
	 * Flies camera to postal code center with 90° pitch (directly overhead).
	 * Searches for postal code entity in PostCodes data source.
	 *
	 * @returns {void}
	 */
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
  
	/**
	 * Switches camera to 3D perspective view of the current postal code
	 * Flies camera to postal code center with 35° pitch (angled perspective).
	 * Applies slight latitude offset for better framing.
	 *
	 * @returns {void}
	 */
	switchTo3DView() {
		// Find the data source for postcodes
		const postCodesDataSource = this.viewer.dataSources._dataSources.find( ds => ds.name === 'PostCodes' );

		// Iterate over all entities in the postcodes data source
		for ( let i = 0; i < postCodesDataSource._entityCollection._entities._array.length; i++ ) {

			let entity = postCodesDataSource._entityCollection._entities._array[ i ];

			// Check if entity postal code matches current selected postal code
			if ( entity._properties._posno._value  == this.store.postalcode ) {

				// Fly to postal code with 3D perspective
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
	}

	/**
	 * Switches to 3D grid view mode
	 * Either flies to default Helsinki position (start level) or maintains current position
	 * while adjusting orientation. Preserves altitude and resets level state.
	 *
	 * @returns {void}
	 */
switchTo3DGrid() {

  if ( this.store.level === 'start' ) {
	this.flyCamera3D( 24.991745, 60.045, 12000  );
  } else {

  // Get the current camera and its center coordinates
  const camera = this.viewer.scene.camera;
  const centerCartographic = camera.positionCartographic;

  // Get current longitude, latitude, and altitude from the camera's current center position
  const centerLongitude = Cesium.Math.toDegrees(centerCartographic.longitude);
  const centerLatitude = Cesium.Math.toDegrees(centerCartographic.latitude);
  const currentAltitude = centerCartographic.height; // Get current altitude

  // Fly the camera to the current center position, preserving altitude and orientation
  this.viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(centerLongitude, centerLatitude, currentAltitude), // Use current altitude
					orientation: {
						heading: 0.0,
						pitch: Cesium.Math.toRadians( -35.0 ),
						roll: 0.0
					},
    duration: 1 // Animation duration in seconds
  });

  this.store.setLevel(null);

  }
}


	/**
	 * Flies camera to specified coordinates in 3D perspective mode
	 * Quick 1-second animation to geographic position with default 3D orientation.
	 *
	 * @param {number} lat - Latitude in degrees
	 * @param {number} long - Longitude in degrees
	 * @param {number} z - Altitude/height in meters
	 * @returns {void}
	 */
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

	/**
	 * Sets camera view to specific coordinates instantly (no animation)
	 * Positions camera at building-level altitude (500m) with slight latitude offset.
	 * Uses immediate setView rather than animated flyTo.
	 *
	 * @param {number} longitude - Longitude in degrees
	 * @param {number} latitude - Latitude in degrees
	 * @returns {void}
	 */
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

	/**
	 * Zooms the camera in or out based on multiplier value
	 * Calculates zoom distance based on current altitude and multiplier.
	 *
	 * @param {number} multiplier - Zoom factor (>1 zooms in, <1 zooms out, 1 = no change)
	 * @returns {void}
	 */
	zoom(multiplier) {
		if (multiplier > 1) {
			// Zoom in: move camera closer to ground
			this.viewer.camera.zoomIn(this.viewer.camera.positionCartographic.height * (1 - 1 / multiplier));
		} else {
			// Zoom out: move camera further from ground
			this.viewer.camera.zoomOut(this.viewer.camera.positionCartographic.height * (1 - multiplier));
		}
	}

	/**
	 * Rotates camera to specific compass heading with animation
	 * Maintains current position, pitch, and roll while changing heading.
	 *
	 * @param {number} headingInDegrees - Target heading (0° = North, 90° = East, 180° = South, 270° = West)
	 * @returns {void}
	 */
	setHeading(headingInDegrees) {
		this.viewer.camera.flyTo({
			destination: this.viewer.camera.position,
			orientation: {
				heading: Cesium.Math.toRadians(headingInDegrees),
				pitch: this.viewer.camera.pitch, // Keep current pitch
				roll: this.viewer.camera.roll,   // Keep current roll
			},
			duration: 1.0 // Animation duration in seconds
		});
	}

	/**
	 * Resets the camera orientation to face North with a default pitch.
	 */
	resetNorth() {
		this.viewer.camera.flyTo({
			destination: this.viewer.camera.position,
			orientation: {
				heading: Cesium.Math.toRadians(0),
				pitch: Cesium.Math.toRadians(-35.0), // Default 3D pitch
				roll: 0.0,
			},
			duration: 1.0
		});
	}	

	/**
	 * Focuses camera on a specific postal code area
	 * Searches PostCodes data source for matching postal code and flies camera to its center.
	 * Applies latitude offset for better framing and uses 45° pitch.
	 *
	 * @param {string|number} postalCode - Postal code to focus on
	 * @returns {void}
	 */
	focusOnPostalCode(postalCode) {
		// Find the PostCodes data source
		const postCodesDataSource = this.viewer.dataSources._dataSources.find(ds => ds.name === 'PostCodes');

		if (!postCodesDataSource) {
			console.warn('PostCodes data source not found');
			return;
		}

		// Search for entity with matching postal code
		const entity = postCodesDataSource._entityCollection._entities._array.find(
			entity => entity._properties._posno._value == postalCode
		);

		if (entity) {
			// Fly to postal code area with 2-second animation
			this.viewer.camera.flyTo({
				destination: Cesium.Cartesian3.fromDegrees(
					entity._properties._center_x._value,
					entity._properties._center_y._value - 0.015,
					2500
				),
				orientation: {
					heading: 0.0,
					pitch: Cesium.Math.toRadians(-45.0),
					roll: 0.0
				},
				duration: 2
			});
		} else {
			console.warn(`Postal code ${postalCode} not found in data source`);
		}
	}

	/**
	 * Rotates camera 180 degrees around the screen center point
	 * Calculates ellipsoid intersection at screen center and rotates around that point.
	 * Adjusts latitude based on rotation state to maintain proper framing.
	 * Toggles rotation state in global store for tracking.
	 *
	 * @returns {void}
	 */
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

	/**
	 * Alias for rotate180Degrees() method
	 * Maintained for backward compatibility with existing code.
	 *
	 * @returns {void}
	 * @deprecated Use rotate180Degrees() instead
	 */
	rotateCamera() {
		this.rotate180Degrees();
	}
}
