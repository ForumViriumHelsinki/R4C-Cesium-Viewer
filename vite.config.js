import Components from 'unplugin-vue-components/vite'
import Vue from '@vitejs/plugin-vue';
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';
import cesium from 'vite-plugin-cesium-build';

import { sentryVitePlugin } from '@sentry/vite-plugin';
import eslint from 'vite-plugin-eslint';

import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url'
import { version } from './package.json'

export default defineConfig( () => {
	return {
		build: {
			sourcemap: true, // Source map generation must be turned on
			rollupOptions: {
				output: {
					assetFileNames: `assets/[name].[hash].${version}.[ext]`,
					chunkFileNames: `assets/[name].[hash].${version}.js`,
					entryFileNames: `assets/[name].${version}.js`,
				}
			}
		},
		plugins: [
			eslint(),
    Vue({
      template: { transformAssetUrls }
    }),
    Vuetify({
      autoImport: true,
      // styles: {
      //   configFile: 'src/styles/settings.scss',
      // },
    }),
    Components(),
		  cesium(),
			// Put the Sentry vite plugin after all other plugins
			sentryVitePlugin( {
				authToken: process.env.SENTRY_AUTH_TOKEN,
				org: 'forum-virium-helsinki',
				project: 'regions4climate',
			} ),
		],
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
		server: {
			proxy: {
				'/pygeoapi': {
					// Derive URL from HOST - use http for localhost development, https for production
					target: (() => {
						const host = process.env.VITE_PYGEOAPI_HOST || 'pygeoapi.dataportal.fi';
						const protocol = host.startsWith('localhost:') ? 'http' : 'https';
						return `${protocol}://${host}/`;
					})(),
					changeOrigin: true,
					secure: false,
					rewrite: ( path ) => path.replace( /^\/pygeoapi/, '' ),
				},
				'/paavo': {
					target: 'https://geo.stat.fi/geoserver/postialue/wfs',
					changeOrigin: true,
					rewrite: ( path ) => path.replace( /^\/paavo/, '' ),
					secure: false,
					configure: ( proxy, _options ) => {
						proxy.on( 'proxyReq', ( proxyReq, req, _res ) => {
							// Modify the outgoing request to include the necessary parameters
							try {
								// Sanitize the path to ensure it's a valid URL component
								const sanitizedPath = proxyReq.path.startsWith('/') ? proxyReq.path : '/' + proxyReq.path;
								const url = new URL( sanitizedPath, 'https://geo.stat.fi' );
								url.searchParams.set( 'service', 'WFS' );
								url.searchParams.set( 'request', 'GetFeature' );
								url.searchParams.set( 'typename', 'postialue:pno_tilasto' );
								url.searchParams.set( 'version', '2.0.0' );
								url.searchParams.set( 'outputFormat', 'application/json' );
								url.searchParams.set( 'CQL_FILTER', 'kunta IN (\'091\',\'092\',\'049\',\'235\')' );
								url.searchParams.set( 'srsName', 'EPSG:4326' );
								proxyReq.path = url.pathname + url.search;
							} catch (error) {
								console.error('Failed to construct URL for proxy request:', {
									path: proxyReq.path,
									error: error.message
								});
								// Fallback: use the original path if URL construction fails
								// This ensures the proxy still functions even with malformed URLs
							}
						} );
					},
				},
				'/wms/proxy': {
					target: 'https://kartta.hsy.fi',
					changeOrigin: true,
					secure: false,
					rewrite: ( path ) => path.replace( /^\/wms\/proxy/, '/geoserver/wms' ),
				},
				'/ndvi_public': {
					target: 'https://storage.googleapis.com',
					changeOrigin: true,
					secure: false,
					rewrite: ( path ) => path.replace( /^\/ndvi_public/, '/ndvi_public' ),
				},				
				'/terrain-proxy': {
					target: 'https://kartta.hel.fi',
					changeOrigin: true,
					rewrite: ( path ) => path.replace( /^\/terrain-proxy/, '/3d/datasource-data/4383570b-33a3-4a9f-ae16-93373aff5ffa' ),
				},
				'/wms/layers': {
					target: 'https://kartta.hsy.fi',
					changeOrigin: true,
					secure: false,
					rewrite: ( path ) => path.replace( /^\/wms\/layers/, '/geoserver/wms?request=getCapabilities' ),
					configure: ( proxy, _options ) => {
						proxy.on( 'error', ( err, _req, _res ) => {
							console.log( 'proxy error', err );
						} );
						proxy.on( 'proxyReq', ( proxyReq, req, _res ) => {
							console.log( 'Sending Request to the Target:', req.method, req.url );
						} );
						proxy.on( 'proxyRes', ( proxyRes, req, _res ) => {
							console.log( 'Received Response from the Target:', proxyRes.statusCode, req.url );
						} );
					},
				},
				'/digitransit': {
					target: 'https://api.digitransit.fi',
					changeOrigin: true,
					secure: false,
					headers: process.env.VITE_DIGITRANSIT_KEY ? {
						'digitransit-subscription-key': process.env.VITE_DIGITRANSIT_KEY
					} : {},
					rewrite: ( path ) => path.replace( /^\/digitransit/, '' ),
					configure: (proxy, options) => {
						// Log warning if API key is missing
						if (!process.env.VITE_DIGITRANSIT_KEY) {
							console.warn('⚠️  VITE_DIGITRANSIT_KEY not set - digitransit API calls may fail or be rate limited');
						}
					}
				},
				'/hsy-action': {
					target: 'https://kartta.hsy.fi',
					changeOrigin: true,
					secure: false,
					rewrite: ( path ) => path.replace( /^\/hsy-action/, '/action' ),
					configure: ( proxy, _options ) => {
						proxy.on( 'error', ( err, _req, _res ) => {
							console.log( 'HSY action proxy error', err );
						} );
						proxy.on( 'proxyReq', ( proxyReq, req, _res ) => {
							console.log( 'Sending HSY Action Request:', req.method, req.url );
						} );
						proxy.on( 'proxyRes', ( proxyRes, req, _res ) => {
							console.log( 'Received HSY Action Response:', proxyRes.statusCode, req.url );
						} );
					},
				}
			}
		}
	};
} );
