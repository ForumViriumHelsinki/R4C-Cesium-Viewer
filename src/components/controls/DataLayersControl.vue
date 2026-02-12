<template>
	<div class="control-group">
		<h4 class="control-group-title">
			Data Layers
			<v-btn
				v-if="hasActiveLayers"
				icon
				size="x-small"
				variant="text"
				aria-label="Reset all data layers"
				class="ml-auto"
				@click="$emit('reset:layers')"
			>
				<v-icon size="16">mdi-layers-off</v-icon>
			</v-btn>
		</h4>

		<!-- Trees -->
		<v-tooltip
			v-if="view !== 'grid' && postalCode && featureFlagStore.isEnabled('treeCoverage')"
			location="right"
			max-width="200"
		>
			<template #activator="{ props }">
				<div
					v-bind="props"
					class="control-item"
					:class="{ loading: loadingStore.layerLoading.trees }"
				>
					<v-switch
						:model-value="showTrees"
						color="green"
						density="compact"
						hide-details
						:loading="loadingStore.layerLoading.trees"
						@update:model-value="$emit('update:showTrees', $event)"
					/>
					<span class="control-label">
						Trees
						<v-progress-circular
							v-if="loadingStore.layerLoading.trees"
							size="12"
							width="2"
							color="green"
							indeterminate
							class="ml-2"
						/>
						<v-icon
							v-if="loadingStore.cacheStatus.trees?.cached"
							size="12"
							color="blue"
							class="ml-1 cache-indicator"
						>
							mdi-cached
						</v-icon>
					</span>
				</div>
			</template>
			<span>Show individual trees in the selected postal code area</span>
		</v-tooltip>

		<!-- Vegetation (Helsinki only) -->
		<v-tooltip
			v-if="helsinkiView"
			location="right"
			max-width="200"
		>
			<template #activator="{ props }">
				<div
					v-bind="props"
					class="control-item"
				>
					<v-switch
						:model-value="showVegetation"
						color="green"
						density="compact"
						hide-details
						@update:model-value="$emit('update:showVegetation', $event)"
					/>
					<span class="control-label">
						Vegetation
						<v-icon
							v-if="loadingStore.cacheStatus.vegetation?.cached"
							size="12"
							color="blue"
							class="ml-1 cache-indicator"
						>
							mdi-cached
						</v-icon>
					</span>
				</div>
			</template>
			<span>Display vegetation areas and green spaces</span>
		</v-tooltip>

		<!-- Other Nature (Helsinki only) -->
		<v-tooltip
			v-if="helsinkiView"
			location="right"
			max-width="200"
		>
			<template #activator="{ props }">
				<div
					v-bind="props"
					class="control-item"
				>
					<v-switch
						:model-value="showOtherNature"
						color="green"
						density="compact"
						hide-details
						@update:model-value="$emit('update:showOtherNature', $event)"
					/>
					<span class="control-label">Other Nature</span>
				</div>
			</template>
			<span>Show parks, forests, and other natural areas</span>
		</v-tooltip>

		<!-- HSY Land Cover -->
		<v-tooltip
			v-if="!helsinkiView && featureFlagStore.isEnabled('landCover')"
			location="right"
			max-width="200"
		>
			<template #activator="{ props }">
				<div
					v-bind="props"
					class="control-item"
				>
					<v-switch
						:model-value="landCover"
						color="brown"
						density="compact"
						hide-details
						@update:model-value="$emit('update:landCover', $event)"
					/>
					<span class="control-label">Land Cover</span>
				</div>
			</template>
			<span>HSY land use classification showing different surface types</span>
		</v-tooltip>

		<!-- NDVI -->
		<v-tooltip
			v-if="featureFlagStore.isEnabled('ndvi')"
			location="right"
			max-width="200"
		>
			<template #activator="{ props }">
				<div
					v-bind="props"
					class="control-item"
				>
					<v-switch
						:model-value="ndvi"
						color="green"
						density="compact"
						hide-details
						@update:model-value="$emit('update:ndvi', $event)"
					/>
					<span class="control-label">NDVI</span>
				</div>
			</template>
			<span>Normalized Difference Vegetation Index - satellite-based vegetation density</span>
		</v-tooltip>
	</div>
</template>

<script setup>
/**
 * @component DataLayersControl
 * @description Control group for data layer toggles (trees, vegetation, land cover, NDVI).
 *
 * Provides switches for toggling various environmental and vegetation data layers.
 * Includes loading indicators, cache status icons, and view-specific layer visibility.
 *
 * **Props:**
 * - showTrees: Boolean - Trees layer visibility state
 * - showVegetation: Boolean - Vegetation layer visibility state
 * - showOtherNature: Boolean - Other nature layer visibility state
 * - landCover: Boolean - Land cover layer visibility state
 * - ndvi: Boolean - NDVI layer visibility state
 * - helsinkiView: Boolean - Whether Helsinki-specific view is active
 * - view: String - Current view mode
 * - postalCode: String - Current postal code
 *
 * **Emits:**
 * - update:showTrees - Trees layer toggle changed
 * - update:showVegetation - Vegetation layer toggle changed
 * - update:showOtherNature - Other nature layer toggle changed
 * - update:landCover - Land cover layer toggle changed
 * - update:ndvi - NDVI layer toggle changed
 *
 * @example
 * <DataLayersControl
 *   v-model:show-trees="showTrees"
 *   v-model:show-vegetation="showVegetation"
 *   v-model:show-other-nature="showOtherNature"
 *   v-model:land-cover="landCover"
 *   v-model:ndvi="ndvi"
 *   :helsinki-view="helsinkiView"
 *   :view="view"
 *   :postal-code="postalCode"
 * />
 */

import { computed } from 'vue'
import { useFeatureFlagStore } from '../../stores/featureFlagStore'
import { useLoadingStore } from '../../stores/loadingStore.js'

const featureFlagStore = useFeatureFlagStore()

const props = defineProps({
	showTrees: {
		type: Boolean,
		required: true,
	},
	showVegetation: {
		type: Boolean,
		required: true,
	},
	showOtherNature: {
		type: Boolean,
		required: true,
	},
	landCover: {
		type: Boolean,
		required: true,
	},
	ndvi: {
		type: Boolean,
		required: true,
	},
	helsinkiView: {
		type: Boolean,
		required: true,
	},
	view: {
		type: String,
		required: true,
	},
	postalCode: {
		type: String,
		default: null,
	},
})

defineEmits([
	'update:showTrees',
	'update:showVegetation',
	'update:showOtherNature',
	'update:landCover',
	'update:ndvi',
	'reset:layers',
])

const hasActiveLayers = computed(
	() =>
		props.showTrees ||
		props.showVegetation ||
		props.showOtherNature ||
		props.landCover ||
		props.ndvi
)

const loadingStore = useLoadingStore()
</script>

<style scoped>
.control-group {
	border: 1px solid rgba(0, 0, 0, 0.12);
	border-radius: 6px;
	overflow: hidden;
}

.control-group-title {
	font-size: 0.875rem;
	font-weight: 600;
	padding: 12px 16px 8px 16px;
	margin: 0;
	color: rgba(0, 0, 0, 0.87);
	background-color: rgba(0, 0, 0, 0.02);
	border-bottom: 1px solid rgba(0, 0, 0, 0.06);
	display: flex;
	align-items: center;
}

.control-item {
	display: flex;
	align-items: center;
	padding: 8px 16px;
	border-bottom: 1px solid rgba(0, 0, 0, 0.06);
	transition: background-color 0.2s;
}

.control-item:last-child {
	border-bottom: none;
}

.control-item:hover {
	background-color: rgba(0, 0, 0, 0.02);
}

.control-item.loading {
	background-color: rgba(25, 118, 210, 0.04);
	border-left: 3px solid #1976d2;
}

.control-label {
	font-size: 0.875rem;
	color: rgba(0, 0, 0, 0.87);
	margin-left: 12px;
	flex: 1;
	user-select: none;
}

/* Responsive adjustments */
@media (max-width: 768px) {
	.control-group-title {
		font-size: 0.8rem;
		padding: 10px 12px 6px 12px;
	}

	.control-item {
		padding: 6px 12px;
	}

	.control-label {
		font-size: 0.8rem;
		margin-left: 8px;
	}
}

/* High contrast mode support */
@media (prefers-contrast: high) {
	.control-group {
		border-width: 2px;
	}

	.control-item:hover {
		background-color: rgba(0, 0, 0, 0.1);
	}
}
</style>
