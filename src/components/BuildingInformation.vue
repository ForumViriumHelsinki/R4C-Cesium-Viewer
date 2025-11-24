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
			<!-- Header with building icon -->
			<div class="tooltip-header">
				<div class="building-icon">
🏢
</div>
				<div class="building-title">
Building Details
</div>
			</div>

			<!-- Compact data grid -->
			<div class="data-grid">
				<div
					v-if="buildingAttributes.address"
					class="data-item"
				>
					<div class="data-label">
📍
</div>
					<div class="data-value">
						{{ buildingAttributes.address }}
					</div>
				</div>
				<div
					v-if="buildingAttributes.rakennusaine_s"
					class="data-item"
				>
					<div class="data-label">
🧱
</div>
					<div class="data-value">
						{{ buildingAttributes.rakennusaine_s }}
					</div>
				</div>
				<div
					v-if="buildingAttributes.avg_temp_c"
					class="data-item"
				>
					<div class="data-label">
🌡️
</div>
					<div class="data-value">
						<span class="temp-value">{{ buildingAttributes.avg_temp_c }}°C</span>
						<span class="temp-date">({{ store.heatDataDate }})</span>
					</div>
				</div>
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
		const showTooltip = ref(false); // State for whether to show the tooltip
		const mousePosition = ref({ x: 0, y: 0 }); // Mouse cursor position
		const buildingAttributes = ref(null); // Stores building data when hovering
		const pickPending = ref(false); // Throttle flag for scene.pick operations

		const tooltipStyle = computed(() => ({
			position: 'absolute',
			top: `${mousePosition.value.y + 15}px`, // Offset to avoid overlapping cursor
			left: `${mousePosition.value.x + 15}px`,
			background: 'rgba(30, 30, 30, 0.95)',
			color: 'white',
			padding: '12px',
			borderRadius: '8px',
			pointerEvents: 'none',
			backdropFilter: 'blur(8px)',
			border: '1px solid rgba(255, 255, 255, 0.1)',
		}));

		// Function to fetch building information based on the hovered entity
		const fetchBuildingInfo = async (entity) => {
			try {
				const features = buildingStore.buildingFeatures.features;

				const validIdPattern = /^[0-9]{9}[A-Z]$/;

				if (!entity._id || !validIdPattern.test(entity._id)) {
					return; // Exit if the ID is invalid
				}

				if (features) {
					const matchingFeature = features.find((feature) => feature.id === entity._id);

					if (matchingFeature) {
						const properties = matchingFeature.properties;

						buildingAttributes.value = {
							avg_temp_c: findAverageTempC(properties),
							rakennusaine_s: properties.rakennusaine_s,
							address: findAddressForBuilding(properties), // Use the updated address function
						};
						showTooltip.value = true;
					} else {
						console.warn('No matching feature found for Id:', entity._id);
					}
				}
			} catch (error) {
				console.error('Failed to fetch building data', error);
			}
		};

		const findAverageTempC = (properties) => {
			const heatTimeseries = properties.heat_timeseries;
			const foundEntry = heatTimeseries.find(({ date }) => date === store.heatDataDate);
			return foundEntry ? foundEntry.avg_temp_c.toFixed(2) : 'n/a'; // Return 'n/a' if no entry is found
		};

		// Handle mouse movement and check if the user is hovering over a building entity
		// THROTTLED: Uses requestAnimationFrame to prevent DataCloneError from excessive scene.pick calls
		const onMouseMove = (event) => {
			// Skip if a pick operation is already queued for the next frame
			if (pickPending.value) return;

			pickPending.value = true;
			requestAnimationFrame(() => {
				pickPending.value = false;

				const endPosition = event.endPosition; // Get endPosition from the event

				// Update mouse position for tooltip
				mousePosition.value = { x: endPosition.x, y: endPosition.y };

				if (buildingStore.buildingFeatures && viewer) {
					const pickedEntity = viewer.scene.pick(
						new Cesium.Cartesian2(endPosition.x, endPosition.y)
					);

					if (pickedEntity && pickedEntity.id) {
						fetchBuildingInfo(pickedEntity.id);
					} else {
						showTooltip.value = false;
					}
				}
			});
		};

		// Set up Cesium mouse events
		onMounted(() => {
			setTimeout(() => {
				nextTick(() => {
					if (buildingStore.buildingFeatures) {
						viewer.screenSpaceEventHandler.setInputAction(
							onMouseMove,
							Cesium.ScreenSpaceEventType.MOUSE_MOVE
						);
					}
				});
			}, 1000); // 1000 milliseconds = 1 second delay
		});

		// Clean up Cesium mouse events
		onUnmounted(() => {
			viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
		});

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
	font-size: 13px;
	line-height: 1.4;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	z-index: 1000;
	max-width: 280px;
	min-width: 220px;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.tooltip-content {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.tooltip-header {
	display: flex;
	align-items: center;
	gap: 8px;
	padding-bottom: 8px;
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.building-icon {
	font-size: 16px;
}

.building-title {
	font-weight: 600;
	color: #ffffff;
	font-size: 13px;
	letter-spacing: 0.3px;
}

.data-grid {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.data-item {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	min-height: 20px;
}

.data-label {
	font-size: 14px;
	flex-shrink: 0;
	width: 16px;
	display: flex;
	align-items: center;
}

.data-value {
	color: #ffffff;
	font-weight: 400;
	flex: 1;
	word-wrap: break-word;
}

.temp-value {
	font-weight: 600;
	color: #4fc3f7;
}

.temp-date {
	font-size: 11px;
	color: #b0b0b0;
	margin-left: 4px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
	.building-tooltip {
		background: #000000 !important;
		border: 2px solid #ffffff;
	}

	.building-title,
	.data-value {
		color: #ffffff;
	}

	.temp-value {
		color: #ffffff;
	}
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
	.building-tooltip {
		transition: none;
	}
}

/* Mobile optimization */
@media (max-width: 768px) {
	.building-tooltip {
		max-width: 240px;
		font-size: 12px;
	}

	.building-icon {
		font-size: 14px;
	}
}
</style>
