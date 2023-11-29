import { defineConfig } from 'vite';
import cesium from 'vite-plugin-cesium';
import Vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    Vue(), 
    cesium()
  ],
  server: { // for allowing any external access
    host: '0.0.0.0',
    watch: {
      usePolling: true,
    },
  },
  base: './', // Ensure that paths resolve correctly within the Docker environment
});
