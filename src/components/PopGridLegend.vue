<template>
  <div id="legend" v-if="legendData.length > 0">
    <div>
      <h3>{{ title }}</h3>
      <div class="swatch" v-for="item in legendData" :key="item.range">
        <div class="color-box" :style="{ backgroundColor: item.color }"></div>
        <span>{{ item.range }}</span>
      </div>
    </div>
    <v-select
      v-model="localSelectedIndex"
      :items="indexOptions"
      item-text="text"
      item-value="value"
      label="Select Index"
      @update:modelValue="handleSelectionChange"
      style="max-width: 300px;"
    ></v-select>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

// Local state
const localSelectedIndex = ref('heat_index'); // Default selected index
const indexOptions = [
    { text: 'Heat Index', value: 'heat_index' },
    { text: 'Flood Index', value: 'flood_index' }
];

// Compute the title based on the selected index
const title = computed(() => localSelectedIndex.value === 'heat_index' ? 'Heat Index' : 'Flood Index');

// Compute legend data based on the selected index
const legendData = computed(() => {
  return localSelectedIndex.value === 'heat_index' ? [
    { color: '#ffffcc', range: '< 2' },
    { color: '#ffeda0', range: '2 - 4' },
    { color: '#feb24c', range: '4 - 6' },
    { color: '#f03b20', range: '6 - 8' },
    { color: '#bd0026', range: '> 8' }
  ] : [
    { color: '#eff3ff', range: '< 2' },
    { color: '#bdd7e7', range: '2 - 4' },
    { color: '#6baed6', range: '4 - 6' },
    { color: '#3182bd', range: '6 - 8' },
    { color: '#08519c', range: '> 8' }
  ];
});

// Emit event when the selection changes
const handleSelectionChange = (newValue) => {
  emit('onIndexChange', newValue);
};
</script>

<style scoped>
#legend {
  position: absolute;
  top: 100px;
  right: 10px;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  padding: 10px;
  z-index: 10;
}

.swatch {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.color-box {
  width: 20px;
  height: 20px;
  border: 1px solid black;
  margin-right: 5px;
}
</style>