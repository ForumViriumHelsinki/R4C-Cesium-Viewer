import { defineConfig } from 'vite';
import Vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'url';
import cesium from 'vite-plugin-cesium-build';

const base = import.meta.env.VITE_BASE;

export default defineConfig( ( { command } ) => {
	if ( command === 'serve' ) {
		return {
			// dev specific config
			plugins: [ Vue(),  cesium() ],
			test: {
				include: [ 'src/**/*.{test,spec}.{js,ts}' ],
				server: { // for allowing any external access
					host: '0.0.0.0',
					watch: {
						usePolling: true,
					},
				},
				define: { 'process.env': {} },
				resolve: {
					alias: {
						'@': fileURLToPath( new URL( './src', import.meta.url ) )
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
			}
		};
	} else {
		// command === 'build'
		return {
			// build specific config
			plugins: [ Vue(),  cesium() ],
			test: {
				include: [ 'src/**/*.{test,spec}.{js,ts}' ]
			},
			ssr: { noExternal: [ '@supabase/postgrest-js' ] }, // Activate this in build
			server: { // for allowing any external access
				host: '0.0.0.0',
				watch: {
					usePolling: true,
				},
			},
			define: { 'process.env': {} },
			resolve: {
				alias: {
					'@': fileURLToPath( new URL( './src', import.meta.url ) )
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
		};
	}
} );
