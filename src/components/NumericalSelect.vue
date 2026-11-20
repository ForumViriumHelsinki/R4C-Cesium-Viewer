<template>
	<v-select
		v-model="selectedNumerical"
		:items="numericalOptions"
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
		const numericalOptions = [
			'kavu',
			'area_m2',
			'kerrosten_lkm',
			'kerala',
			'korala',
			'asuntojen_lkm',
		].map((value) => ({ text: propertyLabel(value), value }))

		const selectedNumerical = ref('area_m2') // default selection

		// Watcher for selectedNumerical to emit changes via eventBus
		watch(
			() => selectedNumerical.value,
			(newValue) => {
				const selectedOption = numericalOptions.find((option) => option.value === newValue)
				emitChange(selectedOption)
			}
		)

		// Emit function
		const emitChange = (selectedOption) => {
			propsStore.setNumericalSelect({ value: selectedOption.value, text: selectedOption.text })
			eventBus.emit('updateScatterPlot')
		}

		return {
			selectedNumerical,
			numericalOptions,
		}
	},
}
</script>
