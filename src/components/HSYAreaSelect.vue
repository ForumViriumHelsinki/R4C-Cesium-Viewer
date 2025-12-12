<template>
	<v-select
		v-model="selectedArea"
		:items="areaOptions"
		label="Select Area"
		density="compact"
		variant="underlined"
	/>
</template>

<script>
import { onMounted, ref, watch } from 'vue'
import { eventBus } from '../services/eventEmitter.js'
import { useBackgroundMapStore } from '../stores/backgroundMapStore.js'
import { usePropsStore } from '../stores/propsStore.js'

export default {
	setup() {
		const backgroundMapStore = useBackgroundMapStore()
		const propsStore = usePropsStore()
		const selectedArea = ref('')
		const areaOptions = ref([])

		// Populate areaOptions when the component is mounted
		onMounted(() => {
			if (propsStore.postalCodeData) {
				areaOptions.value = extractNimiValues(propsStore.postalCodeData)
				selectedArea.value = 'Askisto'
			}
		})

		const extractNimiValues = (datasource) => {
			const nimiValuesSet = new Set()
			const entitiesArray = datasource._entityCollection?._entities._array

			if (Array.isArray(entitiesArray)) {
				entitiesArray.forEach((entity) => {
					if (
						entity &&
						entity._properties &&
						entity._properties._nimi &&
						typeof entity._properties._nimi._value !== 'undefined'
					) {
						nimiValuesSet.add(entity._properties._nimi._value)
					}
				})
			}

			return Array.from(nimiValuesSet).sort()
		}

		watch(
			() => selectedArea.value,
			(newValue) => {
				backgroundMapStore.setHSYSelectArea(newValue)
				eventBus.emit('recreate piechart')
			}
		)

		return {
			selectedArea,
			areaOptions,
		}
	},
}
</script>
