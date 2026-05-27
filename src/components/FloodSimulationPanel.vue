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
			@update:model-value="store.setDimension"
		>
			<v-radio
				v-for="dim in VTT_DIMENSIONS"
				:key="dim.key"
				:value="dim.key"
				:label="`${dim.label} (${dim.unit})`"
			/>
		</v-radio-group>

		<div
			class="vtt-legend mb-2"
			role="img"
			:aria-label="`Legend: blue indicates ${legendMin}, red indicates ${legendMax}`"
		>
			<div class="vtt-legend-bar" />
			<div class="d-flex justify-space-between text-caption">
				<span>{{ legendMin }} {{ activeDimensionUnit }}</span>
				<span>{{ legendMax }} {{ activeDimensionUnit }}</span>
			</div>
		</div>

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
		</v-alert>
	</div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { VTT_DIMENSIONS, VTT_SCENARIOS } from '../constants/vttFlood.ts'
import { clearFlood, renderFlood } from '../services/vttFlood.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { useVttFloodStore } from '../stores/vttFloodStore.ts'
import logger from '../utils/logger.js'

const emit = defineEmits(['close'])

const store = useVttFloodStore()
const globalStore = useGlobalStore()

const scenarioItems = VTT_SCENARIOS.map((s) => ({ id: s.id, label: s.label }))

const activeScenarioDescription = computed(() => {
	const match = VTT_SCENARIOS.find((s) => s.id === store.scenarioId)
	return match?.description ?? ''
})

const activeDimensionMeta = computed(
	() => VTT_DIMENSIONS.find((d) => d.key === store.dimension) ?? VTT_DIMENSIONS[0]
)
const activeDimensionUnit = computed(() => activeDimensionMeta.value.unit)

function formatRange(value) {
	if (!Number.isFinite(value)) return '—'
	return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2)
}

const legendMin = computed(() => formatRange(store.activeRange.min))
const legendMax = computed(() => formatRange(store.activeRange.max))

function onScenarioChange(id) {
	if (id) store.selectScenario(id)
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

// Re-render whenever frame data or selected dimension changes. The component
// owns Cesium calls; the store stays viewer-agnostic.
const stopRenderWatcher = watch(
	() => [store.frame, store.dimension],
	async ([frame, dimension]) => {
		const viewer = globalStore.cesiumViewer
		if (!viewer) return
		if (!frame) {
			await clearFlood({ viewer })
			return
		}
		try {
			await renderFlood({ viewer, frame, dimension })
		} catch (error) {
			logger.error('[FloodSimulationPanel] Render failed:', error)
		}
	}
)

onMounted(() => {
	// Always fetch on first mount so the initial frame appears without an
	// extra click. Subsequent open/close cycles re-mount the component, which
	// is fine — the store caches frame data and skips network if scenario+frame
	// haven't changed (handled via _requestSeq dedup).
	store.fetchCurrentFrame()
})

onUnmounted(async () => {
	stopRenderWatcher()
	const viewer = globalStore.cesiumViewer
	if (viewer) {
		await clearFlood({ viewer })
	}
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
	background: linear-gradient(
		to right,
		rgb(33, 102, 172),
		rgb(178, 24, 43)
	);
	border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
</style>
