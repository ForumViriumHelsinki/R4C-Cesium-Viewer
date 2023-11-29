import { defineConfig } from 'vite';
import cesium from 'vite-plugin-cesium';
import Vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    Vue(), 
    cesium()
  ],
  resolve: { alias: { '@': '/src' } },
  server: { // for allowing any external access
   host: true,
   port: 5173,
    watch: {
      usePolling: true,
    },
  },
  base: './', // Ensure that paths resolve correctly within the Docker environment
});
