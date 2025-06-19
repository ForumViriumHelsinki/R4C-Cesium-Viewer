<template>
  <div
    v-if="showTooltip"
    :style="tooltipStyle"
    class="building-tooltip"
    role="tooltip"
    aria-live="polite"
    aria-label="Building information"
  >
    <div
v-if="buildingAttributes"
class="tooltip-content"
>
      <div
v-if="buildingAttributes.address"
class="tooltip-item"
>
        <span class="tooltip-label">Address:</span>
        <span class="tooltip-value">{{ buildingAttributes.address }}</span>
      </div>
      <div
v-if="buildingAttributes.rakennusaine_s"
class="tooltip-item"
>
        <span class="tooltip-label">Building Material:</span>
        <span class="tooltip-value">{{ buildingAttributes.rakennusaine_s }}</span>
      </div>
      <div
v-if="buildingAttributes.avg_temp_c"
class="tooltip-item"
>
        <span class="tooltip-label">Surface Temperature ({{ store.heatDataDate }}):</span>
        <span class="tooltip-value">{{ buildingAttributes.avg_temp_c }}°C</span>
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
  font-size: 14px;
  line-height: 1.4;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  max-width: 300px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tooltip-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tooltip-label {
  font-weight: 600;
  color: #e0e0e0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tooltip-value {
  color: #ffffff;
  font-weight: 400;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .building-tooltip {
    background: #000000 !important;
    border: 2px solid #ffffff;
  }
  
  .tooltip-label {
    color: #ffffff;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .building-tooltip {
    transition: none;
  }
}
</style>
