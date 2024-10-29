import js from '@eslint/js';
import eslintPluginVue from 'eslint-plugin-vue';
import globals from 'globals';

export default [
	// Global settings
	{
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				...globals.browser,
				...globals.es2021,
				// Add Cesium global
				Cesium: 'readonly',
				// Add Vuetify global
				Vuetify: 'readonly',
			}
		}
	},

	// Include recommended ESLint rules
	js.configs.recommended,

	// Vue plugin configuration - enhanced for Vue 3
	{
		files: [ '**/*.vue' ],
		plugins: {
			vue: eslintPluginVue
		},
		rules: {
			// Using vue3-recommended instead of vue3-essential for stricter rules
			...eslintPluginVue.configs['vue3-recommended'].rules,
			// Customize some Vue-specific rules
			'vue/html-indent': [ 'error', 'tab' ],
			'vue/script-indent': [ 'error', 'tab' ],
			'vue/component-name-in-template-casing': [ 'error', 'PascalCase' ],
			'vue/multi-word-component-names': 'error',
			'vue/no-unused-components': 'error',
			'vue/no-unused-vars': 'error',
			'vue/require-default-prop': 'error',
			// Pinia-specific rules
			'vue/no-unused-properties': [ 'error', {
				groups: [ 'data', 'computed', 'methods', 'setup' ]
			} ]
		}
	},

	// JavaScript/Node.js rules
	{
		files: [ '**/*.js', '**/*.mjs' ],
		rules: {
			'indent': [ 'error', 'tab' ],
			'linebreak-style': [ 'error', 'unix' ],
			'quotes': [ 'error', 'single' ],
			'semi': [ 'error', 'always' ],
			'space-in-parens': [ 'error', 'always' ],
			'array-bracket-spacing': [ 'error', 'always' ],
			'block-spacing': [ 'error', 'always' ],
			'keyword-spacing': [ 'error', { 
				'before': true, 
				'after': true 
			} ],
			// Additional rules for better code quality
			'no-unused-vars': 'error',
			'no-console': [ 'warn', { allow: [ 'warn', 'error' ] } ],
			'no-debugger': 'warn',
			'prefer-const': 'error',
			'arrow-spacing': [ 'error', { before: true, after: true } ],
			// D3-specific rule
			'no-shadow': [ 'error', { allow: [ 'd3' ] } ],
			// Promise handling (for axios)
			'handle-callback-err': 'error',
			'prefer-promise-reject-errors': 'error'
		}
	},

	// Vite config files
	{
		files: [ 'vite.config.js' ],
		rules: {
			'no-unused-vars': 'warn',
			'import/no-unresolved': 'off'
		}
	}
];
