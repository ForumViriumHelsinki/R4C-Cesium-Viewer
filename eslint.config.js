import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';

export default [
	{
		name: 'app/files-to-lint',
		files: ['**/*.{js,mjs,jsx,ts,tsx,vue}'],
	},

	{
		name: 'app/files-to-ignore',
		ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
	},

	js.configs.recommended,
	...pluginVue.configs['flat/recommended'],
	...tseslint.configs.recommended,

	// TypeScript-specific overrides
	{
		files: ['**/*.ts', '**/*.tsx'],
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrors: 'none',
				},
			],
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-expressions': 'warn',
		},
	},

	// Vue-specific parser configuration (must come after tseslint config)
	{
		files: ['**/*.vue'],
		languageOptions: {
			parser: vueParser,
			parserOptions: {
				parser: tseslint.parser,
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrors: 'none',
				},
			],
			'@typescript-eslint/no-unused-expressions': 'warn',
		},
	},

	{
		languageOptions: {
			globals: {
				// Node.js globals
				global: 'readonly',
				process: 'readonly',
				Buffer: 'readonly',
				__dirname: 'readonly',
				__filename: 'readonly',
				exports: 'readonly',
				module: 'readonly',
				require: 'readonly',
				// Test globals
				describe: 'readonly',
				it: 'readonly',
				test: 'readonly',
				expect: 'readonly',
				beforeEach: 'readonly',
				afterEach: 'readonly',
				beforeAll: 'readonly',
				afterAll: 'readonly',
				jest: 'readonly',
				vi: 'readonly',
				vitest: 'readonly',
				// Browser globals
				window: 'readonly',
				document: 'readonly',
				console: 'readonly',
				fetch: 'readonly',
				indexedDB: 'readonly',
				Blob: 'readonly',
				requestIdleCallback: 'readonly',
				requestAnimationFrame: 'readonly',
				cancelAnimationFrame: 'readonly',
				setTimeout: 'readonly',
				clearTimeout: 'readonly',
				setInterval: 'readonly',
				clearInterval: 'readonly',
				AbortController: 'readonly',
				btoa: 'readonly',
				atob: 'readonly',
				Event: 'readonly',
				performance: 'readonly',
				localStorage: 'readonly',
				sessionStorage: 'readonly',
				URLSearchParams: 'readonly',
				URL: 'readonly',
				alert: 'readonly',
				navigator: 'readonly',
				location: 'readonly',
				// Vite specific
				import: 'readonly',
			},
		},
		rules: {
			// Style rules - keep disabled for flexibility
			'vue/multi-word-component-names': 'off',
			'vue/html-indent': 'off',
			'vue/no-ref-as-operand': 'off',
			'vue/html-closing-bracket-spacing': 'off',
			'vue/multiline-html-element-content-newline': 'off',

			// Code quality rules - enable as warnings to catch issues
			'no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrors: 'none',
				},
			],
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrors: 'none',
				},
			],
			'@typescript-eslint/no-unused-expressions': 'warn',
			'vue/no-unused-components': 'warn',
			'no-fallthrough': 'warn',
		},
	},
];
