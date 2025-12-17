<template>
	<v-card class="graphics-quality-card">
		<v-card-title class="d-flex align-center">
			<v-icon class="mr-2"> mdi-palette </v-icon>
			Graphics Quality
			<v-spacer />
			<v-chip
				:color="qualityColor"
				size="small"
				variant="flat"
			>
				{{ graphicsStore.qualityLevel }}
			</v-chip>
		</v-card-title>

		<v-card-text>
			<!-- Quality Presets -->
			<v-row class="mb-3">
				<v-col cols="12">
					<v-label class="text-caption text-medium-emphasis mb-2"> Quick Presets </v-label>
					<v-btn-toggle
						v-model="selectedPreset"
						color="primary"
						variant="outlined"
						divided
						class="w-100"
						@update:model-value="applyPreset"
					>
						<v-btn
							value="ultra"
							size="small"
							:disabled="!canUseUltra"
						>
							Ultra
						</v-btn>
						<v-btn
							value="high"
							size="small"
						>
							High
						</v-btn>
						<v-btn
							value="medium"
							size="small"
						>
							Medium
						</v-btn>
						<v-btn
							value="low"
							size="small"
						>
							Low
						</v-btn>
						<v-btn
							value="performance"
							size="small"
						>
							Performance
						</v-btn>
					</v-btn-toggle>
				</v-col>
			</v-row>

			<v-divider class="my-3" />

			<!-- Anti-Aliasing Settings -->
			<v-row>
				<v-col cols="12">
					<v-label class="text-caption text-medium-emphasis mb-2"> Anti-Aliasing </v-label>

					<!-- MSAA Settings -->
					<div class="mb-3">
						<v-row
							align="center"
							no-gutters
						>
							<v-col>
								<v-switch
									v-model="msaaEnabled"
									:disabled="!graphicsStore.msaaSupported"
									color="primary"
									density="compact"
									hide-details
								>
									<template #label>
										<span class="text-body-2">
											MSAA
											<v-tooltip
												activator="parent"
												location="top"
											>
												Multi-Sample Anti-Aliasing - Hardware-based edge smoothing
											</v-tooltip>
										</span>
									</template>
								</v-switch>
							</v-col>
							<v-col
								v-if="!graphicsStore.msaaSupported"
								cols="auto"
							>
								<v-icon
									color="warning"
									size="small"
								>
									mdi-alert
								</v-icon>
							</v-col>
						</v-row>

						<v-slider
							v-if="msaaEnabled && graphicsStore.msaaSupported"
							v-model="msaaSamples"
							:min="1"
							:max="8"
							:step="1"
							:tick-labels="['Off', '2x', '', '4x', '', '', '', '8x']"
							show-ticks="always"
							tick-size="4"
							color="primary"
							hide-details
							class="mt-2"
						>
							<template #append>
								<span class="text-caption">{{ msaaSamples }}x</span>
							</template>
						</v-slider>
					</div>

					<!-- FXAA Settings -->
					<v-switch
						v-model="fxaaEnabled"
						color="primary"
						density="compact"
						hide-details
					>
						<template #label>
							<span class="text-body-2">
								FXAA
								<v-tooltip
									activator="parent"
									location="top"
								>
									Fast Approximate Anti-Aliasing - Post-processing edge smoothing
								</v-tooltip>
							</span>
						</template>
					</v-switch>
				</v-col>
			</v-row>

			<v-divider class="my-3" />

			<!-- Advanced Settings -->
			<v-row>
				<v-col cols="12">
					<v-label class="text-caption text-medium-emphasis mb-2"> Advanced Rendering </v-label>

					<!-- HDR -->
					<v-switch
						v-model="hdrEnabled"
						:disabled="!graphicsStore.hdrSupported"
						color="primary"
						density="compact"
						hide-details
						class="mb-2"
					>
						<template #label>
							<div class="d-flex align-center">
								<span class="text-body-2">HDR</span>
								<v-icon
									v-if="!graphicsStore.hdrSupported"
									color="warning"
									size="small"
									class="ml-1"
								>
									mdi-alert
								</v-icon>
								<v-tooltip
									activator="parent"
									location="top"
								>
									High Dynamic Range rendering for better lighting
								</v-tooltip>
							</div>
						</template>
					</v-switch>

					<!-- Ambient Occlusion -->
					<v-switch
						v-model="ambientOcclusionEnabled"
						:disabled="!graphicsStore.ambientOcclusionSupported"
						color="primary"
						density="compact"
						hide-details
						class="mb-2"
					>
						<template #label>
							<div class="d-flex align-center">
								<span class="text-body-2">Ambient Occlusion</span>
								<v-icon
									v-if="!graphicsStore.ambientOcclusionSupported"
									color="warning"
									size="small"
									class="ml-1"
								>
									mdi-alert
								</v-icon>
								<v-tooltip
									activator="parent"
									location="top"
								>
									Enhanced shadows and depth for 3D buildings
								</v-tooltip>
							</div>
						</template>
					</v-switch>

					<!-- Performance Mode -->
					<v-switch
						v-model="requestRenderMode"
						color="primary"
						density="compact"
						hide-details
					>
						<template #label>
							<span class="text-body-2">
								Performance Mode
								<v-tooltip
									activator="parent"
									location="top"
								>
									Only render when scene changes (saves battery/CPU)
								</v-tooltip>
							</span>
						</template>
					</v-switch>
				</v-col>
			</v-row>

			<!-- Performance Indicator -->
			<v-row class="mt-3">
				<v-col cols="12">
					<v-alert
						v-if="showPerformanceWarning"
						type="warning"
						density="compact"
						variant="tonal"
						class="text-caption"
					>
						High quality settings may impact performance on slower devices
					</v-alert>

					<div class="text-caption text-medium-emphasis d-flex align-center">
						<v-icon
							size="small"
							class="mr-1"
						>
							mdi-information
						</v-icon>
						Anti-aliasing: {{ antiAliasingStatus }}
					</div>
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useGraphicsStore } from '../stores/graphicsStore.js'

export default {
	name: 'GraphicsQuality',
	setup() {
		const graphicsStore = useGraphicsStore()
		const selectedPreset = ref(null)

		// Reactive properties
		const msaaEnabled = computed({
			get: () => graphicsStore.msaaEnabled,
			set: (value) => graphicsStore.setMsaaSettings(value, graphicsStore.msaaSamples),
		})

		const msaaSamples = computed({
			get: () => graphicsStore.msaaSamples,
			set: (value) => graphicsStore.setMsaaSettings(graphicsStore.msaaEnabled, value),
		})

		const fxaaEnabled = computed({
			get: () => graphicsStore.fxaaEnabled,
			set: (value) => graphicsStore.setFxaaEnabled(value),
		})

		const hdrEnabled = computed({
			get: () => graphicsStore.hdrEnabled,
			set: (value) => graphicsStore.setHdrEnabled(value),
		})

		const ambientOcclusionEnabled = computed({
			get: () => graphicsStore.ambientOcclusionEnabled,
			set: (value) => graphicsStore.setAmbientOcclusionEnabled(value),
		})

		const requestRenderMode = computed({
			get: () => graphicsStore.requestRenderMode,
			set: (value) => {
				graphicsStore.setRequestRenderMode(value)
				// Note: Request render mode requires viewer restart to take effect
				if (value) {
					console.warn('Performance mode requires page refresh to take effect')
				}
			},
		})

		// Computed properties for UI
		const qualityColor = computed(() => {
			const level = graphicsStore.qualityLevel
			switch (level) {
				case 'Ultra':
					return 'purple'
				case 'High':
					return 'primary'
				case 'Medium':
					return 'success'
				case 'Low (FXAA)':
					return 'warning'
				default:
					return 'grey'
			}
		})

		const canUseUltra = computed(() => {
			return (
				graphicsStore.msaaSupported &&
				graphicsStore.hdrSupported &&
				graphicsStore.ambientOcclusionSupported
			)
		})

		const showPerformanceWarning = computed(() => {
			return (
				(msaaEnabled.value && msaaSamples.value >= 4) ||
				hdrEnabled.value ||
				ambientOcclusionEnabled.value
			)
		})

		const antiAliasingStatus = computed(() => {
			if (msaaEnabled.value && graphicsStore.msaaSupported && msaaSamples.value > 1) {
				return `MSAA ${msaaSamples.value}x`
			} else if (fxaaEnabled.value) {
				return 'FXAA'
			} else {
				return 'None'
			}
		})

		// Methods
		const applyPreset = (preset) => {
			if (preset) {
				graphicsStore.applyQualityPreset(preset)
			}
		}

		// Watch for external changes to update preset selection
		// Capture stop handler for explicit cleanup on unmount
		const stopWatchGraphicsSettings = watch(
			() => [
				graphicsStore.msaaEnabled,
				graphicsStore.msaaSamples,
				graphicsStore.fxaaEnabled,
				graphicsStore.hdrEnabled,
				graphicsStore.ambientOcclusionEnabled,
				graphicsStore.requestRenderMode,
			],
			() => {
				// Auto-detect current preset
				selectedPreset.value = detectCurrentPreset()
			},
			{ deep: true }
		)

		onBeforeUnmount(() => {
			// Stop watcher to prevent stale callbacks
			stopWatchGraphicsSettings()
		})

		const detectCurrentPreset = () => {
			const state = graphicsStore

			// Ultra preset
			if (
				state.msaaEnabled &&
				state.msaaSamples === 8 &&
				!state.fxaaEnabled &&
				state.hdrEnabled &&
				state.ambientOcclusionEnabled &&
				!state.requestRenderMode
			) {
				return 'ultra'
			}

			// High preset
			if (
				state.msaaEnabled &&
				state.msaaSamples === 4 &&
				!state.fxaaEnabled &&
				!state.hdrEnabled &&
				state.ambientOcclusionEnabled &&
				!state.requestRenderMode
			) {
				return 'high'
			}

			// Medium preset
			if (
				state.msaaEnabled &&
				state.msaaSamples === 2 &&
				!state.fxaaEnabled &&
				!state.hdrEnabled &&
				!state.ambientOcclusionEnabled &&
				!state.requestRenderMode
			) {
				return 'medium'
			}

			// Low preset
			if (
				!state.msaaEnabled &&
				state.fxaaEnabled &&
				!state.hdrEnabled &&
				!state.ambientOcclusionEnabled &&
				!state.requestRenderMode
			) {
				return 'low'
			}

			// Performance preset
			if (
				!state.msaaEnabled &&
				!state.fxaaEnabled &&
				!state.hdrEnabled &&
				!state.ambientOcclusionEnabled &&
				state.requestRenderMode
			) {
				return 'performance'
			}

			return null // Custom settings
		}

		return {
			graphicsStore,
			selectedPreset,
			msaaEnabled,
			msaaSamples,
			fxaaEnabled,
			hdrEnabled,
			ambientOcclusionEnabled,
			requestRenderMode,
			qualityColor,
			canUseUltra,
			showPerformanceWarning,
			antiAliasingStatus,
			applyPreset,
		}
	},
}
</script>

<style scoped>
.graphics-quality-card {
	margin-bottom: 16px;
}

.v-btn-toggle .v-btn {
	font-size: 11px;
}

.v-slider :deep(.v-slider__tick-label) {
	font-size: 10px;
}
</style>
