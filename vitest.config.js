import { defineConfig } from 'vite';
import Vue from '@vitejs/plugin-vue';
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
	plugins: [
		Vue({
			template: { transformAssetUrls },
		}),
		Vuetify({
			autoImport: true,
		}),
		{
			name: 'vitest-plugin-stub-css',
			transform(code, id) {
				if (id.endsWith('.css')) {
					return { code: 'export default {}' };
				}
			},
		},
	],
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./tests/setup.js'],
		include: ['tests/unit/**/*.test.{js,ts}', 'tests/integration/**/*.test.{js,ts}'],
		exclude: ['tests/**/*.spec.ts', 'tests/e2e/**/*', 'tests/performance/**/*'],
		server: {
			deps: {
				inline: ['vuetify'],
			},
		},
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'lcov'],
			exclude: [
				'node_modules/',
				'tests/',
				'dist/',
				'**/*.config.js',
				'**/*.config.ts',
				'public/',
				'helm/',
				'scripts/',
			],
			thresholds: {
				global: {
					branches: 70,
					functions: 70,
					lines: 70,
					statements: 70,
				},
			},
		},
		testTimeout: 10000,
		// Use threads pool for better performance (default in Vitest)
		// Tests run in parallel with proper isolation
		pool: 'threads',
	},
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	define: {
		'process.env': {},
	},
});
