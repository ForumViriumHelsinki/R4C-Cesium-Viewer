<template>
  <v-select
    v-model="selectedCategorical"
    :items="categoricalOptions"
    label="Select Categorical"
    item-title="text"
    item-value="value"    
    dense
  />
</template>

<script>
import { ref, watch } from 'vue';
import { eventBus } from '../services/eventEmitter.js';
import { usePropsStore } from '../stores/propsStore.js';

export default {
  setup() {
    const propsStore = usePropsStore();
    const categoricalOptions = [
      { text: 'Facade Material', value: 'julkisivu_s' },
      { text: 'Building Material', value: 'rakennusaine_s' },
      { text: 'Usage', value: 'kayttarks' },
      { text: 'Heating Method', value: 'lammitystapa_s' },
      { text: 'Heating Source', value: 'lammitysaine_s' }
    ];

    const selectedCategorical = ref('julkisivu_s');

    // Watch for changes and emit both value and text
    watch(() => selectedCategorical.value, (newValue) => {
      const selectedOption = categoricalOptions.find(option => option.value === newValue);
      emitChange(selectedOption);
    });

    const emitChange = (selectedOption) => {
      propsStore.setCategoricalSelect( { value: selectedOption.value, text: selectedOption.text } );
      eventBus.$emit( 'updateScatterPlot' );
    };

    return {
      selectedCategorical,
      categoricalOptions
    };
  }
};
</script>