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
				<div class="building-icon">🏢</div>
				<div class="building-title">Building Details</div>
			</div>

			<!-- Compact data grid -->
			<div class="data-grid">
				<div
					v-if="buildingAttributes.address"
					class="data-item"
				>
					<div class="data-label">📍</div>
					<div class="data-value">
						{{ buildingAttributes.address }}
					</div>
				</div>
				<div
					v-if="buildingAttributes.rakennusaine_s"
					class="data-item"
				>
					<div class="data-label">🧱</div>
					<div class="data-value">
						{{ buildingAttributes.rakennusaine_s }}
					</div>
				</div>
				<div
					v-if="buildingAttributes.avg_temp_c"
					class="data-item"
				>
					<div class="data-label">🌡️</div>
					<div class="data-value">
						<span class="temp-value">{{ buildingAttributes.avg_temp_c }}°C</span>
						<span class="temp-date">({{ heatDataDate }})</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
/**
 * @component BuildingInformation
 * @description Displays a tooltip with building details when hovering over buildings in the 3D map.
 * Shows address, construction material, and heat temperature data for hovered buildings.
 *
 * Features:
 * - Mouse position tracking with throttling via requestAnimationFrame
 * - Automatic feature lookup from building GeoJSON data
 * - Dynamic tooltip positioning based on cursor
 * - Validates building ID format before lookup (9 digits + letter)
 * - Extracts temperature data from heat time series
 * - Accessible tooltip with ARIA attributes
 *
 * Performance Optimizations:
 * - Throttles scene.pick calls to prevent DataCloneError
 * - Uses computed boolean to avoid deep-tracking large GeoJSON
 * - Delayed handler registration to ensure Cesium is ready
 *
 * @example
 * <BuildingInformation v-if="shouldShowBuildingInformation" />
 *
 * Store Integration:
 * - globalStore: Cesium viewer instance, heat data date
 * - buildingStore: Building features GeoJSON data
 *
 * Service Integration:
 * - address: Finds building address from properties
 * - Cesium: Scene picking and screen space events
 */
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';
import { useBuildingStore } from '../stores/buildingStore.js';
import { findAddressForBuilding } from '../services/address.js';
import { Cartesian2, ScreenSpaceEventType } from 'cesium';

export default {
	setup() {
		const store = useGlobalStore();
		const viewer = store.cesiumViewer;
		const buildingStore = useBuildingStore();
		const showTooltip = ref(false);
		const mousePosition = ref({ x: 0, y: 0 });
		const buildingAttributes = ref(null);
		const pickPending = ref(false);
		const handlerRegistered = ref(false);

		console.log('[BuildingInformation] 🎬 Component setup started');

		/**
		 * Computed style for tooltip positioning and appearance.
		 * Positions tooltip near cursor with offset to avoid obscuring the building.
		 *
		 * @type {import('vue').ComputedRef<Object>}
		 */
		const tooltipStyle = computed(() => ({
			position: 'absolute',
			top: `${mousePosition.value.y + 15}px`,
			left: `${mousePosition.value.x + 15}px`,
			background: 'rgba(30, 30, 30, 0.95)',
			color: 'white',
			padding: '12px',
			borderRadius: '8px',
			pointerEvents: 'none',
			backdropFilter: 'blur(8px)',
			border: '1px solid rgba(255, 255, 255, 0.1)',
		}));

		/**
		 * Computed property to check if building features are available.
		 * Avoids deep-tracking the entire GeoJSON object which can cause stack overflow.
		 *
		 * @type {import('vue').ComputedRef<boolean>}
		 */
		const hasBuildingFeatures = computed(() => {
			const hasFeatures = Boolean(buildingStore.buildingFeatures);
			console.log('[BuildingInformation] 🔍 hasBuildingFeatures computed:', {
				hasFeatures,
				featuresCount: buildingStore.buildingFeatures?.features?.length,
			});
			return hasFeatures;
		});

		/**
		 * Exposes heat data date from store.
		 * Avoids exposing the entire store which contains circular references (cesiumViewer).
		 *
		 * @type {import('vue').ComputedRef<string>}
		 */
		const heatDataDate = computed(() => store.heatDataDate);

		/**
		 * Fetches building information based on the hovered entity.
		 * Validates entity ID, finds matching feature in GeoJSON, and extracts properties.
		 *
		 * ID Validation:
		 * - Must match pattern: 9 digits followed by 1 uppercase letter
		 * - Example: 123456789A
		 *
		 * Extracted Properties:
		 * - avg_temp_c: Average temperature from heat timeseries
		 * - rakennusaine_s: Building construction material
		 * - address: Formatted address from properties
		 *
		 * @async
		 * @param {Object} entity - Cesium entity from scene pick
		 * @returns {Promise<void>}
		 */
		const fetchBuildingInfo = async (entity) => {
			try {
				console.log('[BuildingInformation] 🔎 fetchBuildingInfo called for entity:', entity._id);

				const features = buildingStore.buildingFeatures.features;

				const validIdPattern = /^[0-9]{9}[A-Z]$/;

				if (!entity._id || !validIdPattern.test(entity._id)) {
					console.log('[BuildingInformation] ⚠️ Entity ID does not match pattern:', entity._id);
					return;
				}

				console.log('[BuildingInformation] ✓ Entity ID matches pattern:', entity._id);
				console.log('[BuildingInformation] 📦 Searching in', features?.length || 0, 'features');

				if (features) {
					const matchingFeature = features.find((feature) => feature.id === entity._id);

					if (matchingFeature) {
						console.log('[BuildingInformation] ✅ Found matching feature:', matchingFeature.id);
						const properties = matchingFeature.properties;

						buildingAttributes.value = {
							avg_temp_c: findAverageTempC(properties),
							rakennusaine_s: properties.rakennusaine_s,
							address: findAddressForBuilding(properties),
						};
						showTooltip.value = true;
						console.log(
							'[BuildingInformation] 🎯 Tooltip displayed with:',
							buildingAttributes.value
						);
					} else {
						console.warn('[BuildingInformation] ❌ No matching feature found for Id:', entity._id);
						console.log(
							'[BuildingInformation] Sample feature IDs:',
							features.slice(0, 5).map((f) => f.id)
						);
					}
				}
			} catch (error) {
				console.error('[BuildingInformation] ❌ Failed to fetch building data', error);
			}
		};

		/**
		 * Finds average temperature from heat timeseries for the current date.
		 * Returns formatted temperature or 'n/a' if data unavailable.
		 *
		 * @param {Object} properties - Building feature properties
		 * @returns {string} Temperature in Celsius (fixed to 2 decimals) or 'n/a'
		 */
		const findAverageTempC = (properties) => {
			const heatTimeseries = properties.heat_timeseries;
			const foundEntry = heatTimeseries.find(({ date }) => date === store.heatDataDate);
			return foundEntry ? foundEntry.avg_temp_c.toFixed(2) : 'n/a';
		};

		/**
		 * Handles mouse movement and checks if the user is hovering over a building entity.
		 * THROTTLED: Uses requestAnimationFrame to prevent DataCloneError from excessive scene.pick calls.
		 *
		 * Throttling Strategy:
		 * - Sets pickPending flag to true
		 * - Schedules pick for next animation frame
		 * - Ignores additional move events until pick completes
		 *
		 * @param {Object} event - Cesium screen space event with endPosition
		 * @returns {void}
		 */
		const onMouseMove = (event) => {
			if (pickPending.value) return;

			pickPending.value = true;
			requestAnimationFrame(() => {
				pickPending.value = false;

				const endPosition = event.endPosition;
				mousePosition.value = { x: endPosition.x, y: endPosition.y };

				if (buildingStore.buildingFeatures && viewer) {
					const pickedEntity = viewer.scene.pick(new Cartesian2(endPosition.x, endPosition.y));

					if (pickedEntity && pickedEntity.id) {
						fetchBuildingInfo(pickedEntity.id);
					} else {
						showTooltip.value = false;
					}
				}
			});
		};

		/**
		 * Registers the mouse move handler with Cesium's screen space event handler.
		 * Includes safety checks to ensure viewer and handler are ready.
		 *
		 * @returns {void}
		 */
		const registerMouseMoveHandler = () => {
			if (handlerRegistered.value || !viewer || !viewer.screenSpaceEventHandler) {
				console.log('[BuildingInformation] ⚠️ Cannot register handler:', {
					alreadyRegistered: handlerRegistered.value,
					hasViewer: Boolean(viewer),
					hasHandler: Boolean(viewer?.screenSpaceEventHandler),
				});
				return;
			}

			viewer.screenSpaceEventHandler.setInputAction(onMouseMove, ScreenSpaceEventType.MOUSE_MOVE);
			handlerRegistered.value = true;
			console.log('[BuildingInformation] ✅ MOUSE_MOVE handler registered successfully');
		};

		/**
		 * Unregisters the mouse move handler from Cesium's screen space event handler.
		 *
		 * @returns {void}
		 */
		const unregisterMouseMoveHandler = () => {
			if (!handlerRegistered.value || !viewer || !viewer.screenSpaceEventHandler) {
				return;
			}

			viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
			handlerRegistered.value = false;
			console.log('[BuildingInformation] 🗑️ MOUSE_MOVE handler unregistered');
		};

		/**
		 * Watches for buildingFeatures to become available and registers handler.
		 * Using computed boolean to avoid deep-tracking large GeoJSON objects.
		 *
		 * Includes 100ms delay to ensure Cesium viewer is fully initialized.
		 */
		watch(
			hasBuildingFeatures,
			(hasFeatures) => {
				console.log(
					'[BuildingInformation] 👀 Watcher triggered. hasFeatures:',
					hasFeatures,
					'handlerRegistered:',
					handlerRegistered.value
				);

				if (hasFeatures && !handlerRegistered.value) {
					console.log('[BuildingInformation] ⏰ Scheduling handler registration in 100ms');
					setTimeout(() => {
						registerMouseMoveHandler();
					}, 100);
				}
			},
			{ immediate: true }
		);

		/**
		 * Sets up Cesium mouse events on mount if buildingFeatures already exists.
		 * Includes 100ms delay for Cesium viewer initialization.
		 */
		onMounted(() => {
			console.log(
				'[BuildingInformation] 🔧 Component mounted. buildingFeatures exists:',
				Boolean(buildingStore.buildingFeatures)
			);

			if (buildingStore.buildingFeatures) {
				console.log(
					'[BuildingInformation] ⏰ Scheduling handler registration in 100ms (onMounted)'
				);
				setTimeout(() => {
					registerMouseMoveHandler();
				}, 100);
			}
		});

		/**
		 * Cleans up Cesium mouse events on component unmount.
		 */
		onUnmounted(() => {
			console.log('[BuildingInformation] 🧹 Component unmounted');
			unregisterMouseMoveHandler();
		});

		return {
			showTooltip,
			tooltipStyle,
			heatDataDate,
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
