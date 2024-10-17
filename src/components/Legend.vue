<template>
  <div id="legend" v-if="legendData.length > 0">
    <h3>{{ title }}</h3>
    <div class="swatch" v-for="item in legendData" :key="item.label">
      <div class="color-box" :style="{ backgroundColor: item.color }"></div>
      <span>{{ item.label }} m ({{ item.count }})</span>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    legendData: {
      type: Array,
      required: true
    },
    title: {
      type: String,
      default: ''
    }
  },
};
</script>

<style scoped>
#legend {
  position: absolute;
  top: 10px; /* Adjust as needed */
  right: 10px; /* Adjust as needed */
  background-color: rgba(255, 255, 255, 0.8); /* Semi-transparent white background */
  border-radius: 4px;
  padding: 10px;
  z-index: 10; /* Ensure it's above the Cesium content */
}

.swatch {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.color-box {
  width: 20px;
  height: 20px;
  border: 1px solid black; /* Optional: add a border to the color box */
  margin-right: 5px;
}
</style>