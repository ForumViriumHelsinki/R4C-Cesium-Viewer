<template>
	<div>
		<v-btn-toggle
			v-model="adaptationTab"
			mandatory
			divided
			density="compact"
			variant="outlined"
			color="primary"
			class="adaptation-tool-switch"
			aria-label="Climate adaptation tool"
		>
			<v-btn
				v-for="tool in TOOLS"
				:key="tool.value"
				:value="tool.value"
				size="small"
				class="text-none"
			>
				{{ tool.label }}
			</v-btn>
		</v-btn-toggle>
		<v-window v-model="adaptationTab">
			<v-window-item value="centers">
				<CoolingCenter />
			</v-window-item>
			<v-window-item value="optimizer">
				<CoolingCenterOptimiser />
			</v-window-item>
			<v-window-item value="parks">
				<LandcoverToParks />
			</v-window-item>
		</v-window>
		<div class="mt-2">
			<EstimatedImpacts />
		</div>
	</div>
</template>

<script setup>
import { defineAsyncComponent, ref } from 'vue'

const CoolingCenter = defineAsyncComponent(() => import('./CoolingCenter.vue'))
const CoolingCenterOptimiser = defineAsyncComponent(() => import('./CoolingCenterOptimiser.vue'))
const EstimatedImpacts = defineAsyncComponent(() => import('./EstimatedImpacts.vue'))
const LandcoverToParks = defineAsyncComponent(() => import('./LandcoverToParks.vue'))

/** Short labels so all three fit the sidebar without scroll arrows. */
const TOOLS = [
	{ value: 'centers', label: 'Centers' },
	{ value: 'optimizer', label: 'Optimize' },
	{ value: 'parks', label: 'Parks' },
]

const adaptationTab = ref('centers')
</script>

<style scoped>
.adaptation-tool-switch {
	display: flex;
	width: 100%;
}

.adaptation-tool-switch :deep(.v-btn) {
	flex: 1 1 0;
	min-width: 0;
}
</style>
