<template>
	<div
		class="analysis-panel-body"
		role="region"
		aria-label="Socioeconomic comparison"
	>
		<SocioEconomicsSelect label="Compare to" />
		<SocioEconomicsChart />
	</div>
</template>

<script setup>
import SocioEconomicsChart from './SocioEconomicsChart.vue'
import SocioEconomicsSelect from './SocioEconomicsSelect.vue'
</script>
