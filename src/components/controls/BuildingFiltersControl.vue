<template>
	<div
		v-if="view !== 'grid'"
		class="control-group"
	>
		<h4 class="control-group-title">Building Filters</h4>

		<!-- Public/Social Buildings Filter -->
		<v-tooltip
			location="left"
			max-width="200"
		>
			<template #activator="{ props }">
				<div
					v-bind="props"
					class="control-item"
				>
					<v-switch
						:model-value="hideNonSote"
						color="blue"
						density="compact"
						hide-details
						@update:model-value="$emit('update:hideNonSote', $event)"
					/>
					<span class="control-label">
						{{ helsinkiView ? 'Social & Healthcare' : 'Public Buildings' }}
					</span>
				</div>
			</template>
			<span>
				{{
					helsinkiView
						? 'Show only social services and healthcare buildings'
						: 'Show only public and municipal buildings'
				}}
			</span>
		</v-tooltip>

		<!-- Building Age Filter (Helsinki only) -->
		<v-tooltip
			v-if="helsinkiView"
			location="left"
			max-width="200"
		>
			<template #activator="{ props }">
				<div
					v-bind="props"
					class="control-item"
				>
					<v-switch
						:model-value="hideNewBuildings"
						color="orange"
						density="compact"
						hide-details
						@update:model-value="$emit('update:hideNewBuildings', $event)"
					/>
					<span class="control-label">Pre-2018</span>
				</div>
			</template>
			<span>Show only buildings constructed before summer 2018</span>
		</v-tooltip>

		<!-- Building Height Filter -->
		<v-tooltip
			location="left"
			max-width="200"
		>
			<template #activator="{ props }">
				<div
					v-bind="props"
					class="control-item"
				>
					<v-switch
						:model-value="hideLow"
						color="purple"
						density="compact"
						hide-details
						@update:model-value="$emit('update:hideLow', $event)"
					/>
					<span class="control-label">Tall Buildings</span>
				</div>
			</template>
			<span>Show only tall buildings (filters out low-rise structures)</span>
		</v-tooltip>
	</div>
</template>

<script setup>
/**
 * @component BuildingFiltersControl
 * @description Control group for building filter toggles.
 *
 * Provides switches for filtering buildings by various criteria:
 * - Public/social buildings (SOTE)
 * - Building age (Pre-2018, Helsinki only)
 * - Building height (Tall buildings)
 *
 * **Props:**
 * - hideNonSote: Boolean - Filter for public/social buildings
 * - hideNewBuildings: Boolean - Filter for pre-2018 buildings (Helsinki only)
 * - hideLow: Boolean - Filter for tall buildings
 * - helsinkiView: Boolean - Whether Helsinki-specific view is active
 * - view: String - Current view mode
 *
 * **Emits:**
 * - update:hideNonSote - Public/social buildings filter changed
 * - update:hideNewBuildings - Building age filter changed
 * - update:hideLow - Building height filter changed
 *
 * @example
 * <BuildingFiltersControl
 *   v-model:hide-non-sote="hideNonSote"
 *   v-model:hide-new-buildings="hideNewBuildings"
 *   v-model:hide-low="hideLow"
 *   :helsinki-view="helsinkiView"
 *   :view="view"
 * />
 */

defineProps({
	hideNonSote: {
		type: Boolean,
		required: true,
	},
	hideNewBuildings: {
		type: Boolean,
		required: true,
	},
	hideLow: {
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
})

defineEmits(['update:hideNonSote', 'update:hideNewBuildings', 'update:hideLow'])
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
