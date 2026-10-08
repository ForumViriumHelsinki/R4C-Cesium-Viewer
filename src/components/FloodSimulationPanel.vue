<template>
	<div
		class="vtt-flood-panel"
		role="region"
		aria-label="VTT flood simulation controls"
	>
		<div class="d-flex align-center mb-2">
			<v-icon
				size="small"
				class="mr-2"
			>
				mdi-water
			</v-icon>
			<span class="text-subtitle-2">VTT Flood Simulation</span>
			<v-chip
				size="x-small"
				color="warning"
				class="ml-2"
				variant="tonal"
			>
				VTT / FVH internal
			</v-chip>
			<v-chip
				v-if="syntheticData"
				size="x-small"
				color="info"
				class="ml-2"
				variant="tonal"
			>
				Synthetic data
			</v-chip>
			<v-spacer />
			<v-btn
				icon
				variant="text"
				size="x-small"
				:aria-label="'Close VTT flood simulation panel'"
				@click="emit('close')"
			>
				<v-icon size="small">mdi-close</v-icon>
			</v-btn>
		</div>

		<v-select
			:model-value="store.scenarioId"
			:items="scenarioItems"
			item-title="label"
			item-value="id"
			label="Scenario"
			density="compact"
			variant="outlined"
			hide-details
			class="mb-2"
			@update:model-value="onScenarioChange"
		/>
		<div class="text-caption mb-3 vtt-scenario-description">
			{{ activeScenarioDescription }}
		</div>

		<div class="d-flex align-center justify-space-between mb-1">
			<span class="text-caption">Frame</span>
			<span class="text-caption font-weight-medium">
				{{ store.frameNumber }} / {{ store.frameCount - 1 }} ({{ store.frameOffsetLabel }})
			</span>
		</div>
		<v-slider
			:model-value="store.frameNumber"
			:min="0"
			:max="store.frameCount - 1"
			:step="1"
			color="primary"
			density="compact"
			hide-details
			thumb-label
			class="mb-2"
			@update:model-value="onFrameChange"
		/>
		<v-text-field
			:model-value="store.frameNumber"
			type="number"
			:min="0"
			:max="store.frameCount - 1"
			label="Frame number"
			density="compact"
			variant="outlined"
			hide-details
			class="mb-3"
			@update:model-value="onFrameInput"
		/>

		<p class="text-caption mb-1">View dimension</p>
		<v-radio-group
			:model-value="store.dimension"
			density="compact"
			hide-details
			class="mb-2"
			@update:model-value="onDimensionChange"
		>
			<v-radio
				v-for="dim in VTT_DIMENSIONS"
				:key="dim.key"
				:value="dim.key"
				:label="`${dim.label} (${dim.unit})`"
			/>
		</v-radio-group>

		<p class="text-caption mb-1">Camera</p>
		<!-- @click per button, not @update:model-value: a mandatory toggle does not
		     re-emit for the active value, and re-clicking it re-frames the extent. -->
		<v-btn-toggle
			:model-value="cameraView"
			mandatory
			density="compact"
			variant="outlined"
			divided
			class="mb-3"
		>
			<v-btn
				value="oblique"
				size="small"
				aria-label="Oblique view of flood extent"
				@click="onCameraView('oblique')"
			>
				Oblique
			</v-btn>
			<v-btn
				value="topDown"
				size="small"
				aria-label="Top-down view of flood extent"
				@click="onCameraView('topDown')"
			>
				Top-down
			</v-btn>
		</v-btn-toggle>

		<div class="d-flex align-center justify-space-between mb-1">
			<span
				id="vtt-opacity-label"
				class="text-caption"
			>
				Opacity
			</span>
			<span class="text-caption font-weight-medium">{{ opacityPercent }} %</span>
		</div>
		<v-slider
			:model-value="store.opacity"
			:min="VTT_OPACITY_MIN"
			:max="VTT_OPACITY_MAX"
			:step="VTT_OPACITY_STEP"
			color="primary"
			density="compact"
			hide-details
			aria-labelledby="vtt-opacity-label"
			class="mb-2"
			@update:model-value="onOpacityChange"
		/>

		<div
			v-if="colorScale && colorScale.mode !== 'empty'"
			class="vtt-legend mb-2"
			role="img"
			:aria-label="legendAriaLabel"
		>
			<template v-if="colorScale.mode === 'classes'">
				<div
					class="vtt-legend-bar"
					:style="{ background: legendGradient ?? undefined }"
				/>
				<div class="vtt-legend-ticks text-caption">
					<span
						v-for="tick in legendTickList"
						:key="tick.label"
						class="vtt-legend-tick"
						:style="tickStyle(tick)"
					>
						{{ tick.label }}
					</span>
				</div>
			</template>
			<div
				v-else
				class="d-flex align-center text-caption"
			>
				<span
					class="vtt-legend-swatch mr-2"
					:style="{ background: colorScale.classes[0].color }"
				/>
				{{ maskLabel }}
			</div>
			<div class="text-caption vtt-legend-caption">{{ legendCaption }}</div>
			<div class="text-caption vtt-legend-caption">{{ hiddenCellsLabel }}</div>
		</div>
		<v-alert
			v-else-if="emptyMessage"
			type="info"
			density="compact"
			variant="tonal"
			class="mb-2"
		>
			{{ emptyMessage }}
		</v-alert>

		<v-progress-linear
			v-if="store.isLoading"
			indeterminate
			color="primary"
			class="mb-2"
		/>
		<v-alert
			v-if="store.error"
			type="warning"
			density="compact"
			variant="tonal"
			class="mb-2"
			icon="mdi-alert-circle-outline"
		>
			{{ store.error }}
			<div
				v-if="!syntheticData"
				class="text-caption mt-1"
			>
				Enable the "VTT Flood Synthetic Data" feature flag to preview the panel with locally
				generated frames while the API is unavailable.
			</div>
		</v-alert>
	</div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
	VTT_DEFAULT_CAMERA_VIEW,
	VTT_DIMENSIONS,
	VTT_OPACITY_MAX,
	VTT_OPACITY_MIN,
	VTT_OPACITY_STEP,
	VTT_SCENARIOS,
} from '../constants/vttFlood'
import { clearFlood, hideFlood, renderFlood } from '../services/vttFlood.js'
import { flyToFloodExtent } from '../services/vttFloodCamera.js'
import { useFeatureFlagStore } from '../stores/featureFlagStore'
import { useGlobalStore } from '../stores/globalStore.js'
import { useVttFloodStore } from '../stores/vttFloodStore'
import logger from '../utils/logger.js'
import {
	buildColorScale,
	formatLegendValue,
	legendGradientCss,
	legendTicks,
} from '../utils/vttFloodColorScale.js'

const emit = defineEmits(['close'])

const store = useVttFloodStore()
const globalStore = useGlobalStore()
const featureFlagStore = useFeatureFlagStore()

const syntheticData = computed(() => featureFlagStore.isEnabled('vttFloodSyntheticData'))

// Flipping the synthetic-data flag while the panel is open re-loads the
// current frame from the newly selected source.
const stopSyntheticWatcher = watch(syntheticData, () => {
	store.fetchCurrentFrame()
})

const scenarioItems = VTT_SCENARIOS.map((s) => ({ id: s.id, label: s.label }))

const activeScenarioDescription = computed(() => {
	const match = VTT_SCENARIOS.find((s) => s.id === store.scenarioId)
	return match?.description ?? ''
})

const activeDimensionMeta = computed(
	() => VTT_DIMENSIONS.find((d) => d.key === store.dimension) ?? VTT_DIMENSIONS[0]
)
const activeDimensionUnit = computed(() => activeDimensionMeta.value.unit)

// The one colour scale for this frame and dimension: the legend reads it and
// renderFlood draws with it.
const colorScale = computed(() => {
	const frame = store.frame
	if (!frame) return null
	return buildColorScale(activeDimensionMeta.value, frame.values[store.dimension])
})

const opacityPercent = computed(() => Math.round(store.opacity * 100))
const legendGradient = computed(() =>
	colorScale.value ? legendGradientCss(colorScale.value) : null
)
const legendTickList = computed(() => (colorScale.value ? legendTicks(colorScale.value) : []))

/** Keep end labels inside the bar: shift each label left by its own position. */
function tickStyle(tick) {
	const pct = tick.at * 100
	return { left: `${pct}%`, transform: `translateX(-${pct}%)` }
}

const legendCaption = computed(() => {
	const scale = colorScale.value
	const unit = activeDimensionUnit.value
	if (!scale || scale.mode === 'empty') return ''
	if (scale.mode === 'mask') return `All shown cells share one value (${unit})`
	if (scale.kind === 'fixed') return `Fixed classes (${unit})`
	return `Classes span the 2nd–98th percentile of shown cells in this frame (${unit})`
})

const hiddenCellsLabel = computed(() => {
	const scale = colorScale.value
	if (!scale || scale.hiddenCount === 0) return ''
	const threshold = scale.hideBelow
	const rule = Number.isFinite(threshold)
		? `≤ ${formatLegendValue(threshold)} ${activeDimensionUnit.value}`
		: 'without a value'
	return `Cells ${rule} hidden (${scale.hiddenCount.toLocaleString('en-US')})`
})

const maskLabel = computed(() => {
	const scale = colorScale.value
	if (!scale || scale.mode !== 'mask') return ''
	return `${formatLegendValue(scale.value ?? 0)} ${activeDimensionUnit.value} (${scale.shownCount.toLocaleString('en-US')} cells)`
})

const legendAriaLabel = computed(() => {
	const scale = colorScale.value
	const unit = activeDimensionUnit.value
	if (!scale || scale.mode === 'empty') return ''
	if (scale.mode === 'mask') return `Legend: one colour for ${maskLabel.value}`
	const ticks = legendTickList.value
	return `Legend: ${scale.classes.length} colour classes from light to dark, ${ticks[0]?.label} to ${ticks.at(-1)?.label} ${unit}`
})

const emptyMessage = computed(() => {
	const scale = colorScale.value
	const meta = activeDimensionMeta.value
	if (!scale || scale.mode !== 'empty') return ''
	if (scale.reason === 'no-variation') {
		return `No variation in this frame: all ${scale.totalCount.toLocaleString('en-US')} cells are ${formatLegendValue(scale.value ?? 0)} ${meta.unit}.`
	}
	if (scale.reason === 'all-hidden') {
		return `No cells above ${formatLegendValue(scale.threshold ?? 0)} ${meta.unit} in this frame.`
	}
	return `No ${meta.label.toLowerCase()} values in this frame.`
})

// Camera orientation is not stored: the camera itself is in the URL already
// (lon/lat/alt/heading/pitch), and the toggle resets to oblique on reopen.
const cameraView = ref(VTT_DEFAULT_CAMERA_VIEW)
function onCameraView(view) {
	cameraView.value = view
	flyToFloodExtent({ viewer: globalStore.cesiumViewer, view })
}

function onScenarioChange(id) {
	if (id) store.selectScenario(id)
}
function onDimensionChange(key) {
	if (key) store.setDimension(key)
}
function onOpacityChange(value) {
	store.setOpacity(Number(value))
}
function onFrameChange(value) {
	store.setFrame(Number(value))
}
function onFrameInput(value) {
	const n = Number(value)
	if (!Number.isFinite(n)) return
	const clamped = Math.max(0, Math.min(store.frameCount - 1, Math.round(n)))
	store.setFrame(clamped)
}

// Re-render whenever the frame, its colour scale (frame or dimension change) or
// the opacity changes. The component owns Cesium calls; the store stays
// viewer-agnostic. renderFlood is synchronous and restyles the existing layer,
// so rapid changes cannot stack layers or queue rebuilds.
const stopRenderWatcher = watch([() => store.frame, colorScale, () => store.opacity], () => {
	const viewer = globalStore.cesiumViewer
	if (!viewer) return
	const frame = store.frame
	if (!frame) {
		// Between scenarios or after an error: hide, keep the geometry.
		hideFlood({ viewer })
		return
	}
	try {
		renderFlood({
			viewer,
			frame,
			dimension: store.dimension,
			opacity: store.opacity,
			scale: colorScale.value ?? undefined,
		})
	} catch (error) {
		logger.error('[FloodSimulationPanel] Render failed:', error)
	}
})

onMounted(() => {
	// Fetch on mount so the initial frame appears without an extra click.
	store.fetchCurrentFrame()
})

onUnmounted(() => {
	// Stop the watchers first so nothing re-creates the layer after it is cleared.
	stopRenderWatcher()
	stopSyntheticWatcher()
	const viewer = globalStore.cesiumViewer
	if (viewer) clearFlood({ viewer })
	store.clear()
})
</script>

<style scoped>
.vtt-flood-panel {
	padding: 12px;
	border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
	border-radius: 8px;
	background: rgba(var(--v-theme-surface), 0.6);
}

.vtt-scenario-description {
	color: rgba(var(--v-theme-on-surface), 0.7);
	font-style: italic;
}

.vtt-legend {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.vtt-legend-bar {
	height: 8px;
	border-radius: 4px;
	border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.vtt-legend-ticks {
	position: relative;
	height: 1.25rem;
}

.vtt-legend-tick {
	position: absolute;
	white-space: nowrap;
}

.vtt-legend-swatch {
	display: inline-block;
	width: 16px;
	height: 8px;
	border-radius: 2px;
	border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.vtt-legend-caption {
	color: rgba(var(--v-theme-on-surface), 0.7);
}
</style>
