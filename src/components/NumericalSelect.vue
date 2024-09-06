<template>
  <v-select
    v-model="selected"
    :items="numericalOptions"
    label="Select Numerical Attribute"
    @change="emitChange"
  ></v-select>
</template>

<script>
import { ref } from 'vue';

export default {
  emits: ['change'],
  setup(_, { emit }) {
    const numericalOptions = [
      { text: 'Built', value: 'kavu' },
      { text: 'Area', value: 'area_m2' },
      { text: 'Floor Count', value: 'kerrosten_lkm' },
      { text: 'Floor Area', value: 'kerala' },
      { text: 'Total Area', value: 'korala' },
      { text: 'Apartments', value: 'asuntojen_lkm' },
    ];

    const selected = ref('area_m2');

    const emitChange = () => {
      emit('change', selected.value);
    };

    return {
      selected,
      numericalOptions,
      emitChange,
    };
  },
};
</script>