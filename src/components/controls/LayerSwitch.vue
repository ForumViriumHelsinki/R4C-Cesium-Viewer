<template>
	<v-tooltip
		location="right"
		max-width="200"
		:aria-label="config.description"
	>
		<template #activator="{ props: tooltipProps }">
			<div
				v-bind="tooltipProps"
				class="control-item layer-switch"
				:data-layer="layer"
			>
				<v-switch
					:model-value="enabled"
					:aria-label="config.label"
					:color="config.color"
					density="compact"
					hide-details
					@update:model-value="toggle"
				/>
				<span class="control-label">{{ config.label }}</span>
			</div>
		</template>
		<span>{{ config.description }}</span>
	</v-tooltip>
</template>

<script setup>
/**
 * @component LayerSwitch
 * @description The one visibility control for a map layer that can be switched from
 * more than one place (#1155): the Layers tab (DataLayersControl) and the layer's
 * Analysis panel (LandcoverPanel, NDVIPanel). Every instance is bound to the same
 * toggleStore field and switches the layer through the same function, so a change
 * in one place shows in the other, and every instance carries the same name.
 *
 * @example
 * <LayerSwitch layer="landCover" />
 */

import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { LAYER_LABELS } from '../../constants/metricLabels.js'
import { useToggleStore } from '../../stores/toggleStore.js'
import { LAYER_TOGGLES } from './layerToggles.js'

/** @typedef {'landCover' | 'ndvi'} SwitchableLayer */

/** Name, tooltip and switch colour per layer. */
const LAYER_CONFIG = Object.freeze({
	landCover: {
		label: LAYER_LABELS.LAND_COVER,
		description:
			'HSY classification of surface types: trees by height, low vegetation, fields, bare rock and soil, roads, other paved surfaces and water',
		color: 'brown',
	},
	ndvi: {
		label: LAYER_LABELS.NDVI,
		description: 'Normalized Difference Vegetation Index - satellite-based vegetation density',
		color: 'green',
	},
})

const props = defineProps({
	/** toggleStore field of the layer. */
	layer: {
		type: /** @type {import('vue').PropType<SwitchableLayer>} */ (String),
		required: true,
		validator: (value) => value === 'landCover' || value === 'ndvi',
	},
})

const toggleStore = useToggleStore()
const layerState = storeToRefs(toggleStore)

const config = computed(() => LAYER_CONFIG[props.layer])
const enabled = computed(() => layerState[props.layer].value)

/** @param {boolean | null} value */
const toggle = (value) => LAYER_TOGGLES[props.layer](Boolean(value))
</script>

<style scoped>
.control-item {
	display: flex;
	align-items: center;
	padding: 8px 16px;
	border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
	transition: background-color 0.2s;
}

.control-item:last-child {
	border-bottom: none;
}

.control-item:hover {
	background-color: rgba(var(--v-theme-on-surface), 0.02);
}

.control-label {
	font-size: 0.875rem;
	color: rgba(var(--v-theme-on-surface), 0.87);
	margin-left: 12px;
	flex: 1;
	user-select: none;
}

@media (max-width: 768px) {
	.control-item {
		padding: 6px 12px;
	}

	.control-label {
		font-size: 0.8rem;
		margin-left: 8px;
	}
}

@media (prefers-contrast: high) {
	.control-item:hover {
		background-color: rgba(var(--v-theme-on-surface), 0.1);
	}
}
</style>
