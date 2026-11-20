<template>
	<div
		class="analysis-panel-body"
		role="region"
		aria-label="Land cover comparison"
	>
		<div class="d-flex ga-2">
			<HSYAreaSelect class="flex-grow-1" />
			<HSYYearSelect class="year-select" />
		</div>
		<!-- The Layers tab switch itself (#1155): same name, same store field, and the
		     same entry point, which switches NDVI off and reports a failure (#1152). -->
		<LayerSwitch layer="landCover" />
		<PieChart />
	</div>
</template>

<script setup>
import LayerSwitch from './controls/LayerSwitch.vue'
import HSYAreaSelect from './HSYAreaSelect.vue'
import HSYYearSelect from './HSYYearSelect.vue'
import PieChart from './PieChart.vue'
</script>

<style scoped>
.year-select {
	flex: 0 0 96px;
}
</style>
