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
import { ref, watch, onMounted } from 'vue';
import { useSocioEconomicsStore } from '../stores/socioEconomicsStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import { eventBus } from '../services/eventEmitter.js';

export default {
	setup() {
		const socioEconomicsStore = useSocioEconomicsStore();
		const toggleStore = useToggleStore(); 
		const propsStore = usePropsStore(); 
		const selectedArea = ref( '' );
		const areaOptions = ref( [] );

		// Populate the select options based on 'nimi' attribute of socioEconomics store
		const populateSelectFromStore = () => {
			const nimiValues = getNimiDataFromStore();
			areaOptions.value = nimiValues;
			selectedArea.value = nimiValues[0] || ''; // Set the first area as default
		};

		const getNimiDataFromStore = () => toggleStore.helsinkiView ? socioEconomicsStore.getNimiForHelsinki() : socioEconomicsStore.getNimiForCapital();

		// Populate areaOptions when the component is mounted
		onMounted( () => {

			populateSelectFromStore();

		} );

		// Watch for changes in the selected area and handle the change
		watch( () => selectedArea.value, ( newValue ) => {
			propsStore.setSocioEconomics( newValue );
			eventBus.emit( 'updateSocioEconomics' );
		} );

		return {
			selectedArea,
			areaOptions
		};
	}
};
</script>