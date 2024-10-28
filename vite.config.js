import { defineConfig, loadEnv } from 'vite';
import Vue from '@vitejs/plugin-vue';
import cesium from 'vite-plugin-cesium-build';

export default defineConfig( ( { mode } ) => {
	// Load env file based on mode (development/production)
	const env = loadEnv( mode, '.' );
	return {
		plugins: [ Vue(), cesium() ],
		server: {
			proxy: {
				'/pygeoapi': {
					target: 'https://geo.fvh.fi/r4c',
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
							const url = new URL( proxyReq.path, 'https://geo.stat.fi' );
							url.searchParams.set( 'service', 'WFS' );
							url.searchParams.set( 'request', 'GetFeature' );
							url.searchParams.set( 'typename', 'postialue:pno_tilasto_2024' );
							url.searchParams.set( 'version', '2.0.0' );
							url.searchParams.set( 'outputFormat', 'application/json' );
							url.searchParams.set( 'CQL_FILTER', 'kunta IN (\'091\',\'092\',\'049\',\'235\')' );
							url.searchParams.set( 'srsName', 'EPSG:4326' );
							proxyReq.path = url.pathname + url.search;
						} );
					},
				},
				'/wms/proxy': {
					target: 'https://kartta.hsy.fi',
					changeOrigin: true,
					secure: false,
					rewrite: ( path ) => path.replace( /^\/wms\/proxy/, '/geoserver/wms' ),
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
					headers: {
						'digitransit-subscription-key': env.VITE_DIGITRANSIT_KEY
					},
					rewrite: ( path ) => path.replace( /^\/digitransit/, '' )
				}
			}
		}
	};
} );
