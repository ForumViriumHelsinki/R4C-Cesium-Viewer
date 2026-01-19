<template>
	<div class="loading-indicator-container">
		<!-- Global Loading Overlay -->
		<v-overlay
			v-model="showGlobalOverlay"
			eager
			persistent
			class="loading-overlay"
		>
			<v-card
				class="loading-card"
				min-width="320"
				max-width="400"
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="loading-dialog-title"
				aria-describedby="loading-dialog-description"
			>
				<v-card-title
					id="loading-dialog-title"
					class="loading-title"
				>
					<v-icon
						class="mr-2 rotating"
						aria-hidden="true"
					>
						mdi-loading
					</v-icon>
					Loading Data
				</v-card-title>
				<!-- Hidden description for screen readers -->
				<span
					id="loading-dialog-description"
					class="sr-only"
				>
					Loading map data. Overall progress {{ overallProgress }} percent.
					{{ activeLoadingLayers.length }} layers currently loading.
				</span>

				<v-card-text>
					<!-- Overall Progress -->
					<div class="progress-section">
						<div class="progress-header">
							<span
								id="overall-progress-label"
								class="progress-text"
								>Overall Progress</span
							>
							<span class="progress-percentage">{{ overallProgress }}%</span>
						</div>
						<v-progress-linear
							:model-value="overallProgress"
							color="primary"
							height="8"
							rounded
							class="mb-4"
							role="progressbar"
							:aria-valuenow="overallProgress"
							:aria-valuemin="0"
							:aria-valuemax="100"
							aria-labelledby="overall-progress-label"
						/>
					</div>

					<!-- Individual Layer Progress -->
					<div class="layers-progress">
						<div
							v-for="layer in activeLoadingLayers"
							:key="layer"
							class="layer-progress"
						>
							<div class="layer-header">
								<div class="layer-info">
									<v-icon
										:color="getLayerColor(layer)"
										size="16"
										class="mr-2"
									>
										{{ getLayerIcon(layer) }}
									</v-icon>
									<span class="layer-name">{{ formatLayerName(layer) }}</span>
								</div>
								<span class="layer-percentage">{{ getLayerProgress(layer) }}%</span>
							</div>

							<v-progress-linear
								:model-value="getLayerProgress(layer)"
								:color="getLayerColor(layer)"
								height="4"
								rounded
								class="layer-progress-bar"
								role="progressbar"
								:aria-valuenow="getLayerProgress(layer)"
								:aria-valuemin="0"
								:aria-valuemax="100"
								:aria-label="`${formatLayerName(layer)} loading progress`"
							/>

							<div class="layer-message">
								{{ getLoadingMessage(layer) }}
							</div>
						</div>
					</div>

					<!-- Error Messages -->
					<div
						v-if="hasErrors"
						class="error-section"
					>
						<v-alert
							v-for="(error, layer) in layerErrors"
							:key="layer"
							type="error"
							density="compact"
							variant="tonal"
							class="mb-2"
						>
							<template #prepend>
								<v-icon size="16"> mdi-alert-circle </v-icon>
							</template>
							<div class="error-content">
								<strong>{{ formatLayerName(layer) }}</strong
								>: {{ error }}
								<v-btn
									size="x-small"
									variant="text"
									color="error"
									class="ml-2"
									@click="retryLayer(layer)"
								>
									Retry
								</v-btn>
							</div>
						</v-alert>
					</div>
				</v-card-text>

				<!-- Performance Info (Debug) -->
				<v-card-actions v-if="showPerformanceInfo">
					<v-btn
						variant="text"
						size="small"
						@click="showPerformanceDialog = true"
					>
						<v-icon
							class="mr-1"
							size="16"
						>
							mdi-speedometer
						</v-icon>
						Performance
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-overlay>

		<!-- Compact Loading Indicator (when not using overlay) -->
		<v-snackbar
			v-model="showCompactIndicator"
			:timeout="-1"
			location="bottom right"
			class="compact-loading"
		>
			<div class="compact-content">
				<v-progress-circular
					size="20"
					width="2"
					color="white"
					indeterminate
					class="mr-2"
				/>
				<span>{{ getCompactMessage() }}</span>
			</div>

			<template #actions>
				<v-btn
					icon
					size="small"
					@click="showGlobalOverlay = true"
				>
					<v-icon size="16"> mdi-arrow-expand </v-icon>
				</v-btn>
			</template>
		</v-snackbar>

		<!-- Performance Dialog -->
		<v-dialog
			v-model="showPerformanceDialog"
			max-width="500"
		>
			<v-card>
				<v-card-title>Loading Performance</v-card-title>
				<v-card-text>
					<div
						v-for="metric in performanceMetrics"
						:key="metric.layer"
						class="performance-item"
					>
						<div class="performance-header">
							<span class="performance-layer">{{ formatLayerName(metric.layer) }}</span>
							<span class="performance-time">{{ formatDuration(metric.duration) }}</span>
						</div>
					</div>
				</v-card-text>
				<v-card-actions>
					<v-spacer />
					<v-btn @click="showPerformanceDialog = false"> Close </v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useLoadingStore } from '../stores/loadingStore'

// Props
const props = defineProps({
	mode: {
		type: String,
		default: 'overlay', // 'overlay', 'compact', 'both'
		validator: (value) => ['overlay', 'compact', 'both'].includes(value),
	},
	showPerformanceInfo: {
		type: Boolean,
		default: false,
	},
})

// Store
const loadingStore = useLoadingStore()

// Local state
const showPerformanceDialog = ref(false)

// Computed properties
const showGlobalOverlay = computed({
	get: () => props.mode === 'overlay' && loadingStore.hasActiveLoading,
	set: (value) => {
		// Allow manual control of overlay
		if (!value && props.mode === 'both') {
			// Switch to compact mode when overlay is closed
		}
	},
})

const showCompactIndicator = computed(() => {
	return (
		(props.mode === 'compact' || props.mode === 'both') &&
		loadingStore.hasActiveLoading &&
		!showGlobalOverlay.value
	)
})

const overallProgress = computed(() => loadingStore.overallProgress)
const activeLoadingLayers = computed(() => loadingStore.activeLoadingLayers)

const hasErrors = computed(() => {
	return Object.keys(layerErrors.value).length > 0
})

const layerErrors = computed(() => {
	return Object.keys(loadingStore.loadingErrors).reduce((errors, layer) => {
		if (loadingStore.loadingErrors[layer]) {
			errors[layer] = loadingStore.loadingErrors[layer]
		}
		return errors
	}, {})
})

const performanceMetrics = computed(() => loadingStore.getPerformanceMetrics())

// Methods
const getLayerProgress = (layer) => loadingStore.getLayerProgress(layer)
const getLoadingMessage = (layer) => loadingStore.getLoadingMessage(layer)

const formatLayerName = (layer) => {
	const names = {
		trees: 'Trees',
		vegetation: 'Vegetation',
		otherNature: 'Nature Areas',
		buildings: 'Buildings',
		postalCodes: 'Postal Codes',
		landcover: 'Land Cover',
		ndvi: 'NDVI Data',
		populationGrid: 'Population Grid',
		heatData: 'Heat Data',
	}
	return names[layer] || layer.charAt(0).toUpperCase() + layer.slice(1)
}

const getLayerIcon = (layer) => {
	const icons = {
		trees: 'mdi-tree',
		vegetation: 'mdi-leaf',
		otherNature: 'mdi-pine-tree',
		buildings: 'mdi-building',
		postalCodes: 'mdi-map-marker',
		landcover: 'mdi-image',
		ndvi: 'mdi-chart-line',
		populationGrid: 'mdi-grid',
		heatData: 'mdi-thermometer',
	}
	return icons[layer] || 'mdi-database'
}

const getLayerColor = (layer) => {
	const colors = {
		trees: 'green',
		vegetation: 'light-green',
		otherNature: 'teal',
		buildings: 'blue',
		postalCodes: 'purple',
		landcover: 'brown',
		ndvi: 'orange',
		populationGrid: 'indigo',
		heatData: 'red',
	}
	return colors[layer] || 'primary'
}

const getCompactMessage = () => {
	const activeCount = activeLoadingLayers.value.length
	if (activeCount === 1) {
		return `Loading ${formatLayerName(activeLoadingLayers.value[0])}...`
	}
	return `Loading ${activeCount} layers...`
}

const retryLayer = (layer) => {
	loadingStore.retryLayerLoading(layer)
	// Emit event for parent component to handle actual retry
	emit('retry-layer', layer)
}

const formatDuration = (ms) => {
	if (ms < 1000) return `${ms}ms`
	return `${(ms / 1000).toFixed(1)}s`
}

// Emits
const emit = defineEmits(['retry-layer'])

// Watch for loading changes to provide haptic feedback on mobile
watch(
	() => loadingStore.hasActiveLoading,
	(isLoading) => {
		if (isLoading && 'vibrate' in navigator) {
			navigator.vibrate([50]) // Subtle vibration when loading starts
		}
	}
)
</script>

<style scoped>
.loading-overlay {
	backdrop-filter: blur(4px);
}

.loading-card {
	margin: 16px;
}

.loading-title {
	font-size: 1.1rem;
	font-weight: 600;
	padding-bottom: 8px;
}

.rotating {
	animation: rotate 2s linear infinite;
}

@keyframes rotate {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

.progress-section {
	margin-bottom: 24px;
}

.progress-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 8px;
}

.progress-text {
	font-weight: 500;
	color: rgba(0, 0, 0, 0.87);
}

.progress-percentage {
	font-weight: 600;
	color: #1976d2;
}

.layers-progress {
	max-height: 300px;
	overflow-y: auto;
}

.layer-progress {
	margin-bottom: 16px;
	padding: 12px;
	background-color: rgba(0, 0, 0, 0.02);
	border-radius: 8px;
	border-left: 3px solid;
}

.layer-progress:nth-child(1) {
	border-left-color: #4caf50;
}
.layer-progress:nth-child(2) {
	border-left-color: #2196f3;
}
.layer-progress:nth-child(3) {
	border-left-color: #ff9800;
}
.layer-progress:nth-child(4) {
	border-left-color: #9c27b0;
}

.layer-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 6px;
}

.layer-info {
	display: flex;
	align-items: center;
}

.layer-name {
	font-weight: 500;
	font-size: 0.9rem;
}

.layer-percentage {
	font-weight: 600;
	font-size: 0.85rem;
}

.layer-progress-bar {
	margin-bottom: 6px;
}

.layer-message {
	font-size: 0.8rem;
	color: rgba(0, 0, 0, 0.6);
	font-style: italic;
}

.error-section {
	margin-top: 16px;
	padding-top: 16px;
	border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.error-content {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
}

.compact-loading {
	z-index: 2000;
}

.compact-content {
	display: flex;
	align-items: center;
}

.performance-item {
	margin-bottom: 8px;
	padding: 8px;
	background-color: rgba(0, 0, 0, 0.02);
	border-radius: 4px;
}

.performance-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.performance-layer {
	font-weight: 500;
}

.performance-time {
	font-family: monospace;
	font-size: 0.9rem;
	color: rgba(0, 0, 0, 0.7);
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

/* Responsive adjustments */
@media (max-width: 768px) {
	.loading-card {
		margin: 8px;
		max-height: 80vh;
		overflow-y: auto;
	}

	.layers-progress {
		max-height: 200px;
	}
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
	.rotating {
		animation: none;
	}

	.v-progress-linear,
	.v-progress-circular {
		animation: none;
	}
}
</style>
