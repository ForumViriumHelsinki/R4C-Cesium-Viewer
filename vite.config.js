import { defineConfig } from 'vite';
import cesium from 'vite-plugin-cesium';
import Vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from "url";

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
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      { find: '@assets', replacement: fileURLToPath(new URL('./src/shared/assets', import.meta.url)) },
      { find: '@cmp', replacement: fileURLToPath(new URL('./src/shared/cmp', import.meta.url)) },
      { find: '@stores', replacement: fileURLToPath(new URL('./src/shared/stores', import.meta.url)) },
      { find: '@use', replacement: fileURLToPath(new URL('./src/shared/use', import.meta.url)) },
    ],
  },
});
