<template>
  <div class="camera-controls">
    <v-btn
      icon
      size="small"
      class="camera-btn"
      @click="zoomIn"
      title="Zoom In"
    >
      <v-icon>mdi-plus</v-icon>
    </v-btn>
    
    <v-btn
      icon
      size="small"
      class="camera-btn"
      @click="zoomOut"
      title="Zoom Out"
    >
      <v-icon>mdi-minus</v-icon>
    </v-btn>
    
    <v-btn
      icon
      size="small"
      class="camera-btn"
      @click="resetView"
      title="Reset Camera"
    >
      <v-icon>mdi-home</v-icon>
    </v-btn>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import Camera from '../services/camera.js';

export default {
  name: 'CameraControls',
  setup() {
    const camera = ref(null);

    onMounted(() => {
      camera.value = new Camera();
    });

    const zoomIn = () => {
      if (camera.value) {
        camera.value.zoomIn();
      }
    };

    const zoomOut = () => {
      if (camera.value) {
        camera.value.zoomOut();
      }
    };

    const resetView = () => {
      if (camera.value) {
        camera.value.init();
      }
    };

    return {
      zoomIn,
      zoomOut,
      resetView
    };
  }
};
</script>

<style scoped>
.camera-controls {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.camera-btn {
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.camera-btn:hover {
  background-color: rgba(255, 255, 255, 1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}
</style>