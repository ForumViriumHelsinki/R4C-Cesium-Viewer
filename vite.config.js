import { defineConfig } from 'vite';
import cesium from 'vite-plugin-cesium';
import Vue from '@vitejs/plugin-vue';
import forwardToTrailingSlashPlugin from './forward-to-trailing-slash-plugin.js'
import { fileURLToPath, URL } from 'url'

const base = '.';

export default defineConfig({
  plugins: [
    Vue(), 
    cesium(),
  //  forwardToTrailingSlashPlugin(base),
  ],
  server: { // for allowing any external access
    host: '0.0.0.0',
    watch: {
      usePolling: true,
    },
  },
  define: { 'process.env': {} },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    extensions: [
      '.js',
      '.json',
      '.jsx',
      '.mjs',
      '.ts',
      '.tsx',
      '.vue',
    ],
  },
  base: base,
});
