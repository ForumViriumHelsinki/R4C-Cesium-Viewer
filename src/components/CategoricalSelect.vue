<template>
	<v-select
		v-model="selectedCategorical"
		:items="categoricalOptions"
		label="Select Property"
		item-title="text"
		item-value="value"
		density="compact"
		variant="underlined"
	/>
</template>

<script>
import { ref, watch } from 'vue'
import { propertyLabel } from '../constants/metricLabels.js'
import { eventBus } from '../services/eventEmitter.js'
import { usePropsStore } from '../stores/propsStore.js'

export default {
	setup() {
		const propsStore = usePropsStore()
		// Option names are the Details names for the same keys (#1156).
		const categoricalOptions = [
			'julkisivu_s',
			'rakennusaine_s',
			'kayttarks',
			'lammitystapa_s',
			'lammitysaine_s',
		].map((value) => ({ text: propertyLabel(value), value }))

		const selectedCategorical = ref('julkisivu_s')

		// Watch for changes and emit both value and text
		watch(
			() => selectedCategorical.value,
			(newValue) => {
				const selectedOption = categoricalOptions.find((option) => option.value === newValue)
				emitChange(selectedOption)
			}
		)

		const emitChange = (selectedOption) => {
			propsStore.setCategoricalSelect({ value: selectedOption.value, text: selectedOption.text })
			eventBus.emit('updateScatterPlot')
		}

		return {
			selectedCategorical,
			categoricalOptions,
		}
	},
}
</script>
