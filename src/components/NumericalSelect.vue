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
import { ref, watch } from 'vue';
import { eventBus } from '../services/eventEmitter.js';
import { usePropsStore } from '../stores/propsStore.js';

export default {
  setup() {
    const propsStore = usePropsStore();
    const numericalOptions = [
      { text: 'Built', value: 'kavu' },
      { text: 'Area', value: 'area_m2' },
      { text: 'Floor Count', value: 'kerrosten_lkm' },
      { text: 'Floor Area', value: 'kerala' },
      { text: 'Total Area', value: 'korala' },
      { text: 'Apartments', value: 'asuntojen_lkm' }
    ];

    const selectedNumerical = ref('area_m2'); // default selection

    // Watcher for selectedNumerical to emit changes via eventBus
    watch(() => selectedNumerical.value, (newValue) => {
      const selectedOption = numericalOptions.find(option => option.value === newValue);
      emitChange(selectedOption);
    });

    // Emit function
    const emitChange = (selectedOption) => {
      propsStore.setNumericalSelect( { value: selectedOption.value, text: selectedOption.text } );
      eventBus.emit('updateScatterPlot' );
    };

    return {
      selectedNumerical,
      numericalOptions
    };
  }
};
</script>