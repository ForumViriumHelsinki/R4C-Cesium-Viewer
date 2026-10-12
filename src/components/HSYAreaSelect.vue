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
		const areaOptions = ref(/** @type {string[]} */ ([]))

		// Populate areaOptions when the component is mounted
		onMounted(() => {
			if (propsStore.postalCodeData) {
				areaOptions.value = extractNimiValues(propsStore.postalCodeData)
				selectedArea.value = 'Askisto'
			}
		})

		const extractNimiValues = (datasource) => {
			const nimiValuesSet = new Set(/** @type {string[]} */ ([]))
			const entitiesArray = datasource.entities?.values

			if (Array.isArray(entitiesArray)) {
				entitiesArray.forEach((entity) => {
					if (
						entity &&
						entity.properties &&
						entity.properties.nimi &&
						typeof entity.properties.nimi.getValue() !== 'undefined'
					) {
						nimiValuesSet.add(entity.properties.nimi.getValue())
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
