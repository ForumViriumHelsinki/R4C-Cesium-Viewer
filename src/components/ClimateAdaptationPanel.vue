<template>
	<div>
		<v-tabs
			v-model="adaptationTab"
			grow
		>
			<v-tab
				value="centers"
				:stacked="true"
				class="text-none"
			>
				Cooling Centers
			</v-tab>
			<v-tab
				value="optimizer"
				:stacked="true"
				class="text-none"
			>
				Optimizer
			</v-tab>
			<v-tab
				value="parks"
				:stacked="true"
				class="text-none"
			>
				Parks
			</v-tab>
		</v-tabs>
		<v-window v-model="adaptationTab">
			<v-window-item
				value="centers"
				class="pa-1"
			>
				<CoolingCenter />
			</v-window-item>
			<v-window-item
				value="optimizer"
				class="pa-1"
			>
				<CoolingCenterOptimiser />
			</v-window-item>
			<v-window-item
				value="parks"
				class="pa-1"
			>
				<LandcoverToParks />
			</v-window-item>
		</v-window>
		<div class="pa-2 mt-2">
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

const adaptationTab = ref('centers')
</script>
