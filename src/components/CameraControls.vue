<template>
	<div class="camera-controls-container">
		<!-- Compass Assembly: SVG visual + directional buttons -->
		<div
			class="compass-assembly"
			role="group"
			aria-label="Camera direction controls"
		>
			<!-- Central SVG Compass (visual indicator only) -->
			<div class="compass-visual">
				<!-- Rotating compass ring with cardinal directions -->
				<svg
					class="compass-ring"
					viewBox="0 0 100 100"
					:style="compassRingStyle"
					aria-hidden="true"
				>
					<!-- Outer ring -->
					<circle
						cx="50"
						cy="50"
						r="46"
						fill="none"
						stroke="rgba(0,0,0,0.2)"
						stroke-width="1.5"
					/>
					<!-- Inner decorative ring -->
					<circle
						cx="50"
						cy="50"
						r="38"
						fill="none"
						stroke="rgba(0,0,0,0.08)"
						stroke-width="1"
					/>
					<!-- Cardinal direction markers -->
					<text
						x="50"
						y="16"
						class="compass-cardinal compass-north"
					>
						N
					</text>
					<text
						x="84"
						y="54"
						class="compass-cardinal"
					>
						E
					</text>
					<text
						x="50"
						y="92"
						class="compass-cardinal"
					>
						S
					</text>
					<text
						x="16"
						y="54"
						class="compass-cardinal"
					>
						W
					</text>
				</svg>

				<!-- Fixed compass needle (always points up = North indicator) -->
				<svg
					class="compass-needle"
					viewBox="0 0 40 40"
					aria-hidden="true"
				>
					<!-- North pointer (red) -->
					<polygon
						points="20,6 17,20 20,18 23,20"
						class="needle-north"
					/>
					<!-- South pointer (dark gray) -->
					<polygon
						points="20,34 17,20 20,22 23,20"
						class="needle-south"
					/>
					<!-- Center circle -->
					<circle
						cx="20"
						cy="20"
						r="3"
						class="needle-center"
					/>
				</svg>

				<!-- Screen reader announcement for current heading -->
				<span
					class="sr-only"
					role="status"
					aria-live="polite"
				>
					Current heading: {{ currentDirectionName }}, {{ normalizedHeading }} degrees
				</span>
			</div>

			<!-- Directional buttons around the compass -->
			<v-btn
				v-for="dir in directions"
				:key="dir.name"
				class="dir-btn"
				:class="[dir.position]"
				:color="getButtonColor(dir)"
				:variant="isActiveDirection(dir.degrees) ? 'flat' : 'outlined'"
				:disabled="!viewerReady"
				:aria-label="`Face ${dir.label}`"
				:title="`Face ${dir.label}`"
				size="x-small"
				icon
				@click.stop="setHeading(dir.degrees)"
			>
				{{ dir.name }}
			</v-btn>
		</div>

		<!-- Zoom Controls -->
		<v-btn-group
			divided
			density="compact"
			elevation="2"
			rounded="lg"
			class="zoom-controls"
			aria-label="Zoom controls"
		>
			<v-btn
				:disabled="!viewerReady"
				aria-label="Zoom in"
				title="Zoom in"
				icon="mdi-plus"
				size="small"
				@click.stop="zoomIn"
			/>
			<v-btn
				:disabled="!viewerReady"
				aria-label="Zoom out"
				title="Zoom out"
				icon="mdi-minus"
				size="small"
				@click.stop="zoomOut"
			/>
		</v-btn-group>
	</div>
</template>

<script setup>
import { ref, computed, onUnmounted, onMounted, watch } from 'vue';
import { useGlobalStore } from '../stores/globalStore';
import Camera from '../services/camera';
import * as Cesium from 'cesium';

// Direction configuration
const directions = [
	{ name: 'N', label: 'North', degrees: 0, position: 'north' },
	{ name: 'NE', label: 'Northeast', degrees: 45, position: 'northeast' },
	{ name: 'E', label: 'East', degrees: 90, position: 'east' },
	{ name: 'SE', label: 'Southeast', degrees: 135, position: 'southeast' },
	{ name: 'S', label: 'South', degrees: 180, position: 'south' },
	{ name: 'SW', label: 'Southwest', degrees: 225, position: 'southwest' },
	{ name: 'W', label: 'West', degrees: 270, position: 'west' },
	{ name: 'NW', label: 'Northwest', degrees: 315, position: 'northwest' },
];

// Check for reduced motion preference
const prefersReducedMotion = ref(false);

const store = useGlobalStore();
let cameraService = null;
const currentHeading = ref(0);
const viewerReady = ref(false);
let motionMediaQuery = null;

onMounted(() => {
	// Set up reduced motion detection
	motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
	prefersReducedMotion.value = motionMediaQuery.matches;

	const handleMotionChange = (e) => {
		prefersReducedMotion.value = e.matches;
	};
	motionMediaQuery.addEventListener('change', handleMotionChange);
});

const updateHeading = () => {
	if (store.cesiumViewer) {
		const headingDegrees = Cesium.Math.toDegrees(store.cesiumViewer.camera.heading);
		currentHeading.value = headingDegrees;
	}
};

watch(
	() => store.cesiumViewer,
	(newViewer) => {
		if (newViewer && !cameraService) {
			cameraService = new Camera();

			newViewer.camera.changed.addEventListener(updateHeading);
			newViewer.camera.moveEnd.addEventListener(updateHeading);
			updateHeading();

			viewerReady.value = true;
		}
	},
	{ immediate: true }
);

onUnmounted(() => {
	if (store.cesiumViewer) {
		store.cesiumViewer.camera.changed.removeEventListener(updateHeading);
		store.cesiumViewer.camera.moveEnd.removeEventListener(updateHeading);
	}
});

// Normalize heading to 0-359 range
const normalizedHeading = computed(() => {
	return Math.round(((currentHeading.value % 360) + 360) % 360);
});

// Get current direction name for screen readers
const currentDirectionName = computed(() => {
	const heading = normalizedHeading.value;
	const index = Math.round(heading / 45) % 8;
	return directions[index].label;
});

// Check if a direction button should show as active
const isActiveDirection = (degrees) => {
	const heading = normalizedHeading.value;
	const diff = Math.abs(heading - degrees);
	// Consider active if within 22.5 degrees (half of 45-degree sector)
	return diff < 22.5 || diff > 337.5;
};

// Get button color based on direction and active state
const getButtonColor = (dir) => {
	if (dir.name === 'N') {
		return isActiveDirection(dir.degrees) ? 'error' : undefined;
	}
	return isActiveDirection(dir.degrees) ? 'primary' : undefined;
};

// Compass ring rotates opposite to heading to show current orientation
const compassRingStyle = computed(() => {
	const style = {
		transform: `rotate(${-currentHeading.value}deg)`,
	};
	if (!prefersReducedMotion.value) {
		style.transition = 'transform 0.2s ease-out';
	}
	return style;
});

const setHeading = (degrees) => {
	cameraService?.setHeading(degrees, prefersReducedMotion.value);
};

const zoomIn = () => {
	cameraService?.zoom(1.5);
};

const zoomOut = () => {
	cameraService?.zoom(0.5);
};
</script>

<style scoped>
.camera-controls-container {
	position: absolute;
	top: 75px;
	left: 20px;
	z-index: 400;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
}

/* Screen reader only class */
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border: 0;
}

/* Compass Assembly */
.compass-assembly {
	position: relative;
	width: 110px;
	height: 110px;
}

/* Central compass visual */
.compass-visual {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 52px;
	height: 52px;
	border-radius: 50%;
	background: linear-gradient(145deg, #ffffff, #f0f0f0);
	box-shadow:
		0 2px 8px rgba(0, 0, 0, 0.15),
		inset 0 1px 0 rgba(255, 255, 255, 0.9);
	pointer-events: none;
}

/* Rotating compass ring */
.compass-ring {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
}

.compass-cardinal {
	font-size: 8px;
	font-weight: 600;
	fill: #424242;
	text-anchor: middle;
	dominant-baseline: middle;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.compass-north {
	fill: #b71c1c;
	font-weight: 700;
	font-size: 9px;
}

/* Fixed compass needle */
.compass-needle {
	position: absolute;
	top: 50%;
	left: 50%;
	width: 22px;
	height: 22px;
	transform: translate(-50%, -50%);
}

.needle-north {
	fill: #c62828;
}

.needle-south {
	fill: #424242;
}

.needle-center {
	fill: #ffffff;
	stroke: #424242;
	stroke-width: 1;
}

/* Directional button positions */
.dir-btn {
	position: absolute;
}

.dir-btn.north {
	top: 0;
	left: 50%;
	transform: translateX(-50%);
}
.dir-btn.northeast {
	top: 12px;
	right: 12px;
}
.dir-btn.east {
	top: 50%;
	right: 0;
	transform: translateY(-50%);
}
.dir-btn.southeast {
	bottom: 12px;
	right: 12px;
}
.dir-btn.south {
	bottom: 0;
	left: 50%;
	transform: translateX(-50%);
}
.dir-btn.southwest {
	bottom: 12px;
	left: 12px;
}
.dir-btn.west {
	top: 50%;
	left: 0;
	transform: translateY(-50%);
}
.dir-btn.northwest {
	top: 12px;
	left: 12px;
}

/* Zoom Controls */
.zoom-controls {
	display: flex;
	flex-direction: column;
}

/* Touch device adjustments - larger targets */
@media (pointer: coarse) {
	.compass-assembly {
		width: 130px;
		height: 130px;
	}

	.compass-visual {
		width: 58px;
		height: 58px;
	}

	.dir-btn.northeast {
		top: 14px;
		right: 14px;
	}
	.dir-btn.southeast {
		bottom: 14px;
		right: 14px;
	}
	.dir-btn.southwest {
		bottom: 14px;
		left: 14px;
	}
	.dir-btn.northwest {
		top: 14px;
		left: 14px;
	}
}

/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
	.compass-ring {
		transition: none;
	}
}

/* High contrast mode support */
@media (prefers-contrast: high) {
	.compass-cardinal {
		fill: #000000;
	}

	.compass-north {
		fill: #b71c1c;
	}
}
</style>
