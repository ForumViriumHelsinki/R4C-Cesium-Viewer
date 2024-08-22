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
      item-title="text"
      item-value="value"
      label="Select Index"
      @update:modelValue="handleSelectionChange"
      style="max-width: 300px;"
    ></v-select>
    <div class="source-note">
      Socioeconomic source data by<br>
    <a href="https://stat.fi/index_en.html" target="_blank">Statistics Finland</a>
</div>   
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { defineEmits } from 'vue';

const indexOptions = [
  { text: 'Heat Vulnerability', value: 'heat_index' },
  { text: 'Flood Vulnerability', value: 'flood_index' },
];

// Compute legend data based on the selected index
const legendData = computed(() => {
  return localSelectedIndex.value === 'heat_index'
    ? [
        { color: '#ffffff', range: 'Incomplete data' }, // Add Incomplete data with white color
        { color: '#ffffcc', range: '< 0.2' },
        { color: '#ffeda0', range: '0.2 - 0.4' },
        { color: '#feb24c', range: '0.4 - 0.6' },
        { color: '#f03b20', range: '0.6 - 0.8' },
        { color: '#bd0026', range: '> 0.8' },
      ]
    : [
        { color: '#ffffff', range: 'Incomplete data' }, // Add Incomplete data with white color
        { color: '#eff3ff', range: '< 0.2' },
        { color: '#bdd7e7', range: '0.2 - 0.4' },
        { color: '#6baed6', range: '0.4 - 0.6' },
        { color: '#3182bd', range: '0.6 - 0.8' },
        { color: '#08519c', range: '> 0.8' },
      ];
});

const emit = defineEmits(['onIndexChange']);

// Local state to bind to v-select
const localSelectedIndex = ref('heat_index');

const handleSelectionChange = (value) => {
  emit('onIndexChange', value);
};

// Compute the title based on the selected index
const title = computed(() => {
  return localSelectedIndex.value === 'heat_index' ? 'Heat Vulnerability' : 'Flood Vulnerability';
});
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
  border: 1px solid black; 
	box-shadow: 3px 5px 5px black; 
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

.source-note {
  margin-top: -12px;
  font-size: 8px;
}

.source-note a {
  color: #0066cc;
  text-decoration: none;
}

.source-note a:hover {
  text-decoration: underline;
}
</style>