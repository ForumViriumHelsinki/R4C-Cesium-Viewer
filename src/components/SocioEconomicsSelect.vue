<template>
	<v-select
		v-model="selectedArea"
		:items="areaOptions"
		density="compact"
		variant="underlined"
		class="pa-0 ma-0"
	/>
</template>

<script>
import { onMounted, ref, watch } from 'vue'
import { eventBus } from '../services/eventEmitter.js'
import { usePropsStore } from '../stores/propsStore.js'
import { useSocioEconomicsStore } from '../stores/socioEconomicsStore.js'
import { useToggleStore } from '../stores/toggleStore.js'

export default {
	setup() {
		const socioEconomicsStore = useSocioEconomicsStore()
		const toggleStore = useToggleStore()
		const propsStore = usePropsStore()
		const selectedArea = ref('')
		const areaOptions = ref([])

		// Populate the select options based on 'nimi' attribute of socioEconomics store
		const populateSelectFromStore = () => {
			const nimiValues = getNimiDataFromStore()
			areaOptions.value = nimiValues
			selectedArea.value = nimiValues[nimiValues.length - 4] || '' // Set the whole region as default
		}

		const getNimiDataFromStore = () =>
			toggleStore.helsinkiView
				? socioEconomicsStore.getNimiForHelsinki()
				: socioEconomicsStore.getNimiForCapital()

		// Populate areaOptions when the component is mounted
		onMounted(() => {
			populateSelectFromStore()
		})

		// Watch for changes in the selected area and handle the change
		watch(
			() => selectedArea.value,
			(newValue) => {
				propsStore.setSocioEconomics(newValue)
				eventBus.emit('updateSocioEconomics')
			}
		)

		return {
			selectedArea,
			areaOptions,
		}
	},
}
</script>
