<template>
	<div
		v-if="coolingCenters.length"
		class="mt-4"
	>
		<v-divider class="my-4" />
		<h3>Estimated Impacts</h3>
		<p>Total Centers Added: {{ coolingCenters.length }}</p>
		<p>Total Cells Affected: {{ affectedCells.length }}</p>
		<p>Total Heat Vulnerability impact: {{ impact }}</p>
		<p v-if="optimised">In optimization the minimum distance between two cooling centers is 500m</p>
	</div>
</template>

<script setup>
import { computed } from 'vue'
import { useMitigationStore } from '../stores/mitigationStore'

const mitigationStore = useMitigationStore()
const _coolingCenters = computed(() => mitigationStore.coolingCenters)
const _affectedCells = computed(() => mitigationStore.affected)
const _impact = computed(() => mitigationStore.impact.toFixed(2))
const _optimised = computed(() => mitigationStore.optimised)
</script>

<style scoped>
/* Add your styles here if needed */
</style>
