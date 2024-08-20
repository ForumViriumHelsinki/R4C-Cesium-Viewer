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
import { defineProps, defineEmits } from 'vue';

// Props and Emits
const props = defineProps({
  legendData: Array,
  indexOptions: Array,
  selectedIndex: String,
});

const emit = defineEmits(['onIndexChange']);

// Local state to bind to v-select
const localSelectedIndex = ref(props.selectedIndex);

// Watch for changes and emit the selection
watch(localSelectedIndex, (newValue) => {
  emit('onIndexChange', newValue);
});

// Compute the title based on the selected index
const title = computed(() => {
  return localSelectedIndex.value === 'heat_index' ? 'Heat Index' : 'Flood Index';
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