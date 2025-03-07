<template>
  <div
v-if="showTooltip"
:style="tooltipStyle"
class="building-tooltip"
>
    <div v-if="buildingAttributes">
      <div v-if="buildingAttributes.address">
        <strong>Address:</strong> {{ buildingAttributes.address }} <br >
      </div>
      <div v-if="buildingAttributes.rakennusaine_s">
        <strong>Building Material:</strong> {{ buildingAttributes.rakennusaine_s }} <br >
      </div>
      <div v-if="buildingAttributes.avg_temp_c">
        <strong>Surface Temperature {{ store.heatDataDate }}:</strong> {{ buildingAttributes.avg_temp_c }} °C<br >
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';
import { useBuildingStore } from '../stores/buildingStore.js';
import { findAddressForBuilding } from '../services/address.js'; // Import the updated address function
import * as Cesium from 'cesium';

export default {
	setup() {
		const store = useGlobalStore(); // Access Cesium viewer via global store
		const viewer = store.cesiumViewer;
		const buildingStore = useBuildingStore(); // Access Cesium viewer via global store
		const showTooltip = ref( false ); // State for whether to show the tooltip
		const mousePosition = ref( { x: 0, y: 0 } ); // Mouse cursor position
		const buildingAttributes = ref( null ); // Stores building data when hovering

		const tooltipStyle = computed( () => ( {
			position: 'absolute',
			top: `${mousePosition.value.y + 15}px`, // Offset to avoid overlapping cursor
			left: `${mousePosition.value.x + 15}px`,
			background: 'rgba(0, 0, 0, 0.8)',
			color: 'white',
			padding: '8px',
			borderRadius: '4px',
			pointerEvents: 'none',
		} ) );

		// Function to fetch building information based on the hovered entity
		const fetchBuildingInfo = async ( entity ) => {
			try {
				const features = buildingStore.buildingFeatures.features;

				const validIdPattern = /^[0-9]{9}[A-Z]$/;

				if ( !entity._id || !validIdPattern.test( entity._id ) ) {
					return; // Exit if the ID is invalid
				}

				if ( features ) {
					const matchingFeature = features.find(
						( feature ) => feature.id === entity._id
					);

					if ( matchingFeature ) {
						const properties = matchingFeature.properties;

						buildingAttributes.value = {
							avg_temp_c: findAverageTempC ( properties ),
							rakennusaine_s: properties.rakennusaine_s,
							address: findAddressForBuilding( properties ), // Use the updated address function
						};
						showTooltip.value = true;
					} else {
						console.warn( 'No matching feature found for Id:', entity._id );
					}
				}
			} catch ( error ) {
				console.error( 'Failed to fetch building data', error );
			}
		};

		const findAverageTempC = ( properties ) => {
  			const heatTimeseries = properties.heat_timeseries;
  			const foundEntry = heatTimeseries.find( ({  date } ) => date === store.heatDataDate );
  			return foundEntry ? foundEntry.avg_temp_c.toFixed( 2 ) : 'n/a'; // Return 'n/a' if no entry is found
		};

		// Handle mouse movement and check if the user is hovering over a building entity
		const onMouseMove = ( event ) => {
			const endPosition = event.endPosition; // Get endPosition from the event

			// Update mouse position for tooltip
			mousePosition.value = { x: endPosition.x, y: endPosition.y };

			if ( buildingStore.buildingFeatures && viewer ) {
				const pickedEntity = viewer.scene.pick(
					new Cesium.Cartesian2( endPosition.x, endPosition.y )
				);

				if ( pickedEntity && pickedEntity.id ) {

					fetchBuildingInfo( pickedEntity.id );
  	
				} else {
					showTooltip.value = false;
				}
			}
		};

		// Set up Cesium mouse events
		onMounted( () => {
			setTimeout( () => {
				nextTick( () => {
					if ( buildingStore.buildingFeatures ) {
						viewer.screenSpaceEventHandler.setInputAction(
							onMouseMove,
							Cesium.ScreenSpaceEventType.MOUSE_MOVE
						);
					}
				} );
			}, 1000 ); // 1000 milliseconds = 1 second delay
		} );

		// Clean up Cesium mouse events
		onUnmounted( () => {

			viewer.screenSpaceEventHandler.removeInputAction(
				Cesium.ScreenSpaceEventType.MOUSE_MOVE
			);
			
		} );

		return {
			showTooltip,
			tooltipStyle,
			store,
			buildingAttributes,
		};
	},
};
</script>

<style scoped>
.building-tooltip {
  font-size: 12px;
  white-space: nowrap;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 100;
}
</style>
