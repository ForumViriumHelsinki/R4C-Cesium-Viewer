<template>
	<v-alert
		v-if="hasConflict"
		type="warning"
		density="compact"
		variant="tonal"
		class="layer-warning"
	>
		<template #prepend>
			<v-icon size="small"> mdi-alert </v-icon>
		</template>
		NDVI and Land Cover cannot be active simultaneously
	</v-alert>
</template>

<script setup>
/**
 * @component LayerConflictAlert
 * @description Warning alert for conflicting data layers.
 *
 * Displays a warning when NDVI and Land Cover layers are both active,
 * which is not supported. Only shows when there's an actual conflict.
 *
 * **Props:**
 * - hasConflict: Boolean - Whether a layer conflict exists
 *
 * @example
 * <LayerConflictAlert :has-conflict="landCover && ndvi" />
 */

defineProps({
	hasConflict: {
		type: Boolean,
		required: true,
	},
})
</script>

<style scoped>
.layer-warning {
	margin-top: 8px;
	font-size: 0.8rem;
}
</style>
