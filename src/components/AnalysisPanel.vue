<template>
	<v-navigation-drawer
		:model-value="modelValue"
		:width="panelWidth"
		location="right"
		temporary
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
					{{ config?.icon || 'mdi-chart-line' }}
				</v-icon>
				<span class="text-subtitle-1">{{ config?.title || '' }}</span>
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
import { computed, defineAsyncComponent } from 'vue'
import { useDisplay } from 'vuetify'
import { useGlobalStore } from '../stores/globalStore'

const props = defineProps({
	modelValue: { type: Boolean, default: false },
	analysisType: { type: String, default: '' },
	analysisConfig: { type: Object, default: () => ({}) },
})

defineEmits(['update:modelValue'])

const { smAndDown } = useDisplay()
const globalStore = useGlobalStore()
const currentView = computed(() => globalStore.view)

const panelWidth = computed(() => (smAndDown.value ? '100%' : 480))
const config = computed(() => props.analysisConfig[props.analysisType])

// Lazy-loaded chart components
const componentMap = {
	socioeconomics: defineAsyncComponent(() => import('../views/SocioEconomics.vue')),
	'scatter-plot-default': defineAsyncComponent(() => import('../views/BuildingScatterPlot.vue')),
	'scatter-plot-helsinki': defineAsyncComponent(() => import('../components/Scatterplot.vue')),
	'ndvi-analysis': defineAsyncComponent(() => import('../views/PostalCodeNDVI.vue')),
}

const activeComponent = computed(() => {
	if (!props.analysisType) return null
	if (props.analysisType === 'scatter-plot') {
		return currentView.value === 'helsinki'
			? componentMap['scatter-plot-helsinki']
			: componentMap['scatter-plot-default']
	}
	return componentMap[props.analysisType] || null
})
</script>

<style scoped>
.analysis-panel {
	z-index: 1200;
}

.v-btn:focus-visible {
	outline: 2px solid #1976d2;
	outline-offset: 2px;
}
</style>
