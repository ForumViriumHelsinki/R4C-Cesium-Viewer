<template>
	<div class="analysis-entry-list">
		<template
			v-for="entry in entries"
			:key="entry.id"
		>
			<v-expansion-panels
				v-if="entry.placement === 'expansion'"
				class="expansion-outlined"
			>
				<v-expansion-panel>
					<v-expansion-panel-title>
						<v-icon class="mr-2">{{ entry.icon }}</v-icon>
						{{ entry.label }}
					</v-expansion-panel-title>
					<v-expansion-panel-text class="pa-0">
						<component :is="entry.component(view)" />
					</v-expansion-panel-text>
				</v-expansion-panel>
			</v-expansion-panels>
			<v-btn
				v-else
				block
				variant="outlined"
				:prepend-icon="entry.icon"
				@click="emit('open', entry)"
			>
				{{ entry.label }}
			</v-btn>
		</template>

		<ChartCard
			v-if="inlineEntry"
			class="inline-chart mt-3"
			:title="analysisTitle(inlineEntry)"
			:icon="inlineEntry.icon"
			@close="emit('close-inline')"
		>
			<component :is="inlineEntry.component(view)" />
		</ChartCard>
	</div>
</template>

<script setup>
/**
 * Renders registry entries for one sidebar tab: a button per entry (or an
 * expansion panel for `placement: 'expansion'`), followed by the open inline
 * card when it belongs to this list. See src/constants/analysisRegistry.js.
 */
import { analysisTitle } from '../constants/analysisRegistry.js'
import ChartCard from './ChartCard.vue'

/** @typedef {import('../constants/analysisRegistry.js').AnalysisEntry} AnalysisEntry */
/** @typedef {import('../constants/analysisRegistry.js').ViewMode} ViewMode */

defineProps({
	entries: {
		type: /** @type {import('vue').PropType<AnalysisEntry[]>} */ (Array),
		required: true,
	},
	/** Open inline entry, when it is listed here */
	inlineEntry: {
		type: /** @type {import('vue').PropType<AnalysisEntry | null>} */ (Object),
		default: null,
	},
	view: {
		type: /** @type {import('vue').PropType<ViewMode>} */ (String),
		required: true,
	},
})

const emit = defineEmits(['open', 'close-inline'])
</script>

<style scoped>
.analysis-entry-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.inline-chart {
	border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
	border-radius: 8px;
	padding: 12px;
}

.expansion-outlined :deep(.v-expansion-panel) {
	border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
	background: transparent;
}

.v-btn:focus-visible {
	outline: 2px solid rgb(var(--v-theme-primary));
	outline-offset: 2px;
}
</style>
