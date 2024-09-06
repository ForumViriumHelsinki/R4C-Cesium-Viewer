<template>
  <v-select
    v-model="selected"
    :items="categoricalOptions"
    label="Select Categorical Attribute"
    @change="emitChange"
  ></v-select>
</template>

<script>
import { ref } from 'vue';

export default {
  emits: ['change'],
  setup(_, { emit }) {
    const categoricalOptions = [
      { text: 'Facade Material', value: 'julkisivu_s' },
      { text: 'Building Material', value: 'rakennusaine_s' },
      { text: 'Usage', value: 'kayttarks' },
      { text: 'Heating Method', value: 'lammitystapa_s' },
      { text: 'Heating Source', value: 'lammitysaine_s' },
    ];

    const selected = ref('julkisivu_s');

    const emitChange = () => {
      emit('change', selected.value);
    };

    return {
      selected,
      categoricalOptions,
      emitChange,
    };
  },
};
</script>