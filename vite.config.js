import { defineConfig } from 'vite';
import cesium from 'vite-plugin-cesium';
import Vue from '@vitejs/plugin-vue';
import path from 'path'
import pluginRewriteAll from 'vite-plugin-rewrite-all';

export default defineConfig({
  plugins: [
    Vue(), 
    cesium(),
    pluginRewriteAll()
  ],
  server: { // for allowing any external access
    host: '0.0.0.0',
    watch: {
      usePolling: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  base: '.',
});
