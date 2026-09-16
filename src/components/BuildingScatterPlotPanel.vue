<template>
	<div
		class="analysis-panel-body"
		role="region"
		aria-label="Building attributes and surface temperature"
	>
		<div class="d-flex ga-2">
			<NumericalSelect
				class="flex-grow-1"
				label="X axis"
			/>
			<CategoricalSelect
				class="flex-grow-1"
				label="Colour by"
			/>
		</div>
		<HSYScatterplot />
	</div>
</template>

<script setup>
import CategoricalSelect from './CategoricalSelect.vue'
import HSYScatterplot from './HSYScatterplot.vue'
import NumericalSelect from './NumericalSelect.vue'
</script>
