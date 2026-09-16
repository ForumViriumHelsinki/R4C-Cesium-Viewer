<template>
	<v-navigation-drawer
		:model-value="modelValue"
		:width="panelWidth"
		location="right"
		temporary
		:scrim="false"
		class="analysis-panel"
		@update:model-value="$emit('update:modelValue', $event)"
	>
		<v-card
			flat
			class="h-100 d-flex flex-column"
		>
			<v-card-title class="d-flex align-center pa-3">
				<v-icon
					class="mr-2"
					size="small"
				>
					{{ entry?.icon || 'mdi-chart-line' }}
				</v-icon>
				<span class="text-subtitle-1">{{ entry ? analysisTitle(entry) : '' }}</span>
				<v-spacer />
				<v-btn
					icon
					variant="text"
					size="small"
					aria-label="Close analysis panel"
					@click="$emit('update:modelValue', false)"
				>
					<v-icon>mdi-close</v-icon>
				</v-btn>
			</v-card-title>
			<v-divider />
			<v-card-text class="flex-grow-1 overflow-y-auto pa-4">
				<component
					:is="activeComponent"
					v-if="activeComponent"
				/>
			</v-card-text>
		</v-card>
	</v-navigation-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { useDisplay } from 'vuetify'
import { analysisTitle, findAnalysis } from '../constants/analysisRegistry.js'
import { LAYOUT } from '../constants/layout.js'
import { useGlobalStore } from '../stores/globalStore'

const props = defineProps({
	modelValue: { type: Boolean, default: false },
	/** Registry id of the analysis to show (src/constants/analysisRegistry.js) */
	analysisType: { type: String, default: '' },
})

defineEmits(['update:modelValue'])

const { smAndDown } = useDisplay()
const globalStore = useGlobalStore()

const panelWidth = computed(() => (smAndDown.value ? '100%' : LAYOUT.ANALYSIS_PANEL_WIDTH))
const entry = computed(() => (props.analysisType ? findAnalysis(props.analysisType) : undefined))
const activeComponent = computed(() => entry.value?.component(globalStore.view) ?? null)
</script>

<style scoped>
.analysis-panel {
	z-index: 1200;
}

.v-btn:focus-visible {
	outline: 2px solid rgb(var(--v-theme-primary));
	outline-offset: 2px;
}
</style>
