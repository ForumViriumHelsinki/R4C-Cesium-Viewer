<template>
	<div class="map-overlay-controls">
		<v-btn
			v-if="currentLevel !== 'start'"
			icon
			size="small"
			variant="elevated"
			color="surface"
			aria-label="Rotate camera view 180 degrees"
			@click="rotateCamera"
		>
			<v-icon>mdi-compass</v-icon>
		</v-btn>
		<v-btn
			icon
			size="small"
			variant="elevated"
			color="surface"
			aria-label="Zoom in"
			@click="zoomIn"
		>
			<v-icon>mdi-plus</v-icon>
		</v-btn>
		<v-btn
			icon
			size="small"
			variant="elevated"
			color="surface"
			aria-label="Zoom out"
			@click="zoomOut"
		>
			<v-icon>mdi-minus</v-icon>
		</v-btn>
		<FeatureFlagsPanel />
	</div>
</template>

<script setup>
import { computed } from 'vue'
import { useGlobalStore } from '../stores/globalStore'
import FeatureFlagsPanel from './FeatureFlagsPanel.vue'

const globalStore = useGlobalStore()
const currentLevel = computed(() => globalStore.level)

const rotateCamera = async () => {
	const { default: Camera } = await import('../services/camera')
	const camera = new Camera()
	camera.rotate180Degrees()
}

const zoomIn = async () => {
	const { default: Camera } = await import('../services/camera')
	const camera = new Camera()
	if (camera.viewer?.camera) {
		camera.viewer.camera.zoomIn(camera.viewer.camera.positionCartographic.height * 0.3)
	}
}

const zoomOut = async () => {
	const { default: Camera } = await import('../services/camera')
	const camera = new Camera()
	if (camera.viewer?.camera) {
		camera.viewer.camera.zoomOut(camera.viewer.camera.positionCartographic.height * 0.3)
	}
}
</script>

<style scoped>
.map-overlay-controls {
	position: fixed;
	right: 16px;
	top: 50%;
	transform: translateY(-50%);
	z-index: 1100;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.map-overlay-controls .v-btn {
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.map-overlay-controls .v-btn:focus-visible {
	outline: 2px solid #1976d2;
	outline-offset: 2px;
}

@media (max-width: 768px) {
	.map-overlay-controls {
		right: 8px;
	}

	.map-overlay-controls .v-btn {
		width: 36px;
		height: 36px;
	}
}
</style>
